import type { TrainingContentPackage } from "@/modules/block-content";
import type { BcOnlineBlockPlan } from "@/modules/block-plan";
import type { AgentInputKind } from "@/modules/training-agent";
import { findEpistemicFlags, segmentInput, type AnalysisOutcome, type EpistemicFlag, type SourceSegment } from "@/modules/training-agent/v2";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import type { Db } from "./db";
import {
  composeStoredContentPackage,
  getCurrentArtifactRevision,
  getLatestTrainingInput,
  getSelectedDirectionId,
  getTraining,
  isRevisionApproved,
  listArtifactRevisions,
  listTrainings,
  type ArtifactRevision,
  type TrainingRecord,
} from "./training-record";

/*
 * Het hervatbare beeld van één training, volledig uit Postgres: wat de UI toont en waar de gebruiker verdergaat. De
 * voortgang (`stage`) wordt afgeleid uit de opgeslagen revisions en events en nergens apart opgeslagen.
 * Serialiseerbaar (geen Dates of klassen), zodat een server component het aan de client kan geven.
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
  training_ready: "Alle blokken goedgekeurd",
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

interface StoredArtifactView<T> {
  revisionId: string;
  revisionNo: number;
  payload: T;
  approved: boolean;
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
  content: {
    package: TrainingContentPackage;
    /** Current revision per gepland blok (voor besluiten en regeneratie met stale-controle). */
    blockRevisions: Record<string, { revisionId: string; revisionNo: number }>;
  } | null;
  progress: WorkflowProgress;
}

const iso = (d: Date) => d.toISOString();

async function storedView<T>(db: Db, revision: ArtifactRevision | null): Promise<StoredArtifactView<T> | null> {
  if (!revision) return null;
  return { revisionId: revision.id, revisionNo: revision.revisionNo, payload: revision.payload as T, approved: await isRevisionApproved(db, revision.id) };
}

export async function loadTrainingWorkspace(db: Db, trainingId: string): Promise<TrainingWorkspaceView | null> {
  const training = await getTraining(db, trainingId);
  if (!training) return null;
  const input = await getLatestTrainingInput(db, training.id);

  const analysisRev = await getCurrentArtifactRevision(db, training.id, "analysis");
  const analysis = analysisRev && input
    ? {
        revisionId: analysisRev.id,
        outcome: analysisRev.payload as AnalysisOutcome,
        segments: segmentInput(input.inputText),
        epistemicFlags: findEpistemicFlags(analysisRev.payload as AnalysisOutcome, input.inputText),
        selectedDirectionId: await getSelectedDirectionId(db, analysisRev.id),
      }
    : null;

  // Alleen artifacts op de huidige upstream tellen; een verouderd downstream-artifact wordt niet getoond als current.
  const blueprintRev = await getCurrentArtifactRevision(db, training.id, "blueprint");
  const blueprint = analysisRev && blueprintRev?.basedOnRevisionIds.includes(analysisRev.id) ? await storedView<TrainingBlueprintV2>(db, blueprintRev) : null;
  const planRev = await getCurrentArtifactRevision(db, training.id, "block_plan");
  const blockPlan = blueprint && planRev?.basedOnRevisionIds.includes(blueprint.revisionId) ? await storedView<BcOnlineBlockPlan>(db, planRev) : null;

  let content: TrainingWorkspaceView["content"] = null;
  if (blueprint?.approved && blockPlan?.approved) {
    const stored = await composeStoredContentPackage(db, training.id);
    if (stored.status === "ok") {
      const blockRevisions: Record<string, { revisionId: string; revisionNo: number }> = {};
      for (const block of stored.package.blocks) {
        const rev = await getCurrentArtifactRevision(db, training.id, "block_content", block.plannedBlockId);
        if (rev) blockRevisions[block.plannedBlockId] = { revisionId: rev.id, revisionNo: rev.revisionNo };
      }
      content = { package: stored.package, blockRevisions };
    }
  }

  const view: Omit<TrainingWorkspaceView, "progress"> = {
    training: { id: training.id, code: training.code, title: displayTitle(training, blueprint?.payload), createdAt: iso(training.createdAt), updatedAt: iso(training.updatedAt) },
    input: input ? { kind: input.inputType, text: input.inputText } : null,
    analysis,
    blueprint,
    blockPlan,
    content,
  };
  return { ...view, progress: deriveProgress(view) };
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
  if (pkg.readiness === "approved") return progress("training_ready");
  return progress("content_review");
}

export interface TrainingSummary {
  id: string;
  code: string;
  title: string;
  updatedAt: string;
  progress: WorkflowProgress;
}

/** De trainingenlijst: echte records, met de afgeleide voortgang. */
export async function listTrainingSummaries(db: Db, options: { limit?: number } = {}): Promise<TrainingSummary[]> {
  const trainings = await listTrainings(db, options);
  const summaries: TrainingSummary[] = [];
  for (const t of trainings) {
    const view = await loadTrainingWorkspace(db, t.id);
    if (view) summaries.push({ id: t.id, code: view.training.code, title: view.training.title, updatedAt: view.training.updatedAt, progress: view.progress });
  }
  return summaries;
}

/** Of er voor deze analyse al een Blueprint bestaat; dan ligt de richting vast. */
export async function hasBlueprintFor(db: Db, trainingId: string, analysisRevisionId: string): Promise<boolean> {
  const blueprints = await listArtifactRevisions(db, trainingId, { artifactType: "blueprint" });
  return blueprints.some((b) => b.basedOnRevisionIds.includes(analysisRevisionId));
}

