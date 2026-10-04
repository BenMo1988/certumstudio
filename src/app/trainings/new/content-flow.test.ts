import { describe, expect, it, vi } from "vitest";
import { AnalysisError } from "@/services/analysis/errors";
import { MockBlockContentService } from "@/services/block-content/mock/mock-block-content-service";
import type { BlockContentService } from "@/services/block-content/services";
import { fixtureCase } from "../../../../test/block-content-fixtures";
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
    expect(generate).toHaveBeenCalledTimes(11);
    expect(d.entries).toEqual([
      expect.objectContaining({ event: "certum.block_content", operation: "package", outcome: "success", blocks: 11, generated: 9, unresolved: result.package.unresolvedRequirements.length }),
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
