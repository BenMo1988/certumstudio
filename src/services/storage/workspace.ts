import type { TrainingContentPackage } from "@/modules/block-content";
import type { BcOnlineBlockPlan } from "@/modules/block-plan";
import type { AgentInputKind } from "@/modules/training-agent";
import { findEpistemicFlags, segmentInput, type AnalysisOutcome, type EpistemicFlag, type SourceSegment } from "@/modules/training-agent/v2";
import { sourceNeedScope, type SourceNeedScope, type TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import type { Db } from "./db";
import { sourceNeedCoverage, type CertumSource } from "@/modules/sources/schema";
import {
  builtOn,
  composeContentFromSnapshot,
  currentRevision,
  currentSources,
  isApproved,
  lastRelevantEvent,
  selectedDirection,
  sourcesUsedBy,
  validatedSources,
  type TrainingRecordSnapshot,
} from "./snapshot";
import {
  listTrainings,
  loadTrainingRecordSnapshot,
  loadTrainingRecordSnapshots,
  type ArtifactRevision,
  type TrainingRecord,
} from "./training-record";

/*
 * Het hervatbare beeld van één training, volledig uit Postgres: wat de UI toont en waar de gebruiker verdergaat. De
 * voortgang (`stage`) wordt afgeleid uit de opgeslagen revisions en events en nergens apart opgeslagen.
 * Serialiseerbaar (geen Dates of klassen), zodat een server component het aan de client kan geven.
 *
 * Eén Training Record Snapshot (vier bulkqueries) en daarna alles in het geheugen (`deriveWorkspace`): gekozen
 * richting, approvals, staleness, Content Package, reviewstatus en resume-stage. Geen query per revision of blok.
 */

export const WORKFLOW_STAGES = [
  "intake_complete",
  "analysis_not_ready",
  "analysis_ready",
  "direction_selected",
  "blueprint_ready",
  "blueprint_approved",
  "block_plan_ready",
  "block_plan_approved",
  "content_in_progress",
  "content_review",
  "training_ready",
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  intake_complete: "Invoer opgeslagen",
  analysis_not_ready: "Analyse: niet gereed",
  analysis_ready: "Analyse gereed",
  direction_selected: "Richting gekozen",
  blueprint_ready: "Blueprint ter beoordeling",
  blueprint_approved: "Blueprint goedgekeurd",
  block_plan_ready: "Block Plan ter beoordeling",
  block_plan_approved: "Block Plan goedgekeurd",
  content_in_progress: "Content in uitvoering",
  content_review: "Content ter beoordeling",
  training_ready: "Training gereed",
};

export interface WorkflowProgress {
  stage: WorkflowStage;
  label: string;
  totalBlocks: number;
  /** Blokken met een current revision op de huidige Blueprint en het huidige Block Plan (ongeacht status). */
  storedBlocks: number;
  generatedBlocks: number;
  approvedBlocks: number;
  unresolved: { source: number; asset: number; capability: number };
}

/** Herkomst van een opgeslagen revision: door een provider gemaakt of handmatig bewerkt. */
export const MANUAL_EDIT = "manual-edit";
export type RevisionSource = "generated" | "manual";

export interface RevisionMeta {
  revisionId: string;
  revisionNo: number;
  /** Aantal eerdere revisions van hetzelfde onderdeel (historie). */
  previousRevisions: number;
  source: RevisionSource;
  /** Titels van de bronnen waarop deze revision is gebaseerd (alleen bij Bron-blokken). */
  basedOnSources: string[];
  /** Een gebruikte bronversie is niet meer current of gevalideerd: opnieuw genereren en beoordelen. */
  staleSources: boolean;
}

/** Source Workspace: per sourceNeed de dekking, en de bronnen van de training (current versie). */
export interface SourcesView {
  /**
   * Per sourceNeed de dekking. `scope` is `professional` (ook legacy zonder scope) of `organisation_specific`; alleen
   * professionele kennis blokkeert, organisatiegebonden kennis blijft zichtbaar als aandachtspunt.
   */
  needs: { id: string; question: string; whyNeeded: string; scope: SourceNeedScope; covered: boolean; sourceIds: string[] }[];
  items: {
    sourceId: string;
    revisionId: string;
    revisionNo: number;
    previousRevisions: number;
    validated: boolean;
    validatedAt: string | null;
    payload: CertumSource;
  }[];
  /** Alle professionele (blokkerende) sourceNeeds zijn gedekt. */
  allCovered: boolean;
  /** Organisatiegebonden sourceNeeds zonder organisatiebron (niet blokkerend). */
  organisationSpecificOpen: number;
}

/**
 * De reviewstatus van de training als geheel (intern; geen export of accreditatie), afgeleid uit de current revisions
 * en besluiten:
 * - `incomplete`: niet ieder gepland blok heeft gegenereerde inhoud (ontbrekend, bron nodig, asset nodig, technische
 *   beperking) of Start/Einde ontbreekt;
 * - `in_review`: alles bestaat, maar niet ieder blok én Start en Einde zijn current goedgekeurd;
 * - `approved`: ieder blok gegenereerd en goedgekeurd, Start en Einde goedgekeurd.
 * Bouwt voort op de readiness van het Content Package (geen tweede waarheid).
 */
export interface TrainingReview {
  readiness: "incomplete" | "in_review" | "approved";
  totalBlocks: number;
  approved: number;
  /** Gegenereerd, nog niet goedgekeurd en niet als "moet aangepast" gemarkeerd. */
  draft: number;
  needsRevision: number;
  notGenerated: number;
  source: number;
  asset: number;
  capability: number;
  /** Start en Einde die nog goedgekeurd moeten worden (0–2). */
  frameToReview: number;
  /** Onderdelen (blokken, Start, Einde) die nog een besluit van de opleider vragen. */
  toReview: number;
  /** Professionele sourceNeeds van de Blueprint zonder current gevalideerde bron (blokkerend). */
  sourceNeedsOpen: number;
  /** Organisatiegebonden sourceNeeds zonder organisatiebron: zichtbaar aandachtspunt, niet blokkerend. */
  organisationSpecificOpen: number;
  /** Bron-blokken waarvan een gebruikte bron intussen is gewijzigd. */
  staleBlocks: number;
}

interface StoredArtifactView<T> {
  revisionId: string;
  revisionNo: number;
  payload: T;
  approved: boolean;
  /** Gegenereerd of handmatig aangepast (bijv. een Block Plan-override). */
  source: RevisionSource;
}

export interface TrainingWorkspaceView {
  training: { id: string; code: string; title: string; createdAt: string; updatedAt: string };
  input: { kind: AgentInputKind; text: string } | null;
  analysis: {
    revisionId: string;
    outcome: AnalysisOutcome;
    segments: SourceSegment[];
    epistemicFlags: EpistemicFlag[];
    selectedDirectionId: string | null;
  } | null;
  blueprint: StoredArtifactView<TrainingBlueprintV2> | null;
  blockPlan: StoredArtifactView<BcOnlineBlockPlan> | null;
  /** Bronnen en dekking; beschikbaar zodra de Blueprint is goedgekeurd. */
  sources: SourcesView | null;
  content: {
    package: TrainingContentPackage;
    /** Current revision per gepland blok (voor besluiten, bewerken en regeneratie met stale-controle). */
    blockRevisions: Record<string, RevisionMeta>;
    /** Vaste Start en Vast Einde: eigen revisions met een eigen goedkeuring. */
    frame: { start: RevisionMeta & { approved: boolean }; end: RevisionMeta & { approved: boolean } };
    review: TrainingReview;
  } | null;
  progress: WorkflowProgress;
}

const iso = (d: Date) => d.toISOString();

function storedView<T>(snap: TrainingRecordSnapshot, revision: ArtifactRevision | null): StoredArtifactView<T> | null {
  if (!revision) return null;
  return {
    revisionId: revision.id,
    revisionNo: revision.revisionNo,
    payload: revision.payload as T,
    approved: isApproved(snap, revision.id),
    source: revision.modelVersion === MANUAL_EDIT ? "manual" : "generated",
  };
}

export async function loadTrainingWorkspace(db: Db, trainingId: string): Promise<TrainingWorkspaceView | null> {
  const snap = await loadTrainingRecordSnapshot(db, trainingId);
  return snap ? deriveWorkspace(snap) : null;
}

/** De hele workspace uit één snapshot; puur, zonder database. */
export function deriveWorkspace(snap: TrainingRecordSnapshot): TrainingWorkspaceView {
  const { training, input } = snap;
  const analysisRev = currentRevision(snap, "analysis");
  const analysis = analysisRev && input
    ? {
        revisionId: analysisRev.id,
        outcome: analysisRev.payload as AnalysisOutcome,
        segments: segmentInput(input.inputText),
        epistemicFlags: findEpistemicFlags(analysisRev.payload as AnalysisOutcome, input.inputText),
        selectedDirectionId: selectedDirection(snap, analysisRev.id),
      }
    : null;

  // Alleen artifacts op de huidige upstream tellen; een verouderd downstream-artifact wordt niet getoond als current.
  const blueprintRev = currentRevision(snap, "blueprint");
  const blueprint = analysisRev && builtOn(blueprintRev, [analysisRev.id]) ? storedView<TrainingBlueprintV2>(snap, blueprintRev) : null;
  const planRev = currentRevision(snap, "block_plan");
  const blockPlan = blueprint && builtOn(planRev, [blueprint.revisionId]) ? storedView<BcOnlineBlockPlan>(snap, planRev) : null;

  let content: TrainingWorkspaceView["content"] = null;
  if (blueprint?.approved && blockPlan?.approved) {
    const stored = composeContentFromSnapshot(snap);
    if (stored.status === "ok") {
      const blockRevisions: Record<string, RevisionMeta> = {};
      for (const block of stored.package.blocks) {
        const rev = currentRevision(snap, "block_content", block.plannedBlockId);
        if (rev) blockRevisions[block.plannedBlockId] = revisionMeta(snap, rev);
      }
      const startRev = currentRevision(snap, "start_content")!;
      const endRev = currentRevision(snap, "end_content")!;
      const frame = {
        start: { ...revisionMeta(snap, startRev), approved: isApproved(snap, startRev.id) },
        end: { ...revisionMeta(snap, endRev), approved: isApproved(snap, endRev.id) },
      };
      const review = deriveReview(stored.package, blockPlan.payload, frame);
      const sources = sourcesView(snap, blueprint.payload);
      review.sourceNeedsOpen = sources.needs.filter((n) => n.scope === "professional" && !n.covered).length;
      review.organisationSpecificOpen = sources.organisationSpecificOpen;
      review.staleBlocks = Object.values(blockRevisions).filter((m) => m.staleSources).length;
      content = { package: stored.package, blockRevisions, frame, review };
    }
  }

  const view: Omit<TrainingWorkspaceView, "progress"> = {
    training: { id: training.id, code: training.code, title: displayTitle(training, blueprint?.payload), createdAt: iso(training.createdAt), updatedAt: iso(training.updatedAt) },
    input: input ? { kind: input.inputType, text: input.inputText } : null,
    analysis,
    blueprint,
    blockPlan,
    sources: blueprint?.approved ? sourcesView(snap, blueprint.payload) : null,
    content,
  };
  return { ...view, progress: deriveProgress(view) };
}

/** De Source Workspace uit de snapshot: dekking per sourceNeed (alleen current gevalideerde bronnen tellen). */
function sourcesView(snap: TrainingRecordSnapshot, blueprint: TrainingBlueprintV2): SourcesView {
  const items = currentSources(snap).map((rev) => {
    const validated = isApproved(snap, rev.id);
    const decision = validated ? lastRelevantEvent(snap, rev) : null;
    return {
      sourceId: rev.artifactKey,
      revisionId: rev.id,
      revisionNo: rev.revisionNo,
      previousRevisions: snap.revisions.filter((r) => r.artifactType === "source" && r.artifactKey === rev.artifactKey && r.revisionNo < rev.revisionNo).length,
      validated,
      validatedAt: decision ? decision.createdAt.toISOString() : null,
      payload: rev.payload as CertumSource,
    };
  });
  const coverage = sourceNeedCoverage(blueprint.sourceNeeds.map((s) => s.id), validatedSources(snap));
  const needs = blueprint.sourceNeeds.map((n) => ({
    id: n.id,
    question: n.question,
    whyNeeded: n.whyNeeded,
    scope: sourceNeedScope(n),
    covered: coverage[n.id] ?? false,
    sourceIds: items.filter((i) => i.payload.sourceNeedRefs.includes(n.id)).map((i) => i.sourceId),
  }));
  return {
    needs,
    items,
    allCovered: needs.filter((n) => n.scope === "professional").every((n) => n.covered),
    organisationSpecificOpen: needs.filter((n) => n.scope === "organisation_specific" && !n.covered).length,
  };
}

function revisionMeta(snap: TrainingRecordSnapshot, rev: ArtifactRevision): RevisionMeta {
  const used = sourcesUsedBy(snap, rev);
  return {
    basedOnSources: used.map((s) => (s.payload as CertumSource).title),
    staleSources: used.some((s) => !isApproved(snap, s.id)),
    revisionId: rev.id,
    revisionNo: rev.revisionNo,
    previousRevisions: snap.revisions.filter((r) => r.artifactType === rev.artifactType && r.artifactKey === rev.artifactKey && r.revisionNo < rev.revisionNo).length,
    source: rev.modelVersion === MANUAL_EDIT ? "manual" : "generated",
  };
}

/** De reviewstatus van de training; zie `TrainingReview`. */
export function deriveReview(
  pkg: TrainingContentPackage,
  plan: BcOnlineBlockPlan,
  frame: { start: { approved: boolean }; end: { approved: boolean } },
): TrainingReview {
  const blocks = pkg.blocks;
  const generated = blocks.filter((b) => b.body.status === "generated");
  const approved = generated.filter((b) => b.reviewStatus === "approved").length;
  const needsRevision = generated.filter((b) => b.reviewStatus === "needs_revision").length;
  const frameToReview = [frame.start, frame.end].filter((f) => !f.approved).length;
  const review = {
    totalBlocks: plan.plannedBlocks.length,
    approved,
    draft: generated.length - approved - needsRevision,
    needsRevision,
    notGenerated: plan.plannedBlocks.length - blocks.length,
    source: blocks.filter((b) => b.body.status === "needs_source").length,
    asset: blocks.filter((b) => b.body.status === "needs_asset").length,
    capability: blocks.filter((b) => b.body.status === "blocked_by_capability").length,
    frameToReview,
    toReview: generated.length - approved + frameToReview,
    sourceNeedsOpen: 0,
    organisationSpecificOpen: 0,
    staleBlocks: 0,
  };
  const readiness =
    pkg.readiness === "incomplete" ? "incomplete" : pkg.readiness === "approved" && frameToReview === 0 ? "approved" : "in_review";
  return { readiness, ...review };
}

/** De titel van de Blueprint zodra die er is; daarvoor de neutrale titel van het trainingsrecord. */
function displayTitle(training: TrainingRecord, blueprint: TrainingBlueprintV2 | undefined): string {
  return blueprint?.title ?? training.title;
}

/** De resume-state: afgeleid uit opgeslagen artifacts en events, geen tweede waarheid. */
export function deriveProgress(view: Omit<TrainingWorkspaceView, "progress">): WorkflowProgress {
  const pkg = view.content?.package;
  const totalBlocks = view.blockPlan?.payload.plannedBlocks.length ?? 0;
  const blocks = pkg?.blocks ?? [];
  const progress = (stage: WorkflowStage): WorkflowProgress => ({
    stage,
    label: STAGE_LABELS[stage],
    totalBlocks,
    storedBlocks: blocks.length,
    generatedBlocks: blocks.filter((b) => b.body.status === "generated").length,
    approvedBlocks: blocks.filter((b) => b.reviewStatus === "approved").length,
    unresolved: {
      source: blocks.filter((b) => b.body.status === "needs_source").length,
      asset: blocks.filter((b) => b.body.status === "needs_asset").length,
      capability: blocks.filter((b) => b.body.status === "blocked_by_capability").length,
    },
  });

  if (!view.analysis) return progress("intake_complete");
  if (view.analysis.outcome.outcome !== "ready") return progress("analysis_not_ready");
  if (!view.analysis.selectedDirectionId) return progress("analysis_ready");
  if (!view.blueprint) return progress("direction_selected");
  if (!view.blueprint.approved) return progress("blueprint_ready");
  if (!view.blockPlan) return progress("blueprint_approved");
  if (!view.blockPlan.approved) return progress("block_plan_ready");
  if (!pkg) return progress("block_plan_approved");
  if (blocks.length < totalBlocks) return progress("content_in_progress");
  if (view.content?.review.readiness === "approved") return progress("training_ready");
  return progress("content_review");
}

export interface TrainingSummary {
  id: string;
  code: string;
  title: string;
  updatedAt: string;
  progress: WorkflowProgress;
}

/** De trainingenlijst: echte records met afgeleide voortgang. Vijf queries in totaal, ongeacht het aantal trainingen. */
export async function listTrainingSummaries(db: Db, options: { limit?: number } = {}): Promise<TrainingSummary[]> {
  const trainings = await listTrainings(db, options);
  const snapshots = await loadTrainingRecordSnapshots(db, trainings.map((t) => t.id));
  return trainings.flatMap((t) => {
    const snap = snapshots.get(t.id);
    if (!snap) return [];
    const view = deriveWorkspace(snap);
    return [{ id: t.id, code: view.training.code, title: view.training.title, updatedAt: view.training.updatedAt, progress: view.progress }];
  });
}

/** Of er in deze snapshot al een Blueprint op de analyse is gebaseerd; dan ligt de richting vast. */
export function hasBlueprintFor(snap: TrainingRecordSnapshot, analysisRevisionId: string): boolean {
  return snap.revisions.some((r) => r.artifactType === "blueprint" && r.basedOnRevisionIds.includes(analysisRevisionId));
}
