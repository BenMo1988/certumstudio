import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BcOnlineBlockPlan } from "@/modules/block-plan";
import { hashPreflightText } from "@/modules/privacy";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { ORGANISATION_SPECIFIC_NOTE } from "@/services/block-content/mock/mock-block-content-service";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { MOCK_ORGANISATION_SPECIFIC } from "@/services/blueprint/v2/mock-blueprint-service-v2";
import { createArtifactRevision, getArtifactRevision } from "@/services/storage/training-record";
import { loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import tr0014 from "../../../../test/fixtures/tr-0014.json";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { saveSourceNeedScopes } from "./editing";
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
import { addSource, validateSource } from "./sources";

/*
 * Step 15B: SourceNeed Scope Review. AI formuleert de kennisbehoefte; de opleider bepaalt de scope. Tegen PGlite met
 * mock-providers, 0 AI-aanroepen.
 */

const TEXT = `Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt? ${MOCK_ORGANISATION_SPECIFIC}`;
const mock = { promptVersion: "mock", modelVersion: "mock" };
const SCOPES = { SN1: "professional", SN2: "professional", SN3: "organisation_specific" } as const;

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

async function trainingWithAnalysis(d: WorkflowDeps = deps()) {
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
  return { d, id, analysisRevisionId: analysis.revisionId, direction };
}

/** Een gegenereerde, nog niet geclassificeerde Blueprint met drie kennisbehoeften (mock-marker). */
async function unclassifiedBlueprint() {
  const t = await trainingWithAnalysis();
  return { ...t, view: ws(await generateBlueprint(t.d, t.id)) };
}

describe("SourceNeed Scope Review", () => {
  it("zonder classificatie geen goedkeuring; geen stille default", async () => {
    const { d, id, view } = await unclassifiedBlueprint();
    expect(view.blueprint!.payload.sourceNeeds.map((n) => [n.id, n.scope])).toEqual([
      ["SN1", undefined],
      ["SN2", undefined],
      ["SN3", undefined],
    ]);
    expect(await decideRevision(d, id, view.blueprint!.revisionId, "approved")).toMatchObject({ status: "rejected", reason: "scope_review_required" });
    expect((await loadTrainingWorkspace(db, id))!.blueprint!.approved).toBe(false);
  });

  it("alle scopes gekozen: nieuwe Blueprint-revision met alleen de scope gewijzigd, daarna goedkeuring mogelijk", async () => {
    const { d, id, view } = await unclassifiedBlueprint();
    const original = await getArtifactRevision(db, view.blueprint!.revisionId);
    const scoped = ws(await saveSourceNeedScopes(d, id, view.blueprint!.revisionId, SCOPES));
    expect(scoped.blueprint).toMatchObject({ revisionNo: 2, source: "manual", approved: false });
    const before = view.blueprint!.payload;
    const after = scoped.blueprint!.payload;
    expect(after.sourceNeeds.map((n) => [n.id, n.scope])).toEqual([
      ["SN1", "professional"],
      ["SN2", "professional"],
      ["SN3", "organisation_specific"],
    ]);
    expect({ ...after, sourceNeeds: after.sourceNeeds.map(({ scope, ...n }) => (void scope, n)) }).toEqual(before);
    expect(await getArtifactRevision(db, view.blueprint!.revisionId)).toEqual(original);
    const approved = ws(await decideRevision(d, id, scoped.blueprint!.revisionId, "approved"));
    expect(approved.blueprint!.approved).toBe(true);
    // Ongewijzigd opnieuw opslaan maakt geen revision.
    expect(ws(await saveSourceNeedScopes(d, id, scoped.blueprint!.revisionId, SCOPES)).blueprint!.revisionNo).toBe(2);
  });

  it("alleen de scope is bewerkbaar; onbekende scopes, ontbrekende of extra kennisbehoeften en verouderde revisions worden geweigerd", async () => {
    const { d, id, view } = await unclassifiedBlueprint();
    const rev = view.blueprint!.revisionId;
    const invalid = { status: "rejected", reason: "invalid_input" };
    expect(await saveSourceNeedScopes(d, id, rev, { ...SCOPES, SN3: "ongeveer" })).toMatchObject(invalid);
    expect(await saveSourceNeedScopes(d, id, rev, { SN1: "professional", SN2: "professional" })).toMatchObject(invalid);
    expect(await saveSourceNeedScopes(d, id, rev, { ...SCOPES, SN4: "professional" })).toMatchObject(invalid);
    expect(await saveSourceNeedScopes(d, id, rev, { ...SCOPES, SN1: { question: "Andere vraag", scope: "professional" } })).toMatchObject(invalid);
    expect(await saveSourceNeedScopes(d, id, rev, { ...SCOPES, learningGoal: "Ander leerdoel" })).toMatchObject(invalid);
    expect(await saveSourceNeedScopes(d, id, rev, "professional")).toMatchObject(invalid);
    expect((await loadTrainingWorkspace(db, id))!.blueprint!.revisionNo).toBe(1);

    ws(await saveSourceNeedScopes(d, id, rev, SCOPES));
    expect(await saveSourceNeedScopes(d, id, rev, { ...SCOPES, SN3: "professional" })).toMatchObject({ status: "rejected", reason: "stale_revision" });
  });

  it("een herclassificatie na goedkeuring: de goedkeuring gaat niet mee en het Block Plan op de oude Blueprint wordt stale", async () => {
    const { d, id, view } = await unclassifiedBlueprint();
    const scoped = ws(await saveSourceNeedScopes(d, id, view.blueprint!.revisionId, SCOPES));
    ws(await decideRevision(d, id, scoped.blueprint!.revisionId, "approved"));
    const planned = ws(await generateBlockPlan(d, id));
    ws(await decideRevision(d, id, planned.blockPlan!.revisionId, "approved"));

    const rescoped = ws(await saveSourceNeedScopes(d, id, scoped.blueprint!.revisionId, { ...SCOPES, SN2: "organisation_specific" }));
    expect(rescoped.blueprint).toMatchObject({ revisionNo: 3, approved: false });
    expect(rescoped.blockPlan).toBeNull();
    expect(rescoped.progress.stage).toBe("blueprint_ready");
    expect(await decideRevision(d, id, scoped.blueprint!.revisionId, "approved")).toMatchObject({ status: "rejected" });

    // Daarna: opnieuw goedkeuren en een nieuw Block Plan op de current Blueprint.
    ws(await decideRevision(d, id, rescoped.blueprint!.revisionId, "approved"));
    const replanned = ws(await generateBlockPlan(d, id));
    expect(replanned.blockPlan!.revisionId).not.toBe(planned.blockPlan!.revisionId);
    const stored = await getArtifactRevision(db, replanned.blockPlan!.revisionId);
    expect(stored!.basedOnRevisionIds).toEqual([rescoped.blueprint!.revisionId]);
  });

  it("een legacy Blueprint zonder scope blijft leesbaar en een bestaande goedkeuring blijft geldig (als professional)", async () => {
    const { d, id, view } = await unclassifiedBlueprint();
    // Een goedkeuring van vóór 15B, rechtstreeks in de database (zoals bij bestaande trainingen).
    const rev = (await getArtifactRevision(db, view.blueprint!.revisionId))!;
    await db.query(
      `insert into workflow_event (training_id, artifact_revision_id, event_type, event_data, content_hash, actor_id)
       values ($1, $2, 'approved', '{}'::jsonb, $3, null)`,
      [id, rev.id, rev.contentHash],
    );
    const legacy = (await loadTrainingWorkspace(db, id))!;
    expect(legacy.blueprint!.approved).toBe(true);
    expect(legacy.sources!.needs.map((n) => n.scope)).toEqual(["professional", "professional", "professional"]);
    expect(legacy.sources!.organisationSpecificOpen).toBe(0);
    // Verdergaan werkt; een nieuwe goedkeuring vraagt wel een classificatie.
    expect(ws(await generateBlockPlan(d, id)).blockPlan).not.toBeNull();
  });
});

describe("TR-0014-regressie: SN1/SN2 professioneel, SN3 organisatiespecifiek", () => {
  it("SN1/SN2 vereisen gevalideerde bronnen; SN3 blijft zichtbaar en blokkeert de generieke training niet; Bron verzint niets over SN3", async () => {
    const { d, id, analysisRevisionId, direction } = await trainingWithAnalysis();
    const blueprint = { ...(tr0014.blueprint as unknown as TrainingBlueprintV2), selectedDirectionId: direction };
    const bp = await createArtifactRevision(db, {
      trainingId: id,
      artifactType: "blueprint",
      contractVersion: blueprint.version,
      promptVersion: "fixture",
      modelVersion: "fixture TR-0014",
      payload: blueprint,
      basedOnRevisionIds: [analysisRevisionId],
      expectedCurrentRevisionId: null,
    });
    expect(await decideRevision(d, id, bp.id, "approved")).toMatchObject({ reason: "scope_review_required" });
    const scoped = ws(await saveSourceNeedScopes(d, id, bp.id, SCOPES));
    ws(await decideRevision(d, id, scoped.blueprint!.revisionId, "approved"));
    const plan = await createArtifactRevision(db, {
      trainingId: id,
      artifactType: "block_plan",
      contractVersion: (tr0014.blockPlan as unknown as BcOnlineBlockPlan).version,
      promptVersion: "fixture",
      modelVersion: "fixture TR-0014",
      payload: tr0014.blockPlan,
      basedOnRevisionIds: [scoped.blueprint!.revisionId],
      expectedCurrentRevisionId: null,
    });
    ws(await decideRevision(d, id, plan.id, "approved"));
    const content = ws(await generateContent(d, id));
    const bronId = content.content!.package.blocks.find((b) => b.certumPhase === "bron")!.plannedBlockId;

    // Zonder bronnen: SN1 en SN2 blokkeren, SN3 is een zichtbaar aandachtspunt.
    expect(content.sources!.needs.map((n) => [n.id, n.scope, n.covered])).toEqual([
      ["SN1", "professional", false],
      ["SN2", "professional", false],
      ["SN3", "organisation_specific", false],
    ]);
    expect(content.content!.review).toMatchObject({ readiness: "incomplete", sourceNeedsOpen: 2, organisationSpecificOpen: 1 });

    // De vier gevalideerde bronpassages uit de pilot.
    let current = content;
    for (const s of tr0014.sources) {
      const added = ws(await addSource(d, id, s));
      current = ws(await validateSource(d, id, added.sources!.items.at(-1)!.revisionId, true));
    }
    expect(current.sources!.allCovered).toBe(true);
    expect(current.content!.review).toMatchObject({ sourceNeedsOpen: 0, organisationSpecificOpen: 1 });
    expect(current.content!.package.unresolvedRequirements.filter((u) => u.plannedBlockId === bronId)).toEqual([
      { plannedBlockId: bronId, kind: "source", refs: [] },
      { plannedBlockId: bronId, kind: "organisation_source", refs: ["SN3"] },
    ]);

    // Bron uit de gevalideerde bronnen: alleen SN1/SN2, voor SN3 hoogstens een neutrale verwijzing.
    current = ws(await regenerateBlock(d, id, bronId, current.content!.blockRevisions[bronId].revisionId));
    const bron = current.content!.package.blocks.find((b) => b.plannedBlockId === bronId)!;
    expect(bron.body.status).toBe("generated");
    expect(bron.accreditation.sourceNeedRefs).toEqual(["SN1", "SN2"]);
    const text = bron.body.status === "generated" && bron.body.content.catalogBlockId === "certum.bco.tekst" ? bron.body.content.text : "";
    expect(text).toContain(ORGANISATION_SPECIFIC_NOTE);
    expect(text).not.toMatch(/meldcode/i);

    // Alles goedkeuren: Training gereed, terwijl SN3 als organisatie-aandachtspunt zichtbaar blijft.
    for (const b of current.content!.package.blocks) {
      current = ws(await decideRevision(d, id, current.content!.blockRevisions[b.plannedBlockId].revisionId, "approved"));
    }
    current = ws(await decideRevision(d, id, current.content!.frame.start.revisionId, "approved"));
    current = ws(await decideRevision(d, id, current.content!.frame.end.revisionId, "approved"));
    expect(current.progress.stage).toBe("training_ready");
    expect(current.content!.review).toMatchObject({ readiness: "approved", organisationSpecificOpen: 1 });
    expect(current.content!.package.unresolvedRequirements).toContainEqual({ plannedBlockId: bronId, kind: "organisation_source", refs: ["SN3"] });
  });
});
