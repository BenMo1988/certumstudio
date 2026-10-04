import { expect, it, vi } from "vitest";
import { decideRevision, generateBlockPlan, generateBlueprint, generateContent, runAnalysis, selectDirection, type WorkflowDeps, type WorkflowResult } from "@/app/trainings/workflow/persisted-workflow";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { instrumentDb, summarize } from "./instrumented-db";
import { createPostgresDb } from "./postgres-db";
import { createTraining, saveTrainingInput } from "./training-record";
import { listTrainingSummaries, loadTrainingWorkspace } from "./workspace";

/*
 * Opt-in performance-proof tegen de echte database (Step 11D). Per run één herkenbare development-training
 * ("[development performance] …", synthetische praktijkvraag, mock-providers, 0 Claude-aanroepen). Meet per actie:
 * aantal queries, DB-tijd en totale tijd. Print alleen aantallen, tijden en statische querytekst.
 * Aantal runs: CERTUM_PERF_RUNS (standaard 1).
 */

if (!process.env.DATABASE_URL) process.loadEnvFile(".env.local");
const URL_ = process.env.DATABASE_URL?.trim();
const RUNS = Number(process.env.CERTUM_PERF_RUNS ?? "1");
const TEXT = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
const mock = { promptVersion: "mock", modelVersion: "mock" };

const ws = (r: WorkflowResult) => {
  if (r.status !== "ok") throw new Error(`stap afgewezen: ${r.reason}`);
  return r.workspace;
};

it("Supabase performance: heropenen, blokgoedkeuring, mock-contentgeneratie, lijst", async () => {
  if (!URL_) throw new Error("DATABASE_URL ontbreekt in .env.local.");
  vi.spyOn(console, "info").mockImplementation(() => {});
  const raw = createPostgresDb(URL_);
  const { db, stats, reset } = instrumentDb(raw);
  const deps: WorkflowDeps = {
    db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: () => createBlockContentService({}),
    provenance: { analysis: mock, blueprint: mock, blockPlan: mock, blockContent: mock },
    log: () => {},
  };
  async function measure<T>(run: () => Promise<T>) {
    reset();
    const started = performance.now();
    const value = await run();
    return { value, ms: Math.round(performance.now() - started), ...summarize(stats) };
  }

  try {
    for (let run = 1; run <= RUNS; run++) {
      // Opzet tot en met een goedgekeurd Block Plan (niet gemeten).
      const training = await createTraining(db, { title: "[development performance] persistence" });
      await saveTrainingInput(db, {
        trainingId: training.id,
        inputType: "praktijkvraag",
        text: TEXT,
        acknowledgement: { textHash: await hashPreflightText(TEXT), acknowledgedFindingIds: [], syntheticDataAttested: true },
      });
      const analysis = ws(await runAnalysis(deps, training.id)).analysis!;
      const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
      ws(await selectDirection(deps, training.id, analysis.revisionId, direction));
      ws(await decideRevision(deps, training.id, ws(await generateBlueprint(deps, training.id)).blueprint!.revisionId, "approved"));
      ws(await decideRevision(deps, training.id, ws(await generateBlockPlan(deps, training.id)).blockPlan!.revisionId, "approved"));

      const content = await measure(() => generateContent(deps, training.id));
      const generated = ws(content.value).content!.package.blocks.filter((b) => b.body.status === "generated").map((b) => b.plannedBlockId);
      const blockRevisions = ws(content.value).content!.blockRevisions;

      const reopen = [];
      for (let i = 0; i < 3; i++) reopen.push(await measure(() => loadTrainingWorkspace(db, training.id)));
      const approve = [];
      for (let i = 0; i < 3; i++) approve.push(await measure(() => decideRevision(deps, training.id, blockRevisions[generated[i]].revisionId, "approved")));
      for (const a of approve) expect(a.value.status).toBe("ok");
      const list = await measure(() => listTrainingSummaries(db));

      const brief = (m: { ms: number; queries: number; dbMs: number }) => ({ ms: m.ms, queries: m.queries, dbMs: m.dbMs });
      process.stdout.write(
        `certum.perf ${JSON.stringify({
          run,
          code: training.code,
          content: { ...brief(content), top: content.top.slice(0, 5) },
          reopen: reopen.map(brief),
          reopenTop: reopen[0].top.slice(0, 5),
          approve: approve.map(brief),
          approveTop: approve[0].top.slice(0, 5),
          list: { ...brief(list), trainings: list.value.length },
        })}\n`,
      );
    }
  } finally {
    await raw.close();
  }
}, 900_000);
