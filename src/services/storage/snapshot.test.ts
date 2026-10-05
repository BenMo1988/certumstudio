import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decideRevision,
  generateBlockPlan,
  generateBlueprint,
  generateContent,
  regenerateBlock,
  selectDirection,
  startTraining,
  type WorkflowDeps,
  type WorkflowResult,
} from "@/app/trainings/workflow/persisted-workflow";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { createTestDb, type TestDb } from "../../../test/pglite-db";
import { instrumentDb } from "./instrumented-db";
import { approvalState, composeContentFromSnapshot, currentRevision } from "./snapshot";
import { appendWorkflowEvent, composeStoredContentPackage, getApprovalState, loadTrainingRecordSnapshot } from "./training-record";
import { deriveWorkspace, listTrainingSummaries, loadTrainingWorkspace } from "./workspace";
import { approveBlueprint } from "../../../test/workflow-helpers";

/*
 * Step 11D: de snapshot-implementatie levert exact dezelfde uitkomsten als de approvalregels, met een klein en vast
 * aantal queries. De query-tellingen maken een terugkeer van N+1 direct zichtbaar.
 */

const TEXT = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
const mock = { promptVersion: "mock", modelVersion: "mock" };

let base: TestDb;
beforeAll(async () => {
  base = await createTestDb();
}, 60_000);
afterAll(async () => {
  await base?.close();
});
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

function setup() {
  const counted = instrumentDb(base);
  const deps: WorkflowDeps = {
    db: counted.db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: () => createBlockContentService({}),
    provenance: { analysis: mock, blueprint: mock, blockPlan: mock, blockContent: mock },
    log: () => {},
  };
  return { deps, ...counted };
}

const ws = (r: WorkflowResult) => {
  if (r.status !== "ok") throw new Error(r.reason);
  return r.workspace;
};

async function trainingAtContent(deps: WorkflowDeps) {
  const started = await startTraining(deps, {
    kind: "praktijkvraag",
    text: TEXT,
    acknowledgement: { textHash: await hashPreflightText(TEXT), acknowledgedFindingIds: [], syntheticDataAttested: true },
  });
  if (started.status !== "created") throw new Error(started.reason);
  const id = started.trainingId;
  const analysis = ws(started.analysis).analysis!;
  const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
  ws(await selectDirection(deps, id, analysis.revisionId, direction));
  ws(await generateBlueprint(deps, id));
  ws(await approveBlueprint(deps, id));
  ws(await decideRevision(deps, id, ws(await generateBlockPlan(deps, id)).blockPlan!.revisionId, "approved"));
  return id;
}

describe("query-tellingen (geen N+1)", () => {
  it("heropenen: vier bulkqueries, ongeacht het aantal blokken, revisions en events", async () => {
    const { deps, stats, reset, db } = setup();
    const id = await trainingAtContent(deps);
    const content = ws(await generateContent(deps, id)).content!;
    const generated = content.package.blocks.filter((b) => b.body.status === "generated").map((b) => b.plannedBlockId);
    for (const blockId of generated.slice(0, 3)) ws(await decideRevision(deps, id, content.blockRevisions[blockId].revisionId, "approved"));
    reset();
    const view = await loadTrainingWorkspace(db, id);
    expect(view?.progress.approvedBlocks).toBe(3);
    expect(stats.count).toBe(4);
  });

  it("één blokbesluit: één vergrendelde snapshot, één insert en één nieuwe weergave (≤ 8 queries), ook na eerdere goedkeuringen", async () => {
    const { deps, stats, reset } = setup();
    const id = await trainingAtContent(deps);
    const content = ws(await generateContent(deps, id)).content!;
    const generated = content.package.blocks.filter((b) => b.body.status === "generated").map((b) => b.plannedBlockId);
    const counts: number[] = [];
    for (const blockId of generated.slice(0, 4)) {
      reset();
      ws(await decideRevision(deps, id, content.blockRevisions[blockId].revisionId, "approved"));
      counts.push(stats.count);
    }
    expect(Math.max(...counts)).toBeLessThanOrEqual(8);
    expect(new Set(counts).size).toBe(1); // groeit niet met het aantal goedgekeurde blokken
  });

  it("contentgeneratie: één snapshot vooraf, per opgeslagen artifact een vaste write, één weergave achteraf", async () => {
    const { deps, stats, reset } = setup();
    const id = await trainingAtContent(deps);
    reset();
    const view = ws(await generateContent(deps, id));
    const writes = view.progress.totalBlocks + 2; // blokken + Start + Einde
    // snapshot (4) + per write: lock, revisions, events, insert (4) + weergave (4)
    expect(stats.count).toBeLessThanOrEqual(4 + writes * 4 + 4);
  });

  it("de trainingenlijst: vijf queries, ongeacht het aantal trainingen", async () => {
    const { deps, stats, reset, db } = setup();
    await trainingAtContent(deps);
    await trainingAtContent(deps);
    reset();
    const summaries = await listTrainingSummaries(db);
    expect(summaries.length).toBeGreaterThanOrEqual(2);
    expect(stats.count).toBe(5);
  });
});

describe("snapshot = bestaande regels", () => {
  it("approvalState uit de snapshot is gelijk aan getApprovalState voor iedere revision, ook stale, herzien en ingetrokken", async () => {
    const { deps } = setup();
    const id = await trainingAtContent(deps);
    const content = ws(await generateContent(deps, id)).content!;
    const generated = content.package.blocks.filter((b) => b.body.status === "generated").map((b) => b.plannedBlockId);
    ws(await decideRevision(deps, id, content.blockRevisions[generated[0]].revisionId, "approved"));
    ws(await decideRevision(deps, id, content.blockRevisions[generated[1]].revisionId, "needs_revision"));
    ws(await decideRevision(deps, id, content.blockRevisions[generated[2]].revisionId, "approved"));
    await appendWorkflowEvent(base, { trainingId: id, artifactRevisionId: content.blockRevisions[generated[2]].revisionId, eventType: "revoked" });
    ws(await regenerateBlock(deps, id, generated[0], content.blockRevisions[generated[0]].revisionId)); // oude revision wordt historie

    const snap = (await loadTrainingRecordSnapshot(base, id))!;
    expect(snap.revisions.length).toBeGreaterThan(10);
    for (const revision of snap.revisions) {
      expect(approvalState(snap, revision.id)).toEqual(await getApprovalState(base, revision.id));
    }
    expect(composeContentFromSnapshot(snap)).toEqual(await composeStoredContentPackage(base, id));
    expect(deriveWorkspace(snap)).toEqual(await loadTrainingWorkspace(base, id));
    const regenerated = currentRevision(snap, "block_content", generated[0])!;
    expect(regenerated.revisionNo).toBe(2);
    expect(approvalState(snap, regenerated.id)).toEqual({ approved: false, reason: "no_decision" });
  });
});
