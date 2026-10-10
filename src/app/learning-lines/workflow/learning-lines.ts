import { buildSkjPackage } from "@/modules/accreditation";
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
} from "@/modules/learning-lines";
import { CATEGORY_INFO, hashPreflightText, runPrivacyPreflight, type PreflightCategory } from "@/modules/privacy";
import { AnalysisError } from "@/services/analysis/errors";
import type { LearningLineArchitectService } from "@/services/learning-line/services";
import { contentHash } from "@/services/storage/canonical-json";
import type { Db } from "@/services/storage/db";
import {
  appendLearningLineEvent,
  createLearningLine,
  createLearningLineRevision,
  linkModuleTraining,
  loadLearningLineSnapshot,
  MAX_LEARNING_LINE_PROMPT,
  type LearningLineRevision,
  type LearningLineSnapshot,
} from "@/services/storage/learning-line-record";
import { StorageError, loadTrainingRecordSnapshots } from "@/services/storage/training-record";
import { deriveWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { startTraining, type WorkflowDeps } from "../../trainings/workflow/persisted-workflow";

/*
 * Leerlijn Engine V1: één prompt → leerlijn van zes modules → (Gate 1) → zes trainingen in de bestaande keten →
 * (Gate 2) → Certum-, Tom- en SKJ-pakket. Server-authoritative: acties nemen alleen ids, keuzes en eigen tekst aan;
 * de server laadt alles uit Postgres.
 *
 * - Gate 1 = het leerlijnontwerp goedkeuren (GO) of één gerichte revisie-instructie voor het geheel. Bij GO bevestigt de
 *   opleider ook de synthetic_only-attestatie en de review-bevindingen van de Privacy Preflight op de zes
 *   module-invoerteksten (gebonden aan de hash van exact die teksten).
 * - Productie: iedere ModuleSpec wordt via `startTraining` een gewone training (zelfde preflight, policy en analyse).
 *   Daarna gelden de bestaande menselijke stappen per training; die worden hier niet overgeslagen.
 * - Gate 2 = het eindpakket goedkeuren, gebonden aan de hash van het Certum Package; alleen als alle zes modules
 *   Training gereed zijn.
 * - Logt alleen metadata: nooit prompt, aanwijzing, ontwerp of moduletekst.
 */

export interface LearningLineDeps {
  db: Db;
  getArchitect: () => LearningLineArchitectService;
  provenance: { promptVersion: string | null; modelVersion: string | null };
  /** De bestaande Training Engine (instroom en analyse per module). */
  training: WorkflowDeps;
  log?: (entry: LearningLineWorkflowLogEntry) => void;
}

export type LearningLineRejection =
  | "invalid_input"
  | "input_gate"
  | "privacy_blocked"
  | "not_found"
  | "invalid_state"
  | "stale_revision"
  | "acknowledgement_required"
  | "not_ready"
  | "provider_error"
  | "invalid_output"
  | "production_failed"
  | "persistence_error";

export interface LearningLineWorkflowLogEntry {
  event: "certum.learning_line_workflow";
  action: string;
  outcome: "ok" | "rejected";
  reason?: LearningLineRejection;
  errorKind?: string;
  modules?: number;
}

/** Trainer-diagnose bij een privacyblokkade: alleen de gemarkeerde review-span(s) uit de eigen tekst, nooit gelogd. */
export type PrivacyFlag = { category: PreflightCategory; text: string };

export type LearningLineResult =
  | { status: "ok"; view: LearningLineView }
  | { status: "rejected"; reason: LearningLineRejection; categories?: PreflightCategory[]; flagged?: PrivacyFlag[]; view?: LearningLineView };

export type StartLearningLineResult =
  | { status: "created"; learningLineId: string; result: LearningLineResult }
  | { status: "rejected"; reason: LearningLineRejection; categories?: PreflightCategory[]; flagged?: PrivacyFlag[] };

export type LearningLineStatus = "design_missing" | "design_review" | "design_approved" | "in_production" | "package_ready" | "package_approved";

export const LEARNING_LINE_STATUS_LABEL: Record<LearningLineStatus, string> = {
  design_missing: "Ontwerp nog niet gemaakt",
  design_review: "Gate 1 · ontwerp ter beoordeling",
  design_approved: "Ontwerp goedgekeurd · productie nog niet gestart",
  in_production: "In productie",
  package_ready: "Gate 2 · eindpakket ter beoordeling",
  package_approved: "Eindpakket goedgekeurd",
};

export interface ModuleInputCheck {
  moduleId: ModuleId;
  status: "safe" | "review_required" | "blocked";
  /** Bevindingen in de (door de architect gegenereerde, synthetische) module-invoertekst; alleen voor de eigen browser. */
  findings: { id: string; category: PreflightCategory; label: string; severity: "blocked" | "review_required"; text: string }[];
}

export interface LearningLineView {
  line: { id: string; code: string; title: string; updatedAt: string };
  prompt: string | null;
  status: LearningLineStatus;
  statusLabel: string;
  design: { revisionId: string; revisionNo: number; payload: LearningLineDesign; approved: boolean; source: "mock" | "generated"; plannedMinutes: number } | null;
  /** Alleen vóór Gate 1: de preflight van de zes module-invoerteksten. */
  gate1: { moduleInputs: ModuleInputCheck[] } | null;
  modules: { moduleId: ModuleId; sequence: number; title: string; training: { id: string; code: string; stageLabel: string; ready: boolean } | null }[];
  production: { started: number; ready: number; total: number };
  packages: { certumHash: string; complete: boolean; approved: boolean } | null;
}

const MAX_FEEDBACK = 3000;
const defaultLog = (entry: LearningLineWorkflowLogEntry) => console.info(JSON.stringify(entry));

function reject(deps: LearningLineDeps, action: string, reason: LearningLineRejection, extra: { errorKind?: string } = {}) {
  (deps.log ?? defaultLog)({ event: "certum.learning_line_workflow", action, outcome: "rejected", reason, ...extra });
  return { status: "rejected" as const, reason };
}

function okLog(deps: LearningLineDeps, action: string, extra: { modules?: number } = {}) {
  (deps.log ?? defaultLog)({ event: "certum.learning_line_workflow", action, outcome: "ok", ...extra });
}

function storageReason(error: unknown): LearningLineRejection {
  if (error instanceof StorageError) {
    if (error.code === "stale_revision") return "stale_revision";
    if (error.code === "not_found") return "not_found";
    if (error.code === "input_gate") return "input_gate";
    if (error.code === "not_current" || error.code === "duplicate_revision") return "invalid_state";
    return "persistence_error";
  }
  return "persistence_error";
}

/** De Privacy Preflight op eigen tekst (prompt of aanwijzing). V1: alleen een volledig `safe` tekst gaat door. */
function privacyCheck(text: string): { categories: PreflightCategory[]; flagged: PrivacyFlag[] } | null {
  const result = runPrivacyPreflight(text);
  if (result.status === "safe") return null;
  return {
    categories: [...new Set(result.findings.map((f) => f.category))],
    flagged: result.findings.filter((f) => f.severity === "review_required").map((f) => ({ category: f.category, text: text.slice(f.span.start, f.span.end) })),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Afgeleide stand
// ---------------------------------------------------------------------------------------------------------------

const current = (snap: LearningLineSnapshot): LearningLineRevision | null => snap.revisions.at(-1) ?? null;
const eventsOn = (snap: LearningLineSnapshot, revisionId: string) => snap.events.filter((e) => e.revisionId === revisionId);
const lastEvent = (snap: LearningLineSnapshot, revisionId: string) => eventsOn(snap, revisionId).at(-1) ?? null;
const designApprovedEvent = (snap: LearningLineSnapshot, revision: LearningLineRevision) =>
  eventsOn(snap, revision.id).find((e) => e.eventType === "design_approved" && e.contentHash === revision.contentHash) ?? null;

export function moduleInputChecks(design: LearningLineDesign): ModuleInputCheck[] {
  return design.modules.map((m) => {
    const text = moduleTrainingInputText(design, m);
    const result = runPrivacyPreflight(text);
    return {
      moduleId: m.id,
      status: result.status,
      findings: result.findings.map((f) => ({ id: f.id, category: f.category, label: CATEGORY_INFO[f.category].label, severity: f.severity, text: text.slice(f.span.start, f.span.end) })),
    };
  });
}

function toProduction(moduleId: ModuleId, ws: TrainingWorkspaceView | undefined): ModuleProduction {
  if (!ws) return emptyProduction(moduleId);
  const ready = ws.progress.stage === "training_ready" && ws.content?.package.readiness === "approved";
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

/** De stand waaruit de pakketten worden afgeleid; null zonder ontwerp. */
export function learningLineState(snap: LearningLineSnapshot, workspaces: Map<string, TrainingWorkspaceView>): LearningLineState | null {
  const revision = current(snap);
  if (!revision) return null;
  return {
    line: { code: snap.line.code, title: snap.line.title },
    design: revision.payload,
    designRevisionNo: revision.revisionNo,
    designHash: revision.contentHash,
    designApproved: designApprovedEvent(snap, revision) !== null,
    modules: MODULE_IDS.map((id) => {
      const link = snap.modules.find((m) => m.moduleId === id);
      return toProduction(id, link ? workspaces.get(link.trainingId) : undefined);
    }),
  };
}

export function deriveLearningLineView(snap: LearningLineSnapshot, workspaces: Map<string, TrainingWorkspaceView>): LearningLineView {
  const revision = current(snap);
  const state = learningLineState(snap, workspaces);
  const approved = state?.designApproved ?? false;
  const certum = state ? buildCertumPackage(state) : null;
  const certumHash = certum ? contentHash(certum) : null;
  const packageApproved =
    !!revision && !!certumHash && eventsOn(snap, revision.id).some((e) => e.eventType === "package_approved" && e.eventData.packageHash === certumHash);
  const modules = (revision?.payload.modules ?? []).map((m) => {
    const link = snap.modules.find((l) => l.moduleId === m.id);
    const ws = link ? workspaces.get(link.trainingId) : undefined;
    const p = state?.modules.find((x) => x.moduleId === m.id);
    return {
      moduleId: m.id,
      sequence: m.sequence,
      title: m.title,
      training: link && ws ? { id: link.trainingId, code: ws.training.code, stageLabel: ws.progress.label, ready: p?.ready ?? false } : null,
    };
  });
  const started = modules.filter((m) => m.training).length;
  const ready = modules.filter((m) => m.training?.ready).length;
  const status: LearningLineStatus = !revision
    ? "design_missing"
    : !approved
      ? "design_review"
      : packageApproved
        ? "package_approved"
        : ready === MODULE_IDS.length
          ? "package_ready"
          : started > 0
            ? "in_production"
            : "design_approved";
  return {
    line: { id: snap.line.id, code: snap.line.code, title: snap.line.title, updatedAt: snap.line.updatedAt.toISOString() },
    prompt: snap.prompt,
    status,
    statusLabel: LEARNING_LINE_STATUS_LABEL[status],
    design: revision
      ? { revisionId: revision.id, revisionNo: revision.revisionNo, payload: revision.payload, approved, source: revision.modelVersion === "mock" ? "mock" : "generated", plannedMinutes: plannedStudyMinutes(revision.payload) }
      : null,
    gate1: revision && !approved ? { moduleInputs: moduleInputChecks(revision.payload) } : null,
    modules,
    production: { started, ready, total: MODULE_IDS.length },
    packages: certum && certumHash ? { certumHash, complete: certum.readiness.complete, approved: packageApproved } : null,
  };
}

async function loadAll(db: Db, lineId: string): Promise<{ snap: LearningLineSnapshot; workspaces: Map<string, TrainingWorkspaceView> } | null> {
  const snap = await loadLearningLineSnapshot(db, lineId);
  if (!snap) return null;
  const snaps = await loadTrainingRecordSnapshots(db, snap.modules.map((m) => m.trainingId));
  const workspaces = new Map<string, TrainingWorkspaceView>();
  for (const [id, s] of snaps) workspaces.set(id, deriveWorkspace(s));
  return { snap, workspaces };
}

export async function loadLearningLineView(db: Db, lineId: string): Promise<LearningLineView | null> {
  const all = await loadAll(db, lineId);
  return all ? deriveLearningLineView(all.snap, all.workspaces) : null;
}

/** De drie pakketten, afgeleid uit de opgeslagen stand. Deterministisch; niets wordt opgeslagen. */
export async function loadLearningLinePackages(db: Db, lineId: string) {
  const all = await loadAll(db, lineId);
  const state = all && learningLineState(all.snap, all.workspaces);
  if (!state) return null;
  return { certum: buildCertumPackage(state), tom: buildTomPackage(state), skj: buildSkjPackage(state) };
}

async function viewResult(deps: LearningLineDeps, lineId: string): Promise<LearningLineResult> {
  const view = await loadLearningLineView(deps.db, lineId);
  return view ? { status: "ok", view } : { status: "rejected", reason: "not_found" };
}

// ---------------------------------------------------------------------------------------------------------------
// Acties
// ---------------------------------------------------------------------------------------------------------------

/** Eén prompt → leerlijn (na preflight en attestatie) → eerste ontwerp. */
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
  okLog(deps, action);
  return { status: "created", learningLineId: lineId, result: await generateDesign(deps, lineId) };
}

/**
 * Het ontwerp (opnieuw) maken. Idempotent: zonder ontwerp het eerste; met een openstaande revisie-instructie op de
 * current versie precies één nieuwe versie; anders niets. Geen automatische retry.
 */
export async function generateDesign(deps: LearningLineDeps, lineId: string): Promise<LearningLineResult> {
  const action = "generate_design";
  const snap = await loadLearningLineSnapshot(deps.db, lineId);
  if (!snap?.prompt) return reject(deps, action, "not_found");
  const revision = current(snap);
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
    return reject(deps, action, storageReason(error) === "persistence_error" ? "invalid_output" : storageReason(error));
  }
  okLog(deps, action, { modules: design.modules.length });
  return viewResult(deps, lineId);
}

/** Gate 1, alternatief voor GO: één gerichte revisie-instructie voor het hele ontwerp, daarna één nieuwe versie. */
export async function requestDesignRevision(deps: LearningLineDeps, lineId: string, revisionId: string, feedback: string): Promise<LearningLineResult> {
  const action = "request_design_revision";
  const text = feedback.trim();
  if (!text || text.length > MAX_FEEDBACK) return reject(deps, action, "invalid_input");
  const privacy = privacyCheck(text);
  if (privacy) return { ...reject(deps, action, "privacy_blocked"), ...privacy };
  const snap = await loadLearningLineSnapshot(deps.db, lineId);
  const revision = snap && current(snap);
  if (!snap || !revision) return reject(deps, action, "not_found");
  if (revision.id !== revisionId) return reject(deps, action, "stale_revision");
  if (designApprovedEvent(snap, revision)) return reject(deps, action, "invalid_state");
  try {
    await appendLearningLineEvent(deps.db, { learningLineId: lineId, revisionId, eventType: "needs_revision", eventData: { revisionFeedback: text } });
  } catch (error) {
    return reject(deps, action, storageReason(error));
  }
  okLog(deps, action);
  return generateDesign(deps, lineId);
}

/**
 * Gate 1 = GO. Vereist de synthetic_only-attestatie en een bevestiging van iedere review-bevinding in de zes
 * module-invoerteksten; een `blocked`-bevinding maakt GO onmogelijk (dan eerst een revisie).
 */
export async function approveDesign(
  deps: LearningLineDeps,
  lineId: string,
  input: { revisionId: string; syntheticDataAttested: boolean; acknowledgedFindings: Partial<Record<ModuleId, string[]>> },
): Promise<LearningLineResult> {
  const action = "approve_design";
  const snap = await loadLearningLineSnapshot(deps.db, lineId);
  const revision = snap && current(snap);
  if (!snap || !revision) return reject(deps, action, "not_found");
  if (revision.id !== input.revisionId) return reject(deps, action, "stale_revision");
  if (input.syntheticDataAttested !== true) return reject(deps, action, "input_gate");
  const checks = moduleInputChecks(revision.payload);
  if (checks.some((c) => c.status === "blocked")) return reject(deps, action, "privacy_blocked");
  const acknowledgements: Record<string, string[]> = {};
  for (const c of checks) {
    const required = c.findings.filter((f) => f.severity === "review_required").map((f) => f.id);
    const given = new Set(input.acknowledgedFindings[c.moduleId] ?? []);
    if (required.some((id) => !given.has(id))) return reject(deps, action, "acknowledgement_required");
    acknowledgements[c.moduleId] = required;
  }
  try {
    await appendLearningLineEvent(deps.db, { learningLineId: lineId, revisionId: revision.id, eventType: "design_approved", eventData: { syntheticDataAttested: true, moduleAcknowledgements: acknowledgements } });
  } catch (error) {
    return reject(deps, action, storageReason(error));
  }
  okLog(deps, action);
  return viewResult(deps, lineId);
}

/**
 * Orchestrator: iedere ModuleSpec → een gewone training via `startTraining` (zelfde preflight, policy en Certum
 * Analyse). Op volgorde, idempotent (bestaande koppelingen blijven), stopt bij de eerste afwijzing. Daarna loopt iedere
 * training door de bestaande Studio-workflow met haar eigen menselijke stappen.
 */
export async function startProduction(deps: LearningLineDeps, lineId: string): Promise<LearningLineResult> {
  const action = "start_production";
  const snap = await loadLearningLineSnapshot(deps.db, lineId);
  const revision = snap && current(snap);
  if (!snap || !revision) return reject(deps, action, "not_found");
  const approval = designApprovedEvent(snap, revision);
  if (!approval) return reject(deps, action, "invalid_state");
  const acknowledgements = (approval.eventData.moduleAcknowledgements ?? {}) as Record<string, string[]>;
  let created = 0;
  for (const spec of revision.payload.modules) {
    if (snap.modules.some((m) => m.moduleId === spec.id)) continue;
    const text = moduleTrainingInputText(revision.payload, spec);
    const acknowledgement = { textHash: await hashPreflightText(text), acknowledgedFindingIds: acknowledgements[spec.id] ?? [], syntheticDataAttested: true };
    const started = await startTraining(deps.training, { kind: MODULE_INPUT_KIND, text, acknowledgement });
    if (started.status !== "created") return reject(deps, action, "production_failed", { errorKind: started.reason });
    try {
      await linkModuleTraining(deps.db, { learningLineId: lineId, moduleId: spec.id, trainingId: started.trainingId, revisionId: revision.id });
    } catch (error) {
      return reject(deps, action, storageReason(error));
    }
    created++;
  }
  okLog(deps, action, { modules: created });
  return viewResult(deps, lineId);
}

/** Gate 2: het eindpakket goedkeuren, gebonden aan de hash van het Certum Package dat de opleider zag. */
export async function approvePackage(deps: LearningLineDeps, lineId: string, expectedPackageHash: string): Promise<LearningLineResult> {
  const action = "approve_package";
  const all = await loadAll(deps.db, lineId);
  const revision = all && current(all.snap);
  const view = all && deriveLearningLineView(all.snap, all.workspaces);
  if (!all || !revision || !view?.packages) return reject(deps, action, "not_found");
  if (!view.design?.approved || !view.packages.complete) return reject(deps, action, "not_ready");
  if (view.packages.certumHash !== expectedPackageHash) return reject(deps, action, "stale_revision");
  try {
    await appendLearningLineEvent(deps.db, { learningLineId: lineId, revisionId: revision.id, eventType: "package_approved", eventData: { packageHash: expectedPackageHash } });
  } catch (error) {
    return reject(deps, action, storageReason(error));
  }
  okLog(deps, action);
  return viewResult(deps, lineId);
}
