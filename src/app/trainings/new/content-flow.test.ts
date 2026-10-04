import { describe, expect, it, vi } from "vitest";
import { AnalysisError } from "@/services/analysis/errors";
import { MockBlockContentService } from "@/services/block-content/mock/mock-block-content-service";
import type { BlockContentService } from "@/services/block-content/services";
import { fixtureCase } from "../../../../test/block-content-fixtures";
import { replaceBlockContent } from "@/modules/block-content";
import { runBlockRegenerationFlow, runTrainingContentFlow, type ContentFlowLogEntry } from "./content-flow";

const APPROVED = { status: "approved" as const };
const CONCEPT = { status: "concept" as const };

function deps(service: BlockContentService = new MockBlockContentService()) {
  const entries: ContentFlowLogEntry[] = [];
  const getService = vi.fn(() => service);
  return { getService, log: (e: ContentFlowLogEntry) => entries.push(e), entries };
}

describe("runTrainingContentFlow: poorten", () => {
  it("zonder goedgekeurde Blueprint of goedgekeurd Block Plan wordt geen provider aangemaakt", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    for (const [bp, plan, reason] of [
      [CONCEPT, APPROVED, "blueprint_not_approved"],
      [APPROVED, CONCEPT, "block_plan_not_approved"],
    ] as const) {
      const d = deps();
      expect(await runTrainingContentFlow(blueprint, bp, blockPlan, plan, d)).toEqual({ status: "rejected", reason });
      expect(d.getService).not.toHaveBeenCalled();
    }
  });

  it("ongeldige of oude Blueprint en een plan dat niet bij de Blueprint hoort worden afgewezen", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const d = deps();
    expect(await runTrainingContentFlow({ ...blueprint, version: "x" }, APPROVED, blockPlan, APPROVED, d)).toMatchObject({ reason: "invalid_blueprint" });
    const inconsistent = { ...blueprint, decisionPoint: { ...blueprint.decisionPoint, routePolicy: "prescribed_action" } };
    expect(await runTrainingContentFlow(inconsistent, APPROVED, blockPlan, APPROVED, d)).toMatchObject({ reason: "invalid_blueprint" });
    expect(await runTrainingContentFlow(blueprint, APPROVED, { ...blockPlan, blueprintVersion: "blueprint-contract/v1" }, APPROVED, d)).toMatchObject({ reason: "invalid_block_plan" });
    expect(await runTrainingContentFlow(fixtureCase("BLP-002").blueprint, APPROVED, blockPlan, APPROVED, d)).toMatchObject({ reason: "invalid_block_plan" });
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
    expect(await runTrainingContentFlow(v1, APPROVED, blockPlan, APPROVED, deps())).toMatchObject({ reason: "incompatible_blueprint" });
  });

  it("na beide goedkeuringen: een volledig pakket, één aanroep per blok, metadata-log", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-002");
    const service = new MockBlockContentService();
    const generate = vi.spyOn(service, "generate");
    const d = deps(service);
    const result = await runTrainingContentFlow(blueprint, APPROVED, blockPlan, APPROVED, d);
    if (result.status !== "content_package") throw new Error(result.reason);
    expect(result.failedBlockId).toBeNull();
    expect(result.package.blocks).toHaveLength(11);
    // blok-6 en blok-7 (Bron) bepaalt de server zelf: 9 provideraanroepen voor 11 blokken, één providercreatie.
    expect(generate).toHaveBeenCalledTimes(9);
    expect(d.getService).toHaveBeenCalledTimes(1);
    expect(d.entries).toEqual([
      expect.objectContaining({ event: "certum.block_content", operation: "package", outcome: "success", blocks: 11, generated: 9, deterministic: 2, unresolved: result.package.unresolvedRequirements.length }),
    ]);
    expect(JSON.stringify(d.entries)).not.toContain(blueprint.title);
  });

  it("een providerfout bij Start/Einde wordt provider_error, zonder terugval naar mock", async () => {
    const failing: BlockContentService = {
      generate: vi.fn(),
      generateFrame: async () => { throw new AnalysisError("auth", "401"); },
    };
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    expect(await runTrainingContentFlow(blueprint, APPROVED, blockPlan, APPROVED, deps(failing))).toEqual({ status: "rejected", reason: "provider_error" });
    expect(failing.generate).not.toHaveBeenCalled();
  });

  it("een blokfout geeft een gedeeltelijk pakket met het mislukte blok", async () => {
    const mock = new MockBlockContentService();
    const failing: BlockContentService = {
      generateFrame: (r) => mock.generateFrame(r),
      generate: async (r) => {
        if (r.plannedBlockId === "blok-2") throw new AnalysisError("invalid-output", "x");
        return mock.generate(r);
      },
    };
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const result = await runTrainingContentFlow(blueprint, APPROVED, blockPlan, APPROVED, deps(failing));
    expect(result).toMatchObject({ status: "content_package", failedBlockId: "blok-2", package: { readiness: "incomplete" } });
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

  it("pakket: Start/Einde één keer per training, één providercreatie, deterministische blokken zonder aanroep", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-003");
    const c = counting();
    await runTrainingContentFlow(blueprint, APPROVED, blockPlan, APPROVED, c);
    expect(c.getService).toHaveBeenCalledTimes(1);
    expect(c.service.generateFrame).toHaveBeenCalledTimes(1);
    expect(c.service.generate).toHaveBeenCalledTimes(13); // 14 blokken, blok-9 (Bron) server-side
  });

  it("regeneratie van één blok verandert Start en Einde niet", async () => {
    const { blueprint, blockPlan } = fixtureCase("BLP-001");
    const c = counting();
    const first = await runTrainingContentFlow(blueprint, APPROVED, blockPlan, APPROVED, c);
    if (first.status !== "content_package") throw new Error();
    for (const plannedBlockId of ["blok-2", "blok-5"]) {
      const regen = await runBlockRegenerationFlow(blueprint, APPROVED, blockPlan, APPROVED, plannedBlockId, first.package.blocks, c);
      if (regen.status !== "block_content") throw new Error();
      const after = replaceBlockContent(first.package, blockPlan, regen.block);
      expect(after.start).toEqual(first.package.start);
      expect(after.end).toEqual(first.package.end);
    }
    expect(c.service.generateFrame).toHaveBeenCalledTimes(1);
  });
});
