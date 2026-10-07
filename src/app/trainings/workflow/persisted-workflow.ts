import { ACTIVE_DATA_POLICY, evaluateDataPolicy } from "@/modules/governance";
import {
  evaluatePreflightGate,
  hashPreflightText,
  runPrivacyPreflight,
  type PreflightAcknowledgement,
} from "@/modules/privacy";
import { INPUT_KINDS, MAX_INPUT_LENGTH, type AgentInput, type AgentInputKind } from "@/modules/training-agent";
import { ANALYSIS_CONTRACT_V21_VERSION } from "@/modules/training-agent/v2-1";
import { BLOCK_CONTENT_VERSION, type BlockContentResult } from "@/modules/block-content";
import { BC_ONLINE_BLOCK_PLAN_VERSION, type BcOnlineBlockPlan } from "@/modules/block-plan";
import { TrainingBlueprintV2Schema, type TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { AnalysisError, type AnalysisErrorKind } from "@/services/analysis/errors";
import type { TrainingAnalysisServiceV2 } from "@/services/analysis/training-analysis-service-v2";
import type { BlockContentService } from "@/services/block-content/services";
import { lazyService } from "@/services/block-content/orchestrator";
import type { BlockPlanService, TrainingBlueprintServiceV21 } from "@/services/blueprint/services";
import type { Db } from "@/services/storage/db";
import { builtOn, currentRevision, isApproved, pendingRevisionFeedback, selectedDirection, validatedSources, withRevision, type TrainingRecordSnapshot } from "@/services/storage/snapshot";
import { resolveBlockTarget } from "@/modules/block-content";
import {
  DATA_POLICY_VERSION,
  REVISION_FEEDBACK_MAX,
  StorageError,
  appendWorkflowEvent,
  createArtifactRevision,
  createTraining,
  loadTrainingRecordSnapshot,
  saveTrainingInput,
  type ArtifactRevision,
  type StoredTrainingInput,
} from "@/services/storage/training-record";
import { hasBlueprintFor, loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { runBlockPlanFlow, runBlueprintFlowV21 } from "../new/blueprint-flow";
import { runBlockRegenerationFlow } from "../new/content-flow";
import { runGatedAnalysis, type InputGateRejection } from "../new/gated-analysis";

/*
 * Persistence cut-over V1: de workflow van een training met Postgres als waarheid.
 *
 * - Iedere stap krijgt alleen ids (training, revision, richting, gepland blok). De server laadt Blueprint, Block Plan,
 *   analyse, invoer en eerder goedgekeurde inhoud zelf uit de database; de browser levert nooit trusted artifacts aan.
 * - De bestaande poorten blijven bindend (runGatedAnalysis, runBlueprintFlowV21, runBlockPlanFlow,
 *   runBlockRegenerationFlow): ze krijgen nu opgeslagen data in plaats van clientdata.
 * - Een stap slaagt pas als het resultaat is opgeslagen. Geen automatische provider-retry.
 * - Dubbele of verouderde acties maken geen extra revisions of events (idempotente besluiten,
 *   `expectedCurrentRevisionId`).
 * Logt alleen metadata.
 */

export interface Provenance {
  promptVersion: string | null;
  modelVersion: string | null;
}

export interface WorkflowDeps {
  db: Db;
  getAnalysisService: () => TrainingAnalysisServiceV2;
  getBlueprintService: () => TrainingBlueprintServiceV21;
  getBlockPlanService: () => BlockPlanService;
  getBlockContentService: () => BlockContentService;
  provenance: {
    analysis: Provenance;
    blueprint: Provenance;
    /** Herkomst van een gerichte Blueprint-revisie (andere promptversie); zonder deze waarde geldt `blueprint`. */
    blueprintRevision?: Provenance;
    blockPlan: Provenance;
    blockContent: Provenance;
  };
  log?: (entry: WorkflowLogEntry) => void;
}

export type WorkflowRejection =
  | "not_found"
  | "invalid_input"
  | "input_gate"
  | "attestation_outdated"
  | "invalid_state"
  | "stale_revision"
  | "direction_locked"
  | "provider_error"
  | "invalid_output"
  | "persistence_error"
  | "scope_review_required";

export type WorkflowResult =
  | { status: "ok"; workspace: TrainingWorkspaceView; failedBlockId?: string | null }
  | {
      status: "rejected";
      reason: WorkflowRejection;
      gateReason?: InputGateRejection;
      workspace?: TrainingWorkspaceView;
      /** Inhoudsvrije validatiecodes bij een afgewezen bewerking (bijv. `too_small@options`). */
      issues?: string[];
    };

export type StartTrainingResult =
  | { status: "created"; trainingId: string; analysis: WorkflowResult }
  | { status: "rejected"; reason: WorkflowRejection; gateReason?: InputGateRejection };

export interface WorkflowLogEntry {
  event: "certum.training_workflow";
  action: string;
  outcome: "ok" | "rejected";
  reason?: WorkflowRejection;
  errorKind?: AnalysisErrorKind | string;
}

const defaultLog = (entry: WorkflowLogEntry) => console.info(JSON.stringify(entry));

// ---------------------------------------------------------------------------------------------------------------
// Hulpfuncties
// ---------------------------------------------------------------------------------------------------------------

export async function ok(deps: WorkflowDeps, trainingId: string, action: string, extra: { failedBlockId?: string | null } = {}): Promise<WorkflowResult> {
  const workspace = await loadTrainingWorkspace(deps.db, trainingId);
  if (!workspace) return reject(deps, action, "not_found");
  (deps.log ?? defaultLog)({ event: "certum.training_workflow", action, outcome: "ok" });
  return { status: "ok", workspace, ...extra };
}

export function reject(deps: WorkflowDeps, action: string, reason: WorkflowRejection, errorKind?: string, gateReason?: InputGateRejection): WorkflowResult & { status: "rejected" } {
  (deps.log ?? defaultLog)({ event: "certum.training_workflow", action, outcome: "rejected", reason, ...(errorKind && { errorKind }) });
  return { status: "rejected", reason, ...(gateReason && { gateReason }) };
}

/** Fouten van provider of opslag als inhoudsvrije afwijzing. */
export function rejectError(deps: WorkflowDeps, action: string, error: unknown): WorkflowResult {
  if (error instanceof StorageError) {
    if (error.code === "stale_revision" || error.code === "not_current" || error.code === "stale_based_on") return reject(deps, action, "stale_revision", error.code);
    if (error.code === "not_found") return reject(deps, action, "not_found", error.code);
    if (error.code === "not_generated" || error.code === "invalid_event") return reject(deps, action, "invalid_state", error.code);
    if (error.code === "scope_review_required") return reject(deps, action, "scope_review_required", error.code);
    return reject(deps, action, "persistence_error", error.code);
  }
  if (error instanceof AnalysisError) return reject(deps, action, error.kind === "invalid-output" ? "invalid_output" : "provider_error", error.kind);
  return reject(deps, action, "persistence_error", "unknown");
}

/**
 * De bevestiging bij de opgeslagen invoer: dezelfde tekst-hash, de bevestigde bevindingen en de attestatie. Alleen
 * geldig zolang de attestatietekst van de huidige governance-policy ongewijzigd is.
 */
function storedAcknowledgement(input: StoredTrainingInput): PreflightAcknowledgement | null {
  if (input.dataPolicyVersion !== DATA_POLICY_VERSION) return null;
  return { textHash: input.textHash, acknowledgedFindingIds: input.acknowledgements, syntheticDataAttested: input.attestation.syntheticDataAttested === true };
}

const agentInput = (input: StoredTrainingInput): AgentInput => ({ kind: input.inputType, text: input.inputText }) as AgentInput;

/** De snapshot van een training, of `null` als hij niet bestaat. Eén bulkload per actie. */
const snapshotOf = (deps: WorkflowDeps, trainingId: string) => loadTrainingRecordSnapshot(deps.db, trainingId);

// ---------------------------------------------------------------------------------------------------------------
// Invoer en analyse
// ---------------------------------------------------------------------------------------------------------------

/**
 * Nieuwe training: maakt `training` en `training_input` in één transactie, alleen na de lokale Privacy Preflight en
 * de synthetic_only-attestatie (opnieuw, server-side). Daarna direct de analyse; mislukt die, dan bestaat de training
 * al en kan de analyse vanuit de training opnieuw worden gestart.
 */
export async function startTraining(
  deps: WorkflowDeps,
  input: { kind: AgentInputKind; text: string; acknowledgement: PreflightAcknowledgement | null },
): Promise<StartTrainingResult> {
  const text = input.text.trim();
  if (text.length === 0 || text.length > MAX_INPUT_LENGTH) return reject(deps, "start_training", "invalid_input");
  const preflight = runPrivacyPreflight(text);
  const textHash = await hashPreflightText(text);
  const gate = evaluatePreflightGate({ preflight, currentTextHash: textHash, acknowledgement: input.acknowledgement });
  const ackForText = input.acknowledgement?.textHash === textHash ? input.acknowledgement : null;
  const policy = evaluateDataPolicy(ACTIVE_DATA_POLICY, ackForText?.syntheticDataAttested === true);
  if (!gate.allowed) return reject(deps, "start_training", "input_gate", undefined, gate.reason);
  if (!policy.allowed) return reject(deps, "start_training", "input_gate", undefined, policy.reason);

  let trainingId: string;
  try {
    const label = INPUT_KINDS.find((k) => k.kind === input.kind)?.label ?? "Training";
    trainingId = await deps.db.transaction(async (tx) => {
      const training = await createTraining(tx, { title: `Nieuwe training · ${label}` });
      await saveTrainingInput(tx, { trainingId: training.id, inputType: input.kind, text, acknowledgement: input.acknowledgement });
      return training.id;
    });
  } catch (error) {
    if (error instanceof StorageError && error.code === "input_gate") return reject(deps, "start_training", "input_gate");
    const rejected = rejectError(deps, "start_training", error);
    return { status: "rejected", reason: rejected.status === "rejected" ? rejected.reason : "persistence_error" };
  }
  (deps.log ?? defaultLog)({ event: "certum.training_workflow", action: "start_training", outcome: "ok" });
  return { status: "created", trainingId, analysis: await runAnalysis(deps, trainingId) };
}

/** Analyse op de opgeslagen invoer; slaat de gevalideerde uitkomst op als analysis-revision. Idempotent. */
export async function runAnalysis(deps: WorkflowDeps, trainingId: string): Promise<WorkflowResult> {
  const action = "run_analysis";
  const snap = await snapshotOf(deps, trainingId);
  if (!snap?.input) return reject(deps, action, "not_found");
  if (currentRevision(snap, "analysis")) return ok(deps, trainingId, action);
  const acknowledgement = storedAcknowledgement(snap.input);
  if (!acknowledgement) return reject(deps, action, "attestation_outdated");

  try {
    const result = await runGatedAnalysis(agentInput(snap.input), acknowledgement, {
      getService: deps.getAnalysisService,
      contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
    });
    if (result.status === "preflight") return reject(deps, action, "input_gate", undefined, result.reason);
    await createArtifactRevision(deps.db, {
      trainingId,
      artifactType: "analysis",
      contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
      ...deps.provenance.analysis,
      payload: result.analysis,
      basedOnRevisionIds: [],
      expectedCurrentRevisionId: null,
    });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

// ---------------------------------------------------------------------------------------------------------------
// Richting en Blueprint
// ---------------------------------------------------------------------------------------------------------------

/** Legt de gekozen richting vast als workflow event op exact de current analyse. Vast zodra er een Blueprint is. */
export async function selectDirection(deps: WorkflowDeps, trainingId: string, analysisRevisionId: string, trainingDirectionId: string): Promise<WorkflowResult> {
  const action = "select_direction";
  const snap = await snapshotOf(deps, trainingId);
  const analysis = snap && currentRevision(snap, "analysis");
  if (!snap || !analysis) return reject(deps, action, "not_found");
  if (analysis.id !== analysisRevisionId) return reject(deps, action, "stale_revision");
  if (hasBlueprintFor(snap, analysis.id)) {
    return selectedDirection(snap, analysis.id) === trainingDirectionId ? ok(deps, trainingId, action) : reject(deps, action, "direction_locked");
  }
  try {
    await appendWorkflowEvent(deps.db, { trainingId, artifactRevisionId: analysis.id, eventType: "direction_selected", trainingDirectionId });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

/** Blueprint uit de opgeslagen analyse, de opgeslagen richting en de opgeslagen invoer. Idempotent per analyse. */
export async function generateBlueprint(deps: WorkflowDeps, trainingId: string): Promise<WorkflowResult> {
  const action = "generate_blueprint";
  const snap = await snapshotOf(deps, trainingId);
  const analysis = snap && currentRevision(snap, "analysis");
  if (!snap?.input || !analysis) return reject(deps, action, "not_found");
  const directionId = selectedDirection(snap, analysis.id);
  if (!directionId) return reject(deps, action, "invalid_state");
  const current = currentRevision(snap, "blueprint");
  const currentId = current?.id ?? null;
  // Idempotent, met één uitzondering: een menselijke revisietoelichting op exact de current Blueprint vraagt één
  // nieuwe, gerichte generatie. Zonder toelichting gebeurt er niets (geen blinde nieuwe trekking).
  let revision: { feedback: string; previous: TrainingBlueprintV2 } | undefined;
  if (builtOn(current, [analysis.id])) {
    const feedback = pendingRevisionFeedback(snap, current);
    if (!feedback) return ok(deps, trainingId, action);
    const previous = TrainingBlueprintV2Schema.safeParse(current.payload);
    if (!previous.success) return reject(deps, action, "invalid_state");
    revision = { feedback, previous: previous.data };
  }
  const acknowledgement = storedAcknowledgement(snap.input);
  if (!acknowledgement) return reject(deps, action, "attestation_outdated");

  try {
    const result = await runBlueprintFlowV21(agentInput(snap.input), acknowledgement, analysis.payload, directionId, { getService: deps.getBlueprintService }, revision);
    if (result.status === "rejected") {
      return reject(deps, action, result.reason === "provider_error" ? "provider_error" : result.reason === "invalid_blueprint" ? "invalid_output" : "invalid_state", result.reason);
    }
    await createArtifactRevision(deps.db, {
      trainingId,
      artifactType: "blueprint",
      contractVersion: result.blueprint.version,
      ...(revision ? (deps.provenance.blueprintRevision ?? deps.provenance.blueprint) : deps.provenance.blueprint),
      payload: result.blueprint,
      basedOnRevisionIds: [analysis.id],
      expectedCurrentRevisionId: currentId,
    });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

// ---------------------------------------------------------------------------------------------------------------
// Besluiten
// ---------------------------------------------------------------------------------------------------------------

/**
 * Goedkeuren of laten herzien van exact één revision (Blueprint, Block Plan of blokinhoud). Alleen de current
 * revision; de content_hash komt uit de database. Een herhaald besluit voegt niets toe. De write laadt zijn eigen
 * snapshot binnen de vergrendelde transactie en evalueert de approvalregels in het geheugen.
 */
export async function decideRevision(
  deps: WorkflowDeps,
  trainingId: string,
  revisionId: string,
  decision: "approved" | "needs_revision",
  options: { revisionFeedback?: string } = {},
): Promise<WorkflowResult> {
  const action = `decide_${decision}`;
  try {
    await appendWorkflowEvent(deps.db, {
      trainingId,
      artifactRevisionId: revisionId,
      eventType: decision,
      ...(options.revisionFeedback !== undefined && { revisionFeedback: options.revisionFeedback }),
    });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

/**
 * "Laten aanpassen" van de current Blueprint met een gerichte menselijke toelichting. Legt alleen het besluit vast
 * (immutable, in `event_data`); de nieuwe versie ontstaat pas bij een expliciete `generateBlueprint`. Leeg of te lang
 * wordt geweigerd; de toelichting wordt nooit gelogd.
 */
export async function requestBlueprintRevision(deps: WorkflowDeps, trainingId: string, revisionId: string, feedback: unknown): Promise<WorkflowResult> {
  const action = "request_blueprint_revision";
  const text = typeof feedback === "string" ? feedback.trim() : "";
  if (!text || text.length > REVISION_FEEDBACK_MAX) return reject(deps, action, "invalid_input");
  const snap = await snapshotOf(deps, trainingId);
  const current = snap && currentRevision(snap, "blueprint");
  if (!current || current.id !== revisionId) return reject(deps, action, "stale_revision");
  return decideRevision(deps, trainingId, revisionId, "needs_revision", { revisionFeedback: text });
}

// ---------------------------------------------------------------------------------------------------------------
// Block Plan en inhoud
// ---------------------------------------------------------------------------------------------------------------

/** Goedgekeurde Blueprint op de current analyse, en het Block Plan daarop (indien aanwezig), uit de snapshot. */
export function approvedUpstream(snap: TrainingRecordSnapshot) {
  const analysis = currentRevision(snap, "analysis");
  const blueprint = currentRevision(snap, "blueprint");
  if (!analysis || !builtOn(blueprint, [analysis.id]) || !isApproved(snap, blueprint.id)) return null;
  const planRev = currentRevision(snap, "block_plan");
  const plan = builtOn(planRev, [blueprint.id]) ? planRev : null;
  return { blueprint, plan, planApproved: plan !== null && isApproved(snap, plan.id) };
}

/** Block Plan uit de opgeslagen, goedgekeurde Blueprint. De browser levert geen Blueprint aan. Idempotent. */
export async function generateBlockPlan(deps: WorkflowDeps, trainingId: string): Promise<WorkflowResult> {
  const action = "generate_block_plan";
  const snap = await snapshotOf(deps, trainingId);
  const upstream = snap && approvedUpstream(snap);
  if (!snap || !upstream) return reject(deps, action, "invalid_state");
  if (upstream.plan) return ok(deps, trainingId, action);
  const current = currentRevision(snap, "block_plan");
  try {
    const result = await runBlockPlanFlow(upstream.blueprint.payload, { status: "approved" }, { getService: deps.getBlockPlanService });
    if (result.status === "rejected") {
      return reject(deps, action, result.reason === "provider_error" ? "provider_error" : result.reason === "invalid_block_plan" ? "invalid_output" : "invalid_state", result.reason);
    }
    await createArtifactRevision(deps.db, {
      trainingId,
      artifactType: "block_plan",
      contractVersion: BC_ONLINE_BLOCK_PLAN_VERSION,
      ...deps.provenance.blockPlan,
      payload: result.blockPlan,
      basedOnRevisionIds: [upstream.blueprint.id],
      expectedCurrentRevisionId: current?.id ?? null,
    });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

/** Eerder goedgekeurde inhoud van blokken vóór dit blok, uit de snapshot (nooit uit de browser). */
export function approvedEarlierContent(snap: TrainingRecordSnapshot, plan: BcOnlineBlockPlan, plannedBlockId: string, upstream: string[]): BlockContentResult[] {
  const target = plan.plannedBlocks.find((b) => b.id === plannedBlockId)!;
  return plan.plannedBlocks
    .filter((p) => p.sequence < target.sequence)
    .flatMap((b) => {
      const rev = currentRevision(snap, "block_content", b.id);
      return builtOn(rev, upstream) && isApproved(snap, rev.id) ? [{ ...(rev.payload as BlockContentResult), reviewStatus: "approved" as const }] : [];
    });
}

/**
 * Eén blok genereren (deterministisch zonder provider waar mogelijk) en opslaan met stale-controle. Geeft de opgeslagen
 * revision terug, of een afwijzing.
 */
async function generateAndStoreBlock(
  deps: WorkflowDeps,
  snap: TrainingRecordSnapshot,
  up: { blueprint: ArtifactRevision; plan: ArtifactRevision },
  plannedBlockId: string,
  expectedCurrentRevisionId: string | null,
  getService: () => BlockContentService,
): Promise<ArtifactRevision | (WorkflowResult & { status: "rejected" })> {
  const blueprint = up.blueprint.payload as TrainingBlueprintV2;
  const plan = up.plan.payload as BcOnlineBlockPlan;
  const upstream = [up.blueprint.id, up.plan.id];
  const earlier = approvedEarlierContent(snap, plan, plannedBlockId, upstream);
  // Bron-blok: alleen de current gevalideerde bronnen die aan zijn vereiste sourceNeeds gekoppeld zijn; hun versies
  // worden provenance (based_on), zodat een nieuwe bronversie het blok stale maakt.
  const sources = resolveBlockTarget(blueprint, plan, plannedBlockId, validatedSources(snap))?.sources ?? [];
  const result = await runBlockRegenerationFlow(blueprint, { status: "approved" }, plan, { status: "approved" }, plannedBlockId, earlier, { getService }, sources);
  if (result.status === "rejected") {
    return reject(deps, "generate_block", result.reason === "provider_error" ? "provider_error" : result.reason === "invalid_block_content" ? "invalid_output" : "invalid_state", result.reason);
  }
  return createArtifactRevision(deps.db, {
    trainingId: snap.training.id,
    artifactType: "block_content",
    artifactKey: plannedBlockId,
    contractVersion: BLOCK_CONTENT_VERSION,
    ...deps.provenance.blockContent,
    payload: result.block,
    basedOnRevisionIds: [...upstream, ...sources.map((s) => s.revisionId)],
    expectedCurrentRevisionId,
  });
}

/**
 * Training Content: Start en Einde één keer per training, daarna ieder gepland blok dat nog geen inhoud heeft op de
 * huidige Blueprint en het huidige Block Plan. Eén snapshot bij de start; na iedere opgeslagen revision wordt de lokale
 * snapshot bijgewerkt in plaats van de training opnieuw te laden. Iedere blokinhoud wordt direct opgeslagen (een
 * onderbreking verliest niets; opnieuw starten gaat verder). Stopt bij de eerste fout.
 */
export async function generateContent(deps: WorkflowDeps, trainingId: string): Promise<WorkflowResult> {
  const action = "generate_content";
  let snap = await snapshotOf(deps, trainingId);
  const up = snap && approvedUpstream(snap);
  if (!snap || !up || !up.plan || !up.planApproved) return reject(deps, action, "invalid_state");
  const upstream = [up.blueprint.id, up.plan.id];
  const blueprint = up.blueprint.payload as TrainingBlueprintV2;
  const plan = up.plan.payload as BcOnlineBlockPlan;
  const getService = lazyService(deps.getBlockContentService);

  try {
    const start = currentRevision(snap, "start_content");
    const end = currentRevision(snap, "end_content");
    const startId = start?.id ?? null;
    const endId = end?.id ?? null;
    if (!builtOn(start, upstream) || !builtOn(end, upstream)) {
      const frame = await getService().generateFrame({ blueprint, blockPlan: plan });
      if (!builtOn(start, upstream)) {
        snap = withRevision(snap, await createArtifactRevision(deps.db, { trainingId, artifactType: "start_content", contractVersion: BLOCK_CONTENT_VERSION, ...deps.provenance.blockContent, payload: frame.start, basedOnRevisionIds: upstream, expectedCurrentRevisionId: startId }));
      }
      if (!builtOn(end, upstream)) {
        snap = withRevision(snap, await createArtifactRevision(deps.db, { trainingId, artifactType: "end_content", contractVersion: BLOCK_CONTENT_VERSION, ...deps.provenance.blockContent, payload: frame.end, basedOnRevisionIds: upstream, expectedCurrentRevisionId: endId }));
      }
    }
    for (const planned of [...plan.plannedBlocks].sort((a, b) => a.sequence - b.sequence)) {
      const current = currentRevision(snap, "block_content", planned.id);
      const currentId = current?.id ?? null;
      if (builtOn(current, upstream)) continue;
      const stored = await generateAndStoreBlock(deps, snap, { blueprint: up.blueprint, plan: up.plan }, planned.id, currentId, getService);
      if ("status" in stored) return ok(deps, trainingId, action, { failedBlockId: planned.id });
      snap = withRevision(snap, stored);
    }
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action, { failedBlockId: null });
}

/**
 * Eén blok opnieuw genereren: revision +1 (concept). Alleen als de client de current revision kent
 * (`expectedRevisionId`); anders `stale_revision`. Start en Einde blijven ongemoeid; de oude revision blijft historie.
 */
export async function regenerateBlock(deps: WorkflowDeps, trainingId: string, plannedBlockId: string, expectedRevisionId: string | null): Promise<WorkflowResult> {
  const action = "regenerate_block";
  const snap = await snapshotOf(deps, trainingId);
  const up = snap && approvedUpstream(snap);
  if (!snap || !up || !up.plan || !up.planApproved) return reject(deps, action, "invalid_state");
  if (!(up.plan.payload as BcOnlineBlockPlan).plannedBlocks.some((b) => b.id === plannedBlockId)) return reject(deps, action, "not_found");
  try {
    const stored = await generateAndStoreBlock(deps, snap, { blueprint: up.blueprint, plan: up.plan }, plannedBlockId, expectedRevisionId, lazyService(deps.getBlockContentService));
    if ("status" in stored) return stored;
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}
