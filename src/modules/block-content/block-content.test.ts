import { describe, expect, it } from "vitest";
import { PLANNABLE_BLOCK_IDS } from "@/knowledge/platform/bc-online-block-catalog";
import { MockBlockContentService } from "@/services/block-content/mock/mock-block-content-service";
import { generateBlockContent } from "@/services/block-content/orchestrator";
import type { BlockContentRequest } from "@/services/block-content/services";
import { fixtureCase, type PlanCaseId } from "../../../test/block-content-fixtures";
import {
  BlockContentResultSchema,
  BlockPayloadSchema,
  CONTENT_BLOCK_IDS,
  MEDIA_BLOCK_IDS,
  TrainingContentPackageSchema,
  checkBlockContentInvariants,
  checkContentPackageInvariants,
  composeContentPackage,
  getBlockApprovalBlocker,
  getBlockContentGenerationBlocker,
  replaceBlockContent,
  resolveBlockTarget,
  setBlockReviewStatus,
  type BlockContentResult,
  type TrainingContentPackage,
} from ".";

const mock = new MockBlockContentService();
/** Zoals de flow: eerst de server-side beslissing, alleen genereerbare blokken naar de mock. */
const gen = async (request: BlockContentRequest) => (await generateBlockContent(() => mock, request)).block;

async function blockOf(id: PlanCaseId, plannedBlockId: string): Promise<BlockContentResult> {
  return gen({ ...fixtureCase(id), plannedBlockId, approvedEarlierContent: [] });
}

async function packageOf(id: PlanCaseId): Promise<TrainingContentPackage> {
  const input = fixtureCase(id);
  const frame = await mock.generateFrame(input);
  const blocks = [];
  for (const b of input.blockPlan.plannedBlocks) blocks.push(await gen({ ...input, plannedBlockId: b.id, approvedEarlierContent: [] }));
  return composeContentPackage({ ...input, frame, blocks });
}

describe("contract", () => {
  it("dekt ieder planbaar catalogusblok: inhoudstype of mediablok, niets dubbel", () => {
    expect([...CONTENT_BLOCK_IDS, ...MEDIA_BLOCK_IDS].sort()).toEqual([...PLANNABLE_BLOCK_IDS].sort());
  });

  it("een onbekend bloktype is schema-ongeldig", () => {
    expect(BlockPayloadSchema.safeParse({ catalogBlockId: "certum.bco.branching", title: "x", text: "y" }).success).toBe(false);
    expect(BlockPayloadSchema.safeParse({ catalogBlockId: "certum.bco.video", title: "x" }).success).toBe(false);
  });

  it("schema's zijn strict: een onbekend veld faalt", async () => {
    const block = await blockOf("BLP-001", "blok-1");
    expect(BlockContentResultSchema.safeParse({ ...block, extra: 1 }).success).toBe(false);
    expect(BlockContentResultSchema.safeParse({ ...block, accreditation: { ...block.accreditation, skjPoints: 1 } }).success).toBe(false);
  });

  it("Vast Einde: followUpRecommendation is altijd null", async () => {
    const pkg = await packageOf("BLP-001");
    expect(pkg.end.followUpRecommendation).toBeNull();
    expect(TrainingContentPackageSchema.safeParse({ ...pkg, end: { ...pkg.end, followUpRecommendation: "Intervisie" } }).success).toBe(false);
  });
});

describe("trusted velden en invarianten", () => {
  it("ids, volgorde, fase, bloktype, werkvorm en routebeleid komen uit plan, catalogus en Blueprint", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    for (const planned of blockPlan.plannedBlocks) {
      const block = await blockOf("BLP-001", planned.id);
      expect(block).toMatchObject({
        plannedBlockId: planned.id,
        sequence: planned.sequence,
        certumPhase: planned.certumPhase,
        catalogBlockId: planned.catalogBlockId,
        routePolicy: "open_choice",
        reviewStatus: "draft",
      });
      expect(checkBlockContentInvariants(block, { blueprint, blockPlan })).toEqual([]);
    }
  });

  it.each([
    ["sequence", (b: BlockContentResult) => ({ ...b, sequence: 99 }), "trusted-veld-gewijzigd"],
    ["fase", (b: BlockContentResult) => ({ ...b, certumPhase: "toets" }), "trusted-veld-gewijzigd"],
    ["routebeleid", (b: BlockContentResult) => ({ ...b, routePolicy: "prescribed_action" }), "trusted-veld-gewijzigd"],
    ["werkvorm", (b: BlockContentResult) => ({ ...b, accreditation: { ...b.accreditation, workform: "Video" } }), "trusted-veld-gewijzigd"],
    ["bloktype", (b: BlockContentResult) => ({ ...b, catalogBlockId: "certum.bco.open-vraag" }), "bloktype-gewijzigd"],
  ])("een gewijzigd trusted veld (%s) is ongeldig", async (_name, mutate, code) => {
    const block = await blockOf("BLP-001", "blok-2");
    expect(checkBlockContentInvariants(mutate(block), fixtureCase("BLP-001"))).toContain(code);
  });

  it("de inhoud kan niet van bloktype wisselen", async () => {
    const block = await blockOf("BLP-001", "blok-1");
    const swapped = { ...block, body: { status: "generated", content: { catalogBlockId: "certum.bco.poll", title: "x", question: "y", options: ["a", "b"] } } };
    expect(checkBlockContentInvariants(swapped, fixtureCase("BLP-001"))).toContain("bloktype-gewijzigd");
  });

  it("een onbekend gepland blok wordt afgewezen", async () => {
    const block = await blockOf("BLP-001", "blok-1");
    expect(checkBlockContentInvariants({ ...block, plannedBlockId: "blok-99" }, fixtureCase("BLP-001"))).toEqual(["onbekend-blok"]);
  });

  it("sourceNeedRefs bestaan in de Blueprint en zijn uniek", async () => {
    const block = await blockOf("BLP-001", "blok-5");
    const ctx = fixtureCase("BLP-001");
    expect(checkBlockContentInvariants({ ...block, accreditation: { ...block.accreditation, sourceNeedRefs: ["SN9"] } }, ctx)).toContain("bronverwijzing-onbekend");
    expect(checkBlockContentInvariants({ ...block, accreditation: { ...block.accreditation, sourceNeedRefs: ["SN1", "SN1"] } }, ctx)).toContain("bronverwijzing-dubbel");
    expect(checkBlockContentInvariants({ ...block, accreditation: { ...block.accreditation, sourceNeedRefs: [] } }, ctx)).toContain("bronbehoefte-zonder-ref");
  });

  it("estimatedMinutes is een geheel aantal 1..120 of null", async () => {
    const block = await blockOf("BLP-001", "blok-2");
    for (const minutes of [0, -5, 2.5, 500]) {
      expect(BlockContentResultSchema.safeParse({ ...block, accreditation: { ...block.accreditation, estimatedMinutes: minutes } }).success).toBe(false);
    }
    expect(BlockContentResultSchema.safeParse({ ...block, accreditation: { ...block.accreditation, estimatedMinutes: null } }).success).toBe(true);
  });

  it("nergens een URL", async () => {
    const block = await blockOf("BLP-001", "blok-1");
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.tekst") throw new Error("verwacht tekst");
    const withUrl = { ...block, body: { ...block.body, content: { ...block.body.content, text: "Zie https://voorbeeld.nl" } } };
    expect(checkBlockContentInvariants(withUrl, fixtureCase("BLP-001"))).toContain("url-verzonnen");
  });
});

describe("Bron, media en AI Feedback (structureel)", () => {
  it("Bron levert nooit kennis: alleen needs_source; generated is niet toegestaan", async () => {
    const ctx = fixtureCase("BLP-001");
    expect(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-5")!.allowedStatuses).toEqual(["needs_source"]);
    const block = await blockOf("BLP-001", "blok-5");
    expect(block.body.status).toBe("needs_source");
    expect(block.accreditation.sourceNeedRefs).toEqual(["SN1", "SN2"]);
    const knowledge = { ...block, body: { status: "generated", content: { catalogBlockId: "certum.bco.tekst", title: "Bron", text: "Kennis" } } };
    expect(checkBlockContentInvariants(knowledge, ctx)).toContain("status-niet-toegestaan");
  });

  it("media zonder asset: alleen needs_asset, met trusted assettype en geen URL", async () => {
    const ctx = fixtureCase("BLP-001-MEDIA");
    expect(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-1")!.allowedStatuses).toEqual(["needs_asset"]);
    const block = await blockOf("BLP-001-MEDIA", "blok-1");
    expect(block.body).toMatchObject({ status: "needs_asset", assetRequirement: { assetType: "video" } });
    expect(JSON.stringify(block)).not.toMatch(/https?:\/\/|www\./);
  });

  it("needs_asset bij een niet-mediablok is ongeldig", async () => {
    const block = await blockOf("BLP-001", "blok-1");
    const asset = { ...block, body: { status: "needs_asset", assetRequirement: { assetType: "document", why: "x", desiredContent: "y", captionIntent: null } } };
    expect(checkBlockContentInvariants(asset, fixtureCase("BLP-001"))).toContain("status-niet-toegestaan");
  });

  it("AI Feedback (BLP-003 blok-8): alleen eerdere vraagblokken als context; Productie is niet aangetoond", () => {
    const ctx = fixtureCase("BLP-003");
    const target = resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-8")!;
    // blok-3 Poll, blok-4 Open vraag, blok-7 Open vraag; blok-6 Productie is invoer, maar niet aangetoond als context.
    expect(target.provenContextBlockIds).toEqual(["blok-3", "blok-4", "blok-7"]);
    expect(target.unprovenContextBlockIds).toEqual(["blok-6"]);
  });

  it("AI Feedback met gewijzigde context is ongeldig", async () => {
    const block = await blockOf("BLP-003", "blok-8");
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.ai-feedback") throw new Error("verwacht AI Feedback");
    const claimed = { ...block, body: { ...block.body, content: { ...block.body.content, availableContext: ["blok-3", "blok-4", "blok-6", "blok-7"], unavailableContext: [] } } };
    expect(checkBlockContentInvariants(claimed, fixtureCase("BLP-003"))).toContain("ai-context-niet-aangetoond");
  });

  it("AI Feedback (BLP-001 blok-4): Chat simulatie is niet aangetoond als context", () => {
    const ctx = fixtureCase("BLP-001");
    const target = resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-4")!;
    expect(target.provenContextBlockIds).toEqual(["blok-3"]);
    expect(target.unprovenContextBlockIds).toEqual(["blok-2"]);
  });

  it("AI Feedback zonder eerder vraagblok kan alleen blocked_by_capability zijn", async () => {
    const ctx = fixtureCase("BLP-001");
    ctx.blockPlan.plannedBlocks = ctx.blockPlan.plannedBlocks.filter((b) => b.id !== "blok-3");
    expect(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-4")!.allowedStatuses).toEqual(["blocked_by_capability"]);
    const block = await gen({ ...ctx, plannedBlockId: "blok-4", approvedEarlierContent: [] });
    expect(block.body.status).toBe("blocked_by_capability");
  });

  it("Chat simulatie bij open_choice: een sleutelwoorddoel is ongeldig", async () => {
    const block = await blockOf("BLP-001", "blok-2");
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.chat-simulatie") throw new Error("verwacht chat");
    expect(block.body.content.goal).toBeNull();
    const goal = { keywords: ["grens"], messageOnGoal: "Goed", instructionAfterGoal: "Rond af" };
    const withGoal = { ...block, body: { ...block.body, content: { ...block.body.content, goal } } };
    expect(checkBlockContentInvariants(withGoal, fixtureCase("BLP-001"))).toContain("sleutelwoorddoel-bij-meerdere-routes");
  });

  it("Conditionele logica: bron moet een eerder vraagblok zijn; heeft_geantwoord zonder waarde", async () => {
    const block = await blockOf("BLP-003", "blok-5");
    const ctx = fixtureCase("BLP-003");
    expect(checkBlockContentInvariants(block, ctx)).toEqual([]);
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.conditionele-logica") throw new Error("verwacht conditionele logica");
    const content = block.body.content;
    const later = { ...block, body: { ...block.body, content: { ...content, sourceBlockId: "blok-6" } } };
    expect(checkBlockContentInvariants(later, ctx)).toContain("voorwaarde-bron-ongeldig");
    const withValue = { ...block, body: { ...block.body, content: { ...content, value: "x" } } };
    expect(checkBlockContentInvariants(withValue, ctx)).toContain("voorwaarde-waarde-ongeldig");
  });

  it("Conditionele logica: een gelijk-aan-waarde moet een optie van de goedgekeurde Poll zijn", async () => {
    const ctx = fixtureCase("BLP-003");
    const poll = { ...(await blockOf("BLP-003", "blok-3")), reviewStatus: "approved" as const };
    const block = await blockOf("BLP-003", "blok-5");
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.conditionele-logica") throw new Error("verwacht conditionele logica");
    if (poll.body.status !== "generated" || poll.body.content.catalogBlockId !== "certum.bco.poll") throw new Error("verwacht poll");
    const content = block.body.content;
    const equals = (value: string) => ({ ...block, body: { status: "generated", content: { ...content, sourceBlockId: "blok-3", condition: "antwoord_is_gelijk_aan", value } } });
    expect(checkBlockContentInvariants(equals(poll.body.content.options[0]), { ...ctx, approvedEarlierContent: [poll] })).toEqual([]);
    expect(checkBlockContentInvariants(equals("Bestaat niet"), { ...ctx, approvedEarlierContent: [poll] })).toContain("voorwaarde-waarde-ongeldig");
  });
});

describe("goedkeuringspoorten en review", () => {
  it("Block Content vraagt een goedgekeurde Blueprint én een goedgekeurd Block Plan", () => {
    expect(getBlockContentGenerationBlocker({ status: "concept" }, { status: "approved" })).toBe("blueprint_not_approved");
    expect(getBlockContentGenerationBlocker({ status: "approved" }, { status: "concept" })).toBe("block_plan_not_approved");
    expect(getBlockContentGenerationBlocker({ status: "approved" }, { status: "approved" })).toBeNull();
  });

  it("alleen gegenereerde inhoud kan worden goedgekeurd", async () => {
    const pkg = await packageOf("BLP-001");
    const { blockPlan } = fixtureCase("BLP-001");
    const bron = pkg.blocks.find((b) => b.plannedBlockId === "blok-5")!;
    expect(getBlockApprovalBlocker(bron)).toBe("not_generated");
    expect(setBlockReviewStatus(pkg, blockPlan, "blok-5", "approved")).toBe(pkg);
    const approved = setBlockReviewStatus(pkg, blockPlan, "blok-1", "approved");
    expect(approved.blocks.find((b) => b.plannedBlockId === "blok-1")!.reviewStatus).toBe("approved");
    const revision = setBlockReviewStatus(approved, blockPlan, "blok-5", "needs_revision");
    expect(revision.blocks.find((b) => b.plannedBlockId === "blok-5")!.reviewStatus).toBe("needs_revision");
  });

  it("readiness: incomplete bij een open behoefte; in_review; approved als alles gegenereerd en goedgekeurd is", async () => {
    const ctx = fixtureCase("BLP-001");
    const pkg = await packageOf("BLP-001");
    expect(pkg.readiness).toBe("incomplete");
    expect(pkg.unresolvedRequirements).toEqual([
      { plannedBlockId: "blok-4", kind: "ai_context", refs: ["blok-2"] },
      { plannedBlockId: "blok-5", kind: "source", refs: ["SN1", "SN2"] },
      { plannedBlockId: "blok-9", kind: "ai_context", refs: ["blok-2", "blok-7"] },
    ]);
    expect(checkContentPackageInvariants(pkg, ctx)).toEqual([]);

    // Zonder Bron-blok (synthetisch): alles gegenereerd → in_review → approved.
    ctx.blockPlan.plannedBlocks = ctx.blockPlan.plannedBlocks.filter((b) => b.certumPhase !== "bron");
    const frame = await mock.generateFrame(ctx);
    const blocks = await Promise.all(ctx.blockPlan.plannedBlocks.map((b) => gen({ ...ctx, plannedBlockId: b.id, approvedEarlierContent: [] })));
    let full = composeContentPackage({ ...ctx, frame, blocks });
    expect(full.readiness).toBe("in_review");
    expect(full.start.estimatedDurationMinutes).toBe(blocks.reduce((s, b) => s + b.accreditation.estimatedMinutes!, 0));
    for (const b of full.blocks) full = setBlockReviewStatus(full, ctx.blockPlan, b.plannedBlockId, "approved");
    expect(full.readiness).toBe("approved");
  });

  it("duur blijft null zolang één blok geen schatting heeft", async () => {
    const pkg = await packageOf("BLP-001");
    expect(pkg.start.estimatedDurationMinutes).toBeNull();
  });

  it("regenereren zet een blok terug naar draft", async () => {
    const { blockPlan } = fixtureCase("BLP-001");
    const pkg = setBlockReviewStatus(await packageOf("BLP-001"), blockPlan, "blok-2", "approved");
    const replaced = replaceBlockContent(pkg, blockPlan, { ...(await blockOf("BLP-001", "blok-2")), reviewStatus: "approved" });
    expect(replaced.blocks.find((b) => b.plannedBlockId === "blok-2")!.reviewStatus).toBe("draft");
    expect(replaced.blocks.map((b) => b.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("pakket: titel en leerdoel trusted; afgeleide velden worden gecontroleerd", async () => {
    const ctx = fixtureCase("BLP-002");
    const pkg = await packageOf("BLP-002");
    expect(pkg).toMatchObject({ title: ctx.blueprint.title, learningGoal: ctx.blueprint.learningGoal, start: { learningGoals: [ctx.blueprint.learningGoal] } });
    expect(checkContentPackageInvariants({ ...pkg, title: "Andere titel" }, ctx)).toContain("trusted-veld-gewijzigd");
    expect(checkContentPackageInvariants({ ...pkg, readiness: "approved" }, ctx)).toContain("afgeleid-veld-wijkt-af");
  });
});
