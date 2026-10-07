import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlannedBlockAddition } from "@/modules/block-plan";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { getArtifactRevision } from "@/services/storage/training-record";
import { loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { approveBlueprint } from "../../../../test/workflow-helpers";
import { addBlockPlanBlock, saveBlockPlanBlockEdit } from "./editing";
import {
  decideRevision,
  generateBlockPlan,
  generateBlueprint,
  selectDirection,
  startTraining,
  type WorkflowDeps,
  type WorkflowLogEntry,
  type WorkflowResult,
} from "./persisted-workflow";

/*
 * Human Block Plan Override, toevoegen: een ontbrekend gepland blok invoegen als nieuwe Block Plan-revision (herkomst
 * manual-edit), met dezelfde invarianten als een gegenereerd plan. Tegen PGlite met mocks; de Block Plan-provider mag
 * na het genereren niet meer worden aangeroepen.
 */

const TEXT = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
const mock = { promptVersion: "mock", modelVersion: "mock" };
const SECRET = "GEHEIM-DOEL";

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

function setup() {
  const logs: WorkflowLogEntry[] = [];
  let planCalls = 0;
  const deps: WorkflowDeps = {
    db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => {
      planCalls++;
      return createBlockPlanService({});
    },
    getBlockContentService: () => createBlockContentService({}),
    provenance: { analysis: mock, blueprint: mock, blockPlan: mock, blockContent: mock },
    log: (e) => logs.push(e),
  };
  return { deps, logs, planCalls: () => planCalls };
}

const ws = (r: WorkflowResult): TrainingWorkspaceView => {
  if (r.status !== "ok") throw new Error(`${r.reason} ${r.issues?.join(",") ?? ""}`);
  return r.workspace;
};

async function trainingWithPlan() {
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
  ws(await generateBlueprint(s.deps, id));
  ws(await approveBlueprint(s.deps, id));
  const view = ws(await generateBlockPlan(s.deps, id));
  return { ...s, id, view };
}

const toetsBlock = (purpose = `${SECRET}: formele pilottoets, casus A met drie deelopdrachten.`): PlannedBlockAddition["block"] => ({
  certumPhase: "toets",
  catalogBlockId: "certum.bco.open-vraag",
  purpose,
  whyThisBlock: "Een open antwoord maakt de afweging zichtbaar voor menselijke beoordeling.",
  configurationIntent: [{ setting: "vraagintentie", intent: "Drie genummerde deelopdrachten." }],
});
const ordered = (v: TrainingWorkspaceView) => [...v.blockPlan!.payload.plannedBlocks].sort((a, b) => a.sequence - b.sequence);

describe("blok toevoegen aan een bestaand Block Plan", () => {
  it("geldig blok aan het einde: nieuwe revision, herkomst handmatig, vorige revision onveranderd, geen AI", async () => {
    const { deps, id, view, planCalls } = await trainingWithPlan();
    const callsBefore = planCalls();
    const rev1 = await getArtifactRevision(db, view.blockPlan!.revisionId);
    const added = ws(await addBlockPlanBlock(deps, id, view.blockPlan!.revisionId, { block: toetsBlock(), placement: { position: "end" } }));

    expect(added.blockPlan).toMatchObject({ revisionNo: 2, source: "manual", approved: false });
    const last = ordered(added).at(-1)!;
    expect(last).toMatchObject({ ...toetsBlock(), sequence: ordered(view).length + 1 });
    expect(added.blockPlan!.humanAddedBlockIds).toEqual([last.id]);
    expect(await getArtifactRevision(db, view.blockPlan!.revisionId)).toEqual(rev1);
    const stored = await getArtifactRevision(db, added.blockPlan!.revisionId);
    expect(stored).toMatchObject({ modelVersion: "manual-edit", promptVersion: null, basedOnRevisionIds: rev1!.basedOnRevisionIds });
    expect(planCalls()).toBe(callsBefore);
  });

  it("invoegen vóór en na een bestaand blok houdt ids en volgorde uniek en correct", async () => {
    const { deps, id, view } = await trainingWithPlan();
    const toets = ordered(view).filter((b) => b.certumPhase === "toets");
    const anchor = toets[0];
    const afterBefore = ws(await addBlockPlanBlock(deps, id, view.blockPlan!.revisionId, { block: toetsBlock("Casus A."), placement: { position: "before", anchorBlockId: anchor.id } }));
    const idsA = ordered(afterBefore).map((b) => b.id);
    expect(idsA.indexOf(afterBefore.blockPlan!.humanAddedBlockIds[0])).toBe(idsA.indexOf(anchor.id) - 1);

    const afterAfter = ws(await addBlockPlanBlock(deps, id, afterBefore.blockPlan!.revisionId, { block: toetsBlock("Casus B."), placement: { position: "after", anchorBlockId: anchor.id } }));
    const blocks = ordered(afterAfter);
    expect(blocks.map((b) => b.sequence)).toEqual(blocks.map((_, i) => i + 1));
    expect(new Set(blocks.map((b) => b.id)).size).toBe(blocks.length);
    const ids = blocks.map((b) => b.id);
    expect(ids.indexOf(anchor.id) + 1).toBe(ids.findIndex((x) => blocks.find((b) => b.id === x)!.purpose === "Casus B."));
    expect(afterAfter.blockPlan!.humanAddedBlockIds).toHaveLength(2);
  });

  it("dezelfde invarianten als een gegenereerd plan: catalogus, fasevolgorde, open keuze, maximum aantal blokken", async () => {
    const { deps, id, view } = await trainingWithPlan();
    const rev = view.blockPlan!.revisionId;
    const reject = { status: "rejected", reason: "invalid_input" };
    expect(await addBlockPlanBlock(deps, id, rev, { block: { ...toetsBlock(), catalogBlockId: "certum.bco.verzonnen" }, placement: { position: "end" } })).toMatchObject(reject);
    expect(await addBlockPlanBlock(deps, id, rev, { block: { ...toetsBlock(), catalogBlockId: "certum.bco.vaste-start" }, placement: { position: "end" } })).toMatchObject(reject);
    // Een Context-blok aan het einde breekt de methodiekvolgorde.
    expect(await addBlockPlanBlock(deps, id, rev, { block: { ...toetsBlock(), certumPhase: "context" }, placement: { position: "end" } })).toMatchObject({ ...reject, issues: ["fasen-niet-in-volgorde"] });
    expect(await addBlockPlanBlock(deps, id, rev, { block: { ...toetsBlock(), purpose: "Zie https://example.org" }, placement: { position: "end" } })).toMatchObject(reject);
    expect(await addBlockPlanBlock(deps, id, rev, { block: toetsBlock(), placement: { position: "end" }, id: "blok-1" })).toMatchObject(reject);
    expect(await addBlockPlanBlock(deps, id, rev, { block: toetsBlock(), placement: { position: "before", anchorBlockId: "blok-99" } })).toMatchObject({ status: "rejected", reason: "not_found" });

    // Maximaal 20 geplande blokken.
    let current = view;
    while (current.blockPlan!.payload.plannedBlocks.length < 20) {
      current = ws(await addBlockPlanBlock(deps, id, current.blockPlan!.revisionId, { block: toetsBlock("Extra."), placement: { position: "end" } }));
    }
    expect(await addBlockPlanBlock(deps, id, current.blockPlan!.revisionId, { block: toetsBlock(), placement: { position: "end" } })).toMatchObject(reject);
    expect((await loadTrainingWorkspace(db, id))!.blockPlan!.payload.plannedBlocks).toHaveLength(20);
  });

  it("een verouderde plan-revision wordt geweigerd (geen last-write-wins)", async () => {
    const { deps, id, view } = await trainingWithPlan();
    ws(await addBlockPlanBlock(deps, id, view.blockPlan!.revisionId, { block: toetsBlock(), placement: { position: "end" } }));
    expect(await addBlockPlanBlock(deps, id, view.blockPlan!.revisionId, { block: toetsBlock(), placement: { position: "end" } })).toMatchObject({ reason: "stale_revision" });
  });

  it("bestaande override (bewerken) en de goedkeuringsgate blijven werken na toevoegen", async () => {
    const { deps, id, view } = await trainingWithPlan();
    const approved = ws(await decideRevision(deps, id, view.blockPlan!.revisionId, "approved"));
    expect(approved.blockPlan!.approved).toBe(true);
    const added = ws(await addBlockPlanBlock(deps, id, approved.blockPlan!.revisionId, { block: toetsBlock(), placement: { position: "end" } }));
    // De oude goedkeuring geldt niet voor de nieuwe versie.
    expect(added.blockPlan!.approved).toBe(false);
    expect(added.progress.stage).toBe("block_plan_ready");
    const target = added.blockPlan!.humanAddedBlockIds[0];
    const b = ordered(added).find((x) => x.id === target)!;
    const edited = ws(
      await saveBlockPlanBlockEdit(deps, id, target, added.blockPlan!.revisionId, {
        catalogBlockId: b.catalogBlockId,
        purpose: "Aangescherpt door de opleider.",
        whyThisBlock: b.whyThisBlock,
        configurationIntent: b.configurationIntent,
      }),
    );
    expect(edited.blockPlan!.humanAddedBlockIds).toEqual([target]);
    const reapproved = ws(await decideRevision(deps, id, edited.blockPlan!.revisionId, "approved"));
    expect(reapproved.blockPlan!.approved).toBe(true);
  });

  it("logging blijft metadata-only", async () => {
    const { deps, id, view, logs } = await trainingWithPlan();
    const consoleSpy = vi.spyOn(console, "info");
    ws(await addBlockPlanBlock(deps, id, view.blockPlan!.revisionId, { block: toetsBlock(), placement: { position: "end" } }));
    const logged = JSON.stringify(logs) + JSON.stringify(consoleSpy.mock.calls);
    expect(logged).not.toContain(SECRET);
    expect(logs.some((l) => (l as { action?: string }).action === "add_block_plan_block")).toBe(true);
  });
});
