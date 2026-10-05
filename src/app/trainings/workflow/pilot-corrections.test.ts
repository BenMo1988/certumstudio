import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { checkBlockContentInvariants, deriveUnresolvedRequirements, type BlockContentResult } from "@/modules/block-content";
import { hashPreflightText } from "@/modules/privacy";
import { relevantContentIssue } from "@/modules/sources";
import { sourceNeedScope } from "@/modules/training-blueprint/v2";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { ORGANISATION_SPECIFIC_NOTE } from "@/services/block-content/mock/mock-block-content-service";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { BlueprintV21DesignSchema } from "@/services/blueprint/v2/design-v2-1";
import { MOCK_ORGANISATION_SPECIFIC } from "@/services/blueprint/v2/mock-blueprint-service-v2";
import { instrumentDb } from "@/services/storage/instrumented-db";
import { appendWorkflowEvent, getArtifactRevision, getTraining } from "@/services/storage/training-record";
import { loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { saveBlockPlanBlockEdit } from "./editing";
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
import { addSource, editSource, validateSource } from "./sources";

/*
 * Step 15A: productcorrecties uit de Full Training Pilot (TR-0014), tegen PGlite met mock-providers. 0 AI-aanroepen.
 * A. Human Block Plan Override · B. organisatiegebonden sourceNeeds · C. zichtbare bronvalidatie ·
 * D. trainingstitel · E. actuele unresolved refs.
 */

const GESPREK = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
const KEUZE = "Twee collega's verschillen van mening of het team eerst met het gezin overlegt of direct opschaalt. Welke route kies ik?";
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

function deps(base: WorkflowDeps["db"] = db): WorkflowDeps {
  return {
    db: base,
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

/** Tot en met een gegenereerd (nog niet goedgekeurd) Block Plan. */
async function trainingWithPlan(text: string, d: WorkflowDeps = deps(), directionIndex = 0) {
  const started = await startTraining(d, {
    kind: "praktijkvraag",
    text,
    acknowledgement: { textHash: await hashPreflightText(text), acknowledgedFindingIds: [], syntheticDataAttested: true },
  });
  if (started.status !== "created") throw new Error(started.reason);
  const id = started.trainingId;
  const analysis = ws(started.analysis).analysis!;
  const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[directionIndex].id : "";
  ws(await selectDirection(d, id, analysis.revisionId, direction));
  const bp = ws(await generateBlueprint(d, id));
  ws(await decideRevision(d, id, bp.blueprint!.revisionId, "approved"));
  return { d, id, view: ws(await generateBlockPlan(d, id)) };
}

const planBlock = (view: TrainingWorkspaceView, id: string) => view.blockPlan!.payload.plannedBlocks.find((b) => b.id === id)!;
const editOf = (view: TrainingWorkspaceView, id: string) => {
  const b = planBlock(view, id);
  return { catalogBlockId: b.catalogBlockId, purpose: b.purpose, whyThisBlock: b.whyThisBlock, configurationIntent: b.configurationIntent };
};
const CHAT = {
  catalogBlockId: "certum.bco.chat-simulatie",
  purpose: "Het gesprek met de betrokkene in het keuzemoment zelf voeren, onder druk.",
  whyThisBlock: "Het kernmoment is een gesprek onder druk; een rollenspel-chat laat de deelnemer werkelijk handelen.",
  configurationIntent: [
    { setting: "rol fictieve persoon", intent: "De betrokkene uit de situatie op het keuzemoment." },
    { setting: "gespreksdoel", intent: "Geen sleutelwoorddoel: de afweging wordt via AI Feedback beoordeeld." },
  ],
} as const;

describe("A. Human Block Plan Override", () => {
  it("een Open vraag in Actie wordt bewust een Chat simulatie: nieuwe revision, opnieuw goedkeuren, daarna Chat-inhoud", async () => {
    // De mockrichting "aanleiding" is geen gesprek: het Block Plan kiest dan een Open vraag in Actie.
    const { d, id, view } = await trainingWithPlan(KEUZE, deps(), 1);
    const actie = view.blockPlan!.payload.plannedBlocks.filter((b) => b.certumPhase === "actie");
    const open = actie.find((b) => b.catalogBlockId === "certum.bco.open-vraag")!;
    expect(open).toBeDefined();
    expect(view.blockPlan).toMatchObject({ revisionNo: 1, source: "generated", approved: false });
    const original = await getArtifactRevision(db, view.blockPlan!.revisionId);

    const edited = ws(await saveBlockPlanBlockEdit(d, id, open.id, view.blockPlan!.revisionId, CHAT));
    expect(edited.blockPlan).toMatchObject({ revisionNo: 2, source: "manual", approved: false });
    const block = planBlock(edited, open.id);
    expect(block).toMatchObject({ catalogBlockId: "certum.bco.chat-simulatie", purpose: CHAT.purpose, certumPhase: "actie", sequence: open.sequence, id: open.id });
    // Trusted velden en de andere blokken blijven gelijk; de oude revision is historie.
    expect(edited.blockPlan!.payload.courseShell).toEqual(view.blockPlan!.payload.courseShell);
    expect(edited.blockPlan!.payload.plannedBlocks.filter((b) => b.id !== open.id)).toEqual(view.blockPlan!.payload.plannedBlocks.filter((b) => b.id !== open.id));
    expect(await getArtifactRevision(db, view.blockPlan!.revisionId)).toEqual(original);
    expect(edited.progress.stage).toBe("block_plan_ready");

    ws(await decideRevision(d, id, edited.blockPlan!.revisionId, "approved"));
    const content = ws(await generateContent(d, id)).content!;
    const result = content.package.blocks.find((b) => b.plannedBlockId === open.id)!;
    expect(result.body.status === "generated" && result.body.content.catalogBlockId).toBe("certum.bco.chat-simulatie");
  });

  it("een eerdere goedkeuring gaat niet mee naar de nieuwe revision", async () => {
    const { d, id, view } = await trainingWithPlan(GESPREK);
    const approved = ws(await decideRevision(d, id, view.blockPlan!.revisionId, "approved"));
    expect(approved.blockPlan!.approved).toBe(true);
    const target = approved.blockPlan!.payload.plannedBlocks.find((b) => b.certumPhase === "context")!;
    const edited = ws(
      await saveBlockPlanBlockEdit(d, id, target.id, approved.blockPlan!.revisionId, { ...editOf(approved, target.id), purpose: "De situatie schetsen, aangescherpt door de opleider." }),
    );
    expect(edited.blockPlan).toMatchObject({ revisionNo: 2, approved: false });
    expect(edited.progress.stage).toBe("block_plan_ready");
    // Goedkeuren op de oude revision kan niet meer.
    expect(await decideRevision(d, id, approved.blockPlan!.revisionId, "approved")).toMatchObject({ status: "rejected" });
  });

  it("weigert een bloktype buiten de catalogus, trusted velden en een verouderde revision", async () => {
    const { d, id, view } = await trainingWithPlan(GESPREK);
    const block = view.blockPlan!.payload.plannedBlocks[0];
    const rev = view.blockPlan!.revisionId;
    expect(await saveBlockPlanBlockEdit(d, id, block.id, rev, { ...editOf(view, block.id), catalogBlockId: "certum.bco.verzonnen-blok" })).toMatchObject({ status: "rejected", reason: "invalid_input" });
    expect(await saveBlockPlanBlockEdit(d, id, block.id, rev, { ...editOf(view, block.id), catalogBlockId: "certum.bco.vaste-start" })).toMatchObject({ status: "rejected", reason: "invalid_input" });
    expect(await saveBlockPlanBlockEdit(d, id, block.id, rev, { ...editOf(view, block.id), certumPhase: "toets" })).toMatchObject({ status: "rejected", reason: "invalid_input" });
    expect(await saveBlockPlanBlockEdit(d, id, block.id, rev, { ...editOf(view, block.id), purpose: "Zie https://example.org" })).toMatchObject({ status: "rejected", reason: "invalid_input" });
    expect(await saveBlockPlanBlockEdit(d, id, "blok-99", rev, editOf(view, block.id))).toMatchObject({ status: "rejected", reason: "not_found" });

    ws(await saveBlockPlanBlockEdit(d, id, block.id, rev, { ...editOf(view, block.id), purpose: "Eerste correctie." }));
    expect(await saveBlockPlanBlockEdit(d, id, block.id, rev, { ...editOf(view, block.id), purpose: "Tweede correctie op een oude versie." })).toMatchObject({ status: "rejected", reason: "stale_revision" });
    expect((await loadTrainingWorkspace(db, id))!.blockPlan!.revisionNo).toBe(2);
  });

  it("open_choice-regels blijven gelden: Actie mag niet alleen nog een blok met één juist antwoord hebben", async () => {
    const { d, id, view } = await trainingWithPlan(GESPREK);
    const actie = view.blockPlan!.payload.plannedBlocks.filter((b) => b.certumPhase === "actie");
    expect(actie).toHaveLength(1);
    const result = await saveBlockPlanBlockEdit(d, id, actie[0].id, view.blockPlan!.revisionId, { ...editOf(view, actie[0].id), catalogBlockId: "certum.bco.meerkeuze" });
    expect(result).toMatchObject({ status: "rejected", reason: "invalid_input" });
    expect((result as { issues?: string[] }).issues).toContain("juist-antwoord-bij-meerdere-routes");
    // Ongewijzigd opslaan maakt geen revision.
    const same = ws(await saveBlockPlanBlockEdit(d, id, actie[0].id, view.blockPlan!.revisionId, editOf(view, actie[0].id)));
    expect(same.blockPlan!.revisionNo).toBe(1);
  });

  it("een plan-override kost een vast, klein aantal queries", async () => {
    const counted = instrumentDb(db);
    const { d, id, view } = await trainingWithPlan(GESPREK, deps(counted.db));
    const block = view.blockPlan!.payload.plannedBlocks[0];
    counted.reset();
    ws(await saveBlockPlanBlockEdit(d, id, block.id, view.blockPlan!.revisionId, { ...editOf(view, block.id), purpose: "Gecorrigeerd." }));
    expect(counted.stats.count).toBeLessThanOrEqual(12);
  });
});

/** Training met een organisatiegebonden SN2 (mock-marker), tot en met gegenereerde inhoud. */
async function trainingWithOrganisationNeed() {
  const { d, id, view } = await trainingWithPlan(`${GESPREK} ${MOCK_ORGANISATION_SPECIFIC}`);
  ws(await decideRevision(d, id, view.blockPlan!.revisionId, "approved"));
  const content = ws(await generateContent(d, id));
  const bronId = content.content!.package.blocks.find((b) => b.certumPhase === "bron")!.plannedBlockId;
  return { d, id, view: content, bronId };
}

const source = (refs: string[], over: Record<string, unknown> = {}) => ({
  title: "Synthetische leidraad",
  sourceType: "guideline",
  author: "",
  publisher: "Fictief kenniscentrum",
  publicationDate: "2025",
  url: "https://example.org/leidraad",
  relevantContent: "Synthetische passage over de-escalatie: benoem de emotie en vertraag het gesprek.",
  sourceNeedRefs: refs,
  ...over,
});

async function addValidated(d: WorkflowDeps, id: string, refs: string[]) {
  const added = ws(await addSource(d, id, source(refs)));
  return ws(await validateSource(d, id, added.sources!.items.at(-1)!.revisionId, true));
}

describe("B. organisatiegebonden sourceNeeds", () => {
  it("legacy sourceNeeds zonder scope zijn professional; de Claude-provider kan (nog) geen scope meesturen", () => {
    expect(sourceNeedScope({})).toBe("professional");
    expect(sourceNeedScope({ scope: "organisation_specific" })).toBe("organisation_specific");
    const needs = BlueprintV21DesignSchema.shape.sourceNeeds;
    const need = { id: "SN1", question: "Vraag?", sourceType: "organisatiebeleid", whyNeeded: "Waarom." };
    expect(needs.safeParse([need]).success).toBe(true);
    expect(needs.safeParse([{ ...need, scope: "organisation_specific" }]).success).toBe(false);
  });

  it("een professionele sourceNeed zonder bron blokkeert; de organisatiegebonden blijft zichtbaar zonder te blokkeren", async () => {
    const { view, bronId } = await trainingWithOrganisationNeed();
    expect(view.sources!.needs.map((n) => [n.id, n.scope, n.covered])).toEqual([
      ["SN1", "professional", false],
      ["SN2", "organisation_specific", false],
    ]);
    expect(view.content!.review).toMatchObject({ readiness: "incomplete", sourceNeedsOpen: 1, organisationSpecificOpen: 1, source: 1 });
    expect(view.content!.package.unresolvedRequirements.filter((u) => u.plannedBlockId === bronId)).toEqual([
      { plannedBlockId: bronId, kind: "source", refs: ["SN1"] },
      { plannedBlockId: bronId, kind: "organisation_source", refs: ["SN2"] },
    ]);
  });

  it("met alleen de professionele bron gedekt ontstaat Bron-inhoud zonder organisatiekennis, en kan de training gereed worden", async () => {
    const { d, id, bronId, view } = await trainingWithOrganisationNeed();
    const covered = await addValidated(d, id, ["SN1"]);
    expect(covered.sources!.allCovered).toBe(true);
    expect(covered.content!.review).toMatchObject({ sourceNeedsOpen: 0, organisationSpecificOpen: 1 });
    // E: de actuele unresolved refs volgen de dekking (SN1 niet meer "ontbrekend"); historische revisions blijven gelijk.
    expect(covered.content!.package.unresolvedRequirements.filter((u) => u.plannedBlockId === bronId)).toEqual([
      { plannedBlockId: bronId, kind: "source", refs: [] },
      { plannedBlockId: bronId, kind: "organisation_source", refs: ["SN2"] },
    ]);
    const stored = await getArtifactRevision(db, view.content!.blockRevisions[bronId].revisionId);
    expect((stored!.payload as BlockContentResult).accreditation.sourceNeedRefs).toEqual(["SN1", "SN2"]);

    const generated = ws(await regenerateBlock(d, id, bronId, covered.content!.blockRevisions[bronId].revisionId));
    const bron = generated.content!.package.blocks.find((b) => b.plannedBlockId === bronId)!;
    expect(bron.body.status).toBe("generated");
    expect(bron.accreditation.sourceNeedRefs).toEqual(["SN1"]);
    const text = bron.body.status === "generated" && bron.body.content.catalogBlockId === "certum.bco.tekst" ? bron.body.content.text : "";
    expect(text).toContain(ORGANISATION_SPECIFIC_NOTE);
    expect(text).not.toContain("interne werkwijze of afspraak geldt binnen de eigen organisatie");
    expect(generated.content!.package.unresolvedRequirements).toContainEqual({ plannedBlockId: bronId, kind: "organisation_source", refs: ["SN2"] });

    // Alles goedkeuren: de organisatiegebonden behoefte houdt de generieke training niet op incomplete.
    let current = generated;
    for (const b of current.content!.package.blocks.filter((x) => x.body.status === "generated")) {
      current = ws(await decideRevision(d, id, current.content!.blockRevisions[b.plannedBlockId].revisionId, "approved"));
    }
    current = ws(await decideRevision(d, id, current.content!.frame.start.revisionId, "approved"));
    current = ws(await decideRevision(d, id, current.content!.frame.end.revisionId, "approved"));
    expect(current.content!.package.blocks.filter((b) => b.body.status !== "generated")).toEqual([]);
    expect(current.content!.review.readiness).toBe("approved");
    expect(current.progress.stage).toBe("training_ready");
    expect(current.content!.review.organisationSpecificOpen).toBe(1);
  });

  it("gegenereerde Bron-inhoud mag nooit verwijzen naar een sourceNeed zonder gevalideerde bron", async () => {
    const { d, id, bronId } = await trainingWithOrganisationNeed();
    await addValidated(d, id, ["SN1"]);
    const view = (await loadTrainingWorkspace(db, id))!;
    const generated = ws(await regenerateBlock(d, id, bronId, view.content!.blockRevisions[bronId].revisionId));
    const bron = generated.content!.package.blocks.find((b) => b.plannedBlockId === bronId)!;
    const blueprint = generated.blueprint!.payload;
    const blockPlan = generated.blockPlan!.payload;
    const sources = generated.sources!.items.filter((i) => i.validated).map((i) => ({ sourceId: i.sourceId, revisionId: i.revisionId, ...i.payload }));
    expect(checkBlockContentInvariants(bron, { blueprint, blockPlan, validatedSources: sources })).toEqual([]);
    const claimsOrganisation = { ...bron, accreditation: { ...bron.accreditation, sourceNeedRefs: ["SN1", "SN2"] } };
    expect(checkBlockContentInvariants(claimsOrganisation, { blueprint, blockPlan, validatedSources: sources })).toContain("bronverwijzing-zonder-bron");
  });
});

describe("C. zichtbare bronvalidatie", () => {
  it("relevante inhoud die alleen de titel of een URL is, kan niet worden gevalideerd; een korte notitie wel", async () => {
    expect(relevantContentIssue({ title: "Leidraad", url: null, relevantContent: " Leidraad " })).toBe("relevant_content_is_title");
    expect(relevantContentIssue({ title: "Leidraad", url: "https://example.org/a", relevantContent: "https://example.org/a" })).toBe("relevant_content_is_url");
    expect(relevantContentIssue({ title: "Leidraad", url: null, relevantContent: "https://andere.example.org/pagina" })).toBe("relevant_content_is_url");
    expect(relevantContentIssue({ title: "Leidraad", url: null, relevantContent: "Benoem eerst de emotie." })).toBeNull();

    const { d, id } = await trainingWithOrganisationNeed();
    const titleOnly = ws(await addSource(d, id, source(["SN1"], { relevantContent: "Synthetische leidraad" })));
    const urlOnly = ws(await addSource(d, id, source(["SN1"], { relevantContent: "https://example.org/leidraad" })));
    expect(await validateSource(d, id, titleOnly.sources!.items[0].revisionId, true)).toMatchObject({ status: "rejected", issues: ["relevant_content_is_title"] });
    expect(await validateSource(d, id, urlOnly.sources!.items[1].revisionId, true)).toMatchObject({ status: "rejected", issues: ["relevant_content_is_url"] });
    // Ook buiten de workflow om weigert de opslaglaag; en een generiek besluit kan een bron nooit goedkeuren.
    await expect(appendWorkflowEvent(db, { trainingId: id, artifactRevisionId: titleOnly.sources!.items[0].revisionId, eventType: "approved", sourceValidation: true })).rejects.toMatchObject({ code: "source_content_invalid" });
    expect(await decideRevision(d, id, urlOnly.sources!.items[1].revisionId, "approved")).toMatchObject({ status: "rejected" });

    // Corrigeren met een echte (korte) notitie maakt valideren mogelijk.
    const fixed = ws(await editSource(d, id, "src-1", titleOnly.sources!.items[0].revisionId, source(["SN1"], { relevantContent: "Benoem eerst de emotie, vertraag dan het gesprek." })));
    const validated = ws(await validateSource(d, id, fixed.sources!.items[0].revisionId, true));
    expect(validated.sources!.items[0].validated).toBe(true);
    expect(validated.sources!.needs.find((n) => n.id === "SN1")!.covered).toBe(true);
  });
});

describe("D. trainingstitel", () => {
  it("het trainingsrecord krijgt bij Blueprint-goedkeuring de titel van de Blueprint; downstream generatie wijzigt hem niet", async () => {
    const d = deps();
    const started = await startTraining(d, {
      kind: "praktijkvraag",
      text: GESPREK,
      acknowledgement: { textHash: await hashPreflightText(GESPREK), acknowledgedFindingIds: [], syntheticDataAttested: true },
    });
    if (started.status !== "created") throw new Error(started.reason);
    const id = started.trainingId;
    const intakeTitle = (await getTraining(db, id))!.title;
    const analysis = ws(started.analysis).analysis!;
    ws(await selectDirection(d, id, analysis.revisionId, analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : ""));
    const bp = ws(await generateBlueprint(d, id));
    expect((await getTraining(db, id))!.title).toBe(intakeTitle);
    ws(await decideRevision(d, id, bp.blueprint!.revisionId, "approved"));
    expect((await getTraining(db, id))!.title).toBe(bp.blueprint!.payload.title);
    const plan = ws(await generateBlockPlan(d, id));
    ws(await decideRevision(d, id, plan.blockPlan!.revisionId, "approved"));
    ws(await generateContent(d, id));
    expect((await getTraining(db, id))!.title).toBe(bp.blueprint!.payload.title);
  });
});

describe("E. actuele unresolved refs", () => {
  it("zonder dekking blijven de refs van het blok; met dekking alleen de nog open professionele", () => {
    const plan = { plannedBlocks: [{ id: "blok-1", sequence: 1, certumPhase: "bron" }] } as never;
    const block = { plannedBlockId: "blok-1", body: { status: "needs_source" }, accreditation: { sourceNeedRefs: ["SN1", "SN2", "SN3"] } } as never;
    expect(deriveUnresolvedRequirements(plan, [block])).toEqual([{ plannedBlockId: "blok-1", kind: "source", refs: ["SN1", "SN2", "SN3"] }]);
    expect(deriveUnresolvedRequirements(plan, [block], { covered: ["SN1", "SN2"], organisationSpecific: [] })).toEqual([
      { plannedBlockId: "blok-1", kind: "source", refs: ["SN3"] },
    ]);
    expect(deriveUnresolvedRequirements(plan, [block], { covered: ["SN1", "SN2"], organisationSpecific: ["SN3"] })).toEqual([
      { plannedBlockId: "blok-1", kind: "source", refs: [] },
      { plannedBlockId: "blok-1", kind: "organisation_source", refs: ["SN3"] },
    ]);
  });
});
