import { expect, it, vi } from "vitest";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { createPostgresDb, type PostgresDb } from "@/services/storage/postgres-db";
import { loadTrainingWorkspace } from "@/services/storage/workspace";
import {
  decideRevision,
  generateBlockPlan,
  generateBlueprint,
  generateContent,
  selectDirection,
  startTraining,
  type WorkflowDeps,
  type WorkflowResult,
} from "./persisted-workflow";

/*
 * Opt-in Supabase resume-proof (Step 11C): de persisted workflow met MOCK-providers tegen de echte database in
 * DATABASE_URL. Keten tot en met goedgekeurde blokinhoud, client sluiten, nieuwe verbinding, training heropenen.
 * Laat één synthetische training achter. 0 Claude-aanroepen. Print alleen aantallen en uitkomsten.
 */

if (!process.env.DATABASE_URL) process.loadEnvFile(".env.local");
const URL_ = process.env.DATABASE_URL?.trim();
const TEXT = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
const mock = { promptVersion: "mock", modelVersion: "mock" };

function deps(db: PostgresDb): WorkflowDeps {
  return {
    db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: () => createBlockContentService({}),
    provenance: { analysis: mock, blueprint: mock, blockPlan: mock, blockContent: mock },
    log: () => {},
  };
}

const timings: Record<string, number> = {};
async function timed<T>(name: string, run: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await run();
  } finally {
    timings[name] = Math.round(performance.now() - started);
  }
}

const ws = (r: WorkflowResult) => {
  if (r.status !== "ok") throw new Error(`stap afgewezen: ${r.reason}`);
  return r.workspace;
};

it("Supabase resume-proof: keten → client sluiten → nieuwe verbinding → training heropenen", async () => {
  if (!URL_) throw new Error("DATABASE_URL ontbreekt in .env.local.");
  vi.spyOn(console, "info").mockImplementation(() => {});

  const a = createPostgresDb(URL_);
  let before;
  try {
    const d = deps(a);
    const textHash = await hashPreflightText(TEXT);
    const started = await timed("start_en_analyse", () => startTraining(d, {
      kind: "praktijkvraag",
      text: TEXT,
      acknowledgement: { textHash, acknowledgedFindingIds: [], syntheticDataAttested: true },
    }));
    if (started.status !== "created") throw new Error(started.reason);
    const id = started.trainingId;
    const analysis = ws(started.analysis).analysis!;
    const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
    ws(await timed("richting", () => selectDirection(d, id, analysis.revisionId, direction)));
    const bp = ws(await timed("blueprint", () => generateBlueprint(d, id))).blueprint!;
    ws(await timed("blueprint_goedkeuren", () => decideRevision(d, id, bp.revisionId, "approved")));
    const plan = ws(await timed("block_plan", () => generateBlockPlan(d, id))).blockPlan!;
    ws(await timed("block_plan_goedkeuren", () => decideRevision(d, id, plan.revisionId, "approved")));
    const content = ws(await timed("content", () => generateContent(d, id))).content!;
    const generated = content.package.blocks.filter((b) => b.body.status === "generated").map((b) => b.plannedBlockId);
    expect(generated.length).toBeGreaterThanOrEqual(2);
    before = ws(await timed("blok_goedkeuren", () => decideRevision(d, id, content.blockRevisions[generated[0]].revisionId, "approved")));
  } finally {
    await a.close();
  }

  const b = createPostgresDb(URL_);
  try {
    const after = (await timed("heropenen", () => loadTrainingWorkspace(b, before.training.id)))!;
    expect(after.training.code).toBe(before.training.code);
    expect(after.analysis?.selectedDirectionId).toBe(before.analysis?.selectedDirectionId);
    expect(after.blueprint?.approved && after.blockPlan?.approved).toBe(true);
    expect(after.content?.blockRevisions).toEqual(before.content?.blockRevisions);
    expect(after.content?.package).toEqual(before.content?.package);
    expect(after.progress).toEqual(before.progress);
    expect(after.progress.stage).toBe("content_review");
    expect(after.progress.approvedBlocks).toBe(1);

    const [counts] = await b.query<Record<string, number>>(
      `select
         (select count(*) from training_input where training_id = $1)::int as training_input,
         (select count(*) from artifact_revision where training_id = $1)::int as artifact_revision,
         (select count(*) from workflow_event where training_id = $1)::int as workflow_event`,
      [after.training.id],
    );
    process.stdout.write(`certum.resume_proof ${JSON.stringify({ code: after.training.code, stage: after.progress.stage, ...counts, ms: timings })}\n`);
  } finally {
    await b.close();
  }
}, 300_000);
