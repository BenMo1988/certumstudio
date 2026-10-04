import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { composeContentPackage, resolveBlockTarget, type BlockContentResult } from "@/modules/block-content";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { editableContentSchema } from "@/services/block-content/design";
import { MockBlockContentService } from "@/services/block-content/mock/mock-block-content-service";
import { generateBlockContent } from "@/services/block-content/orchestrator";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { getArtifactRevision, listArtifactRevisions } from "@/services/storage/training-record";
import { deriveReview, loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { fixtureCase } from "../../../../test/block-content-fixtures";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { revisionHistory, saveBlockEdit, saveFrameEdit } from "./editing";
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
} from "./persisted-workflow";

/*
 * Training Review & Editor V1 tegen PGlite met mock-providers. Een bewerking is altijd een nieuwe, immutable revision;
 * mens en AI volgen dezelfde regels; trusted velden zijn niet te wijzigen. 0 AI-aanroepen voor bewerken.
 */

const TEXT = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
const mock = { promptVersion: "mock", modelVersion: "mock" };

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

function deps(): WorkflowDeps {
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

const ws = (r: WorkflowResult): TrainingWorkspaceView => {
  if (r.status !== "ok") throw new Error(`${r.reason} ${r.issues?.join(",") ?? ""}`);
  return r.workspace;
};

/** Een training met gegenereerde inhoud. */
async function trainingWithContent() {
  const d = deps();
  const started = await startTraining(d, {
    kind: "praktijkvraag",
    text: TEXT,
    acknowledgement: { textHash: await hashPreflightText(TEXT), acknowledgedFindingIds: [], syntheticDataAttested: true },
  });
  if (started.status !== "created") throw new Error(started.reason);
  const id = started.trainingId;
  const analysis = ws(started.analysis).analysis!;
  const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
  ws(await selectDirection(d, id, analysis.revisionId, direction));
  ws(await decideRevision(d, id, ws(await generateBlueprint(d, id)).blueprint!.revisionId, "approved"));
  ws(await decideRevision(d, id, ws(await generateBlockPlan(d, id)).blockPlan!.revisionId, "approved"));
  return { d, id, view: ws(await generateContent(d, id)) };
}

const blockOf = (view: TrainingWorkspaceView, id: string) => view.content!.package.blocks.find((b) => b.plannedBlockId === id)!;
const firstOfType = (view: TrainingWorkspaceView, catalogBlockId: string) => view.content!.package.blocks.find((b) => b.catalogBlockId === catalogBlockId && b.body.status === "generated")!;
/** De bewerkbare velden van een opgeslagen blok (zoals de editor ze stuurt). */
function editable(block: BlockContentResult): Record<string, unknown> {
  if (block.body.status !== "generated") throw new Error("niet gegenereerd");
  const { catalogBlockId, ...rest } = block.body.content as Record<string, unknown>;
  void catalogBlockId;
  delete rest.availableContext;
  delete rest.unavailableContext;
  delete rest.minimumWords;
  return rest;
}

describe("handmatige bewerking van een blok", () => {
  it("maakt revision +1 (handmatig, concept); de oude revision en haar goedkeuring blijven historie", async () => {
    const { d, id, view } = await trainingWithContent();
    const tekst = firstOfType(view, "certum.bco.tekst");
    const rev1 = view.content!.blockRevisions[tekst.plannedBlockId];
    ws(await decideRevision(d, id, rev1.revisionId, "approved"));
    const original = await getArtifactRevision(db, rev1.revisionId);

    const after = ws(await saveBlockEdit(d, id, tekst.plannedBlockId, rev1.revisionId, { content: { ...editable(tekst), text: "Aangepaste situatieschets door de opleider." } }));
    const rev2 = after.content!.blockRevisions[tekst.plannedBlockId];
    expect(rev2).toMatchObject({ revisionNo: 2, previousRevisions: 1, source: "manual" });
    const edited = blockOf(after, tekst.plannedBlockId);
    expect(edited.reviewStatus).toBe("draft");
    expect(edited.body.status === "generated" && edited.body.content.catalogBlockId === "certum.bco.tekst" && edited.body.content.text).toBe("Aangepaste situatieschets door de opleider.");
    expect(await getArtifactRevision(db, rev1.revisionId)).toEqual(original);
    // Herladen toont de bewerking; het pakket is opgebouwd uit de bewerkte current revision.
    const reloaded = (await loadTrainingWorkspace(db, id))!;
    expect(reloaded).toEqual(after);
    expect(reloaded.content!.package).toEqual(
      composeContentPackage({
        blueprint: reloaded.blueprint!.payload,
        blockPlan: reloaded.blockPlan!.payload,
        frame: { start: reloaded.content!.package.start, end: reloaded.content!.package.end },
        blocks: reloaded.content!.package.blocks,
      }),
    );
  });

  it("trusted velden zijn niet te wijzigen: bloktype, routebeleid, fase, AI Feedback-context, minimumWords", async () => {
    const { d, id, view } = await trainingWithContent();
    const tekst = firstOfType(view, "certum.bco.tekst");
    const rev = view.content!.blockRevisions[tekst.plannedBlockId].revisionId;
    for (const extra of [{ catalogBlockId: "certum.bco.poll" }, { routePolicy: "prescribed_action" }, { certumPhase: "toets" }, { plannedBlockId: "blok-9" }]) {
      const result = await saveBlockEdit(d, id, tekst.plannedBlockId, rev, { content: { ...editable(tekst), ...extra } });
      expect(result).toMatchObject({ status: "rejected", reason: "invalid_input" });
    }
    const feedback = firstOfType(view, "certum.bco.ai-feedback");
    const fbRev = view.content!.blockRevisions[feedback.plannedBlockId].revisionId;
    expect(await saveBlockEdit(d, id, feedback.plannedBlockId, fbRev, { content: { ...editable(feedback), availableContext: ["blok-2"] } })).toMatchObject({ reason: "invalid_input" });
    const ok = ws(await saveBlockEdit(d, id, feedback.plannedBlockId, fbRev, { content: { ...editable(feedback), instructions: "Nieuwe feedbackinstructie." } }));
    const edited = blockOf(ok, feedback.plannedBlockId);
    if (edited.body.status !== "generated" || edited.body.content.catalogBlockId !== "certum.bco.ai-feedback" || feedback.body.status !== "generated" || feedback.body.content.catalogBlockId !== "certum.bco.ai-feedback") throw new Error();
    expect(edited.body.content.availableContext).toEqual(feedback.body.content.availableContext);
    expect(edited.body.content.unavailableContext).toEqual(feedback.body.content.unavailableContext);
    expect(edited).toMatchObject({ catalogBlockId: feedback.catalogBlockId, certumPhase: feedback.certumPhase, routePolicy: feedback.routePolicy, sequence: feedback.sequence });
    expect(await listArtifactRevisions(db, id, { artifactType: "block_content", artifactKey: tekst.plannedBlockId })).toHaveLength(1);
  });

  it("verouderde en dubbele opslag: stale_revision, geen last-write-wins en geen corrupte revision", async () => {
    const { d, id, view } = await trainingWithContent();
    const tekst = firstOfType(view, "certum.bco.tekst");
    const rev1 = view.content!.blockRevisions[tekst.plannedBlockId].revisionId;
    const edit = { content: { ...editable(tekst), text: "Versie A." } };
    ws(await saveBlockEdit(d, id, tekst.plannedBlockId, rev1, edit));
    expect(await saveBlockEdit(d, id, tekst.plannedBlockId, rev1, { content: { ...editable(tekst), text: "Versie B." } })).toMatchObject({ reason: "stale_revision" });
    expect(await saveBlockEdit(d, id, tekst.plannedBlockId, rev1, edit)).toMatchObject({ reason: "stale_revision" });
    const history = await listArtifactRevisions(db, id, { artifactType: "block_content", artifactKey: tekst.plannedBlockId });
    expect(history.map((r) => r.revisionNo)).toEqual([1, 2]);
    // Opslaan zonder wijziging maakt geen nieuwe revision.
    const latest = (await loadTrainingWorkspace(db, id))!;
    const current = latest.content!.blockRevisions[tekst.plannedBlockId].revisionId;
    ws(await saveBlockEdit(d, id, tekst.plannedBlockId, current, { content: editable(blockOf(latest, tekst.plannedBlockId)) }));
    expect(await listArtifactRevisions(db, id, { artifactType: "block_content", artifactKey: tekst.plannedBlockId })).toHaveLength(2);
  });

  it("geschatte minuten zijn bewerkbaar binnen het contract (geheel getal 1–120 of leeg)", async () => {
    const { d, id, view } = await trainingWithContent();
    const tekst = firstOfType(view, "certum.bco.tekst");
    const rev = view.content!.blockRevisions[tekst.plannedBlockId].revisionId;
    for (const bad of [0, 2.5, 500, "10"]) {
      expect(await saveBlockEdit(d, id, tekst.plannedBlockId, rev, { content: editable(tekst), estimatedMinutes: bad })).toMatchObject({ reason: "invalid_input" });
    }
    const after = ws(await saveBlockEdit(d, id, tekst.plannedBlockId, rev, { content: editable(tekst), estimatedMinutes: 12 }));
    expect(blockOf(after, tekst.plannedBlockId).accreditation.estimatedMinutes).toBe(12);
    expect(blockOf(after, tekst.plannedBlockId).accreditation.workform).toBe(tekst.accreditation.workform);
  });

  it("niet-gegenereerde blokken (bron nodig) hebben geen editor", async () => {
    const { d, id, view } = await trainingWithContent();
    const bron = view.content!.package.blocks.find((b) => b.body.status === "needs_source")!;
    const rev = view.content!.blockRevisions[bron.plannedBlockId].revisionId;
    expect(await saveBlockEdit(d, id, bron.plannedBlockId, rev, { content: { title: "x", text: "Kennis" } })).toMatchObject({ reason: "invalid_state" });
  });

  it("historie: nieuwste eerst, met herkomst; een blokbewerking verandert Start en Einde niet", async () => {
    const { d, id, view } = await trainingWithContent();
    const chat = firstOfType(view, "certum.bco.chat-simulatie");
    const rev1 = view.content!.blockRevisions[chat.plannedBlockId].revisionId;
    const after = ws(await saveBlockEdit(d, id, chat.plannedBlockId, rev1, { content: { ...editable(chat), firstMessage: "Goedemiddag, waar wilde je het over hebben?" } }));
    expect(after.content!.frame).toEqual(view.content!.frame);
    expect(after.content!.package.start).toEqual(view.content!.package.start);
    expect(after.content!.package.end).toEqual(view.content!.package.end);
    const history = (await revisionHistory(d, id, { plannedBlockId: chat.plannedBlockId }))!;
    expect(history.map((h) => [h.revisionNo, h.source, h.current])).toEqual([[2, "manual", true], [1, "generated", false]]);
    // Regenereren na een handmatige bewerking: revision 3, weer gegenereerd.
    const regen = ws(await regenerateBlock(d, id, chat.plannedBlockId, after.content!.blockRevisions[chat.plannedBlockId].revisionId));
    expect(regen.content!.blockRevisions[chat.plannedBlockId]).toMatchObject({ revisionNo: 3, source: "generated" });
  });
});

describe("dezelfde inhoudsregels voor mens en AI", () => {
  it("Poll krijgt geen juist antwoord; open_choice-Chat geen sleutelwoorddoel; Conditionele logica geen andere bron", () => {
    const blp3 = fixtureCase("BLP-003");
    const poll = editableContentSchema(resolveBlockTarget(blp3.blueprint, blp3.blockPlan, "blok-3")!);
    const pollEdit = { title: "Keuze", question: "Wat doe je eerst?", options: ["A", "B"] };
    expect(poll.safeParse(pollEdit).success).toBe(true);
    expect(poll.safeParse({ ...pollEdit, correctOptionIndex: 0 }).success).toBe(false);

    const blp1 = fixtureCase("BLP-001");
    const chat = editableContentSchema(resolveBlockTarget(blp1.blueprint, blp1.blockPlan, "blok-2")!);
    const chatEdit = { title: "t", personaName: "Sam", personaInstructions: "i", scenarioContext: null, firstMessage: "Hoi", goal: null, timeLimitMinutes: null };
    expect(chat.safeParse(chatEdit).success).toBe(true);
    expect(chat.safeParse({ ...chatEdit, goal: { keywords: ["grens"], messageOnGoal: "Goed", instructionAfterGoal: "Rond af" } }).success).toBe(false);

    const cond = editableContentSchema(resolveBlockTarget(blp3.blueprint, blp3.blockPlan, "blok-5")!);
    const condEdit = { title: "t", sourceBlockId: "blok-3", condition: "heeft_geantwoord", value: null, textIfTrue: "a", textIfFalse: "b" };
    expect(cond.safeParse(condEdit).success).toBe(true);
    expect(cond.safeParse({ ...condEdit, sourceBlockId: "blok-6" }).success).toBe(false);

    const blp2 = fixtureCase("BLP-002");
    const productie = editableContentSchema(resolveBlockTarget(blp2.blueprint, blp2.blockPlan, "blok-3")!);
    const prodEdit = { title: "t", productType: "anders", instructions: "Schrijf de melding.", template: null };
    expect(productie.safeParse(prodEdit).success).toBe(true);
    expect(productie.safeParse({ ...prodEdit, minimumWords: 40 }).success).toBe(false);
  });
});

describe("Start en Einde", () => {
  it("bewerken maakt een nieuwe Start- of Einde-revision; titel, leerdoel en vervolg blijven trusted", async () => {
    const { d, id, view } = await trainingWithContent();
    const blocksBefore = view.content!.blockRevisions;
    const start = ws(await saveFrameEdit(d, id, "start", view.content!.frame.start.revisionId, { introduction: "Welkom bij deze praktijksimulatie." }));
    expect(start.content!.frame.start).toMatchObject({ revisionNo: 2, source: "manual", approved: false });
    expect(start.content!.package.start).toMatchObject({ introduction: "Welkom bij deze praktijksimulatie.", title: view.blueprint!.payload.title, learningGoals: [view.blueprint!.payload.learningGoal] });
    expect(await saveFrameEdit(d, id, "start", view.content!.frame.start.revisionId, { introduction: "Te laat." })).toMatchObject({ reason: "stale_revision" });
    expect(await saveFrameEdit(d, id, "start", start.content!.frame.start.revisionId, { introduction: "x", title: "Andere titel" })).toMatchObject({ reason: "invalid_input" });

    const end = ws(await saveFrameEdit(d, id, "end", view.content!.frame.end.revisionId, { closingText: "Dank je wel.", summary: null }));
    expect(end.content!.frame.end).toMatchObject({ revisionNo: 2, source: "manual" });
    expect(end.content!.package.end).toEqual({ closingText: "Dank je wel.", summary: null, followUpRecommendation: null });
    expect(await saveFrameEdit(d, id, "end", end.content!.frame.end.revisionId, { closingText: "x", summary: null, followUpRecommendation: "Intervisie" })).toMatchObject({ reason: "invalid_input" });
    expect(end.content!.blockRevisions).toEqual(blocksBefore);
  });
});

describe("readiness van de training", () => {
  it("incomplete bij een open behoefte; in_review tot alles én Start/Einde is goedgekeurd; dan approved", async () => {
    const mock = new MockBlockContentService();
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const all = await Promise.all(blockPlan.plannedBlocks.map(async (b) => (await generateBlockContent(() => mock, { blueprint, blockPlan, plannedBlockId: b.id, approvedEarlierContent: [] })).block));
    const frame = await mock.generateFrame({ blueprint, blockPlan });
    const pkg = (blocks: BlockContentResult[], plan = blockPlan) => composeContentPackage({ blueprint, blockPlan: plan, frame, blocks });
    const approvedFrame = { start: { approved: true }, end: { approved: true } };

    expect(deriveReview(pkg(all), blockPlan, approvedFrame)).toMatchObject({ readiness: "incomplete", source: 1 });
    const plan = { ...blockPlan, plannedBlocks: blockPlan.plannedBlocks.filter((b) => b.certumPhase !== "bron") };
    const blocks = all.filter((b) => b.certumPhase !== "bron");
    expect(deriveReview(pkg(blocks, plan), plan, approvedFrame)).toMatchObject({ readiness: "in_review", draft: blocks.length, toReview: blocks.length });
    const approved = blocks.map((b) => ({ ...b, reviewStatus: "approved" as const }));
    expect(deriveReview(pkg(approved, plan), plan, approvedFrame)).toMatchObject({ readiness: "approved", toReview: 0 });
    expect(deriveReview(pkg(approved, plan), plan, { start: { approved: false }, end: { approved: true } })).toMatchObject({ readiness: "in_review", frameToReview: 1, toReview: 1 });
  });

  it("in de opgeslagen training: Start en Einde zijn goed te keuren en tellen mee", async () => {
    const { d, id, view } = await trainingWithContent();
    expect(view.content!.review).toMatchObject({ readiness: "incomplete", frameToReview: 2 });
    ws(await decideRevision(d, id, view.content!.frame.start.revisionId, "approved"));
    const after = ws(await decideRevision(d, id, view.content!.frame.end.revisionId, "approved"));
    expect(after.content!.frame.start.approved && after.content!.frame.end.approved).toBe(true);
    expect(after.content!.review.frameToReview).toBe(0);
  });
});

describe("prestatie van de editor", () => {
  it("een handmatige opslag: één snapshot, één vergrendelde write en één nieuwe weergave (≤ 12 queries); heropenen blijft 4", async () => {
    const { instrumentDb } = await import("@/services/storage/instrumented-db");
    const counted = instrumentDb(db);
    const { id, view } = await trainingWithContent();
    const d = { ...deps(), db: counted.db };
    const tekst = firstOfType(view, "certum.bco.tekst");
    counted.reset();
    ws(await saveBlockEdit(d, id, tekst.plannedBlockId, view.content!.blockRevisions[tekst.plannedBlockId].revisionId, { content: { ...editable(tekst), text: "Nieuwe tekst." } }));
    expect(counted.stats.count).toBeLessThanOrEqual(12);
    counted.reset();
    await loadTrainingWorkspace(counted.db, id);
    expect(counted.stats.count).toBe(4);
  });
});
