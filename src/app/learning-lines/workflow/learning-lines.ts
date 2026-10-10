import { buildSkjPackage } from "@/modules/accreditation";
import { mapWithConcurrency } from "@/lib/concurrency";
import { blockingSourceNeedsFor, requiredSourceNeedsFor } from "@/modules/block-content";
import { BC_ONLINE_BLOCK_PLAN_VERSION, type BcOnlineBlockPlan } from "@/modules/block-plan";
import {
  MODULE_INPUT_KIND,
  MODULE_IDS,
  buildCertumPackage,
  buildTomPackage,
  emptyProduction,
  moduleTrainingInputText,
  plannedStudyMinutes,
  type LearningLineDesign,
  type LearningLineState,
  type ModuleId,
  type ModuleProduction,
  type ModuleSpec,
} from "@/modules/learning-lines";
import { CATEGORY_INFO, hashPreflightText, runPrivacyPreflight, type PreflightCategory } from "@/modules/privacy";
import { relevantContentIssue, SOURCE_KINDS, type CertumSource } from "@/modules/sources/schema";
import type { SourceNeedScope, TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { AnalysisError } from "@/services/analysis/errors";
import type { LearningLineArchitectService } from "@/services/learning-line/services";
import { sanitizeSelection, type SourceSelectionRequest, type SourceSelectorService } from "@/services/learning-line/source-selector";
import { contentHash } from "@/services/storage/canonical-json";
import type { Db } from "@/services/storage/db";
import {
  appendLearningLineEvent,
  createLearningLine,
  createLearningLineRevision,
  linkModuleTraining,
  loadLearningLineSnapshot,
  MAX_LEARNING_LINE_PROMPT,
  saveModulePlanProposal,
  type LearningLineModuleLink,
  type LearningLineRevision,
  type LearningLineSnapshot,
  type ModulePlanProposal,
} from "@/services/storage/learning-line-record";
import { builtOn, currentRevision } from "@/services/storage/snapshot";
import {
  StorageError,
  createArtifactRevision,
  listValidatedSourceLibrary,
  loadTrainingRecordSnapshot,
  loadTrainingRecordSnapshots,
  type LibrarySource,
} from "@/services/storage/training-record";
import { deriveWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { runProvisionalBlockPlanFlow } from "../../trainings/new/blueprint-flow";
import { saveSourceNeedScopes } from "../../trainings/workflow/editing";
import {
  approvedUpstream,
  decideRevision,
  generateBlueprint,
  generateContent,
  regenerateBlock,
  runAnalysis,
  selectDirection,
  startTraining,
  type WorkflowDeps,
} from "../../trainings/workflow/persisted-workflow";
import { addSource, validateSource } from "../../trainings/workflow/sources";

/*
 * Leerlijn Engine V1 met Gate Compression V1: één prompt → zes modules → (automatische voorbereiding) → Gate 1 →
 * (automatische productie) → Gate 2 → Certum-, Tom- en SKJ-pakket. Twee menselijke handelingen; de governance blijft:
 * onder iedere GO worden de afzonderlijke besluiten als events vastgelegd in de bestaande Training Records.
 *
 * - Vóór Gate 1 (automatisch, per module begrensd parallel): training via `startTraining` (zelfde preflight, policy en
 *   analyse), een systeemvoorstel voor de richting, de Blueprint en een voorlopig Block Plan (niet in het Training
 *   Record; zie migratie 004). De module-invoer is server-side afgeleid van de geattesteerde prompt; bevat hij toch een
 *   preflight-bevinding, dan stopt alleen die module tot de opleider die bevestigt (uitzonderingspad).
 * - Gate 1 = één GO over: leerlijnontwerp, richting, scope per sourceNeed (geen voorselectie), Blueprint, Block Plan en
 *   bronnen. Bronnen komen vooraf ingevuld uit de bibliotheek van eerder door een mens gevalideerde passages; AI schrijft
 *   nooit bronpassages. De opleider controleert, vinkt uit en valideert. Alleen zonder voorstel: een klein invoerblok.
 * - Na Gate 1 (automatisch, begrensd parallel): alle blokinhoud en Start/Einde. Geen automatische retry; een mislukt
 *   blok is een uitzondering met een expliciete herstelactie.
 * - Gate 2 = één GO over alle blokken, Start en Einde (afzonderlijke `approved`-events), daarna `package_approved` op de
 *   hash van het Certum Package.
 * - Logt alleen metadata.
 */

export interface LearningLineDeps {
  db: Db;
  getArchitect: () => LearningLineArchitectService;
  getSourceSelector: () => SourceSelectorService;
  provenance: { promptVersion: string | null; modelVersion: string | null };
  /** De bestaande Training Engine. */
  training: WorkflowDeps;
  /** Hooguit zoveel AI-taken tegelijk (voorbereiding en productie). */
  concurrency?: number;
  log?: (entry: LearningLineWorkflowLogEntry) => void;
}

export const DEFAULT_CONCURRENCY = 4;

export type LearningLineRejection =
  | "invalid_input"
  | "input_gate"
  | "privacy_blocked"
  | "not_found"
  | "invalid_state"
  | "stale_revision"
  | "acknowledgement_required"
  | "modules_not_prepared"
  | "scope_required"
  | "sources_missing"
  | "source_invalid"
  | "not_ready"
  | "provider_error"
  | "invalid_output"
  | "persistence_error";

export interface LearningLineWorkflowLogEntry {
  event: "certum.learning_line_workflow";
  action: string;
  outcome: "ok" | "rejected" | "partial";
  reason?: LearningLineRejection;
  errorKind?: string;
  modules?: number;
  failed?: number;
}

export type PrivacyFlag = { category: PreflightCategory; text: string };

/** Een concreet probleem tijdens een automatische stap (alleen codes, nooit inhoud). */
export interface ProductionIssue {
  moduleId: ModuleId;
  step: "input" | "analysis" | "direction" | "blueprint" | "plan" | "sources" | "block" | "frame";
  plannedBlockId?: string;
  reason: string;
}

export type LearningLineResult =
  | { status: "ok"; view: LearningLineView; issues?: ProductionIssue[] }
  | { status: "rejected"; reason: LearningLineRejection; moduleId?: ModuleId; categories?: PreflightCategory[]; flagged?: PrivacyFlag[]; view?: LearningLineView };

export type StartLearningLineResult =
  | { status: "created"; learningLineId: string; result: LearningLineResult }
  | { status: "rejected"; reason: LearningLineRejection; categories?: PreflightCategory[]; flagged?: PrivacyFlag[] };

export type LearningLineStatus = "design_missing" | "preparing" | "gate1" | "producing" | "gate2" | "package_approved";

export const LEARNING_LINE_STATUS_LABEL: Record<LearningLineStatus, string> = {
  design_missing: "Ontwerp nog niet gemaakt",
  preparing: "Modules worden voorbereid",
  gate1: "Gate 1 · ontwerp, Blueprints, plannen en bronnen",
  producing: "Productie van de inhoud",
  gate2: "Gate 2 · eindcontrole",
  package_approved: "Eindpakket goedgekeurd",
};

/** Bibliotheek voor bronvoorstellen: geen synthetische testbronnen (die horen niet in een echte leerlijn). */
export function proposalLibrary(library: LibrarySource[]): LibrarySource[] {
  return library.filter((l) => !/synthetisch/i.test(l.fields.title));
}

export const GATE1_SOURCE_STATEMENT = "Ik heb de getoonde bronnen en passages gecontroleerd en wil ze gebruiken voor deze leerlijn.";

export interface ModuleInputCheck {
  status: "safe" | "review_required" | "blocked";
  findings: { id: string; category: PreflightCategory; label: string; severity: "blocked" | "review_required"; text: string }[];
}

export type ModuleBlocker = "input_review" | "input_blocked" | "analysis_not_ready" | null;

export interface ModuleGateView {
  moduleId: ModuleId;
  sequence: number;
  title: string;
  training: { id: string; code: string; stageLabel: string; ready: boolean } | null;
  blocker: ModuleBlocker;
  /** Alleen bij `input_review`/`input_blocked`: de bevindingen in de (synthetische) module-invoer. */
  inputCheck: ModuleInputCheck | null;
  direction: { id: string; title: string; focus: string; routePolicy: string } | null;
  blueprint: {
    revisionId: string;
    approved: boolean;
    title: string;
    learningGoal: string;
    sourceNeeds: { id: string; question: string; whyNeeded: string; scope: SourceNeedScope | null }[];
    bronRefs: string[];
  } | null;
  plan: { hash: string; approved: boolean; blocks: { sequence: number; certumPhase: string; catalogBlockId: string; purpose: string }[] } | null;
  /** Vóór Gate 1: de door de bronselectie voorgestelde bibliotheek-ids (voorgeselecteerd; de opleider corrigeert). */
  proposedSourceIds: string[];
  /** Na Gate 1: de gevalideerde bronnen van de training. */
  validatedSources: string[];
  content: { total: number; generated: number; approved: number; frame: boolean; complete: boolean } | null;
}

export interface LearningLineView {
  line: { id: string; code: string; title: string; updatedAt: string };
  prompt: string | null;
  status: LearningLineStatus;
  statusLabel: string;
  design: { revisionId: string; revisionNo: number; payload: LearningLineDesign; approved: boolean; source: "mock" | "generated"; plannedMinutes: number } | null;
  modules: ModuleGateView[];
  /** Alleen vóór Gate 1: voorstellen uit de bronnenbibliotheek (eerder door een mens gevalideerd). */
  library: LibrarySource[] | null;
  gate2: { fingerprint: string } | null;
  packages: { certumHash: string; complete: boolean; approved: boolean } | null;
}

const MAX_FEEDBACK = 3000;
const defaultLog = (entry: LearningLineWorkflowLogEntry) => console.info(JSON.stringify(entry));
const limitOf = (deps: LearningLineDeps) => Math.max(1, deps.concurrency ?? DEFAULT_CONCURRENCY);

function reject(deps: LearningLineDeps, action: string, reason: LearningLineRejection, extra: { errorKind?: string; moduleId?: ModuleId } = {}) {
  (deps.log ?? defaultLog)({ event: "certum.learning_line_workflow", action, outcome: "rejected", reason, ...(extra.errorKind && { errorKind: extra.errorKind }) });
  return { status: "rejected" as const, reason, ...(extra.moduleId && { moduleId: extra.moduleId }) };
}

function logOk(deps: LearningLineDeps, action: string, extra: { modules?: number; failed?: number } = {}) {
  (deps.log ?? defaultLog)({ event: "certum.learning_line_workflow", action, outcome: extra.failed ? "partial" : "ok", ...extra });
}

function storageReason(error: unknown): LearningLineRejection {
  if (error instanceof StorageError) {
    if (error.code === "stale_revision") return "stale_revision";
    if (error.code === "not_found") return "not_found";
    if (error.code === "input_gate") return "input_gate";
    if (error.code === "not_current" || error.code === "duplicate_revision") return "invalid_state";
  }
  return "persistence_error";
}

function privacyCheck(text: string): { categories: PreflightCategory[]; flagged: PrivacyFlag[] } | null {
  const result = runPrivacyPreflight(text);
  if (result.status === "safe") return null;
  return {
    categories: [...new Set(result.findings.map((f) => f.category))],
    flagged: result.findings.filter((f) => f.severity === "review_required").map((f) => ({ category: f.category, text: text.slice(f.span.start, f.span.end) })),
  };
}

export function moduleInputCheck(design: LearningLineDesign, spec: ModuleSpec): ModuleInputCheck {
  const text = moduleTrainingInputText(design, spec);
  const result = runPrivacyPreflight(text);
  return {
    status: result.status,
    findings: result.findings.map((f) => ({ id: f.id, category: f.category, label: CATEGORY_INFO[f.category].label, severity: f.severity, text: text.slice(f.span.start, f.span.end) })),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Afgeleide stand
// ---------------------------------------------------------------------------------------------------------------

const currentDesign = (snap: LearningLineSnapshot): LearningLineRevision | null => snap.revisions.at(-1) ?? null;
const eventsOn = (snap: LearningLineSnapshot, revisionId: string) => snap.events.filter((e) => e.revisionId === revisionId);
const lastEvent = (snap: LearningLineSnapshot, revisionId: string) => eventsOn(snap, revisionId).at(-1) ?? null;
const designApproved = (snap: LearningLineSnapshot, revision: LearningLineRevision) =>
  eventsOn(snap, revision.id).some((e) => e.eventType === "design_approved" && e.contentHash === revision.contentHash);
const currentLinks = (snap: LearningLineSnapshot): LearningLineModuleLink[] => {
  const revision = currentDesign(snap);
  return revision ? snap.modules.filter((m) => m.revisionId === revision.id) : [];
};
const proposalFor = (snap: LearningLineSnapshot, trainingId: string, blueprintRevisionId: string): ModulePlanProposal | null =>
  snap.plans.filter((p) => p.trainingId === trainingId && p.blueprintRevisionId === blueprintRevisionId).at(-1) ?? null;

const isReady = (ws: TrainingWorkspaceView | undefined) => !!ws && ws.progress.stage === "training_ready" && ws.content?.package.readiness === "approved";

function toProduction(moduleId: ModuleId, ws: TrainingWorkspaceView | undefined): ModuleProduction {
  if (!ws) return emptyProduction(moduleId);
  const ready = isReady(ws);
  return {
    moduleId,
    trainingCode: ws.training.code,
    stageLabel: ws.progress.label,
    ready,
    learningGoal: ws.blueprint?.approved ? ws.blueprint.payload.learningGoal : null,
    content: ready ? ws.content!.package : null,
    sources: (ws.sources?.items ?? [])
      .filter((i) => i.validated)
      .sort((a, b) => a.sourceId.localeCompare(b.sourceId))
      .map(({ payload: p }) => ({ title: p.title, sourceType: p.sourceType, author: p.author, publisher: p.publisher, publicationDate: p.publicationDate, url: p.url, sourceNeedRefs: p.sourceNeedRefs })),
  };
}

export function learningLineState(snap: LearningLineSnapshot, workspaces: Map<string, TrainingWorkspaceView>): LearningLineState | null {
  const revision = currentDesign(snap);
  if (!revision) return null;
  const links = currentLinks(snap);
  return {
    line: { code: snap.line.code, title: snap.line.title },
    design: revision.payload,
    designRevisionNo: revision.revisionNo,
    designHash: revision.contentHash,
    designApproved: designApproved(snap, revision),
    modules: MODULE_IDS.map((id) => {
      const link = links.find((m) => m.moduleId === id);
      return toProduction(id, link ? workspaces.get(link.trainingId) : undefined);
    }),
  };
}

/** De inhoud die bij Gate 2 wordt goedgekeurd: de current revisions van alle blokken en Start/Einde, per module. */
export function contentFingerprint(snap: LearningLineSnapshot, workspaces: Map<string, TrainingWorkspaceView>): string {
  const parts = currentLinks(snap)
    .sort((a, b) => a.moduleId.localeCompare(b.moduleId))
    .map((link) => {
      const c = workspaces.get(link.trainingId)?.content;
      return {
        moduleId: link.moduleId,
        blocks: c ? Object.entries(c.blockRevisions).map(([k, v]) => [k, v.revisionId]).sort() : [],
        frame: c ? [c.frame.start.revisionId, c.frame.end.revisionId] : [],
      };
    });
  return contentHash(parts);
}

function moduleView(snap: LearningLineSnapshot, design: LearningLineDesign, spec: ModuleSpec, ws: TrainingWorkspaceView | undefined, approved: boolean, library: LibrarySource[]): ModuleGateView {
  const link = currentLinks(snap).find((l) => l.moduleId === spec.id);
  let blocker: ModuleBlocker = null;
  let inputCheck: ModuleInputCheck | null = null;
  if (!link && !approved) {
    const check = moduleInputCheck(design, spec);
    if (check.status !== "safe") {
      inputCheck = check;
      blocker = check.status === "blocked" ? "input_blocked" : "input_review";
    }
  }
  const outcome = ws?.analysis?.outcome;
  if (ws?.analysis && outcome?.outcome !== "ready") blocker = "analysis_not_ready";
  const directionId = ws?.analysis?.selectedDirectionId ?? null;
  const direction = outcome?.outcome === "ready" && directionId ? outcome.trainingDirections.find((d) => d.id === directionId) : undefined;
  const bp = ws?.blueprint;
  const bpPayload = bp?.payload as TrainingBlueprintV2 | undefined;
  const proposal = link && bp ? proposalFor(snap, link.trainingId, bp.revisionId) : null;
  const approvedPlan = ws?.blockPlan?.approved ? ws.blockPlan.payload : null;
  const planPayload = (approvedPlan ?? proposal?.payload ?? null) as BcOnlineBlockPlan | null;
  const content = ws?.content;
  return {
    moduleId: spec.id,
    sequence: spec.sequence,
    title: spec.title,
    training: link && ws ? { id: link.trainingId, code: ws.training.code, stageLabel: ws.progress.label, ready: isReady(ws) } : null,
    blocker,
    inputCheck,
    direction: direction ? { id: direction.id, title: direction.title, focus: direction.focus, routePolicy: (direction as { routePolicy?: string }).routePolicy ?? "" } : null,
    blueprint: bp && bpPayload
      ? {
          revisionId: bp.revisionId,
          approved: bp.approved,
          title: bpPayload.title,
          learningGoal: bpPayload.learningGoal,
          sourceNeeds: bpPayload.sourceNeeds.map((n) => ({ id: n.id, question: n.question, whyNeeded: n.whyNeeded, scope: n.scope ?? null })),
          bronRefs: requiredSourceNeedsFor(bpPayload),
        }
      : null,
    plan: planPayload
      ? {
          hash: approvedPlan ? contentHash(approvedPlan) : proposal!.contentHash,
          approved: !!approvedPlan,
          blocks: [...planPayload.plannedBlocks].sort((a, b) => a.sequence - b.sequence).map((b) => ({ sequence: b.sequence, certumPhase: b.certumPhase, catalogBlockId: b.catalogBlockId, purpose: b.purpose })),
        }
      : null,
    proposedSourceIds: proposal && !approved ? [...new Set(Object.values(proposal.sourceSelection).flat())].filter((id) => library.some((l) => l.libraryId === id)) : [],
    validatedSources: (ws?.sources?.items ?? []).filter((i) => i.validated).map((i) => i.payload.title),
    content: content
      ? {
          total: content.package.blocks.length,
          generated: content.package.blocks.filter((b) => b.body.status === "generated").length,
          approved: content.package.blocks.filter((b) => b.reviewStatus === "approved").length,
          frame: !!content.frame.start.revisionId && !!content.frame.end.revisionId,
          complete: content.review.readiness !== "incomplete" && content.review.staleBlocks === 0,
        }
      : null,
  };
}

const isPrepared = (m: ModuleGateView) => !!m.blueprint && !!m.plan;

export function deriveLearningLineView(snap: LearningLineSnapshot, workspaces: Map<string, TrainingWorkspaceView>, library: LibrarySource[] | null = null): LearningLineView {
  const revision = currentDesign(snap);
  const approved = revision ? designApproved(snap, revision) : false;
  const links = currentLinks(snap);
  const modules = (revision?.payload.modules ?? []).map((spec) => {
    const link = links.find((l) => l.moduleId === spec.id);
    return moduleView(snap, revision!.payload, spec, link ? workspaces.get(link.trainingId) : undefined, approved, library ?? []);
  });
  const state = learningLineState(snap, workspaces);
  const certum = state ? buildCertumPackage(state) : null;
  const certumHash = certum ? contentHash(certum) : null;
  const packageApproved = !!revision && !!certumHash && eventsOn(snap, revision.id).some((e) => e.eventType === "package_approved" && e.eventData.packageHash === certumHash);
  const allContent = modules.length === MODULE_IDS.length && modules.every((m) => m.content?.complete && m.content.frame);
  const status: LearningLineStatus = !revision
    ? "design_missing"
    : !approved
      ? modules.every((m) => isPrepared(m) || m.blocker) ? "gate1" : "preparing"
      : packageApproved
        ? "package_approved"
        : allContent
          ? "gate2"
          : "producing";
  return {
    line: { id: snap.line.id, code: snap.line.code, title: snap.line.title, updatedAt: snap.line.updatedAt.toISOString() },
    prompt: snap.prompt,
    status,
    statusLabel: LEARNING_LINE_STATUS_LABEL[status],
    design: revision
      ? { revisionId: revision.id, revisionNo: revision.revisionNo, payload: revision.payload, approved, source: revision.modelVersion === "mock" ? "mock" : "generated", plannedMinutes: plannedStudyMinutes(revision.payload) }
      : null,
    modules,
    library: revision && !approved ? library ?? [] : null,
    gate2: status === "gate2" ? { fingerprint: contentFingerprint(snap, workspaces) } : null,
    packages: certum && certumHash ? { certumHash, complete: certum.readiness.complete, approved: packageApproved } : null,
  };
}

async function loadAll(db: Db, lineId: string) {
  const snap = await loadLearningLineSnapshot(db, lineId);
  if (!snap) return null;
  const snaps = await loadTrainingRecordSnapshots(db, currentLinks(snap).map((m) => m.trainingId));
  const workspaces = new Map<string, TrainingWorkspaceView>();
  for (const [id, s] of snaps) workspaces.set(id, deriveWorkspace(s));
  return { snap, workspaces };
}

export async function loadLearningLineView(db: Db, lineId: string): Promise<LearningLineView | null> {
  const all = await loadAll(db, lineId);
  if (!all) return null;
  const revision = currentDesign(all.snap);
  const library = revision && !designApproved(all.snap, revision) ? proposalLibrary(await listValidatedSourceLibrary(db)) : null;
  return deriveLearningLineView(all.snap, all.workspaces, library);
}

export async function loadLearningLinePackages(db: Db, lineId: string) {
  const all = await loadAll(db, lineId);
  const state = all && learningLineState(all.snap, all.workspaces);
  if (!state) return null;
  return { certum: buildCertumPackage(state), tom: buildTomPackage(state), skj: buildSkjPackage(state) };
}

async function viewResult(deps: LearningLineDeps, lineId: string, issues?: ProductionIssue[]): Promise<LearningLineResult> {
  const view = await loadLearningLineView(deps.db, lineId);
  if (!view) return { status: "rejected", reason: "not_found" };
  return issues && issues.length > 0 ? { status: "ok", view, issues } : { status: "ok", view };
}

// ---------------------------------------------------------------------------------------------------------------
// Ontwerp
// ---------------------------------------------------------------------------------------------------------------

/** Eén prompt → leerlijn (na preflight en attestatie) → ontwerp → automatische voorbereiding van de zes modules. */
export async function startLearningLine(deps: LearningLineDeps, input: { prompt: string; syntheticDataAttested: boolean }): Promise<StartLearningLineResult> {
  const action = "start_learning_line";
  const prompt = input.prompt.trim();
  if (!prompt || prompt.length > MAX_LEARNING_LINE_PROMPT) return reject(deps, action, "invalid_input");
  const privacy = privacyCheck(prompt);
  if (privacy) return { ...reject(deps, action, "privacy_blocked"), ...privacy };
  if (input.syntheticDataAttested !== true) return reject(deps, action, "input_gate");
  let lineId: string;
  try {
    const textHash = await hashPreflightText(prompt);
    lineId = (await createLearningLine(deps.db, { prompt, acknowledgement: { textHash, acknowledgedFindingIds: [], syntheticDataAttested: true } })).id;
  } catch (error) {
    return reject(deps, action, storageReason(error));
  }
  logOk(deps, action);
  const designed = await generateDesign(deps, lineId);
  return { status: "created", learningLineId: lineId, result: designed.status === "ok" ? await prepareModules(deps, lineId) : designed };
}

/** Het ontwerp (opnieuw) maken. Idempotent; met een openstaande revisie-instructie precies één nieuwe versie. */
export async function generateDesign(deps: LearningLineDeps, lineId: string): Promise<LearningLineResult> {
  const action = "generate_design";
  const snap = await loadLearningLineSnapshot(deps.db, lineId);
  if (!snap?.prompt) return reject(deps, action, "not_found");
  const revision = currentDesign(snap);
  const pending = revision ? lastEvent(snap, revision.id) : null;
  const feedback = pending?.eventType === "needs_revision" && typeof pending.eventData.revisionFeedback === "string" ? pending.eventData.revisionFeedback : null;
  if (revision && !feedback) return viewResult(deps, lineId);
  let design: LearningLineDesign;
  try {
    design = await deps.getArchitect().generate({ prompt: snap.prompt, ...(revision && feedback ? { revision: { previous: revision.payload, feedback } } : {}) });
  } catch (error) {
    const kind = error instanceof AnalysisError ? error.kind : "unknown";
    return reject(deps, action, kind === "invalid-output" ? "invalid_output" : "provider_error", { errorKind: kind });
  }
  try {
    await createLearningLineRevision(deps.db, { learningLineId: lineId, payload: design, ...deps.provenance, expectedCurrentRevisionId: revision?.id ?? null });
  } catch (error) {
    const reason = storageReason(error);
    return reject(deps, action, reason === "persistence_error" ? "invalid_output" : reason);
  }
  logOk(deps, action, { modules: design.modules.length });
  return viewResult(deps, lineId);
}

/** Gate 1, alternatief voor GO: één revisie-instructie voor het hele ontwerp; daarna nieuwe versie en voorbereiding. */
export async function requestDesignRevision(deps: LearningLineDeps, lineId: string, revisionId: string, feedback: string): Promise<LearningLineResult> {
  const action = "request_design_revision";
  const text = feedback.trim();
  if (!text || text.length > MAX_FEEDBACK) return reject(deps, action, "invalid_input");
  const privacy = privacyCheck(text);
  if (privacy) return { ...reject(deps, action, "privacy_blocked"), ...privacy };
  const snap = await loadLearningLineSnapshot(deps.db, lineId);
  const revision = snap && currentDesign(snap);
  if (!snap || !revision) return reject(deps, action, "not_found");
  if (revision.id !== revisionId) return reject(deps, action, "stale_revision");
  if (designApproved(snap, revision)) return reject(deps, action, "invalid_state");
  try {
    await appendLearningLineEvent(deps.db, { learningLineId: lineId, revisionId, eventType: "needs_revision", eventData: { revisionFeedback: text } });
  } catch (error) {
    return reject(deps, action, storageReason(error));
  }
  logOk(deps, action);
  const designed = await generateDesign(deps, lineId);
  return designed.status === "ok" ? prepareModules(deps, lineId) : designed;
}

// ---------------------------------------------------------------------------------------------------------------
// Voorbereiding vóór Gate 1
// ---------------------------------------------------------------------------------------------------------------

/** Systeemvoorstel voor de richting: de eerste `ready`-richting met hetzelfde routebeleid als de ModuleSpec. */
function chooseDirection(ws: TrainingWorkspaceView, spec: ModuleSpec): string | null {
  const outcome = ws.analysis?.outcome;
  if (outcome?.outcome !== "ready") return null;
  const directions = outcome.trainingDirections as { id: string; routePolicy?: string }[];
  return (directions.find((d) => d.routePolicy === spec.routePolicy) ?? directions[0])?.id ?? null;
}

async function workspaceOf(deps: LearningLineDeps, trainingId: string): Promise<TrainingWorkspaceView | null> {
  const snap = await loadTrainingRecordSnapshot(deps.db, trainingId);
  return snap ? deriveWorkspace(snap) : null;
}

async function prepareModule(
  deps: LearningLineDeps,
  lineId: string,
  revision: LearningLineRevision,
  spec: ModuleSpec,
  link: LearningLineModuleLink | undefined,
  plans: ModulePlanProposal[],
  acknowledged: string[],
  library: LibrarySource[],
): Promise<ProductionIssue | null> {
  const issue = (step: ProductionIssue["step"], reason: string): ProductionIssue => ({ moduleId: spec.id, step, reason });
  let trainingId = link?.trainingId;
  if (!trainingId) {
    const text = moduleTrainingInputText(revision.payload, spec);
    const check = moduleInputCheck(revision.payload, spec);
    if (check.status === "blocked") return issue("input", "input_blocked");
    const review = check.findings.filter((f) => f.severity === "review_required").map((f) => f.id);
    if (review.some((id) => !acknowledged.includes(id))) return issue("input", "input_review");
    // De module-invoer is server-side afgeleid van de geattesteerde, synthetische prompt; de attestatie gaat mee.
    const started = await startTraining(deps.training, {
      kind: MODULE_INPUT_KIND,
      text,
      acknowledgement: { textHash: await hashPreflightText(text), acknowledgedFindingIds: review, syntheticDataAttested: true },
    });
    if (started.status !== "created") return issue("input", started.reason);
    try {
      await linkModuleTraining(deps.db, { learningLineId: lineId, moduleId: spec.id, trainingId: started.trainingId, revisionId: revision.id });
    } catch (error) {
      return issue("input", storageReason(error));
    }
    trainingId = started.trainingId;
  }

  let ws = await workspaceOf(deps, trainingId);
  if (!ws) return issue("analysis", "not_found");
  if (!ws.analysis) {
    const analysed = await runAnalysis(deps.training, trainingId);
    if (analysed.status !== "ok") return issue("analysis", analysed.reason);
    ws = analysed.workspace;
  }
  if (ws.analysis?.outcome.outcome !== "ready") return issue("analysis", "analysis_not_ready");
  if (!ws.analysis.selectedDirectionId) {
    const directionId = chooseDirection(ws, spec);
    if (!directionId) return issue("direction", "no_direction");
    const selected = await selectDirection(deps.training, trainingId, ws.analysis.revisionId, directionId);
    if (selected.status !== "ok") return issue("direction", selected.reason);
    ws = selected.workspace;
  }
  if (!ws.blueprint) {
    const generated = await generateBlueprint(deps.training, trainingId);
    if (generated.status !== "ok") return issue("blueprint", generated.reason);
    ws = generated.workspace;
  }
  if (!ws.blueprint || ws.blueprint.approved) return null;
  if (proposalFor({ plans } as LearningLineSnapshot, trainingId, ws.blueprint.revisionId)) return null;
  const bp = ws.blueprint.payload as TrainingBlueprintV2;
  const request: SourceSelectionRequest = {
    training: { title: bp.title, learningGoal: bp.learningGoal },
    sourceNeeds: bp.sourceNeeds.map((n) => ({ id: n.id, question: n.question, whyNeeded: n.whyNeeded })),
    library: library.map((l) => ({ libraryId: l.libraryId, title: l.fields.title, publisher: l.fields.publisher, relevantContent: l.fields.relevantContent })),
  };
  // Plan en bronselectie zijn onafhankelijk: tegelijk. Een mislukte selectie is geen blokkade (de opleider kiest dan zelf).
  const [plan, selection] = await Promise.all([
    runProvisionalBlockPlanFlow(ws.blueprint.payload, { getService: deps.training.getBlockPlanService }),
    deps
      .getSourceSelector()
      .select(request)
      .then((s) => sanitizeSelection(s, request))
      .catch(() => null),
  ]);
  if (plan.status !== "block_plan") return issue("plan", plan.reason);
  try {
    await saveModulePlanProposal(deps.db, {
      learningLineId: lineId,
      moduleId: spec.id,
      trainingId,
      blueprintRevisionId: ws.blueprint.revisionId,
      ...deps.training.provenance.blockPlan,
      payload: plan.blockPlan,
      sourceSelection: selection ?? {},
    });
  } catch (error) {
    return issue("plan", storageReason(error));
  }
  return selection ? null : issue("sources", "source_selection_failed");
}

/**
 * Automatische voorbereiding vóór Gate 1, per module begrensd parallel. Idempotent: wat er al is, blijft. Problemen
 * zijn per module (uitzonderingspad); andere modules gaan door. `acknowledgedFindings`: alleen bij het uitzonderingspad
 * van een module-invoer met review-bevindingen.
 */
export async function prepareModules(deps: LearningLineDeps, lineId: string, acknowledgedFindings: Partial<Record<ModuleId, string[]>> = {}): Promise<LearningLineResult> {
  const action = "prepare_modules";
  const snap = await loadLearningLineSnapshot(deps.db, lineId);
  const revision = snap && currentDesign(snap);
  if (!snap || !revision) return reject(deps, action, "not_found");
  if (designApproved(snap, revision)) return viewResult(deps, lineId);
  const links = currentLinks(snap);
  const library = proposalLibrary(await listValidatedSourceLibrary(deps.db));
  const results = await mapWithConcurrency(revision.payload.modules, limitOf(deps), (spec) =>
    prepareModule(deps, lineId, revision, spec, links.find((l) => l.moduleId === spec.id), snap.plans, acknowledgedFindings[spec.id] ?? [], library).catch(
      (): ProductionIssue => ({ moduleId: spec.id, step: "input", reason: "unexpected" }),
    ),
  );
  const issues = results.filter((r): r is ProductionIssue => r !== null);
  logOk(deps, action, { modules: revision.payload.modules.length, failed: issues.length });
  return viewResult(deps, lineId, issues);
}

// ---------------------------------------------------------------------------------------------------------------
// Gate 1
// ---------------------------------------------------------------------------------------------------------------

export interface Gate1SourceFields {
  title: string;
  sourceType: (typeof SOURCE_KINDS)[number];
  author: string | null;
  publisher: string | null;
  publicationDate: string | null;
  url: string | null;
  relevantContent: string;
}

export interface Gate1ModuleDecision {
  /** De Blueprint-revision en de planhash die de opleider zag. */
  blueprintRevisionId: string;
  planHash: string;
  scopes: Record<string, SourceNeedScope>;
  librarySourceIds: string[];
  extraSources: Gate1SourceFields[];
}

export interface Gate1Input {
  revisionId: string;
  syntheticDataAttested: boolean;
  sourcesValidated: boolean;
  modules: Partial<Record<ModuleId, Gate1ModuleDecision>>;
}

const sameSource = (a: Pick<CertumSource, "title" | "relevantContent">, b: Pick<CertumSource, "title" | "relevantContent">) =>
  a.title.trim() === b.title.trim() && a.relevantContent.trim() === b.relevantContent.trim();

/**
 * Gate 1 = één GO. Eerst alle controles zonder schrijven; daarna per module de afzonderlijke besluiten in de bestaande
 * Training Records: scopes (nieuwe Blueprint-revision) → Blueprint approved → het voorlopige plan (zelfde inhoud en
 * hash) als Block Plan-revision → approved → bronnen toevoegen en valideren. Tot slot `design_approved` op de leerlijn.
 * Herhaalbaar: wat al is vastgelegd, wordt overgeslagen.
 */
export async function approveGate1(deps: LearningLineDeps, lineId: string, input: Gate1Input): Promise<LearningLineResult> {
  const action = "approve_gate1";
  const all = await loadAll(deps.db, lineId);
  const revision = all && currentDesign(all.snap);
  if (!all || !revision) return reject(deps, action, "not_found");
  if (revision.id !== input.revisionId) return reject(deps, action, "stale_revision");
  if (designApproved(all.snap, revision)) return viewResult(deps, lineId);
  if (input.syntheticDataAttested !== true || input.sourcesValidated !== true) return reject(deps, action, "input_gate");
  const library = proposalLibrary(await listValidatedSourceLibrary(deps.db));
  const links = currentLinks(all.snap);

  // 1. Controleren, zonder te schrijven.
  type Plan = { spec: ModuleSpec; trainingId: string; ws: TrainingWorkspaceView; decision: Gate1ModuleDecision; proposal: ModulePlanProposal | null; sources: Omit<CertumSource, "version">[] };
  const plans: Plan[] = [];
  for (const spec of revision.payload.modules) {
    const link = links.find((l) => l.moduleId === spec.id);
    const ws = link && all.workspaces.get(link.trainingId);
    const decision = input.modules[spec.id];
    if (!link || !ws?.blueprint || !decision) return reject(deps, action, "modules_not_prepared", { moduleId: spec.id });
    const bp = ws.blueprint.payload as TrainingBlueprintV2;
    let proposal: ModulePlanProposal | null = null;
    if (!ws.blueprint.approved) {
      if (ws.blueprint.revisionId !== decision.blueprintRevisionId) return reject(deps, action, "stale_revision", { moduleId: spec.id });
      proposal = proposalFor(all.snap, link.trainingId, decision.blueprintRevisionId);
      if (!proposal) return reject(deps, action, "modules_not_prepared", { moduleId: spec.id });
      if (proposal.contentHash !== decision.planHash) return reject(deps, action, "stale_revision", { moduleId: spec.id });
      const ids = bp.sourceNeeds.map((n) => n.id);
      if (ids.some((id) => decision.scopes[id] !== "professional" && decision.scopes[id] !== "organisation_specific")) return reject(deps, action, "scope_required", { moduleId: spec.id });
    } else if (!ws.blockPlan?.approved) {
      // Hervatten na een onderbroken GO: het voorlopige plan hoort bij de Blueprint-revision vóór de scopes.
      proposal = all.snap.plans.filter((p) => p.trainingId === link.trainingId).at(-1) ?? null;
      if (!proposal || proposal.contentHash !== decision.planHash) return reject(deps, action, "stale_revision", { moduleId: spec.id });
    }
    const scoped: TrainingBlueprintV2 = ws.blueprint.approved ? bp : { ...bp, sourceNeeds: bp.sourceNeeds.map((n) => ({ ...n, scope: decision.scopes[n.id] })) };
    const required = requiredSourceNeedsFor(scoped).slice(0, 3);
    const sources: Omit<CertumSource, "version">[] = [];
    for (const id of decision.librarySourceIds) {
      const entry = library.find((l) => l.libraryId === id);
      if (!entry) return reject(deps, action, "source_invalid", { moduleId: spec.id });
      // De sourceNeeds waarvoor de bronselectie deze passage voorstelde; handmatig gekozen: alle Bron-refs.
      const selectedFor = Object.entries(proposal?.sourceSelection ?? {}).filter(([, ids]) => ids.includes(id)).map(([sn]) => sn).filter((sn) => required.includes(sn));
      sources.push({ ...entry.fields, sourceNeedRefs: selectedFor.length > 0 ? selectedFor : required });
    }
    for (const extra of decision.extraSources) {
      const candidate = { ...extra, sourceNeedRefs: required };
      if (!extra.title?.trim() || !extra.relevantContent?.trim() || relevantContentIssue(candidate)) return reject(deps, action, "source_invalid", { moduleId: spec.id });
      sources.push(candidate);
    }
    const alreadyValidated = (ws.sources?.items ?? []).filter((i) => i.validated).length;
    if (required.length > 0 && blockingSourceNeedsFor(scoped).length > 0 && sources.length + alreadyValidated === 0) {
      return reject(deps, action, "sources_missing", { moduleId: spec.id });
    }
    plans.push({ spec, trainingId: link.trainingId, ws, decision, proposal, sources });
  }

  // 2. Vastleggen: per module de afzonderlijke besluiten.
  try {
    for (const p of plans) {
      let ws = p.ws;
      if (!ws.blueprint!.approved) {
        const scoped = await saveSourceNeedScopes(deps.training, p.trainingId, ws.blueprint!.revisionId, p.decision.scopes);
        if (scoped.status !== "ok") return reject(deps, action, "invalid_state", { moduleId: p.spec.id, errorKind: scoped.reason });
        const approved = await decideRevision(deps.training, p.trainingId, scoped.workspace.blueprint!.revisionId, "approved");
        if (approved.status !== "ok") return reject(deps, action, "invalid_state", { moduleId: p.spec.id, errorKind: approved.reason });
        ws = approved.workspace;
      }
      if (!ws.blockPlan?.approved && p.proposal) {
        const snap = (await loadTrainingRecordSnapshot(deps.db, p.trainingId))!;
        const up = approvedUpstream(snap)!;
        const existing = currentRevision(snap, "block_plan");
        const existingId = existing?.id ?? null;
        const plan = builtOn(existing, [up.blueprint.id])
          ? existing!
          : await createArtifactRevision(deps.db, {
              trainingId: p.trainingId,
              artifactType: "block_plan",
              contractVersion: BC_ONLINE_BLOCK_PLAN_VERSION,
              promptVersion: p.proposal.promptVersion,
              modelVersion: p.proposal.modelVersion,
              payload: p.proposal.payload,
              basedOnRevisionIds: [up.blueprint.id],
              expectedCurrentRevisionId: existingId,
            });
        if (plan.contentHash !== p.proposal.contentHash) return reject(deps, action, "stale_revision", { moduleId: p.spec.id });
        const approved = await decideRevision(deps.training, p.trainingId, plan.id, "approved");
        if (approved.status !== "ok") return reject(deps, action, "invalid_state", { moduleId: p.spec.id, errorKind: approved.reason });
        ws = approved.workspace;
      }
      const present = ws.sources?.items ?? [];
      for (const source of p.sources) {
        const existing = present.find((i) => sameSource(i.payload, source));
        if (existing?.validated) continue;
        let revisionId = existing?.revisionId;
        if (!revisionId) {
          const added = await addSource(deps.training, p.trainingId, source);
          if (added.status !== "ok") return reject(deps, action, "source_invalid", { moduleId: p.spec.id, errorKind: added.issues?.join(",") ?? added.reason });
          revisionId = added.workspace.sources!.items.at(-1)!.revisionId;
        }
        const validated = await validateSource(deps.training, p.trainingId, revisionId, true);
        if (validated.status !== "ok") return reject(deps, action, "source_invalid", { moduleId: p.spec.id, errorKind: validated.reason });
      }
    }
    await appendLearningLineEvent(deps.db, {
      learningLineId: lineId,
      revisionId: revision.id,
      eventType: "design_approved",
      eventData: { syntheticDataAttested: true, sourceValidationStatement: GATE1_SOURCE_STATEMENT, modules: plans.length },
    });
  } catch (error) {
    return reject(deps, action, storageReason(error));
  }
  logOk(deps, action, { modules: plans.length });
  return viewResult(deps, lineId);
}

// ---------------------------------------------------------------------------------------------------------------
// Productie na Gate 1
// ---------------------------------------------------------------------------------------------------------------

/**
 * Alle blokinhoud en Start/Einde, begrensd parallel over alle modules en blokken. Blokken zijn onafhankelijk zolang er
 * nog geen goedgekeurde eerdere inhoud is (die ontstaat pas bij Gate 2). Geen automatische retry: een mislukt blok blijft
 * open; Start/Einde van die module volgen bij een expliciete hervatting.
 */
export async function produceContent(deps: LearningLineDeps, lineId: string): Promise<LearningLineResult> {
  const action = "produce_content";
  const snap = await loadLearningLineSnapshot(deps.db, lineId);
  const revision = snap && currentDesign(snap);
  if (!snap || !revision) return reject(deps, action, "not_found");
  if (!designApproved(snap, revision)) return reject(deps, action, "invalid_state");
  const links = currentLinks(snap);

  const tasks: { moduleId: ModuleId; trainingId: string; plannedBlockId: string; expected: string | null }[] = [];
  for (const link of links) {
    const tsnap = await loadTrainingRecordSnapshot(deps.db, link.trainingId);
    const up = tsnap && approvedUpstream(tsnap);
    if (!tsnap || !up?.plan || !up.planApproved) return reject(deps, action, "invalid_state", { moduleId: link.moduleId });
    for (const planned of (up.plan.payload as BcOnlineBlockPlan).plannedBlocks) {
      const current = currentRevision(tsnap, "block_content", planned.id);
      const expected = current?.id ?? null;
      if (!builtOn(current, [up.blueprint.id, up.plan.id])) tasks.push({ moduleId: link.moduleId, trainingId: link.trainingId, plannedBlockId: planned.id, expected });
    }
  }
  const blockResults = await mapWithConcurrency(tasks, limitOf(deps), async (t): Promise<ProductionIssue | null> => {
    const r = await regenerateBlock(deps.training, t.trainingId, t.plannedBlockId, t.expected).catch(() => ({ status: "rejected" as const, reason: "unexpected" }));
    return r.status === "ok" ? null : ({ moduleId: t.moduleId, step: "block", plannedBlockId: t.plannedBlockId, reason: r.reason } satisfies ProductionIssue);
  });
  const issues: ProductionIssue[] = blockResults.filter((r): r is ProductionIssue => r !== null);
  // Start/Einde alleen voor modules zonder open blokfout: generateContent maakt dan alleen nog het frame.
  const failed = new Set(issues.map((i) => i.moduleId));
  const frameResults = await mapWithConcurrency(
    links.filter((l) => !failed.has(l.moduleId)),
    limitOf(deps),
    async (link): Promise<ProductionIssue | null> => {
      const r = await generateContent(deps.training, link.trainingId).catch(() => ({ status: "rejected" as const, reason: "unexpected" }));
      if (r.status !== "ok") return { moduleId: link.moduleId, step: "frame", reason: r.reason } satisfies ProductionIssue;
      return r.failedBlockId ? ({ moduleId: link.moduleId, step: "block", plannedBlockId: r.failedBlockId, reason: "invalid_output" } satisfies ProductionIssue) : null;
    },
  );
  issues.push(...frameResults.filter((r): r is ProductionIssue => r !== null));
  logOk(deps, action, { modules: links.length, failed: issues.length });
  return viewResult(deps, lineId, issues);
}

// ---------------------------------------------------------------------------------------------------------------
// Gate 2
// ---------------------------------------------------------------------------------------------------------------

/**
 * Gate 2 = één GO over de inhoud die de opleider zag (vingerafdruk van alle current revisions). Per module een
 * `approved`-event per blok, Start en Einde; daarna `package_approved` op de hash van het resulterende Certum Package.
 */
export async function approveGate2(deps: LearningLineDeps, lineId: string, fingerprint: string): Promise<LearningLineResult> {
  const action = "approve_gate2";
  const all = await loadAll(deps.db, lineId);
  const revision = all && currentDesign(all.snap);
  if (!all || !revision) return reject(deps, action, "not_found");
  const view = deriveLearningLineView(all.snap, all.workspaces);
  if (view.status === "package_approved") return viewResult(deps, lineId);
  if (view.status !== "gate2" || !view.gate2) return reject(deps, action, "not_ready");
  if (view.gate2.fingerprint !== fingerprint) return reject(deps, action, "stale_revision");
  try {
    for (const link of currentLinks(all.snap)) {
      const ws = all.workspaces.get(link.trainingId)!;
      const c = ws.content!;
      const pending = [
        ...c.package.blocks.filter((b) => b.reviewStatus !== "approved").map((b) => c.blockRevisions[b.plannedBlockId].revisionId),
        ...(c.frame.start.approved ? [] : [c.frame.start.revisionId]),
        ...(c.frame.end.approved ? [] : [c.frame.end.revisionId]),
      ];
      for (const revisionId of pending) {
        const r = await decideRevision(deps.training, link.trainingId, revisionId, "approved");
        if (r.status !== "ok") return reject(deps, action, "invalid_state", { moduleId: link.moduleId, errorKind: r.reason });
      }
    }
    const after = await loadAll(deps.db, lineId);
    const state = after && learningLineState(after.snap, after.workspaces);
    const certum = state && buildCertumPackage(state);
    if (!certum?.readiness.complete) return reject(deps, action, "not_ready");
    await appendLearningLineEvent(deps.db, { learningLineId: lineId, revisionId: revision.id, eventType: "package_approved", eventData: { packageHash: contentHash(certum), contentFingerprint: fingerprint } });
  } catch (error) {
    return reject(deps, action, storageReason(error));
  }
  logOk(deps, action, { modules: MODULE_IDS.length });
  return viewResult(deps, lineId);
}
