import { describe, expect, it, vi } from "vitest";
import { runBlockPlanFlow, runBlueprintFlowV21, type BlueprintLogEntry } from "@/app/trainings/new/blueprint-flow";
import { TRAINING_BLUEPRINT_V2_INSTRUCTIONS } from "@/knowledge/prompts/training-blueprint-v2";
import {
  TRAINING_BLUEPRINT_V21_INSTRUCTIONS,
  TRAINING_BLUEPRINT_V21_PROMPT_VERSION,
  buildTrainingBlueprintV21Request,
} from "@/knowledge/prompts/training-blueprint-v2-1";
import { hashPreflightText } from "@/modules/privacy";
import type { SourceSegment } from "@/modules/training-agent/v2";
import { ReadyOutcomeV21Schema, type ReadyOutcomeV21 } from "@/modules/training-agent/v2-1";
import {
  ROUTE_POLICIES,
  TRAINING_BLUEPRINT_V2_VERSION,
  ambiguityFor,
  buildBlueprintGenerationInputV21,
  checkBlueprintV2Invariants,
  composeTrainingBlueprintV21,
  routePolicyFor,
  type BlueprintV21Design,
  type TrainingBlueprintV2,
} from "@/modules/training-blueprint/v2";
import v2Fixture from "../../../../test/fixtures/v2-baseline-ready-analyses.json";
import fixture from "../../../../test/fixtures/v21-ready-analyses.json";
import type { ClaudeMessagesClient } from "../../analysis/claude/claude-training-analysis-service";
import { toV2Outcome } from "@/modules/training-agent/v2-1";
import { AnalysisError } from "../../analysis/errors";
import { CLAUDE_BLUEPRINT_DEFAULTS } from "../config";
import { readBlockPlanConfig } from "../../block-plan/config";
import { createBlockPlanService, createTrainingBlueprintServiceV21 } from "../factory";
import { MockBlockPlanService } from "../mock/mock-block-plan-service";
import type { BlueprintRequestV21, TrainingBlueprintServiceV21 } from "../services";
import { ClaudeTrainingBlueprintServiceV21 } from "./claude-training-blueprint-service-v2-1";
import { BlueprintV21DesignSchema } from "./design-v2-1";
import { MockTrainingBlueprintServiceV21 } from "./mock-blueprint-service-v2-1";

type Case = { kind: "casus"; input: string; segments: SourceSegment[]; analysis: ReadyOutcomeV21 };
const CASES = fixture.cases as unknown as Record<"CA-006" | "CA-010", Case>;
const OPEN = { c: CASES["CA-006"], direction: "grens-en-verantwoordelijkheid" };
const PRESCRIBED = { c: CASES["CA-010"], direction: "instructie-volgen-ondanks-verzoek" };

const requestFor = ({ c, direction }: { c: Case; direction: string }): BlueprintRequestV21 => ({
  input: { kind: c.kind, text: c.input },
  analysis: c.analysis,
  segments: c.segments,
  selectedDirectionId: direction,
});
const inputFor = (sel: { c: Case; direction: string }) =>
  buildBlueprintGenerationInputV21({ inputKind: "casus", analysis: sel.c.analysis, segments: sel.c.segments, selectedDirectionId: sel.direction });
const ack = async (text: string) => ({ textHash: await hashPreflightText(text), acknowledgedFindingIds: [], syntheticDataAttested: true });

/** Wat Claude teruggeeft: het ontwerp zonder vaste velden, ambiguïteit en routebeleid. */
function designOf(b: TrainingBlueprintV2): BlueprintV21Design {
  const copy = structuredClone(b) as unknown as Record<string, unknown> & {
    decisionPoint: Record<string, unknown>;
    learningArc: { actie: Record<string, unknown> };
  };
  for (const f of ["version", "targetAudience", "selectedDirectionId", "learningGoal", "professionalDilemma", "sourceRefs", "ambiguity"]) delete copy[f];
  delete copy.decisionPoint.routePolicy;
  delete copy.learningArc.actie.routePolicy;
  return BlueprintV21DesignSchema.parse(copy);
}

type ParseResult = { stop_reason: string; parsed_output: unknown };
function claudeReturning(output: unknown) {
  const parse = vi.fn<(request: unknown) => Promise<ParseResult>>(async () => ({ stop_reason: "end_turn", parsed_output: output }));
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeTrainingBlueprintServiceV21(client, CLAUDE_BLUEPRINT_DEFAULTS), parse };
}
async function errorKindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof AnalysisError ? error.kind : "geen AnalysisError";
  }
  return "geen fout";
}

describe("centrale mapping routebeleid → ambiguïteit", () => {
  it("open_choice → multiple_defensible_actions; prescribed_action → single_best_action", () => {
    expect(ambiguityFor("open_choice")).toBe("multiple_defensible_actions");
    expect(ambiguityFor("prescribed_action")).toBe("single_best_action");
  });

  it("is exact de inverse van het afgeleide routebeleid van keuzemoment en Actie", () => {
    for (const policy of ROUTE_POLICIES) expect(routePolicyFor(ambiguityFor(policy))).toBe(policy);
  });
});

describe("trusted routebeleid in de Blueprint (mock en compose)", () => {
  it("CA-006 (open_choice) levert multiple_defensible_actions; keuzemoment en Actie volgen", async () => {
    const blueprint = await new MockTrainingBlueprintServiceV21().generate(requestFor(OPEN));
    expect(blueprint.version).toBe(TRAINING_BLUEPRINT_V2_VERSION);
    expect(blueprint.ambiguity).toBe("multiple_defensible_actions");
    expect(blueprint.decisionPoint.routePolicy).toBe("open_choice");
    expect(blueprint.learningArc.actie.routePolicy).toBe("open_choice");
    const analysis = toV2Outcome(OPEN.c.analysis);
    if (analysis.outcome !== "ready") throw new Error("verwacht ready");
    expect(checkBlueprintV2Invariants(blueprint, { analysis, segments: OPEN.c.segments })).toEqual([]);
  });

  it("CA-010 (prescribed_action) levert single_best_action; keuzemoment en Actie volgen", async () => {
    const blueprint = await new MockTrainingBlueprintServiceV21().generate(requestFor(PRESCRIBED));
    expect(blueprint.ambiguity).toBe("single_best_action");
    expect(blueprint.decisionPoint.routePolicy).toBe("prescribed_action");
    expect(blueprint.learningArc.actie.routePolicy).toBe("prescribed_action");
    expect(blueprint.learningArc.feedback.multipleDefensibleHandling).toBeNull();
    const analysis = toV2Outcome(PRESCRIBED.c.analysis);
    if (analysis.outcome !== "ready") throw new Error("verwacht ready");
    expect(checkBlueprintV2Invariants(blueprint, { analysis, segments: PRESCRIBED.c.segments })).toEqual([]);
  });

  it("compose overschrijft een meegestuurde ambiguïteit altijd met de trusted waarde", async () => {
    const input = inputFor(OPEN);
    const design = designOf(await new MockTrainingBlueprintServiceV21().generate(requestFor(OPEN)));
    const sneaky = { ...design, ambiguity: "single_best_action" } as BlueprintV21Design;
    expect(composeTrainingBlueprintV21(sneaky, input).ambiguity).toBe("multiple_defensible_actions");
  });

  it("de provider-input bevat het routebeleid van de gekozen richting", () => {
    expect(inputFor(OPEN).selectedDirection.routePolicy).toBe("open_choice");
    expect(inputFor(PRESCRIBED).selectedDirection.routePolicy).toBe("prescribed_action");
    expect(buildTrainingBlueprintV21Request(inputFor(PRESCRIBED))).toContain("Routebeleid: prescribed_action");
  });

  it("een Analysis V2.1-richting zonder routePolicy kan niet bestaan", () => {
    const analysis = structuredClone(OPEN.c.analysis) as unknown as { trainingDirections: Record<string, unknown>[] };
    delete analysis.trainingDirections[0].routePolicy;
    expect(ReadyOutcomeV21Schema.safeParse(analysis).success).toBe(false);
    expect(() =>
      buildBlueprintGenerationInputV21({
        inputKind: "casus",
        analysis: analysis as unknown as ReadyOutcomeV21,
        segments: OPEN.c.segments,
        selectedDirectionId: OPEN.direction,
      }),
    ).toThrow();
  });
});

describe("ClaudeTrainingBlueprintServiceV21", () => {
  it("het outputschema bevat geen ambiguïteit; prompt v2.1 en routebeleid gaan mee", async () => {
    const expected = await new MockTrainingBlueprintServiceV21().generate(requestFor(OPEN));
    const { service, parse } = claudeReturning(designOf(expected));
    await expect(service.generate(requestFor(OPEN))).resolves.toEqual(expected);
    const sent = parse.mock.calls[0][0] as { system: string; messages: { content: string }[]; output_config: { format: { schema: { properties: Record<string, unknown> } } } };
    expect(sent.system).toBe(TRAINING_BLUEPRINT_V21_INSTRUCTIONS);
    expect(Object.keys(sent.output_config.format.schema.properties)).not.toContain("ambiguity");
    expect(sent.messages[0].content).toContain("Routebeleid: open_choice");
  });

  it("Claude kan de ambiguïteit niet meesturen of overschrijven (invalid-output)", async () => {
    const design = designOf(await new MockTrainingBlueprintServiceV21().generate(requestFor(PRESCRIBED)));
    const { service, parse } = claudeReturning({ ...design, ambiguity: "multiple_defensible_actions" });
    expect(await errorKindOf(service.generate(requestFor(PRESCRIBED)))).toBe("invalid-output");
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("CA-010: Claude-ontwerp met open-route-inhoud bij prescribed_action wordt afgewezen door de invarianten", async () => {
    // Een ontwerp met behandeling van meerdere routes past niet bij single_best_action (behandeling-zonder-ambiguiteit).
    const open = designOf(await new MockTrainingBlueprintServiceV21().generate(requestFor(OPEN)));
    const { service } = claudeReturning(open);
    expect(await errorKindOf(service.generate(requestFor(PRESCRIBED)))).toBe("invalid-output");
  });
});

describe("flow V2.1: geen stille gok", () => {
  it("CA-006 via de flow: multiple_defensible_actions, en een Block Plan (mock) daarna", async () => {
    const logs: BlueprintLogEntry[] = [];
    const result = await runBlueprintFlowV21({ kind: "casus", text: OPEN.c.input }, await ack(OPEN.c.input), OPEN.c.analysis, OPEN.direction, {
      getService: () => new MockTrainingBlueprintServiceV21(),
      log: (e) => logs.push(e),
    });
    if (result.status !== "blueprint") throw new Error(result.reason);
    expect(result.blueprint.ambiguity).toBe("multiple_defensible_actions");
    expect(logs[0]).toMatchObject({ outcome: "success", version: "blueprint-contract/v2", ambiguity: "multiple_defensible_actions" });
    const plan = await runBlockPlanFlow(result.blueprint, { status: "approved" }, { getService: () => new MockBlockPlanService(), log: () => {} });
    expect(plan.status).toBe("block_plan");
  });

  it("CA-010 via de flow: single_best_action", async () => {
    const result = await runBlueprintFlowV21(
      { kind: "casus", text: PRESCRIBED.c.input },
      await ack(PRESCRIBED.c.input),
      PRESCRIBED.c.analysis,
      PRESCRIBED.direction,
      { getService: () => new MockTrainingBlueprintServiceV21(), log: () => {} },
    );
    if (result.status !== "blueprint") throw new Error(result.reason);
    expect(result.blueprint.ambiguity).toBe("single_best_action");
  });

  it("een legacy V2-analyse (zonder routebeleid) wordt niet stil geïnterpreteerd: incompatible_analysis, geen provider", async () => {
    const legacy = (v2Fixture.cases as unknown as Record<string, Case>)["CA-006"];
    const getService = vi.fn((): TrainingBlueprintServiceV21 => new MockTrainingBlueprintServiceV21());
    const logs: BlueprintLogEntry[] = [];
    const result = await runBlueprintFlowV21(
      { kind: "casus", text: legacy.input },
      await ack(legacy.input),
      legacy.analysis,
      "grens-respecteren-en-werk-bespreken",
      { getService, log: (e) => logs.push(e) },
    );
    expect(result).toEqual({ status: "rejected", reason: "incompatible_analysis" });
    expect(getService).not.toHaveBeenCalled();
    expect(logs[0]).toMatchObject({ reason: "incompatible_analysis" });
  });

  it("een provider waarvan de ambiguïteit afwijkt van het routebeleid wordt afgewezen", async () => {
    const wrong: TrainingBlueprintServiceV21 = {
      generate: async (req) => {
        const b = await new MockTrainingBlueprintServiceV21().generate(req);
        // Simuleert een provider die de trusted ambiguïteit (en het afgeleide routebeleid) negeert.
        const flipped = structuredClone(b);
        flipped.ambiguity = "single_best_action";
        flipped.decisionPoint.routePolicy = "prescribed_action";
        flipped.learningArc.actie.routePolicy = "prescribed_action";
        flipped.learningArc.feedback.multipleDefensibleHandling = null;
        flipped.learningArc.feedback.evaluationBasis = ["uitvoering"];
        return flipped;
      },
    };
    const result = await runBlueprintFlowV21({ kind: "casus", text: OPEN.c.input }, await ack(OPEN.c.input), OPEN.c.analysis, OPEN.direction, {
      getService: () => wrong,
      log: () => {},
    });
    expect(result).toEqual({ status: "rejected", reason: "invalid_blueprint" });
  });
});

describe("prompt training-blueprint/v2.1", () => {
  it("is v2 met alleen de vaste-contextregel en de ambiguïteitsuitleg vervangen", () => {
    expect(TRAINING_BLUEPRINT_V21_PROMPT_VERSION).toBe("training-blueprint/v2.1");
    expect(TRAINING_BLUEPRINT_V21_INSTRUCTIONS).not.toContain('Kies in "ambiguity"');
    expect(TRAINING_BLUEPRINT_V21_INSTRUCTIONS).toContain("De ambiguïteit staat vast.");
    expect(TRAINING_BLUEPRINT_V21_INSTRUCTIONS).toContain("het routebeleid en de bronsegmenten van de richting staan vast");
    const v2Lines = TRAINING_BLUEPRINT_V2_INSTRUCTIONS.split("\n");
    const v21Lines = new Set(TRAINING_BLUEPRINT_V21_INSTRUCTIONS.split("\n"));
    const changed = v2Lines.filter((line) => !v21Lines.has(line));
    // Alleen de vaste-contextregel en de vier regels van de ambiguïteitskeuze zijn vervangen.
    expect(changed).toHaveLength(5);
  });
});

describe("factory en Block Plan", () => {
  it("de V2.1-factory is standaard mock en logt v2-contract", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const blueprint = await createTrainingBlueprintServiceV21({}).generate(requestFor(PRESCRIBED));
    expect(blueprint.ambiguity).toBe("single_best_action");
    expect(JSON.parse(String(info.mock.calls.at(-1)![0]))).toMatchObject({ provider: "mock", blueprintContractVersion: "blueprint-contract/v2" });
    info.mockRestore();
  });

  it("claude zonder sleutel faalt veilig", () => {
    expect(() => createTrainingBlueprintServiceV21({ CERTUM_BLUEPRINT_PROVIDER: "claude" })).toThrow(AnalysisError);
  });

  it("Block Plan blijft mock-only", () => {
    // Sinds stap 9A heeft het Block Plan een eigen provider; standaard blijft het de mock.
    expect(readBlockPlanConfig({})).toEqual({ provider: "mock" });
    expect(typeof createBlockPlanService({}).generate).toBe("function");
  });
});
