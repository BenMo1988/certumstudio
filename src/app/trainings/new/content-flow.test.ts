import { describe, expect, it, vi } from "vitest";
import { MockBlockContentService } from "@/services/block-content/mock/mock-block-content-service";
import type { BlockContentService } from "@/services/block-content/services";
import { fixtureCase } from "../../../../test/block-content-fixtures";
import { runBlockRegenerationFlow, type ContentFlowLogEntry } from "./content-flow";

const APPROVED = { status: "approved" as const };
const CONCEPT = { status: "concept" as const };

function deps(service: BlockContentService = new MockBlockContentService()) {
  const entries: ContentFlowLogEntry[] = [];
  const getService = vi.fn(() => service);
  return { getService, log: (e: ContentFlowLogEntry) => entries.push(e), entries };
}

describe("poorten (gedeeld door iedere blokgeneratie)", () => {
  it("zonder goedgekeurde Blueprint of goedgekeurd Block Plan wordt geen provider aangemaakt", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    for (const [bp, plan, reason] of [
      [CONCEPT, APPROVED, "blueprint_not_approved"],
      [APPROVED, CONCEPT, "block_plan_not_approved"],
    ] as const) {
      const d = deps();
      expect(await runBlockRegenerationFlow(blueprint, bp, blockPlan, plan, "blok-2", [], d)).toEqual({ status: "rejected", reason });
      expect(d.getService).not.toHaveBeenCalled();
    }
  });

  it("ongeldige of oude Blueprint en een plan dat niet bij de Blueprint hoort worden afgewezen", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const d = deps();
    expect(await runBlockRegenerationFlow({ ...blueprint, version: "x" }, APPROVED, blockPlan, APPROVED, "blok-2", [], d)).toMatchObject({ reason: "invalid_blueprint" });
    const inconsistent = { ...blueprint, decisionPoint: { ...blueprint.decisionPoint, routePolicy: "prescribed_action" } };
    expect(await runBlockRegenerationFlow(inconsistent, APPROVED, blockPlan, APPROVED, "blok-2", [], d)).toMatchObject({ reason: "invalid_blueprint" });
    expect(await runBlockRegenerationFlow(blueprint, APPROVED, { ...blockPlan, blueprintVersion: "blueprint-contract/v1" }, APPROVED, "blok-2", [], d)).toMatchObject({ reason: "invalid_block_plan" });
    expect(await runBlockRegenerationFlow(fixtureCase("BLP-002").blueprint, APPROVED, blockPlan, APPROVED, "blok-2", [], d)).toMatchObject({ reason: "invalid_block_plan" });
    expect(d.getService).not.toHaveBeenCalled();
  });

  it("een Blueprint V1 (zonder sourceNeed-ids) is incompatible", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const { sourceNeeds, decisionPoint, learningArc, ...rest } = blueprint;
    const v1 = {
      ...rest,
      version: "blueprint-contract/v1",
      decisionPoint: decisionPoint.task,
      sourceNeeds: sourceNeeds.map(({ id, ...s }) => (void id, s)),
      learningArc: {
        ...learningArc,
        actie: { participantMust: learningArc.actie.participantMust, performanceType: learningArc.actie.performanceType },
        feedback: { respondsTo: learningArc.feedback.respondsTo, dimensions: learningArc.feedback.dimensions, multipleDefensibleHandling: learningArc.feedback.multipleDefensibleHandling },
        bron: { knowledgeQuestions: [], sourceTypes: [] },
        toets: { demonstrate: learningArc.toets.demonstrate, transferEvidence: learningArc.toets.transferEvidence, newDecisionPoint: learningArc.toets.newDecisionPoint },
      },
    };
    expect(await runBlockRegenerationFlow(v1, APPROVED, blockPlan, APPROVED, "blok-2", [], deps())).toMatchObject({ reason: "incompatible_blueprint" });
  });
});

describe("runBlockRegenerationFlow", () => {
  it("regenereert precies één blok, met alleen eerdere goedgekeurde inhoud", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-003");
    const mock = new MockBlockContentService();
    const poll = { ...(await mock.generate({ blueprint, blockPlan, plannedBlockId: "blok-3", approvedEarlierContent: [] })), reviewStatus: "approved" };
    const draft = await mock.generate({ blueprint, blockPlan, plannedBlockId: "blok-4", approvedEarlierContent: [] });
    const generate = vi.spyOn(mock, "generate");
    const result = await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, "blok-5", [poll, draft], deps(mock));
    expect(result).toMatchObject({ status: "block_content", block: { plannedBlockId: "blok-5", reviewStatus: "draft" } });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].approvedEarlierContent.map((b) => b.plannedBlockId)).toEqual(["blok-3"]);
  });

  it("onbekend blok, ontbrekende goedkeuring of ongeldige eerdere inhoud: geen provider", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-003");
    const d = deps();
    expect(await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, "blok-99", [], d)).toMatchObject({ reason: "unknown_block" });
    expect(await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, CONCEPT, "blok-1", [], d)).toMatchObject({ reason: "block_plan_not_approved" });
    expect(await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, "blok-5", [{ plannedBlockId: "blok-3" }], d)).toMatchObject({ reason: "invalid_earlier_content" });
    const poll = { ...(await new MockBlockContentService().generate({ blueprint, blockPlan, plannedBlockId: "blok-3", approvedEarlierContent: [] })), reviewStatus: "approved", sequence: 4 };
    expect(await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, "blok-5", [poll], d)).toMatchObject({ reason: "invalid_earlier_content" });
    expect(d.getService).not.toHaveBeenCalled();
  });
});

describe("deterministische resultaten vóór providercreatie", () => {
  /** Een service die elke aanroep telt; `getService` telt de providercreaties. */
  function counting() {
    const mock = new MockBlockContentService();
    const service: BlockContentService = { generate: vi.fn((r) => mock.generate(r)), generateFrame: vi.fn((r) => mock.generateFrame(r)) };
    return { service, ...deps(service) };
  }

  /** BC-005: BLP-002 met Reflectie als Productie (synthetisch), zodat AI Feedback (blok-5) geen eerder vraagblok heeft. */
  const unprovenFeedbackCase = () => fixtureCase("BLP-002-UNPROVEN-FEEDBACK");

  it.each([
    ["needs_source (Bron)", () => fixtureCase("BLP-001"), "blok-5", "needs_source"],
    ["needs_asset (Video)", () => fixtureCase("BLP-001-MEDIA"), "blok-1", "needs_asset"],
    ["blocked_by_capability (AI Feedback zonder vraagblok)", unprovenFeedbackCase, "blok-5", "blocked_by_capability"],
  ] as const)("%s → 0 providercreaties, 0 aanroepen", async (_name, ctxOf, plannedBlockId, status) => {
    const { blueprint, blockPlan } = ctxOf();
    const c = counting();
    const result = await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, plannedBlockId, [], c);
    expect(result).toMatchObject({ status: "block_content", block: { plannedBlockId, body: { status } } });
    expect(c.getService).not.toHaveBeenCalled();
    expect(c.service.generate).not.toHaveBeenCalled();
    expect(c.entries.at(-1)).toMatchObject({ outcome: "success", deterministic: 1, generated: 0 });
  });

  it("blocked_by_capability legt de concrete, trusted afhankelijkheid vast", async () => {
    const { blueprint, blockPlan } = unprovenFeedbackCase();
    const result = await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, "blok-5", [], deps());
    if (result.status !== "block_content" || result.block.body.status !== "blocked_by_capability") throw new Error();
    expect(result.block.body.missingCapability).toMatch(/^ai_context_buiten_vraagblokken: /);
    expect(result.block.body.why).toContain("blok-2, blok-3, blok-4");
  });

  it("needs_asset en needs_source bevatten alleen trusted informatie, geen URL of kennis", async () => {
    const media = fixtureCase("BLP-001-MEDIA");
    const asset = await runBlockRegenerationFlow(media.blueprint, APPROVED, media.blockPlan, APPROVED, "blok-1", [], deps());
    expect(asset).toMatchObject({ block: { body: { status: "needs_asset", assetRequirement: { assetType: "video" } } } });
    expect(JSON.stringify(asset)).not.toMatch(/https?:\/\/|www\./);
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const source = await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, "blok-5", [], deps());
    if (source.status !== "block_content" || source.block.body.status !== "needs_source") throw new Error();
    expect(source.block.accreditation.sourceNeedRefs).toEqual(["SN1", "SN2"]);
    expect(source.block.body.whatToValidate).toBe(blueprint.sourceNeeds.map((s) => `${s.id}: ${s.question}`).join(" "));
  });

  it("generated → precies één providercreatie en één aanroep, zonder Start/Einde", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const c = counting();
    const result = await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, "blok-2", [], c);
    expect(result).toMatchObject({ block: { body: { status: "generated" } } });
    expect(c.getService).toHaveBeenCalledTimes(1);
    expect(c.service.generate).toHaveBeenCalledTimes(1);
    expect(c.service.generateFrame).not.toHaveBeenCalled();
  });
});
