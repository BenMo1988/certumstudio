import type { BlueprintRevisionContext } from "@/knowledge/prompts/training-blueprint-v2-2";
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
  ambiguityFor,
  checkBlueprintV2Invariants,
  routePolicyFor,
  type TrainingBlueprintV2,
} from "@/modules/training-blueprint/v2";
import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2";
import { AnalysisOutcomeV21Schema, toV2Outcome, type ReadyOutcomeV21 } from "@/modules/training-agent/v2-1";
import type {
  BlockPlanService,
  TrainingBlueprintService,
  TrainingBlueprintServiceV2,
  TrainingBlueprintServiceV21,
} from "@/services/blueprint/services";

/** Waarom een Blueprint of Block Plan niet mag ontstaan. Bevat geen inhoud. */
export type BlueprintFlowRejection =
  | "input_gate"
  | "invalid_analysis"
  | "not_ready"
  | "unknown_direction"
  | "incompatible_analysis"
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
      /** Gerichte revisie met menselijke toelichting (alleen ja/nee; nooit de toelichting zelf). */
      revisionRequested?: boolean;
    }
  | {
      event: "certum.block_plan";
      version: string;
      outcome: "success" | "rejected";
      reason?: BlueprintFlowRejection;
      errorKind?: AnalysisErrorKind | "unknown";
      plannedBlocks?: number;
      capabilityGaps?: number;
    };

const defaultLog = (entry: BlueprintLogEntry) => console.info(JSON.stringify(entry));

/**
 * Wat een contractversie aan de flow levert: versie-id, de domeincontrole tegen de analyse en of het routebeleid van
 * de analyse trusted is. Bij `trustRoutePolicy` is alleen een Analysis V2.1-uitkomst toegestaan (geen stille gok bij
 * een V2-analyse zonder routebeleid) en moet de ambiguïteit van de Blueprint daaruit volgen.
 */
interface BlueprintContract<B> {
  version: string;
  check: (blueprint: B, context: { analysis: ReadyOutcome; segments: SourceSegment[] }) => string[];
  trustRoutePolicy: boolean;
}

const V1_CONTRACT: BlueprintContract<TrainingBlueprint> = {
  version: TRAINING_BLUEPRINT_VERSION,
  check: checkBlueprintInvariants,
  trustRoutePolicy: false,
};

const V2_CONTRACT: BlueprintContract<TrainingBlueprintV2> = {
  version: TRAINING_BLUEPRINT_V2_VERSION,
  check: checkBlueprintV2Invariants,
  trustRoutePolicy: false,
};

const V21_CONTRACT: BlueprintContract<TrainingBlueprintV2> = { ...V2_CONTRACT, trustRoutePolicy: true };

type ServiceRequest<A> = { input: AgentInput; analysis: A; segments: SourceSegment[]; selectedDirectionId: string; revision?: BlueprintRevisionContext };

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

/**
 * Blueprint Generation met trusted routebeleid (actief): Blueprint Contract V2 en prompt training-blueprint/v2.1.
 * Dezelfde poorten, plus: alleen een Analysis V2.1-uitkomst met routebeleid. Een V2-analyse zonder routebeleid geeft
 * `incompatible_analysis`; de flow bepaalt de ambiguïteit nooit zelf. De ambiguïteit van de Blueprint moet volgen uit
 * het routebeleid van de gekozen richting (`ambiguityFor`).
 */
export async function runBlueprintFlowV21(
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  analysisCandidate: unknown,
  selectedDirectionId: string,
  deps: { getService: () => TrainingBlueprintServiceV21; log?: (entry: BlueprintLogEntry) => void },
  /** Gerichte revisie: server-side geladen uit het `needs_revision`-besluit op de current Blueprint. */
  revision?: BlueprintRevisionContext,
): Promise<BlueprintFlowResultV2> {
  return runGatedBlueprintFlow(V21_CONTRACT, input, acknowledgement, analysisCandidate, selectedDirectionId, deps, revision);
}

/** De gedeelde poorten voor iedere contractversie. De provider wordt pas na alle poorten aangemaakt. */
async function runGatedBlueprintFlow<
  B extends { ambiguity: TrainingBlueprint["ambiguity"]; sourceNeeds: unknown[] },
  A extends ReadyOutcome | ReadyOutcomeV21,
>(
  contract: BlueprintContract<B>,
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  analysisCandidate: unknown,
  selectedDirectionId: string,
  deps: {
    getService: () => { generate: (request: ServiceRequest<A>) => Promise<B> };
    log?: (entry: BlueprintLogEntry) => void;
  },
  revision?: BlueprintRevisionContext,
): Promise<BlueprintFlowResult<B>> {
  const log = deps.log ?? defaultLog;
  const reject = (reason: BlueprintFlowRejection, errorKind?: AnalysisErrorKind | "unknown"): BlueprintFlowResult<B> => {
    log({
      event: "certum.blueprint",
      version: contract.version,
      outcome: "rejected",
      reason,
      ...(errorKind && { errorKind }),
      ...(revision && { revisionRequested: true }),
    });
    return { status: "rejected", reason };
  };

  const preflight = runPrivacyPreflight(input.text);
  const textHash = await hashPreflightText(input.text);
  const ackForThisText = acknowledgement?.textHash === textHash ? acknowledgement : null;
  const preflightPassed = evaluatePreflightGate({ preflight, currentTextHash: textHash, acknowledgement }).allowed;
  const syntheticDataAttested = evaluateDataPolicy(ACTIVE_DATA_POLICY, ackForThisText?.syntheticDataAttested === true).allowed;
  if (!preflightPassed || !syntheticDataAttested) return reject("input_gate");

  // Een V2.1-analyse of (alleen zonder trusted routebeleid) een V2-analyse; V2.1 is V2 plus routePolicy.
  const v21 = AnalysisOutcomeV21Schema.safeParse(analysisCandidate);
  const parsed = v21.success ? v21 : AnalysisOutcomeSchema.safeParse(analysisCandidate);
  if (!parsed.success) return reject("invalid_analysis");
  // Geen stille gok: een V2-analyse zonder routebeleid wordt bij trusted routebeleid niet geïnterpreteerd.
  if (contract.trustRoutePolicy && !v21.success) return reject("incompatible_analysis");
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
    // Bij trusted routebeleid krijgt de provider de V2.1-uitkomst (met routePolicy), anders de V2-weergave.
    const serviceAnalysis = (contract.trustRoutePolicy && v21.success ? v21.data : analysis) as A;
    blueprint = await deps.getService().generate({ input, analysis: serviceAnalysis, segments, selectedDirectionId, ...(revision && { revision }) });
  } catch (error) {
    if (error instanceof AnalysisError && error.kind === "invalid-output") return reject("invalid_blueprint", error.kind);
    return reject("provider_error", error instanceof AnalysisError ? error.kind : "unknown");
  }
  // Ook na een provider die zelf controleert: de flow is de poort voor iedere implementatie.
  if (contract.check(blueprint, { analysis, segments }).length > 0) return reject("invalid_blueprint");
  // Eén doorlopende waarheid: de ambiguïteit van de Blueprint volgt uit het routebeleid van de Analysis-richting.
  if (contract.trustRoutePolicy && v21.success && v21.data.outcome === "ready") {
    const direction = v21.data.trainingDirections.find((d) => d.id === selectedDirectionId);
    if (!direction || blueprint.ambiguity !== ambiguityFor(direction.routePolicy)) return reject("invalid_blueprint");
  }

  log({
    event: "certum.blueprint",
    version: contract.version,
    outcome: "success",
    ambiguity: blueprint.ambiguity,
    sourceNeeds: blueprint.sourceNeeds.length,
    inputKind: input.kind,
    ...(revision && { revisionRequested: true }),
  });
  return { status: "blueprint", blueprint };
}

/**
 * Block Plan Generation, alleen uit een geldige én door een mens goedgekeurde Blueprint (V2, of de V1-baseline).
 * De provider (mock of Claude) wordt pas aangemaakt nadat de goedkeuring, het Blueprint-schema en het routebeleid
 * (V2: keuzemoment en Actie volgen uit de ambiguïteit) zijn gecontroleerd. De provider krijgt uitsluitend de Blueprint;
 * nooit de oorspronkelijke input of de analyse.
 *
 * Bekende blocker `approval_integrity_required_before_export` (zie CLAUDE.md): zolang er geen opslag is, komen de
 * goedkeuring en de Blueprint terug van de client. De server controleert schema, routebeleid en approval-flag, maar
 * kan inhoudelijke wijzigingen door een client niet uitsluiten. Vóór export is persistence of integriteitsgebonden
 * goedkeuring vereist.
 */
export async function runBlockPlanFlow(
  blueprintCandidate: unknown,
  approval: ApprovalState,
  deps: { getService: () => BlockPlanService; log?: (entry: BlueprintLogEntry) => void },
): Promise<BlockPlanFlowResult> {
  const log = deps.log ?? defaultLog;
  const reject = (reason: BlueprintFlowRejection, errorKind?: AnalysisErrorKind | "unknown"): BlockPlanFlowResult => {
    log({
      event: "certum.block_plan",
      version: BC_ONLINE_BLOCK_PLAN_VERSION,
      outcome: "rejected",
      reason,
      ...(errorKind && { errorKind }),
    });
    return { status: "rejected", reason };
  };

  if (getBlockPlanGenerationBlocker(approval) !== null) return reject("blueprint_not_approved");
  return blockPlanFromBlueprint(blueprintCandidate, log, reject, deps);
}

/**
 * Leerlijn Gate Compression V1: een voorlopig Block Plan op een nog niet goedgekeurde Blueprint, zodat de opleider
 * Blueprint en plan in één menselijke handeling (Gate 1) beoordeelt en goedkeurt. Dezelfde validatie als
 * `runBlockPlanFlow`; alleen de goedkeuringscheck vervalt. Het resultaat is géén revision: het Training Record legt een
 * plan pas vast na de goedkeuring van de Blueprint, en Block Content blijft hard afhankelijk van beide goedkeuringen.
 */
export async function runProvisionalBlockPlanFlow(
  blueprintCandidate: unknown,
  deps: { getService: () => BlockPlanService; log?: (entry: BlueprintLogEntry) => void },
): Promise<BlockPlanFlowResult> {
  const log = deps.log ?? defaultLog;
  const reject = (reason: BlueprintFlowRejection, errorKind?: AnalysisErrorKind | "unknown"): BlockPlanFlowResult => {
    log({ event: "certum.block_plan", version: BC_ONLINE_BLOCK_PLAN_VERSION, outcome: "rejected", reason, ...(errorKind && { errorKind }) });
    return { status: "rejected", reason };
  };
  return blockPlanFromBlueprint(blueprintCandidate, log, reject, deps);
}

async function blockPlanFromBlueprint(
  blueprintCandidate: unknown,
  log: (entry: BlueprintLogEntry) => void,
  reject: (reason: BlueprintFlowRejection, errorKind?: AnalysisErrorKind | "unknown") => BlockPlanFlowResult,
  deps: { getService: () => BlockPlanService },
): Promise<BlockPlanFlowResult> {
  const v2 = TrainingBlueprintV2Schema.safeParse(blueprintCandidate);
  const parsed = v2.success ? v2 : TrainingBlueprintSchema.safeParse(blueprintCandidate);
  if (!parsed.success) return reject("invalid_blueprint");
  // V2: het routebeleid van keuzemoment en Actie moet uit de ambiguïteit volgen (contextvrije structuurcontrole).
  if (v2.success) {
    const policy = routePolicyFor(v2.data.ambiguity);
    if (v2.data.decisionPoint.routePolicy !== policy || v2.data.learningArc.actie.routePolicy !== policy) {
      return reject("invalid_blueprint");
    }
  }

  // Pas hier, na alle poorten, wordt de provider aangemaakt. Een providerfout blijft een fout: geen terugval naar mock.
  let blockPlan: BcOnlineBlockPlan;
  try {
    blockPlan = await deps.getService().generate({ blueprint: parsed.data });
  } catch (error) {
    if (error instanceof AnalysisError && error.kind === "invalid-output") return reject("invalid_block_plan", error.kind);
    return reject("provider_error", error instanceof AnalysisError ? error.kind : "unknown");
  }
  if (checkBlockPlanInvariants(blockPlan, parsed.data).length > 0) return reject("invalid_block_plan");

  log({
    event: "certum.block_plan",
    version: BC_ONLINE_BLOCK_PLAN_VERSION,
    outcome: "success",
    plannedBlocks: blockPlan.plannedBlocks.length,
    capabilityGaps: blockPlan.capabilityGaps.length,
  });
  return { status: "block_plan", blockPlan };
}
