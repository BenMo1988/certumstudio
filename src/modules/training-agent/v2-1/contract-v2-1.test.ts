import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runBlueprintFlowV2 } from "@/app/trainings/new/blueprint-flow";
import { runGatedAnalysis, type GateLogEntry } from "@/app/trainings/new/gated-analysis";
import { TRAINING_ANALYSIS_V2_INSTRUCTIONS, TRAINING_ANALYSIS_V2_PROMPT_VERSION } from "@/knowledge/prompts/training-analysis-v2";
import {
  TRAINING_ANALYSIS_V21_INSTRUCTIONS,
  TRAINING_ANALYSIS_V21_PROMPT_VERSION,
} from "@/knowledge/prompts/training-analysis-v2-1";
import { hashPreflightText } from "@/modules/privacy";
import { buildBlueprintGenerationInput } from "@/modules/training-blueprint";
import { ROUTE_POLICIES } from "@/modules/training-blueprint/v2";
import type { ClaudeMessagesClient } from "@/services/analysis/claude/claude-training-analysis-service";
import { ClaudeTrainingAnalysisServiceV21 } from "@/services/analysis/claude/claude-training-analysis-service-v2-1";
import { CLAUDE_ANALYSIS_DEFAULTS } from "@/services/analysis/config";
import { AnalysisError } from "@/services/analysis/errors";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { withAnalysisLoggingV2, type AnalysisLogEntryV2 } from "@/services/analysis/logging-v2";
import { MOCK_V2_BLOCKED, MOCK_V2_NEEDS_ADJUSTMENT, MOCK_V2_UNSUITABLE } from "@/services/analysis/mock/v2/mock-outcomes";
import { MockTrainingAnalysisServiceV21 } from "@/services/analysis/mock/v2-1/mock-training-analysis-service-v2-1";
import { MockTrainingBlueprintServiceV2 } from "@/services/blueprint/v2/mock-blueprint-service-v2";
import fixture from "../../../../test/fixtures/v2-baseline-ready-analyses.json";
import {
  ANALYSIS_CONTRACT_VERSION,
  AnalysisOutcomeSchema,
  checkOutcomeInvariants,
  findEpistemicFlags,
  segmentInput,
  type ReadyOutcome,
  type SourceSegment,
} from "../v2";
import {
  ANALYSIS_CONTRACT_V21_VERSION,
  AnalysisOutcomeV21Schema,
  DIRECTION_ROUTE_POLICIES,
  ReadyOutcomeV21Schema,
  checkOutcomeInvariantsV21,
  type ReadyOutcomeV21,
} from ".";

type FixtureCase = { kind: "casus"; input: string; segments: SourceSegment[]; analysis: ReadyOutcome };
const CASES = fixture.cases as unknown as Record<string, FixtureCase>;
const CA006 = CASES["CA-006"];
const DIRECTION = "grens-respecteren-en-werk-bespreken";

/** Route-neutraal leerdoel voor de BP-002-richting: prestatie, af te wegen belangen, te verantwoorden keuze. */
const ROUTE_NEUTRAL_GOAL =
  "De deelnemer kan bepalen hoe hij een uitgesproken privégrens respecteert en tegelijk verantwoordelijkheid houdt voor werkafspraken en gevolgen voor het team, en deze keuze professioneel onderbouwen.";

/** CA-006 als V2.1: de V2-baseline-analyse met routebeleid; de BP-002-richting open en route-neutraal. */
function ca006V21(): ReadyOutcomeV21 {
  return {
    ...structuredClone(CA006.analysis),
    trainingDirections: CA006.analysis.trainingDirections.map((d) => ({
      ...d,
      ...(d.id === DIRECTION && { proposedLearningGoal: ROUTE_NEUTRAL_GOAL }),
      routePolicy: "open_choice" as const,
    })),
  };
}

/**
 * Synthetische fixture voor prescribed_action: geen bestaande eval-case heeft aantoonbaar één normatief gewenste
 * handeling als kern, dus wordt die hier niet aan een bestaande case opgelegd.
 */
const PRESCRIBED_INPUT =
  "Een begeleider ziet bij terugkomst in de groepsruimte dat de nooduitgang geblokkeerd is door gestapelde stoelen. De vaste afspraak op de locatie is dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en daarna wordt doorgegeven aan de leidinggevende. De kinderen komen over enkele minuten terug van buiten.";
const PRESCRIBED_SEGMENTS = segmentInput(PRESCRIBED_INPUT);
const PRESCRIBED: ReadyOutcomeV21 = {
  outcome: "ready",
  summary: "Een begeleider ziet dat de nooduitgang van de groepsruimte geblokkeerd is, kort voordat de kinderen terugkomen.",
  professionalDilemma: "De begeleider moet de afgesproken handeling nu uitvoeren, onder tijdsdruk voordat de kinderen terug zijn.",
  proposedLearningGoal: "De deelnemer kan een geblokkeerde nooduitgang direct vrijmaken en dit daarna doorgeven aan de leidinggevende.",
  targetAudience: null,
  trainingDirections: [
    {
      id: "nooduitgang-vrijmaken",
      title: "Geblokkeerde nooduitgang direct vrijmaken",
      focus: "De begeleider voert de vaste afspraak uit: de nooduitgang vrijmaken en het daarna doorgeven.",
      proposedLearningGoal: "De deelnemer kan een geblokkeerde nooduitgang direct vrijmaken en dit daarna doorgeven aan de leidinggevende.",
      sourceRefs: ["S1", "S2"],
      routePolicy: "prescribed_action",
    },
  ],
  decisionRelevantGaps: [],
  abstractionNotes: [],
  sourceCandidates: [],
  rationale: "De input beschrijft een concrete situatie met één afgesproken handelingslijn.",
};

const ack = async (text: string, attested = true) => ({
  textHash: await hashPreflightText(text),
  acknowledgedFindingIds: [],
  syntheticDataAttested: attested,
});

type ParseResult = { stop_reason: string; stop_details?: { category: string | null } | null; parsed_output: unknown };
function claudeReturning(result: ParseResult) {
  const parse = vi.fn<(request: unknown) => Promise<ParseResult>>(async () => result);
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeTrainingAnalysisServiceV21(client, CLAUDE_ANALYSIS_DEFAULTS), parse };
}
async function errorKindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof AnalysisError ? error.kind : "geen AnalysisError";
  }
  return "geen fout";
}

describe("Analysis Contract V2.1: routePolicy op trainingsrichtingen", () => {
  it("heeft eigen versies; routebeleid heeft dezelfde waarden als Blueprint V2", () => {
    expect(ANALYSIS_CONTRACT_V21_VERSION).toBe("analysis-contract/v2.1");
    expect(TRAINING_ANALYSIS_V21_PROMPT_VERSION).toBe("training-analysis/v2.1");
    expect([...DIRECTION_ROUTE_POLICIES]).toEqual([...ROUTE_POLICIES]);
  });

  it("iedere ready-richting heeft routePolicy (mock)", async () => {
    const segments = segmentInput("Een professional twijfelt of hij moet ingrijpen. Hij moet kiezen.");
    const outcome = await new MockTrainingAnalysisServiceV21(0).analyze({ input: { kind: "praktijkvraag", text: "x" }, segments });
    if (outcome.outcome !== "ready") throw new Error("verwacht ready");
    expect(outcome.trainingDirections.map((d) => d.routePolicy)).toEqual(["open_choice", "prescribed_action"]);
  });

  it("een ready-richting zonder routePolicy is ongeldig", () => {
    const outcome = ca006V21() as unknown as { trainingDirections: Record<string, unknown>[] };
    delete outcome.trainingDirections[0].routePolicy;
    expect(AnalysisOutcomeV21Schema.safeParse(outcome).success).toBe(false);
  });

  it("alleen open_choice of prescribed_action zijn toegestaan", () => {
    const outcome = ca006V21() as unknown as { trainingDirections: Record<string, unknown>[] };
    outcome.trainingDirections[0].routePolicy = "mixed";
    expect(AnalysisOutcomeV21Schema.safeParse(outcome).success).toBe(false);
  });

  it("blocked, unsuitable en needs_adjustment zijn exact de V2-schema's en blijven geldig", () => {
    const [blocked, unsuitable, needsAdjustment] = AnalysisOutcomeV21Schema.options;
    const [v2Blocked, v2Unsuitable, v2NeedsAdjustment] = AnalysisOutcomeSchema.options;
    expect(blocked).toBe(v2Blocked);
    expect(unsuitable).toBe(v2Unsuitable);
    expect(needsAdjustment).toBe(v2NeedsAdjustment);
    for (const outcome of [MOCK_V2_BLOCKED, MOCK_V2_UNSUITABLE, MOCK_V2_NEEDS_ADJUSTMENT]) {
      expect(AnalysisOutcomeV21Schema.safeParse(outcome).success).toBe(true);
    }
  });

  it("CA-006 (BP-002): open_choice met een route-neutraal leerdoel is geldig, met geldige grounding", () => {
    const outcome = ca006V21();
    expect(ReadyOutcomeV21Schema.safeParse(outcome).success).toBe(true);
    expect(checkOutcomeInvariantsV21(outcome, CA006.segments)).toEqual([]);
    expect(findEpistemicFlags(outcome, CA006.input)).toEqual([]);
  });

  it("prescribed_action met een concrete handelingslijn is geldig (synthetische fixture)", () => {
    expect(ReadyOutcomeV21Schema.safeParse(PRESCRIBED).success).toBe(true);
    expect(checkOutcomeInvariantsV21(PRESCRIBED, PRESCRIBED_SEGMENTS)).toEqual([]);
    expect(findEpistemicFlags(PRESCRIBED, PRESCRIBED_INPUT)).toEqual([]);
  });

  it("grounding werkt ongewijzigd: een onbekende sourceRef wordt gesignaleerd, net als in V2", () => {
    const outcome = ca006V21();
    outcome.trainingDirections[0].sourceRefs = ["S42"];
    const v2 = structuredClone(CA006.analysis);
    v2.trainingDirections[0].sourceRefs = ["S42"];
    expect(checkOutcomeInvariantsV21(outcome, CA006.segments)).toEqual(checkOutcomeInvariants(v2, CA006.segments));
    expect(checkOutcomeInvariantsV21(outcome, CA006.segments).length).toBeGreaterThan(0);
  });

  it("controlled-term-discipline werkt ongewijzigd op een V2.1-uitkomst", () => {
    const outcome = ca006V21();
    outcome.trainingDirections[0].focus = "De teamleider past de meldcode toe.";
    expect(findEpistemicFlags(outcome, CA006.input).length).toBeGreaterThan(0);
  });
});

describe("CA-006 V2.1-verwachting staat vooraf vast", () => {
  it("de case bevat de V2.1-sectie met open_choice en het verbod op een voorgeschreven volgorde", () => {
    const root = join(process.cwd(), "evals/training-analysis/cases");
    const dir = readdirSync(root).find((d) => d.startsWith("CA-006"))!;
    const md = readFileSync(join(root, dir, "case.md"), "utf8");
    expect(md).toContain("## Verwachtingen voor Analysis Direction V2.1");
    expect(md).toContain("`routePolicy: open_choice`");
    expect(md).toMatch(/eerst de grens erkent en daarna \(direct\) het werk bespreekt/);
    expect(md.indexOf("## Verwachtingen voor Analysis Direction V2.1")).toBeLessThan(md.indexOf("## Runs"));
  });
});

describe("V2 blijft reproduceerbaar", () => {
  it("het V2-contract kent geen routePolicy en accepteert de V2-baseline-analyses", () => {
    expect(ANALYSIS_CONTRACT_VERSION).toBe("analysis-contract/v2");
    expect(AnalysisOutcomeSchema.safeParse(ca006V21()).success).toBe(false);
    for (const c of Object.values(CASES)) expect(AnalysisOutcomeSchema.safeParse(c.analysis).success).toBe(true);
  });

  it("prompt v2.1 is exact prompt v2 plus één ingevoegde sectie", () => {
    expect(TRAINING_ANALYSIS_V2_PROMPT_VERSION).toBe("training-analysis/v2");
    const start = TRAINING_ANALYSIS_V21_INSTRUCTIONS.indexOf("## Trainingsrichtingen: routebeleid en leerdoel");
    const end = TRAINING_ANALYSIS_V21_INSTRUCTIONS.indexOf("## Bronsegmenten en grounding");
    expect(start).toBeGreaterThan(0);
    const withoutSection = TRAINING_ANALYSIS_V21_INSTRUCTIONS.slice(0, start) + TRAINING_ANALYSIS_V21_INSTRUCTIONS.slice(end);
    expect(withoutSection).toBe(TRAINING_ANALYSIS_V2_INSTRUCTIONS);
  });

  it("prompt v2.1 bevat de nieuwe regels, met een domeinneutraal voorbeeld (geen evalantwoord)", () => {
    const p = TRAINING_ANALYSIS_V21_INSTRUCTIONS;
    expect(p).toMatch(/"open_choice"/);
    expect(p).toMatch(/"prescribed_action"/);
    expect(p).toMatch(/Kies niet automatisch "open_choice"/);
    expect(p).toMatch(/geen "eerst X, daarna Y"/);
    expect(p).toMatch(/is inconsistent/);
    expect(p).not.toMatch(/privégrens|teamleider|deadline/i);
  });
});

describe("ClaudeTrainingAnalysisServiceV21", () => {
  it("stuurt prompt v2.1 en een schema met routePolicy; geeft een geldige V2.1-uitkomst terug", async () => {
    const outcome = ca006V21();
    const { service, parse } = claudeReturning({ stop_reason: "end_turn", parsed_output: { result: outcome } });
    await expect(service.analyze({ input: { kind: "casus", text: CA006.input }, segments: CA006.segments })).resolves.toEqual(outcome);
    const sent = parse.mock.calls[0][0] as { system: string; output_config: { effort: string; format: { schema: unknown } } };
    expect(sent.system).toBe(TRAINING_ANALYSIS_V21_INSTRUCTIONS);
    expect(sent.output_config.effort).toBe("medium");
    expect(JSON.stringify(sent.output_config.format.schema)).toContain("routePolicy");
  });

  it.each<[string, (o: Record<string, unknown> & { trainingDirections: Record<string, unknown>[] }) => void]>([
    ["zonder routePolicy", (o) => delete o.trainingDirections[0].routePolicy],
    ["ongeldige routePolicy", (o) => (o.trainingDirections[0].routePolicy = "mixed")],
    ["onbekende sourceRef", (o) => (o.trainingDirections[0].sourceRefs = ["S42"])],
  ])("%s → invalid-output, zonder tweede aanroep", async (_, change) => {
    const outcome = ca006V21() as unknown as Record<string, unknown> & { trainingDirections: Record<string, unknown>[] };
    change(outcome);
    const { service, parse } = claudeReturning({ stop_reason: "end_turn", parsed_output: { result: outcome } });
    expect(await errorKindOf(service.analyze({ input: { kind: "casus", text: CA006.input }, segments: CA006.segments }))).toBe("invalid-output");
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("claude zonder sleutel faalt veilig, zonder terugval naar mock", () => {
    expect(() => createTrainingAnalysisServiceV21({ CERTUM_ANALYSIS_PROVIDER: "claude" })).toThrow(AnalysisError);
  });
});

describe("logging V2.1: alleen metadata", () => {
  it("logt versies v2.1 en aantallen per routebeleid, geen titels, focus of leerdoelen", async () => {
    const logs: AnalysisLogEntryV2[] = [];
    const service = withAnalysisLoggingV2(
      new MockTrainingAnalysisServiceV21(0),
      { provider: "mock", promptVersion: TRAINING_ANALYSIS_V21_PROMPT_VERSION, contractVersion: ANALYSIS_CONTRACT_V21_VERSION },
      (e) => logs.push(e),
    );
    const segments = segmentInput("Een professional twijfelt of hij moet ingrijpen. Hij moet kiezen.");
    const outcome = await service.analyze({ input: { kind: "praktijkvraag", text: "x" }, segments });
    expect(logs[0]).toMatchObject({
      promptVersion: "training-analysis/v2.1",
      contractVersion: "analysis-contract/v2.1",
      analysisOutcome: "ready",
      openChoiceDirections: 1,
      prescribedActionDirections: 1,
    });
    if (outcome.outcome !== "ready") throw new Error("verwacht ready");
    const line = JSON.stringify(logs);
    for (const d of outcome.trainingDirections) {
      expect(line).not.toContain(d.title);
      expect(line).not.toContain(d.focus);
      expect(line).not.toContain(d.proposedLearningGoal);
    }
  });

  it("V2-logging zonder routebeleid blijft ongewijzigd (geen nieuwe velden)", async () => {
    const logs: AnalysisLogEntryV2[] = [];
    const v2 = { analyze: async () => structuredClone(CA006.analysis) };
    await withAnalysisLoggingV2(v2, { provider: "mock" }, (e) => logs.push(e)).analyze({ input: { kind: "casus", text: CA006.input }, segments: CA006.segments });
    expect(logs[0]).toMatchObject({ promptVersion: "training-analysis/v2", contractVersion: "analysis-contract/v2" });
    expect(Object.keys(logs[0])).not.toContain("openChoiceDirections");
  });
});

describe("poorten en Blueprint met een V2.1-analyse", () => {
  it("zonder attestatie wordt de V2.1-service nooit aangemaakt", async () => {
    const getService = vi.fn(() => new MockTrainingAnalysisServiceV21(0));
    const result = await runGatedAnalysis({ kind: "casus", text: CA006.input }, await ack(CA006.input, false), {
      getService,
      log: () => {},
      contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
    });
    expect(result.status).toBe("preflight");
    expect(getService).not.toHaveBeenCalled();
  });

  it("met geldige poorten levert de V2.1-mock een uitkomst met routebeleid en logt de V2.1-contractversie", async () => {
    const logs: GateLogEntry[] = [];
    const result = await runGatedAnalysis({ kind: "casus", text: CA006.input }, await ack(CA006.input), {
      getService: () => new MockTrainingAnalysisServiceV21(0),
      log: (e) => logs.push(e),
      contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
    });
    if (result.status !== "analysis" || result.analysis.outcome !== "ready") throw new Error("verwacht ready");
    expect(AnalysisOutcomeV21Schema.safeParse(result.analysis).success).toBe(true);
    expect(logs.find((e) => e.event === "certum.analysis_result")).toMatchObject({ contractVersion: "analysis-contract/v2.1" });
  });

  it("de Blueprint-flow accepteert een V2.1-analyse; routePolicy gaat niet mee naar de Blueprint-provider", async () => {
    const analysis = ca006V21();
    const result = await runBlueprintFlowV2({ kind: "casus", text: CA006.input }, await ack(CA006.input), analysis, DIRECTION, {
      getService: () => new MockTrainingBlueprintServiceV2(),
      log: () => {},
    });
    if (result.status !== "blueprint") throw new Error(result.reason);
    expect(result.blueprint.learningGoal).toBe(ROUTE_NEUTRAL_GOAL);
    const input = buildBlueprintGenerationInput({ inputKind: "casus", analysis, segments: CA006.segments, selectedDirectionId: DIRECTION });
    expect(JSON.stringify(input)).not.toContain("routePolicy");
  });

  it("de Blueprint-flow accepteert nog steeds een V2-analyse (baseline-fixtures)", async () => {
    const result = await runBlueprintFlowV2({ kind: "casus", text: CA006.input }, await ack(CA006.input), CA006.analysis, DIRECTION, {
      getService: () => new MockTrainingBlueprintServiceV2(),
      log: () => {},
    });
    expect(result.status).toBe("blueprint");
  });
});
