import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import type { BlockContentResult } from "@/modules/block-content";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import type { BlockContentService } from "@/services/block-content/services";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import {
  getCurrentArtifactRevision,
  listArtifactRevisions,
  listWorkflowEvents,
  type ArtifactRevision,
} from "@/services/storage/training-record";
import { listTrainingSummaries, loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import {
  decideRevision,
  generateBlockPlan,
  generateBlueprint,
  generateContent,
  regenerateBlock,
  runAnalysis,
  selectDirection,
  startTraining,
  type WorkflowDeps,
  type WorkflowResult,
} from "./persisted-workflow";

/*
 * De persisted workflow tegen PGlite (dezelfde migratie als Supabase) met de mock-providers. Bewijst dat iedere stap
 * de waarheid uit de database haalt, dat herladen hetzelfde oplevert en dat verouderde of dubbele acties niets
 * kapotmaken. 0 Claude-aanroepen.
 */

const TEXT = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

const mockProvenance = { promptVersion: "mock", modelVersion: "mock" };

/** Deps met echte mock-services, spionnen op de factories (providercreaties) en op de aanroepen. */
function makeDeps() {
  const analysis = createTrainingAnalysisServiceV21({});
  const blueprint = createTrainingBlueprintServiceV21({});
  const blockPlan = createBlockPlanService({});
  const content = createBlockContentService({});
  const spies = {
    analyze: vi.spyOn(analysis, "analyze"),
    blueprint: vi.spyOn(blueprint, "generate"),
    blockPlan: vi.spyOn(blockPlan, "generate"),
    block: vi.spyOn(content, "generate"),
    frame: vi.spyOn(content, "generateFrame"),
  };
  const getters = {
    getAnalysisService: vi.fn(() => analysis),
    getBlueprintService: vi.fn(() => blueprint),
    getBlockPlanService: vi.fn(() => blockPlan),
    getBlockContentService: vi.fn((): BlockContentService => content),
  };
  const deps: WorkflowDeps = {
    db,
    ...getters,
    provenance: { analysis: mockProvenance, blueprint: mockProvenance, blockPlan: mockProvenance, blockContent: mockProvenance },
    log: () => {},
  };
  return { deps, spies, getters };
}

async function acknowledgement(text: string, attested = true) {
  const preflight = runPrivacyPreflight(text.trim());
  return {
    textHash: await hashPreflightText(text),
    acknowledgedFindingIds: preflight.findings.filter((f) => f.severity === "review_required").map((f) => f.id),
    syntheticDataAttested: attested,
  };
}

function workspaceOf(result: WorkflowResult): TrainingWorkspaceView {
  if (result.status !== "ok") throw new Error(`verwacht ok, kreeg ${result.reason}`);
  return result.workspace;
}

async function newTraining(deps: WorkflowDeps) {
  const started = await startTraining(deps, { kind: "praktijkvraag", text: TEXT, acknowledgement: await acknowledgement(TEXT) });
  if (started.status !== "created") throw new Error(started.reason);
  return { trainingId: started.trainingId, workspace: workspaceOf(started.analysis) };
}

/** De keten tot en met een goedgekeurd Block Plan. */
async function approvedPlan(deps: WorkflowDeps) {
  const { trainingId, workspace } = await newTraining(deps);
  const analysis = workspace.analysis!;
  const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
  workspaceOf(await selectDirection(deps, trainingId, analysis.revisionId, direction));
  const withBlueprint = workspaceOf(await generateBlueprint(deps, trainingId));
  workspaceOf(await decideRevision(deps, trainingId, withBlueprint.blueprint!.revisionId, "approved"));
  const withPlan = workspaceOf(await generateBlockPlan(deps, trainingId));
  return { trainingId, direction, workspace: workspaceOf(await decideRevision(deps, trainingId, withPlan.blockPlan!.revisionId, "approved")) };
}

const reload = async (trainingId: string) => (await loadTrainingWorkspace(db, trainingId))!;

describe("invoer en analyse", () => {
  it("een nieuwe training is direct persistent; de analyse staat als revision en overleeft herladen", async () => {
    const { deps, spies } = makeDeps();
    const { trainingId, workspace } = await newTraining(deps);
    expect(workspace.training.code).toMatch(/^TR-\d{4,}$/);
    expect(workspace.input).toEqual({ kind: "praktijkvraag", text: TEXT });
    expect(workspace.progress.stage).toBe("analysis_ready");
    expect(spies.analyze).toHaveBeenCalledTimes(1);
    const again = await reload(trainingId);
    expect(again).toEqual(workspace);
    // Opnieuw analyseren is idempotent: geen tweede providercall, geen tweede revision.
    workspaceOf(await runAnalysis(deps, trainingId));
    expect(spies.analyze).toHaveBeenCalledTimes(1);
    expect(await listArtifactRevisions(db, trainingId, { artifactType: "analysis" })).toHaveLength(1);
  });

  it.each(["onderwerp", "praktijkvraag", "casus"] as const)("%s zonder attestatie: geen training, geen analyse", async (kind) => {
    const { deps, getters } = makeDeps();
    const before = (await db.query<{ n: number }>("select count(*)::int as n from training"))[0].n;
    const result = await startTraining(deps, { kind, text: TEXT, acknowledgement: await acknowledgement(TEXT, false) });
    expect(result).toMatchObject({ status: "rejected", reason: "input_gate", gateReason: "synthetic_data_attestation_required" });
    expect((await db.query<{ n: number }>("select count(*)::int as n from training"))[0].n).toBe(before);
    expect(getters.getAnalysisService).not.toHaveBeenCalled();
  });
});

describe("richting en Blueprint", () => {
  it("de gekozen richting is een workflow event en blijft na herladen zichtbaar", async () => {
    const { deps } = makeDeps();
    const { trainingId, workspace } = await newTraining(deps);
    const analysis = workspace.analysis!;
    const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
    expect(await selectDirection(deps, trainingId, analysis.revisionId, "bestaat-niet")).toMatchObject({ reason: "invalid_state" });
    expect(await selectDirection(deps, trainingId, "00000000-0000-0000-0000-000000000000", direction)).toMatchObject({ reason: "stale_revision" });
    workspaceOf(await selectDirection(deps, trainingId, analysis.revisionId, direction));
    workspaceOf(await selectDirection(deps, trainingId, analysis.revisionId, direction)); // dubbelklik
    expect((await listWorkflowEvents(db, analysis.revisionId)).filter((e) => e.eventType === "direction_selected")).toHaveLength(1);
    const again = await reload(trainingId);
    expect(again.analysis?.selectedDirectionId).toBe(direction);
    expect(again.progress.stage).toBe("direction_selected");
  });

  it("de Blueprint komt uit de opgeslagen analyse en richting; dubbel genereren maakt geen tweede revision", async () => {
    const { deps, spies } = makeDeps();
    const { trainingId, workspace } = await newTraining(deps);
    const analysis = workspace.analysis!;
    const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
    expect(await generateBlueprint(deps, trainingId)).toMatchObject({ reason: "invalid_state" }); // nog geen richting
    workspaceOf(await selectDirection(deps, trainingId, analysis.revisionId, direction));
    const stored = await getCurrentArtifactRevision(db, trainingId, "analysis");
    const after = workspaceOf(await generateBlueprint(deps, trainingId));
    expect(spies.blueprint).toHaveBeenCalledTimes(1);
    const request = spies.blueprint.mock.calls[0][0];
    expect(request.analysis).toEqual(stored!.payload);
    expect(request.selectedDirectionId).toBe(direction);
    expect(request.input).toEqual({ kind: "praktijkvraag", text: TEXT });
    workspaceOf(await generateBlueprint(deps, trainingId));
    expect(spies.blueprint).toHaveBeenCalledTimes(1);
    expect(await listArtifactRevisions(db, trainingId, { artifactType: "blueprint" })).toHaveLength(1);
    expect(after.progress.stage).toBe("blueprint_ready");
    // Na een Blueprint ligt de richting vast.
    const other = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections.find((d) => d.id !== direction)?.id : undefined;
    if (other) expect(await selectDirection(deps, trainingId, analysis.revisionId, other)).toMatchObject({ reason: "direction_locked" });
  });

  it("Blueprint-goedkeuring blijft na herladen; een dubbele goedkeuring is één event", async () => {
    const { deps } = makeDeps();
    const { trainingId } = await approvedPlan(deps);
    const view = await reload(trainingId);
    expect(view.blueprint?.approved).toBe(true);
    workspaceOf(await decideRevision(deps, trainingId, view.blueprint!.revisionId, "approved"));
    expect((await listWorkflowEvents(db, view.blueprint!.revisionId)).filter((e) => e.eventType === "approved")).toHaveLength(1);
  });

  it("een gemanipuleerde Blueprint in de database wordt niet gebruikt: het Block Plan vertrouwt alleen een geldige approval", async () => {
    const { deps, spies } = makeDeps();
    const { trainingId, workspace } = await newTraining(deps);
    const analysis = workspace.analysis!;
    const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
    await selectDirection(deps, trainingId, analysis.revisionId, direction);
    const bp = workspaceOf(await generateBlueprint(deps, trainingId)).blueprint!;
    await decideRevision(deps, trainingId, bp.revisionId, "approved");
    await db.exec("alter table artifact_revision disable trigger artifact_revision_immutable");
    await db.query(`update artifact_revision set payload = jsonb_set(payload, '{learningGoal}', '"Gemanipuleerd"') where id = $1`, [bp.revisionId]);
    await db.exec("alter table artifact_revision enable trigger artifact_revision_immutable");
    expect(await generateBlockPlan(deps, trainingId)).toMatchObject({ status: "rejected", reason: "invalid_state" });
    expect(spies.blockPlan).not.toHaveBeenCalled();
  });
});

describe("Block Plan", () => {
  it("vóór goedkeuring van de Blueprint: geweigerd; daarna uit de opgeslagen goedgekeurde Blueprint", async () => {
    const { deps, spies } = makeDeps();
    const { trainingId, workspace } = await newTraining(deps);
    const analysis = workspace.analysis!;
    const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
    await selectDirection(deps, trainingId, analysis.revisionId, direction);
    const bp = workspaceOf(await generateBlueprint(deps, trainingId)).blueprint!;
    expect(await generateBlockPlan(deps, trainingId)).toMatchObject({ reason: "invalid_state" });
    await decideRevision(deps, trainingId, bp.revisionId, "approved");
    const after = workspaceOf(await generateBlockPlan(deps, trainingId));
    expect(spies.blockPlan.mock.calls[0][0].blueprint).toEqual((await getCurrentArtifactRevision(db, trainingId, "blueprint"))!.payload);
    workspaceOf(await generateBlockPlan(deps, trainingId));
    expect(spies.blockPlan).toHaveBeenCalledTimes(1);
    expect(after.blockPlan?.approved).toBe(false);
    expect(after.progress.stage).toBe("block_plan_ready");
  });
});

describe("Training Content", () => {
  it("Start/Einde één keer, blokken uit opgeslagen upstream, Bron zonder provider; pakket identiek na herladen", async () => {
    const { deps, spies } = makeDeps();
    const { trainingId, workspace } = await approvedPlan(deps);
    expect(workspace.progress.stage).toBe("block_plan_approved");
    const result = workspaceOf(await generateContent(deps, trainingId));
    const plan = result.blockPlan!.payload;
    const bron = plan.plannedBlocks.filter((b) => b.certumPhase === "bron").length;
    expect(spies.frame).toHaveBeenCalledTimes(1);
    expect(spies.block).toHaveBeenCalledTimes(plan.plannedBlocks.length - bron);
    for (const call of spies.block.mock.calls) {
      expect(call[0].blueprint).toEqual(result.blueprint!.payload);
      expect(call[0].blockPlan).toEqual(plan);
    }
    expect(result.content?.package.blocks).toHaveLength(plan.plannedBlocks.length);
    expect(result.progress.stage).toBe("content_review");
    expect(await reload(trainingId)).toEqual(result);
    // Nog eens: niets nieuws te doen, geen aanroepen.
    workspaceOf(await generateContent(deps, trainingId));
    expect(spies.block).toHaveBeenCalledTimes(plan.plannedBlocks.length - bron);
    expect(spies.frame).toHaveBeenCalledTimes(1);
  });

  it("een onderbroken generatie hervat waar hij stopte", async () => {
    const { deps, getters } = makeDeps();
    const { trainingId } = await approvedPlan(deps);
    const real = getters.getBlockContentService();
    let calls = 0;
    getters.getBlockContentService.mockImplementation(() => ({
      generateFrame: (r) => real.generateFrame(r),
      generate: async (r) => {
        calls += 1;
        if (calls === 2) throw new Error("onderbreking");
        return real.generate(r);
      },
    }));
    const first = await generateContent(deps, trainingId);
    expect(first).toMatchObject({ status: "ok" });
    if (first.status !== "ok") return;
    expect(first.failedBlockId).not.toBeNull();
    expect(first.workspace.progress.stage).toBe("content_in_progress");
    const second = workspaceOf(await generateContent(deps, trainingId));
    expect(second.progress.stage).toBe("content_review");
    expect(second.content?.package.blocks).toHaveLength(second.progress.totalBlocks);
  });

  it("blokgoedkeuring en needs_revision blijven na herladen; regeneratie maakt revision +1 zonder oude goedkeuring", async () => {
    const { deps } = makeDeps();
    const { trainingId } = await approvedPlan(deps);
    const content = workspaceOf(await generateContent(deps, trainingId)).content!;
    const generated = content.package.blocks.filter((b) => b.body.status === "generated").map((b) => b.plannedBlockId);
    const [first, second] = generated;
    workspaceOf(await decideRevision(deps, trainingId, content.blockRevisions[first].revisionId, "approved"));
    workspaceOf(await decideRevision(deps, trainingId, content.blockRevisions[second].revisionId, "needs_revision"));
    const view = await reload(trainingId);
    const status = (id: string) => view.content!.package.blocks.find((b) => b.plannedBlockId === id)!.reviewStatus;
    expect(status(first)).toBe("approved");
    expect(status(second)).toBe("needs_revision");
    expect(view.progress.approvedBlocks).toBe(1);

    const oldRevision = view.content!.blockRevisions[first].revisionId;
    const after = workspaceOf(await regenerateBlock(deps, trainingId, first, oldRevision));
    expect(after.content!.blockRevisions[first].revisionNo).toBe(2);
    expect(after.content!.package.blocks.find((b) => b.plannedBlockId === first)!.reviewStatus).toBe("draft");
    expect(after.content!.package.start).toEqual(view.content!.package.start);
    expect(after.content!.package.end).toEqual(view.content!.package.end);
    const history = await listArtifactRevisions(db, trainingId, { artifactType: "block_content", artifactKey: first });
    expect(history.map((r: ArtifactRevision) => r.revisionNo)).toEqual([1, 2]);
    expect((history[0].payload as BlockContentResult).plannedBlockId).toBe(first);
  });

  it("verouderde acties worden geweigerd: oude revision goedkeuren, regenereren met een oude revision-id", async () => {
    const { deps } = makeDeps();
    const { trainingId } = await approvedPlan(deps);
    const content = workspaceOf(await generateContent(deps, trainingId)).content!;
    const id = content.package.blocks.find((b) => b.body.status === "generated")!.plannedBlockId;
    const old = content.blockRevisions[id].revisionId;
    workspaceOf(await regenerateBlock(deps, trainingId, id, old));
    expect(await decideRevision(deps, trainingId, old, "approved")).toMatchObject({ status: "rejected", reason: "stale_revision" });
    expect(await regenerateBlock(deps, trainingId, id, old)).toMatchObject({ status: "rejected", reason: "stale_revision" });
    expect(await listArtifactRevisions(db, trainingId, { artifactType: "block_content", artifactKey: id })).toHaveLength(2);
  });
});

describe("trainingenlijst en hervatten", () => {
  it("/trainings toont echte records met afgeleide voortgang; een training opent op het juiste punt", async () => {
    const { deps } = makeDeps();
    const { trainingId } = await approvedPlan(deps);
    const summaries = await listTrainingSummaries(db);
    const mine = summaries.find((s) => s.id === trainingId);
    expect(mine).toMatchObject({ progress: { stage: "block_plan_approved", label: "Block Plan goedgekeurd" } });
    expect(mine?.code).toMatch(/^TR-/);
    const view = await reload(trainingId);
    expect(view.progress.stage).toBe("block_plan_approved");
    expect(view.blueprint?.approved && view.blockPlan?.approved).toBe(true);
    expect(await loadTrainingWorkspace(db, "geen-uuid")).toBeNull();
  });
});
