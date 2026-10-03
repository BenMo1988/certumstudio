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
import {
  TRAINING_BLUEPRINT_V2_VERSION,
  TrainingBlueprintV2Schema,
  checkBlueprintV2Invariants,
  type TrainingBlueprintV2,
} from "@/modules/training-blueprint/v2";
import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2";
import { AnalysisOutcomeV21Schema, toV2Outcome } from "@/modules/training-agent/v2-1";
import type {
  BlockPlanService,
  TrainingBlueprintService,
  TrainingBlueprintServiceV2,
} from "@/services/blueprint/services";

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

export type BlueprintFlowResult<B = TrainingBlueprint> =
  | { status: "blueprint"; blueprint: B }
  | { status: "rejected"; reason: BlueprintFlowRejection };

export type BlueprintFlowResultV2 = BlueprintFlowResult<TrainingBlueprintV2>;

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

/** Wat een contractversie aan de flow levert: versie-id en de domeincontrole tegen de analyse. */
interface BlueprintContract<B> {
  version: string;
  check: (blueprint: B, context: { analysis: ReadyOutcome; segments: SourceSegment[] }) => string[];
}

const V1_CONTRACT: BlueprintContract<TrainingBlueprint> = {
  version: TRAINING_BLUEPRINT_VERSION,
  check: checkBlueprintInvariants,
};

const V2_CONTRACT: BlueprintContract<TrainingBlueprintV2> = {
  version: TRAINING_BLUEPRINT_V2_VERSION,
  check: checkBlueprintV2Invariants,
};

/**
 * Blueprint Generation (Blueprint Contract V1, baseline; niet meer aangesloten op de UI). Zie runBlueprintFlowV2.
 */
export async function runBlueprintFlow(
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  analysisCandidate: unknown,
  selectedDirectionId: string,
  deps: { getService: () => TrainingBlueprintService; log?: (entry: BlueprintLogEntry) => void },
): Promise<BlueprintFlowResult> {
  return runGatedBlueprintFlow(V1_CONTRACT, input, acknowledgement, analysisCandidate, selectedDirectionId, deps);
}

/**
 * Blueprint Generation volgens Blueprint Contract V2 (actief). Dezelfde poorten als V1, alleen na:
 * 1. dezelfde poorten als de analyse (lokale preflight + synthetic_only, opnieuw op de tekst);
 * 2. een geldige V2-analyse met outcome `ready` en een werkelijk bestaande gekozen richting
 *    (getProceedBlockerV2 is de centrale poort; blocked/unsuitable/needs_adjustment stoppen hier);
 * 3. een Blueprint die het schema en de domeinregels van V2 doorstaat.
 */
export async function runBlueprintFlowV2(
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  analysisCandidate: unknown,
  selectedDirectionId: string,
  deps: { getService: () => TrainingBlueprintServiceV2; log?: (entry: BlueprintLogEntry) => void },
): Promise<BlueprintFlowResultV2> {
  return runGatedBlueprintFlow(V2_CONTRACT, input, acknowledgement, analysisCandidate, selectedDirectionId, deps);
}

/** De gedeelde poorten voor iedere contractversie. De provider wordt pas na alle poorten aangemaakt. */
async function runGatedBlueprintFlow<B extends { ambiguity: TrainingBlueprint["ambiguity"]; sourceNeeds: unknown[] }>(
  contract: BlueprintContract<B>,
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  analysisCandidate: unknown,
  selectedDirectionId: string,
  deps: {
    getService: () => { generate: (request: { input: AgentInput; analysis: ReadyOutcome; segments: SourceSegment[]; selectedDirectionId: string }) => Promise<B> };
    log?: (entry: BlueprintLogEntry) => void;
  },
): Promise<BlueprintFlowResult<B>> {
  const log = deps.log ?? defaultLog;
  const reject = (reason: BlueprintFlowRejection, errorKind?: AnalysisErrorKind | "unknown"): BlueprintFlowResult<B> => {
    log({
      event: "certum.blueprint",
      version: contract.version,
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

  // Een V2.1-analyse (actief) of een V2-analyse; V2.1 is V2 plus routePolicy, dat de Blueprint (nog) niet leest.
  const v21 = AnalysisOutcomeV21Schema.safeParse(analysisCandidate);
  const parsed = v21.success ? v21 : AnalysisOutcomeSchema.safeParse(analysisCandidate);
  if (!parsed.success) return reject("invalid_analysis");
  // De poort en de Blueprint werken met de V2-weergave (zonder routePolicy); dezelfde V2-invarianten gelden.
  const analysis = v21.success ? toV2Outcome(v21.data) : parsed.data;
  const segments = segmentInput(input.text);
  if (checkOutcomeInvariants(analysis, segments).length > 0) return reject("invalid_analysis");

  const blocker = getProceedBlockerV2(analysis, selectedDirectionId, { preflightPassed, syntheticDataAttested });
  if (blocker === "not_ready" || analysis.outcome !== "ready") return reject("not_ready");
  if (blocker !== null) return reject("unknown_direction");

  // Pas hier, na alle poorten, wordt de provider aangemaakt. Een providerfout blijft een fout: geen terugval naar mock.
  let blueprint: B;
  try {
    blueprint = await deps.getService().generate({ input, analysis, segments, selectedDirectionId });
  } catch (error) {
    if (error instanceof AnalysisError && error.kind === "invalid-output") return reject("invalid_blueprint", error.kind);
    return reject("provider_error", error instanceof AnalysisError ? error.kind : "unknown");
  }
  // Ook na een provider die zelf controleert: de flow is de poort voor iedere implementatie.
  if (contract.check(blueprint, { analysis, segments }).length > 0) return reject("invalid_blueprint");

  log({
    event: "certum.blueprint",
    version: contract.version,
    outcome: "success",
    ambiguity: blueprint.ambiguity,
    sourceNeeds: blueprint.sourceNeeds.length,
    inputKind: input.kind,
  });
  return { status: "blueprint", blueprint };
}

/**
 * Block Plan Generation, alleen uit een geldige én door een mens goedgekeurde Blueprint (V2, of de V1-baseline).
 * Het Block Plan leest alleen titel, leerdoel, ambiguïteit en prestatiesoort; het is onafhankelijk van de versie.
 */
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
  const v2 = TrainingBlueprintV2Schema.safeParse(blueprintCandidate);
  const parsed = v2.success ? v2 : TrainingBlueprintSchema.safeParse(blueprintCandidate);
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
