import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import { decideRevision, regenerateBlock, selectDirection, startTraining, type WorkflowDeps, type WorkflowResult } from "@/app/trainings/workflow/persisted-workflow";
import { addSource, validateSource } from "@/app/trainings/workflow/sources";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { readBlockContentConfig } from "@/services/block-content/config";
import { createBlockContentService } from "@/services/block-content/factory";
import type { BlockContentService } from "@/services/block-content/services";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { currentRevision } from "@/services/storage/snapshot";
import { createArtifactRevision, loadTrainingRecordSnapshot } from "@/services/storage/training-record";
import { TRAINING_BLOCK_CONTENT_V1_2_PROMPT_VERSION } from "@/knowledge/prompts/training-block-content-v1-2";
import { fixtureCase } from "../../../test/block-content-fixtures";
import { createTestDb } from "../../../test/pglite-db";

/*
 * Source Grounding eval-harness. Draait het echte persisted pad in een in-memory PGlite Training Record (geen
 * Supabase): mock-analyse → goedgekeurde BLP-001 Blueprint en Block Plan → bronnen toevoegen en valideren
 * (addSource/validateSource) → regenerateBlock("blok-5"). Alleen Block Content kan Claude zijn; precies één
 * generate-aanroep per run (maxRetries 0, geen retry).
 *
 *   SG_CASE=SG-001 SG_PROVIDER=mock   → droge run, 0 betaalde calls
 *   SG_CASE=SG-001 SG_PROVIDER=claude SG_CONFIRM_PAID=1 → één betaalde call
 *
 * Het resultaat wordt direct na de providerreturn naar disk geschreven (voordat er verder iets gebeurt).
 */

const ROOT = process.cwd();
const CASE = process.env.SG_CASE ?? "";
const PROVIDER = process.env.SG_PROVIDER === "claude" ? "claude" : "mock";
const TARGET = "blok-5";
const QUESTION = "Hoe ga ik als teamleider om met een medewerker die zegt dat privéomstandigheden het werk raken, maar daar niet over wil praten?";

it(`source grounding ${CASE} (${PROVIDER})`, async () => {
  const caseDir = readdirSync(join(ROOT, "evals/source-grounding/cases")).find((d) => d.startsWith(`${CASE}-`));
  if (!caseDir) throw new Error("SG_CASE onbekend");
  if (PROVIDER === "claude" && process.env.SG_CONFIRM_PAID !== "1") throw new Error("Betaalde run vereist SG_CONFIRM_PAID=1");
  const dir = join(ROOT, "evals/source-grounding/cases", caseDir);
  const runDir = join(dir, "runs");
  mkdirSync(runDir, { recursive: true });
  const stamp = `${new Date().toISOString().slice(0, 10)}_${PROVIDER === "claude" ? "training-block-content-v1.2" : "dry-run-mock"}`;
  const sources = JSON.parse(readFileSync(join(dir, "sources.json"), "utf8")).sources as Record<string, unknown>[];

  // Alleen metadata-logs; ze worden opgevangen om te controleren dat er geen broninhoud in staat.
  const logLines: string[] = [];
  const original = { info: console.info, warn: console.warn, error: console.error, log: console.log };
  for (const m of ["info", "warn", "error", "log"] as const) console[m] = (...args: unknown[]) => void logLines.push(args.map(String).join(" "));

  const env: Record<string, string | undefined> = { CERTUM_BLOCK_CONTENT_PROVIDER: PROVIDER };
  if (PROVIDER === "claude") {
    process.loadEnvFile(join(ROOT, ".env.local"));
    env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  }
  const config = readBlockContentConfig(env);
  let generateCalls = 0;
  const blockContent = (): BlockContentService => {
    const inner = createBlockContentService(env);
    return {
      ...inner,
      generateFrame: () => Promise.reject(new Error("niet toegestaan in SG")),
      async generate(request) {
        generateCalls += 1;
        if (generateCalls > 1) throw new Error("Meer dan één generate-aanroep: afgebroken");
        const result = await inner.generate(request);
        writeFileSync(join(runDir, `${stamp}_raw.json`), JSON.stringify({ case: CASE, result }, null, 2));
        return result;
      },
    } as BlockContentService;
  };

  const db = await createTestDb();
  const mock = { promptVersion: "mock", modelVersion: "mock" };
  const deps: WorkflowDeps = {
    db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: blockContent,
    provenance: {
      analysis: mock,
      blueprint: { promptVersion: "fixture", modelVersion: "fixture BLP-001" },
      blockPlan: { promptVersion: "fixture", modelVersion: "fixture BLP-001" },
      blockContent: PROVIDER === "claude" && config.provider === "claude"
        ? { promptVersion: TRAINING_BLOCK_CONTENT_V1_2_PROMPT_VERSION, modelVersion: `${config.claude.model} · ${config.claude.effort}` }
        : mock,
    },
  };
  const ok = (r: WorkflowResult) => {
    if (r.status !== "ok") throw new Error(`workflow: ${r.reason}`);
    return r.workspace;
  };

  try {
    const started = await startTraining(deps, {
      kind: "praktijkvraag",
      text: QUESTION,
      acknowledgement: { textHash: await hashPreflightText(QUESTION), acknowledgedFindingIds: [], syntheticDataAttested: true },
    });
    if (started.status !== "created") throw new Error(`start: ${started.reason}`);
    const trainingId = started.trainingId;
    const analysis = ok(started.analysis).analysis!;
    if (analysis.outcome.outcome !== "ready") throw new Error("mock-analyse niet ready");
    const directionId = analysis.outcome.trainingDirections[0].id;
    ok(await selectDirection(deps, trainingId, analysis.revisionId, directionId));

    // Goedgekeurde BLP-001 Blueprint en Block Plan (fixtures uit eerdere Claude-baselines). Alleen de gekozen
    // richting-id volgt de mock-analyse; de provider-input bevat die id niet.
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const bp = await createArtifactRevision(db, {
      trainingId, artifactType: "blueprint", contractVersion: blueprint.version, promptVersion: "fixture", modelVersion: "fixture BLP-001",
      payload: { ...blueprint, selectedDirectionId: directionId }, basedOnRevisionIds: [analysis.revisionId], expectedCurrentRevisionId: null,
    });
    ok(await decideRevision(deps, trainingId, bp.id, "approved"));
    const plan = await createArtifactRevision(db, {
      trainingId, artifactType: "block_plan", contractVersion: blockPlan.version, promptVersion: "fixture", modelVersion: "fixture BLP-001",
      payload: blockPlan, basedOnRevisionIds: [bp.id], expectedCurrentRevisionId: null,
    });
    ok(await decideRevision(deps, trainingId, plan.id, "approved"));

    for (const s of sources) {
      const added = ok(await addSource(deps, trainingId, s));
      ok(await validateSource(deps, trainingId, added.sources!.items.at(-1)!.revisionId, true));
    }

    const started_at = Date.now();
    const after = ok(await regenerateBlock(deps, trainingId, TARGET, null));
    const wallMs = Date.now() - started_at;

    const snap = (await loadTrainingRecordSnapshot(db, trainingId))!;
    const stored = currentRevision(snap, "block_content", TARGET)!;
    const sourceRevs = snap.revisions.filter((r) => r.artifactType === "source");
    const bcLog = logLines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((e) => e?.event === "certum.block_content_generation");
    const leaks = sources.flatMap((s) => [s.title, s.url, ...String(s.relevantContent).split("\n").map((x) => x.slice(0, 40))]).filter((v): v is string => typeof v === "string" && v.length > 8 && logLines.some((l) => l.includes(v)));

    const record = {
      case: CASE,
      provider: PROVIDER,
      model: config.provider === "claude" ? config.claude.model : "mock",
      effort: config.provider === "claude" ? config.claude.effort : "mock",
      promptVersion: PROVIDER === "claude" ? TRAINING_BLOCK_CONTENT_V1_2_PROMPT_VERSION : "mock",
      generateCalls,
      resultStatus: (stored.payload as { body: { status: string } }).body.status,
      durationMs: bcLog.at(-1)?.durationMs ?? null,
      wallMs,
      storedRevision: { id: stored.id, modelVersion: stored.modelVersion, promptVersion: stored.promptVersion, basedOnRevisionIds: stored.basedOnRevisionIds },
      blueprintRevisionId: bp.id,
      blockPlanRevisionId: plan.id,
      sourceRevisions: sourceRevs.map((r) => ({ id: r.id, key: r.artifactKey, title: (r.payload as { title: string }).title, sourceNeedRefs: (r.payload as { sourceNeedRefs: string[] }).sourceNeedRefs })),
      provenanceExact:
        JSON.stringify([...stored.basedOnRevisionIds].sort()) === JSON.stringify([bp.id, plan.id, ...sourceRevs.map((r) => r.id)].sort()),
      ui: after.content ? { basedOnSources: after.content.blockRevisions[TARGET]?.basedOnSources ?? null } : null,
      blockContentLogEvents: bcLog,
      logLeaks: leaks,
      blockContentResult: stored.payload,
    };
    writeFileSync(join(runDir, `${stamp}_result.json`), JSON.stringify(record, null, 2));
    original.info(JSON.stringify({ case: CASE, provider: PROVIDER, generateCalls, resultStatus: record.resultStatus, durationMs: record.durationMs, provenanceExact: record.provenanceExact, logLeaks: leaks.length }));
  } finally {
    Object.assign(console, original);
    await db.close();
  }
});
