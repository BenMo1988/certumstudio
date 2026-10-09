import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { MOCK_INSUFFICIENT_SOURCE } from "@/services/block-content/mock/mock-block-content-service";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { instrumentDb } from "@/services/storage/instrumented-db";
import { validatedSources } from "@/services/storage/snapshot";
import { StorageError, createArtifactRevision, getArtifactRevision, loadTrainingRecordSnapshot } from "@/services/storage/training-record";
import { loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { runBlockRegenerationFlow } from "../new/content-flow";
import { saveBlockEdit } from "./editing";
import {
  decideRevision,
  generateBlockPlan,
  generateBlueprint,
  generateContent,
  regenerateBlock,
  selectDirection,
  startTraining,
  type WorkflowDeps,
  type WorkflowLogEntry,
  type WorkflowResult,
} from "./persisted-workflow";
import { addSource, editSource, validateSource } from "./sources";
import { approveBlueprint } from "../../../../test/workflow-helpers";

/*
 * Source Workspace V1 tegen PGlite met mock-providers: candidate vs gevalideerd, dekking per sourceNeed, Bron-inhoud
 * alleen uit gevalideerde bronnen, provenance, stale-afhankelijkheid en readiness. 0 AI-aanroepen.
 */

const TEXT = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
const mock = { promptVersion: "mock", modelVersion: "mock" };
const SECRET = "Synthetische bronpassage XQ-7731 over de-escalatie in oudergesprekken.";

let db: TestDb;
let consoleCalls: unknown[][];
beforeAll(async () => {
  db = await createTestDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(() => {
  consoleCalls = [];
  for (const m of ["info", "warn", "error", "log"] as const) vi.spyOn(console, m).mockImplementation((...args: unknown[]) => void consoleCalls.push(args));
});

function deps(logs: WorkflowLogEntry[] = [], base: WorkflowDeps["db"] = db): WorkflowDeps {
  return {
    db: base,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: () => createBlockContentService({}),
    provenance: { analysis: mock, blueprint: mock, blockPlan: mock, blockContent: mock },
    log: (entry) => logs.push(entry),
  };
}

const ws = (r: WorkflowResult): TrainingWorkspaceView => {
  if (r.status !== "ok") throw new Error(`${r.reason} ${r.issues?.join(",") ?? ""}`);
  return r.workspace;
};

async function trainingWithContent(d: WorkflowDeps = deps()) {
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
  ws(await generateBlueprint(d, id));
  ws(await approveBlueprint(d, id));
  ws(await decideRevision(d, id, ws(await generateBlockPlan(d, id)).blockPlan!.revisionId, "approved"));
  const view = ws(await generateContent(d, id));
  const bron = view.content!.package.blocks.find((b) => b.body.status === "needs_source")!;
  return { d, id, view, bronId: bron.plannedBlockId, needIds: view.sources!.needs.map((n) => n.id) };
}

const fields = (refs: string[], over: Record<string, unknown> = {}) => ({
  title: "Richtlijn de-escalatie (synthetisch)",
  sourceType: "guideline",
  author: "",
  publisher: "Fictief Kenniscentrum",
  publicationDate: "2025",
  url: "https://example.org/richtlijn",
  relevantContent: SECRET,
  sourceNeedRefs: refs,
  ...over,
});

const item = (view: TrainingWorkspaceView, sourceId: string) => view.sources!.items.find((i) => i.sourceId === sourceId)!;
const bronBlock = (view: TrainingWorkspaceView, bronId: string) => view.content!.package.blocks.find((b) => b.plannedBlockId === bronId)!;

/** Bron toevoegen en valideren; geeft de workspace terug. */
async function addValidated(d: WorkflowDeps, id: string, refs: string[], over: Record<string, unknown> = {}) {
  const added = ws(await addSource(d, id, fields(refs, over)));
  const latest = added.sources!.items.at(-1)!;
  return { view: ws(await validateSource(d, id, latest.revisionId, true)), sourceId: latest.sourceId };
}

describe("candidate en gevalideerde bron", () => {
  it("een candidate bron dekt een sourceNeed niet; een gevalideerde wel", async () => {
    const { d, id, needIds } = await trainingWithContent();
    const added = ws(await addSource(d, id, fields(needIds)));
    expect(item(added, "src-1")).toMatchObject({ validated: false, revisionNo: 1 });
    expect(added.sources!.needs.every((n) => !n.covered)).toBe(true);
    expect(added.content!.review.sourceNeedsOpen).toBe(needIds.length);

    // Zonder bevestiging geen validatie.
    expect(await validateSource(d, id, item(added, "src-1").revisionId, false)).toMatchObject({ status: "rejected", reason: "invalid_input" });
    const validated = ws(await validateSource(d, id, item(added, "src-1").revisionId, true));
    expect(item(validated, "src-1")).toMatchObject({ validated: true });
    expect(item(validated, "src-1").validatedAt).not.toBeNull();
    expect(validated.sources!.needs.every((n) => n.covered)).toBe(true);
    expect(validated.sources!.allCovered).toBe(true);
    expect(validated.content!.review.sourceNeedsOpen).toBe(0);
  });

  it("een onbekende of nieuwe sourceNeedRef wordt geweigerd, ook buiten de workflow om", async () => {
    const { d, id, view } = await trainingWithContent();
    expect(await addSource(d, id, fields(["SN9"]))).toMatchObject({ status: "rejected", reason: "invalid_input" });
    expect(await addSource(d, id, fields([]))).toMatchObject({ status: "rejected", reason: "invalid_input" });
    expect(await addSource(d, id, { ...fields(["SN1"]), trusted: true })).toMatchObject({ status: "rejected", reason: "invalid_input" });
    expect(await addSource(d, id, fields(["SN1"], { url: "javascript:alert(1)" }))).toMatchObject({ status: "rejected", reason: "invalid_input" });
    await expect(
      createArtifactRevision(db, {
        trainingId: id,
        artifactType: "source",
        artifactKey: "src-1",
        contractVersion: "certum-source/v1",
        promptVersion: null,
        modelVersion: "manual-edit",
        payload: { version: "certum-source/v1", ...fields(["SN9"]), author: null },
        basedOnRevisionIds: [view.blueprint!.revisionId],
        expectedCurrentRevisionId: null,
      }),
    ).rejects.toBeInstanceOf(StorageError);
    expect((await loadTrainingWorkspace(db, id))!.sources!.items).toHaveLength(0);
  });

  it("bronnen blijven bewaard na herladen (server-authoritative)", async () => {
    const { d, id, needIds } = await trainingWithContent();
    await addValidated(d, id, needIds);
    ws(await addSource(d, id, fields([needIds[0]], { title: "Tweede bron" })));
    const reloaded = (await loadTrainingWorkspace(db, id))!;
    expect(reloaded.sources!.items.map((i) => [i.sourceId, i.validated, i.payload.title])).toEqual([
      ["src-1", true, "Richtlijn de-escalatie (synthetisch)"],
      ["src-2", false, "Tweede bron"],
    ]);
    expect(reloaded.sources!.items[0].payload).toMatchObject({ author: null, publicationDate: "2025", relevantContent: SECRET });
  });

  it("een gevalideerde bron wijzigen maakt een nieuwe versie die opnieuw gevalideerd moet worden", async () => {
    const { d, id, needIds } = await trainingWithContent();
    const { view } = await addValidated(d, id, needIds);
    const v1 = item(view, "src-1");
    const unchanged = ws(await editSource(d, id, "src-1", v1.revisionId, fields(needIds)));
    expect(item(unchanged, "src-1").revisionId).toBe(v1.revisionId);

    const edited = ws(await editSource(d, id, "src-1", v1.revisionId, fields(needIds, { relevantContent: `${SECRET} Gecorrigeerd.` })));
    expect(item(edited, "src-1")).toMatchObject({ revisionNo: 2, previousRevisions: 1, validated: false });
    expect(edited.sources!.allCovered).toBe(false);
    expect(await editSource(d, id, "src-1", v1.revisionId, fields(needIds))).toMatchObject({ status: "rejected", reason: "stale_revision" });
    // De oude versie kan niet meer gevalideerd worden; de nieuwe wel.
    expect(await validateSource(d, id, v1.revisionId, true)).toMatchObject({ status: "rejected" });
    expect(item(ws(await validateSource(d, id, item(edited, "src-1").revisionId, true)), "src-1").validated).toBe(true);
    expect(await getArtifactRevision(db, v1.revisionId)).toMatchObject({ revisionNo: 1 });
  });
});

describe("Bron-inhoud uit gevalideerde bronnen", () => {
  it("een candidate bron wordt nooit gebruikt: het Bron-blok blijft needs_source", async () => {
    const { d, id, bronId, needIds, view } = await trainingWithContent();
    const added = ws(await addSource(d, id, fields(needIds)));
    const after = ws(await regenerateBlock(d, id, bronId, view.content!.blockRevisions[bronId].revisionId));
    expect(bronBlock(after, bronId).body.status).toBe("needs_source");
    expect(after.content!.blockRevisions[bronId].basedOnSources).toEqual([]);

    // Ook rechtstreeks naar de opslag: een candidate bron als upstream wordt geweigerd.
    const generated = after.content!.blockRevisions[bronId];
    const stored = await getArtifactRevision(db, generated.revisionId);
    await expect(
      createArtifactRevision(db, {
        trainingId: id,
        artifactType: "block_content",
        artifactKey: bronId,
        contractVersion: stored!.contractVersion,
        promptVersion: null,
        modelVersion: "mock",
        payload: stored!.payload,
        basedOnRevisionIds: [...stored!.basedOnRevisionIds, item(added, "src-1").revisionId],
        expectedCurrentRevisionId: generated.revisionId,
      }),
    ).rejects.toMatchObject({ code: "stale_based_on" });
  });

  it("gebruikt alleen de gekoppelde gevalideerde bronnen en legt de provenance vast", async () => {
    const { d, id, bronId, needIds, view } = await trainingWithContent();
    await addValidated(d, id, needIds, { title: "Gevalideerde bron" });
    ws(await addSource(d, id, fields(needIds, { title: "Candidate bron", relevantContent: "Ongecontroleerde tekst CANDIDATE-1." })));
    const after = ws(await regenerateBlock(d, id, bronId, view.content!.blockRevisions[bronId].revisionId));
    const block = bronBlock(after, bronId);
    expect(block.body.status).toBe("generated");
    expect(block.reviewStatus).toBe("draft");
    expect(block.accreditation.sourceNeedRefs).toEqual(needIds);
    const text = JSON.stringify(block.body);
    expect(text).toContain("XQ-7731");
    expect(text).not.toContain("CANDIDATE-1");

    const meta = after.content!.blockRevisions[bronId];
    expect(meta.basedOnSources).toEqual(["Gevalideerde bron"]);
    expect(meta.staleSources).toBe(false);
    const stored = await getArtifactRevision(db, meta.revisionId);
    expect(stored!.basedOnRevisionIds).toEqual([after.blueprint!.revisionId, after.blockPlan!.revisionId, item(after, "src-1").revisionId]);
    expect(stored!.basedOnRevisionIds).not.toContain(item(after, "src-2").revisionId);

    // Goedkeuren en herladen: bron, provenance en goedkeuring blijven intact.
    ws(await decideRevision(d, id, meta.revisionId, "approved"));
    const reloaded = (await loadTrainingWorkspace(db, id))!;
    expect(bronBlock(reloaded, bronId).reviewStatus).toBe("approved");
    expect(reloaded.content!.blockRevisions[bronId].basedOnSources).toEqual(["Gevalideerde bron"]);
  });

  it("onvoldoende bron leidt niet tot verzonnen inhoud: het blok blijft needs_source", async () => {
    const { d, id, bronId, needIds, view } = await trainingWithContent();
    await addValidated(d, id, needIds, { relevantContent: `Alleen een titelvermelding ${MOCK_INSUFFICIENT_SOURCE}` });
    const after = ws(await regenerateBlock(d, id, bronId, view.content!.blockRevisions[bronId].revisionId));
    expect(bronBlock(after, bronId).body.status).toBe("needs_source");
    expect(after.content!.review.sourceNeedsOpen).toBe(0);
    expect(after.content!.review.source).toBe(1);
  });

  it("een handmatige bewerking van een Bron-blok behoudt de provenance", async () => {
    const { d, id, bronId, needIds, view } = await trainingWithContent();
    await addValidated(d, id, needIds);
    const after = ws(await regenerateBlock(d, id, bronId, view.content!.blockRevisions[bronId].revisionId));
    const block = bronBlock(after, bronId);
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.tekst") throw new Error("verwacht tekstblok");
    const meta = after.content!.blockRevisions[bronId];
    const edited = ws(await saveBlockEdit(d, id, bronId, meta.revisionId, { content: { title: block.body.content.title, text: `${block.body.content.text} Opleider.` } }));
    const stored = await getArtifactRevision(db, edited.content!.blockRevisions[bronId].revisionId);
    expect(stored!.basedOnRevisionIds).toContain(item(after, "src-1").revisionId);
    expect(edited.content!.blockRevisions[bronId]).toMatchObject({ source: "manual", basedOnSources: ["Richtlijn de-escalatie (synthetisch)"] });
  });
});

describe("een later blok na een goedgekeurd Bron-blok", () => {
  /** Bron-blok genereren uit een gevalideerde bron en goedkeuren; geeft ook het eerste latere blok terug. */
  async function approvedBron(spyDeps?: (d: WorkflowDeps) => WorkflowDeps) {
    const base = await trainingWithContent();
    const d = spyDeps ? spyDeps(base.d) : base.d;
    const { id, bronId, needIds, view } = base;
    await addValidated(d, id, needIds);
    const generated = ws(await regenerateBlock(d, id, bronId, view.content!.blockRevisions[bronId].revisionId));
    expect(bronBlock(generated, bronId).body.status).toBe("generated");
    const approved = ws(await decideRevision(d, id, generated.content!.blockRevisions[bronId].revisionId, "approved"));
    const bronSeq = bronBlock(approved, bronId).sequence;
    const later = approved.content!.package.blocks.find((b) => b.sequence > bronSeq && b.body.status === "generated")!;
    return { ...base, d, approved, laterId: later.plannedBlockId };
  }

  it("regenereert een later blok: de eerdere Bron-inhoud is geldig tegen de gevalideerde bronnen en gaat mee", async () => {
    let generate: ReturnType<typeof vi.fn> | undefined;
    const { d, id, bronId, approved, laterId } = await approvedBron((base) => ({
      ...base,
      getBlockContentService: () => {
        const service = createBlockContentService({});
        const original = service.generate.bind(service);
        generate = vi.fn(original);
        service.generate = generate as typeof service.generate;
        return service;
      },
    }));
    generate!.mockClear();
    const after = ws(await regenerateBlock(d, id, laterId, approved.content!.blockRevisions[laterId].revisionId));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate!.mock.calls[0][0].approvedEarlierContent.map((b: { plannedBlockId: string }) => b.plannedBlockId)).toContain(bronId);
    expect(after.content!.blockRevisions[laterId].revisionId).not.toBe(approved.content!.blockRevisions[laterId].revisionId);
    // Het latere blok krijgt geen bronnen als generatie-input of provenance.
    expect(after.content!.blockRevisions[laterId].basedOnSources).toEqual([]);
  });

  it("zonder of met een niet-passende gevalideerde bron blijft dezelfde Bron-inhoud ongeldig", async () => {
    const { id, bronId, approved, laterId } = await approvedBron();
    const snap = (await loadTrainingRecordSnapshot(db, id))!;
    const blueprint = approved.blueprint!.payload;
    const plan = approved.blockPlan!.payload;
    const earlier = [bronBlock(approved, bronId)];
    const validated = validatedSources(snap);
    const run = (sources: typeof validated) => runBlockRegenerationFlow(blueprint, { status: "approved" }, plan, { status: "approved" }, laterId, earlier, { getService: () => createBlockContentService({}), log: () => {} }, [], sources);
    expect(await run(validated)).toMatchObject({ status: "block_content" });
    expect(await run([])).toMatchObject({ status: "rejected", reason: "invalid_earlier_content" });
    const mismatch = validated.map((s) => ({ ...s, sourceNeedRefs: ["SN9"] }));
    expect(await run(mismatch)).toMatchObject({ status: "rejected", reason: "invalid_earlier_content" });
  });

  it("een gecorrigeerde, nog niet gevalideerde bron maakt de eerdere Bron-inhoud niet geldig", async () => {
    const { d, id, bronId, needIds, approved, laterId } = await approvedBron();
    const src = item(approved, "src-1");
    const edited = ws(await editSource(d, id, "src-1", src.revisionId, fields(needIds, { relevantContent: `${SECRET} Gecorrigeerd.` })));
    const snap = (await loadTrainingRecordSnapshot(db, id))!;
    expect(validatedSources(snap)).toEqual([]);
    // Het Bron-blok is nu stale en telt niet meer als goedgekeurde eerdere inhoud.
    expect(bronBlock(edited, bronId).reviewStatus).not.toBe("approved");
    const after = ws(await regenerateBlock(d, id, laterId, edited.content!.blockRevisions[laterId].revisionId));
    expect(after.content!.blockRevisions[laterId].basedOnSources).toEqual([]);
  });
});

describe("stale-afhankelijkheid en readiness", () => {
  it("een gewijzigde bron maakt afhankelijke Bron-inhoud stale; andere blokken blijven geldig", async () => {
    const { d, id, bronId, needIds, view } = await trainingWithContent();
    const { view: validated } = await addValidated(d, id, needIds);
    let current = ws(await regenerateBlock(d, id, bronId, view.content!.blockRevisions[bronId].revisionId));
    for (const b of current.content!.package.blocks.filter((x) => x.body.status === "generated")) {
      current = ws(await decideRevision(d, id, current.content!.blockRevisions[b.plannedBlockId].revisionId, "approved"));
    }
    const otherApproved = current.content!.package.blocks.filter((b) => b.plannedBlockId !== bronId && b.reviewStatus === "approved").map((b) => b.plannedBlockId);
    expect(otherApproved.length).toBeGreaterThan(0);
    expect(bronBlock(current, bronId).reviewStatus).toBe("approved");

    const edited = ws(await editSource(d, id, "src-1", item(validated, "src-1").revisionId, fields(needIds, { relevantContent: `${SECRET} Gecorrigeerd.` })));
    expect(bronBlock(edited, bronId).reviewStatus).toBe("draft");
    expect(edited.content!.blockRevisions[bronId].staleSources).toBe(true);
    expect(edited.content!.review.staleBlocks).toBe(1);
    expect(edited.content!.review.sourceNeedsOpen).toBe(needIds.length);
    for (const other of otherApproved) {
      expect(bronBlock(edited, other).reviewStatus).toBe("approved");
      expect(edited.content!.blockRevisions[other].staleSources).toBe(false);
    }
    // Een stale Bron-blok kan niet opnieuw worden goedgekeurd of bewerkt.
    expect(await decideRevision(d, id, edited.content!.blockRevisions[bronId].revisionId, "approved")).toMatchObject({ status: "rejected" });

    // Na hervalidatie en opnieuw genereren is het blok weer gebaseerd op de nieuwe versie.
    const revalidated = ws(await validateSource(d, id, item(edited, "src-1").revisionId, true));
    expect(revalidated.content!.review.staleBlocks).toBe(1);
    const regenerated = ws(await regenerateBlock(d, id, bronId, revalidated.content!.blockRevisions[bronId].revisionId));
    expect(regenerated.content!.blockRevisions[bronId].staleSources).toBe(false);
    expect(JSON.stringify(bronBlock(regenerated, bronId).body)).toContain("Gecorrigeerd.");
  });

  it("readiness reageert: bron ontbreekt → alle bronnen aanwezig → Bron-blok nog te maken en goed te keuren", async () => {
    const { d, id, bronId, needIds, view } = await trainingWithContent();
    expect(view.content!.review).toMatchObject({ sourceNeedsOpen: needIds.length, source: 1, staleBlocks: 0 });
    expect(view.content!.review.readiness).not.toBe("approved");
    const { view: covered } = await addValidated(d, id, needIds);
    expect(covered.content!.review).toMatchObject({ sourceNeedsOpen: 0, source: 1 });
    expect(covered.content!.review.readiness).not.toBe("approved");
    const generated = ws(await regenerateBlock(d, id, bronId, covered.content!.blockRevisions[bronId].revisionId));
    expect(generated.content!.review.source).toBe(0);
    expect(bronBlock(generated, bronId).reviewStatus).toBe("draft");
  });

  it("bronnen zijn niet beschikbaar zonder goedgekeurde Blueprint", async () => {
    const d = deps();
    const started = await startTraining(d, {
      kind: "praktijkvraag",
      text: TEXT,
      acknowledgement: { textHash: await hashPreflightText(TEXT), acknowledgedFindingIds: [], syntheticDataAttested: true },
    });
    if (started.status !== "created") throw new Error(started.reason);
    expect(ws(started.analysis).sources).toBeNull();
    expect(await addSource(d, started.trainingId, fields(["SN1"]))).toMatchObject({ status: "rejected", reason: "invalid_state" });
  });
});

describe("privacy en prestaties", () => {
  it("geen broninhoud of brontitels in logs", async () => {
    const logs: WorkflowLogEntry[] = [];
    const d = deps(logs);
    const { id, bronId, needIds, view } = await trainingWithContent(d);
    const { view: v } = await addValidated(d, id, needIds, { title: "Titel TTL-4410" });
    ws(await editSource(d, id, "src-1", item(v, "src-1").revisionId, fields(needIds, { title: "Titel TTL-4410", relevantContent: `${SECRET} B` })));
    ws(await regenerateBlock(d, id, bronId, view.content!.blockRevisions[bronId].revisionId));
    expect(logs.length).toBeGreaterThan(0);
    const all = JSON.stringify([logs, consoleCalls]);
    for (const secret of ["XQ-7731", "TTL-4410", "example.org", "Fictief Kenniscentrum"]) expect(all).not.toContain(secret);
  });

  it("heropenen met bronnen blijft vier bulkqueries", async () => {
    const counted = instrumentDb(db);
    const d = deps([], counted.db);
    const { id, needIds } = await trainingWithContent(d);
    await addValidated(d, id, needIds);
    ws(await addSource(d, id, fields(needIds, { title: "Tweede" })));
    counted.reset();
    const view = await loadTrainingWorkspace(counted.db, id);
    expect(view!.sources!.items).toHaveLength(2);
    expect(counted.stats.count).toBe(4);
  });
});
