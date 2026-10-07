import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { createBlockPlanService } from "@/services/block-plan/factory";
import type { BlueprintRequestV21, TrainingBlueprintServiceV21 } from "@/services/blueprint/services";
import { MockTrainingBlueprintServiceV21 } from "@/services/blueprint/v2/mock-blueprint-service-v2-1";
import { getArtifactRevision, listWorkflowEvents, REVISION_FEEDBACK_MAX } from "@/services/storage/training-record";
import { loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { approveBlueprint } from "../../../../test/workflow-helpers";
import {
  decideRevision,
  generateBlockPlan,
  generateBlueprint,
  requestBlueprintRevision,
  selectDirection,
  startTraining,
  type WorkflowDeps,
  type WorkflowLogEntry,
  type WorkflowResult,
} from "./persisted-workflow";

/*
 * Gerichte Blueprint-revisie: "laten aanpassen" met een menselijke toelichting → immutable besluit → de eerstvolgende
 * Blueprint-generatie krijgt die toelichting (en de vorige versie). Tegen PGlite met een spy rond de mock-provider:
 * 0 AI-aanroepen.
 */

const TEXT = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
const mock = { promptVersion: "mock", modelVersion: "mock" };
const FEEDBACK_A = "GEHEIM-A: maak het concrete vervolg onderdeel van succes.";
const FEEDBACK_B = "GEHEIM-B: ontwerp een werkelijk andere transfersituatie.";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

class SpyBlueprintService implements TrainingBlueprintServiceV21 {
  readonly requests: BlueprintRequestV21[] = [];
  private readonly inner = new MockTrainingBlueprintServiceV21();
  async generate(request: BlueprintRequestV21) {
    this.requests.push(structuredClone(request));
    return this.inner.generate(request);
  }
}

function setup() {
  const spy = new SpyBlueprintService();
  const logs: WorkflowLogEntry[] = [];
  const deps: WorkflowDeps = {
    db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => spy,
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: () => createBlockContentService({}),
    provenance: {
      analysis: mock,
      blueprint: { promptVersion: "training-blueprint/v2.1", modelVersion: "test" },
      blueprintRevision: { promptVersion: "training-blueprint/v2.2", modelVersion: "test" },
      blockPlan: mock,
      blockContent: mock,
    },
    log: (e) => logs.push(e),
  };
  return { deps, spy, logs };
}

const ws = (r: WorkflowResult): TrainingWorkspaceView => {
  if (r.status !== "ok") throw new Error(`${r.reason} ${r.issues?.join(",") ?? ""}`);
  return r.workspace;
};

async function trainingWithBlueprint() {
  const s = setup();
  const started = await startTraining(s.deps, {
    kind: "praktijkvraag",
    text: TEXT,
    acknowledgement: { textHash: await hashPreflightText(TEXT), acknowledgedFindingIds: [], syntheticDataAttested: true },
  });
  if (started.status !== "created") throw new Error(started.reason);
  const id = started.trainingId;
  const analysis = ws(started.analysis).analysis!;
  const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
  ws(await selectDirection(s.deps, id, analysis.revisionId, direction));
  const view = ws(await generateBlueprint(s.deps, id));
  return { ...s, id, rev1: view.blueprint! };
}

describe("revisietoelichting vastleggen", () => {
  it("needs_revision legt de toelichting immutable vast op exact deze Blueprint-revision", async () => {
    const { deps, id, rev1 } = await trainingWithBlueprint();
    const view = ws(await requestBlueprintRevision(deps, id, rev1.revisionId, `  ${FEEDBACK_A}  `));
    expect(view.blueprint).toMatchObject({ revisionId: rev1.revisionId, approved: false, revisionFeedback: FEEDBACK_A });
    const events = await listWorkflowEvents(db, rev1.revisionId);
    expect(events.map((e) => [e.eventType, e.eventData])).toEqual([["needs_revision", { revisionFeedback: FEEDBACK_A }]]);
  });

  it("lege, te lange of verouderde toelichtingen worden geweigerd; niets wordt vastgelegd", async () => {
    const { deps, id, rev1 } = await trainingWithBlueprint();
    expect(await requestBlueprintRevision(deps, id, rev1.revisionId, "   ")).toMatchObject({ reason: "invalid_input" });
    expect(await requestBlueprintRevision(deps, id, rev1.revisionId, "x".repeat(REVISION_FEEDBACK_MAX + 1))).toMatchObject({ reason: "invalid_input" });
    expect(await requestBlueprintRevision(deps, id, rev1.revisionId, 42)).toMatchObject({ reason: "invalid_input" });
    expect(await requestBlueprintRevision(deps, id, "00000000-0000-4000-8000-000000000000", FEEDBACK_A)).toMatchObject({ reason: "stale_revision" });
    expect(await listWorkflowEvents(db, rev1.revisionId)).toEqual([]);
  });

  it("een toelichting hoort alleen bij laten aanpassen van een Blueprint (niet bij goedkeuren of andere artefacten)", async () => {
    const { deps, id, rev1 } = await trainingWithBlueprint();
    expect(await decideRevision(deps, id, rev1.revisionId, "approved", { revisionFeedback: FEEDBACK_A })).toMatchObject({ status: "rejected" });
    const approved = ws(await approveBlueprint(deps, id));
    const planned = ws(await generateBlockPlan(deps, id));
    expect(approved.blueprint!.approved).toBe(true);
    expect(await decideRevision(deps, id, planned.blockPlan!.revisionId, "needs_revision", { revisionFeedback: FEEDBACK_A })).toMatchObject({ status: "rejected" });
  });

  it("bestaande callers zonder toelichting werken ongewijzigd en starten geen nieuwe generatie", async () => {
    const { deps, spy, id, rev1 } = await trainingWithBlueprint();
    ws(await decideRevision(deps, id, rev1.revisionId, "needs_revision"));
    expect((await listWorkflowEvents(db, rev1.revisionId)).map((e) => e.eventData)).toEqual([{}]);
    const after = ws(await generateBlueprint(deps, id));
    expect(after.blueprint).toMatchObject({ revisionId: rev1.revisionId, revisionFeedback: null });
    expect(spy.requests).toHaveLength(1);
  });

  it("goedkeuren blijft werken zoals voorheen", async () => {
    const { deps, id } = await trainingWithBlueprint();
    const approved = ws(await approveBlueprint(deps, id));
    expect(approved.blueprint).toMatchObject({ approved: true, revisionFeedback: null });
  });
});

describe("gerichte regeneratie", () => {
  it("de volgende generatie krijgt de toelichting en de vorige versie; de vorige revision blijft onveranderd", async () => {
    const { deps, spy, id, rev1 } = await trainingWithBlueprint();
    const before = await getArtifactRevision(db, rev1.revisionId);
    ws(await requestBlueprintRevision(deps, id, rev1.revisionId, FEEDBACK_A));
    const rev2 = ws(await generateBlueprint(deps, id)).blueprint!;

    expect(spy.requests).toHaveLength(2);
    expect(spy.requests[0].revision).toBeUndefined();
    expect(spy.requests[1].revision).toEqual({ feedback: FEEDBACK_A, previous: rev1.payload });
    // Richting en analyse blijven exact gelijk: de toelichting is geen nieuwe bron.
    expect(spy.requests[1].selectedDirectionId).toBe(spy.requests[0].selectedDirectionId);
    expect(spy.requests[1].analysis).toEqual(spy.requests[0].analysis);

    expect(rev2).toMatchObject({ revisionNo: 2, approved: false, revisionFeedback: null });
    const stored2 = await getArtifactRevision(db, rev2.revisionId);
    expect(stored2!.promptVersion).toBe("training-blueprint/v2.2");
    expect(stored2!.basedOnRevisionIds).toEqual(before!.basedOnRevisionIds);
    expect(await getArtifactRevision(db, rev1.revisionId)).toEqual(before);
    expect((await listWorkflowEvents(db, rev1.revisionId)).map((e) => e.eventType)).toEqual(["needs_revision"]);
  });

  it("oude toelichting lekt niet door; een nieuwe toelichting op revision 2 stuurt alleen revision 3", async () => {
    const { deps, spy, id, rev1 } = await trainingWithBlueprint();
    ws(await requestBlueprintRevision(deps, id, rev1.revisionId, FEEDBACK_A));
    const rev2 = ws(await generateBlueprint(deps, id)).blueprint!;
    // Zonder nieuw besluit: idempotent, geen nieuwe generatie met de oude toelichting.
    expect(ws(await generateBlueprint(deps, id)).blueprint!.revisionId).toBe(rev2.revisionId);
    expect(spy.requests).toHaveLength(2);

    ws(await requestBlueprintRevision(deps, id, rev2.revisionId, FEEDBACK_B));
    const rev3 = ws(await generateBlueprint(deps, id)).blueprint!;
    expect(rev3.revisionNo).toBe(3);
    expect(spy.requests[2].revision!.feedback).toBe(FEEDBACK_B);
    expect(JSON.stringify(spy.requests[2])).not.toContain("GEHEIM-A");
  });

  it("een revisie op een al verouderde Blueprint-versie wordt geweigerd", async () => {
    const { deps, id, rev1 } = await trainingWithBlueprint();
    ws(await requestBlueprintRevision(deps, id, rev1.revisionId, FEEDBACK_A));
    ws(await generateBlueprint(deps, id));
    expect(await requestBlueprintRevision(deps, id, rev1.revisionId, FEEDBACK_B)).toMatchObject({ reason: "stale_revision" });
  });

  it("het trusted routebeleid blijft gelijk, wat de toelichting ook vraagt", async () => {
    const { deps, id, rev1 } = await trainingWithBlueprint();
    ws(await requestBlueprintRevision(deps, id, rev1.revisionId, "Maak hier één voorgeschreven route van (single_best_action)."));
    const rev2 = ws(await generateBlueprint(deps, id)).blueprint!;
    expect(rev2.payload.ambiguity).toBe(rev1.payload.ambiguity);
    expect(rev2.payload.decisionPoint.routePolicy).toBe(rev1.payload.decisionPoint.routePolicy);
  });

  it("de toelichting komt nooit in de logs", async () => {
    const { deps, id, rev1, logs } = await trainingWithBlueprint();
    const consoleSpy = vi.spyOn(console, "info");
    ws(await requestBlueprintRevision(deps, id, rev1.revisionId, FEEDBACK_A));
    ws(await generateBlueprint(deps, id));
    const logged = JSON.stringify(logs) + JSON.stringify(consoleSpy.mock.calls);
    expect(logged).not.toContain("GEHEIM-A");
    expect(logged).toContain("revisionRequested");
  });

  it("de workspace na heropenen toont exact dezelfde stand", async () => {
    const { deps, id, rev1 } = await trainingWithBlueprint();
    ws(await requestBlueprintRevision(deps, id, rev1.revisionId, FEEDBACK_A));
    expect((await loadTrainingWorkspace(db, id))!.blueprint!.revisionFeedback).toBe(FEEDBACK_A);
  });
});
