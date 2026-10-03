import { ACTIVE_DATA_POLICY, evaluateDataPolicy } from "@/modules/governance";
import {
  evaluatePreflightGate,
  hashPreflightText,
  runPrivacyPreflight,
  type PreflightAcknowledgement,
} from "@/modules/privacy";
import type { AgentInput } from "@/modules/training-agent";
import {
  AnalysisOutcomeSchema,
  checkOutcomeInvariants,
  getProceedBlockerV2,
  segmentInput,
} from "@/modules/training-agent/v2";
import {
  BC_ONLINE_BLOCK_PLAN_VERSION,
  checkBlockPlanInvariants,
  type BcOnlineBlockPlan,
} from "@/modules/block-plan";
import {
  TRAINING_BLUEPRINT_VERSION,
  TrainingBlueprintSchema,
  checkBlueprintInvariants,
  getBlockPlanGenerationBlocker,
  type ApprovalState,
  type TrainingBlueprint,
} from "@/modules/training-blueprint";
import { AnalysisError, type AnalysisErrorKind } from "@/services/analysis/errors";
import type { BlockPlanService, TrainingBlueprintService } from "@/services/blueprint/services";

/** Waarom een Blueprint of Block Plan niet mag ontstaan. Bevat geen inhoud. */
export type BlueprintFlowRejection =
  | "input_gate"
  | "invalid_analysis"
  | "not_ready"
  | "unknown_direction"
  | "invalid_blueprint"
  | "provider_error"
  | "blueprint_not_approved"
  | "invalid_block_plan";

export type BlueprintFlowResult =
  | { status: "blueprint"; blueprint: TrainingBlueprint }
  | { status: "rejected"; reason: BlueprintFlowRejection };

export type BlockPlanFlowResult =
  | { status: "block_plan"; blockPlan: BcOnlineBlockPlan }
  | { status: "rejected"; reason: BlueprintFlowRejection };

/**
 * Privacyveilige metadata; nooit inhoud van analyse, Blueprint of plan. Provider, model en aantallen van de
 * generatie zelf staan in `certum.blueprint_generation` (services/blueprint/logging.ts).
 */
export type BlueprintLogEntry =
  | {
      event: "certum.blueprint";
      version: string;
      outcome: "success" | "rejected";
      reason?: BlueprintFlowRejection;
      errorKind?: AnalysisErrorKind | "unknown";
      ambiguity?: TrainingBlueprint["ambiguity"];
      sourceNeeds?: number;
      inputKind?: AgentInput["kind"];
    }
  | {
      event: "certum.block_plan";
      version: string;
      generator: "mock";
      outcome: "success" | "rejected";
      reason?: BlueprintFlowRejection;
      plannedBlocks?: number;
      capabilityGaps?: number;
    };

const defaultLog = (entry: BlueprintLogEntry) => console.info(JSON.stringify(entry));

/**
 * Blueprint Generation, alleen na:
 * 1. dezelfde poorten als de analyse (lokale preflight + synthetic_only, opnieuw op de tekst);
 * 2. een geldige V2-analyse met outcome `ready` en een werkelijk bestaande gekozen richting
 *    (getProceedBlockerV2 is de centrale poort; blocked/unsuitable/needs_adjustment stoppen hier);
 * 3. een Blueprint die het schema en de domeinregels doorstaat.
 */
export async function runBlueprintFlow(
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  analysisCandidate: unknown,
  selectedDirectionId: string,
  deps: { getService: () => TrainingBlueprintService; log?: (entry: BlueprintLogEntry) => void },
): Promise<BlueprintFlowResult> {
  const log = deps.log ?? defaultLog;
  const reject = (reason: BlueprintFlowRejection, errorKind?: AnalysisErrorKind | "unknown"): BlueprintFlowResult => {
    log({
      event: "certum.blueprint",
      version: TRAINING_BLUEPRINT_VERSION,
      outcome: "rejected",
      reason,
      ...(errorKind && { errorKind }),
    });
    return { status: "rejected", reason };
  };

  const preflight = runPrivacyPreflight(input.text);
  const textHash = await hashPreflightText(input.text);
  const ackForThisText = acknowledgement?.textHash === textHash ? acknowledgement : null;
  const preflightPassed = evaluatePreflightGate({ preflight, currentTextHash: textHash, acknowledgement }).allowed;
  const syntheticDataAttested = evaluateDataPolicy(ACTIVE_DATA_POLICY, ackForThisText?.syntheticDataAttested === true).allowed;
  if (!preflightPassed || !syntheticDataAttested) return reject("input_gate");

  const parsed = AnalysisOutcomeSchema.safeParse(analysisCandidate);
  if (!parsed.success) return reject("invalid_analysis");
  const analysis = parsed.data;
  const segments = segmentInput(input.text);
  if (checkOutcomeInvariants(analysis, segments).length > 0) return reject("invalid_analysis");

  const blocker = getProceedBlockerV2(analysis, selectedDirectionId, { preflightPassed, syntheticDataAttested });
  if (blocker === "not_ready" || analysis.outcome !== "ready") return reject("not_ready");
  if (blocker !== null) return reject("unknown_direction");

  // Pas hier, na alle poorten, wordt de provider aangemaakt. Een providerfout blijft een fout: geen terugval naar mock.
  let blueprint: TrainingBlueprint;
  try {
    blueprint = await deps.getService().generate({ input, analysis, segments, selectedDirectionId });
  } catch (error) {
    if (error instanceof AnalysisError && error.kind === "invalid-output") return reject("invalid_blueprint", error.kind);
    return reject("provider_error", error instanceof AnalysisError ? error.kind : "unknown");
  }
  // Ook na een provider die zelf controleert: de flow is de poort voor iedere implementatie.
  if (checkBlueprintInvariants(blueprint, { analysis, segments }).length > 0) return reject("invalid_blueprint");

  log({
    event: "certum.blueprint",
    version: TRAINING_BLUEPRINT_VERSION,
    outcome: "success",
    ambiguity: blueprint.ambiguity,
    sourceNeeds: blueprint.sourceNeeds.length,
    inputKind: input.kind,
  });
  return { status: "blueprint", blueprint };
}

/** Block Plan Generation, alleen uit een geldige én door een mens goedgekeurde Blueprint. */
export async function runBlockPlanFlow(
  blueprintCandidate: unknown,
  approval: ApprovalState,
  deps: { getService: () => BlockPlanService; log?: (entry: BlueprintLogEntry) => void },
): Promise<BlockPlanFlowResult> {
  const log = deps.log ?? defaultLog;
  const reject = (reason: BlueprintFlowRejection): BlockPlanFlowResult => {
    log({ event: "certum.block_plan", version: BC_ONLINE_BLOCK_PLAN_VERSION, generator: "mock", outcome: "rejected", reason });
    return { status: "rejected", reason };
  };

  if (getBlockPlanGenerationBlocker(approval) !== null) return reject("blueprint_not_approved");
  const parsed = TrainingBlueprintSchema.safeParse(blueprintCandidate);
  if (!parsed.success) return reject("invalid_blueprint");

  const blockPlan = await deps.getService().generate(parsed.data);
  if (checkBlockPlanInvariants(blockPlan, parsed.data).length > 0) return reject("invalid_block_plan");

  log({
    event: "certum.block_plan",
    version: BC_ONLINE_BLOCK_PLAN_VERSION,
    generator: "mock",
    outcome: "success",
    plannedBlocks: blockPlan.plannedBlocks.length,
    capabilityGaps: blockPlan.capabilityGaps.length,
  });
  return { status: "block_plan", blockPlan };
}
