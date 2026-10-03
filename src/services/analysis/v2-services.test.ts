import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { TRAINING_ANALYSIS_V2_INSTRUCTIONS } from "@/knowledge/prompts/training-analysis-v2";
import { TRAINING_ANALYSIS_INSTRUCTIONS } from "@/knowledge/prompts/training-analysis";
import { segmentInput, type AnalysisOutcome } from "@/modules/training-agent/v2";
import { evalInput } from "../../../test/eval-inputs";
import { ClaudeTrainingAnalysisServiceV2 } from "./claude/claude-training-analysis-service-v2";
import type { ClaudeMessagesClient } from "./claude/claude-training-analysis-service";
import { CLAUDE_ANALYSIS_DEFAULTS } from "./config";
import { AnalysisError } from "./errors";
import { createTrainingAnalysisServiceV2 } from "./factory";
import { withAnalysisLoggingV2, type AnalysisLogEntryV2 } from "./logging-v2";
import { MOCK_V2_UNSUITABLE, mockV2Ready } from "./mock/v2/mock-outcomes";
import { MockTrainingAnalysisServiceV2 } from "./mock/v2/mock-training-analysis-service-v2";

const mock = new MockTrainingAnalysisServiceV2(0);
const request = (kind: "onderwerp" | "praktijkvraag" | "casus", text: string) => ({
  input: { kind, text },
  segments: segmentInput(text),
});

describe("MockTrainingAnalysisServiceV2", () => {
  it("CA-002 (onderwerp) → needs_adjustment, zonder trainingsrichtingen", async () => {
    const outcome = await mock.analyze(request("onderwerp", evalInput("CA-002")));
    expect(outcome.outcome).toBe("needs_adjustment");
    expect(outcome).not.toHaveProperty("trainingDirections");
  });

  it("CA-003 (casus zonder keuzemoment) → unsuitable, zonder leerdoel of richtingen", async () => {
    const outcome = await mock.analyze(request("casus", evalInput("CA-003")));
    expect(outcome.outcome).toBe("unsuitable");
    expect(outcome).not.toHaveProperty("proposedLearningGoal");
    expect(outcome).not.toHaveProperty("trainingDirections");
  });

  it.each(["CA-001", "CA-005", "CA-006", "CA-007", "CA-008"])("%s (casus met keuzemoment) → ready", async (id) => {
    const r = request("casus", evalInput(id));
    const outcome = await mock.analyze(r);
    expect(outcome.outcome).toBe("ready");
    const known = new Set(r.segments.map((s) => s.id));
    if (outcome.outcome === "ready") {
      expect(outcome.trainingDirections.length).toBeGreaterThanOrEqual(1);
      expect(outcome.trainingDirections.length).toBeLessThanOrEqual(3);
      expect(outcome.trainingDirections.every((d) => d.sourceRefs.length > 0 && d.sourceRefs.every((ref) => known.has(ref)))).toBe(true);
    }
  });

  it("markeringen sturen de uitkomst voor tests", async () => {
    expect((await mock.analyze(request("casus", "Een situatie #blokkeren"))).outcome).toBe("blocked");
    expect((await mock.analyze(request("praktijkvraag", "Een vraag #ongeschikt"))).outcome).toBe("unsuitable");
    expect((await mock.analyze(request("casus", "Ze twijfelt. #afbakenen"))).outcome).toBe("needs_adjustment");
    expect((await mock.analyze(request("praktijkvraag", "Een vraag #kader"))).outcome).toBe("ready");
  });

  it("praktijkvraag → ready, ook bij één segment", async () => {
    const outcome = await mock.analyze(request("praktijkvraag", "Hoe reageer ik op een boze ouder?"));
    expect(outcome.outcome).toBe("ready");
  });
});

type ParseResult = { stop_reason: string; stop_details?: { category: string | null } | null; parsed_output: unknown };

function claudeReturning(result: ParseResult | Error) {
  const parse = vi.fn<(request: unknown) => Promise<ParseResult>>(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeTrainingAnalysisServiceV2(client, CLAUDE_ANALYSIS_DEFAULTS), parse };
}

async function kindOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof AnalysisError ? error.kind : "geen AnalysisError";
  }
  return "geen fout";
}

describe("ClaudeTrainingAnalysisServiceV2 (stub, geen echte aanroep)", () => {
  const r = request("casus", evalInput("CA-001"));

  it("stuurt prompt v2 met genummerde bronsegmenten en geeft result terug", async () => {
    const outcome = mockV2Ready(r.segments);
    const { service, parse } = claudeReturning({ stop_reason: "end_turn", parsed_output: { result: outcome } });
    await expect(service.analyze(r)).resolves.toEqual(outcome);

    const sent = parse.mock.calls[0][0] as { system: string; messages: { content: string }[]; output_config: { effort: string } };
    expect(sent.system).toBe(TRAINING_ANALYSIS_V2_INSTRUCTIONS);
    expect(sent.system).not.toBe(TRAINING_ANALYSIS_INSTRUCTIONS);
    expect(sent.output_config.effort).toBe("medium");
    expect(sent.messages[0].content).toContain("[S1] ");
    expect(sent.messages[0].content).toContain(`[${r.segments.at(-1)!.id}] `);
    expect(sent).not.toHaveProperty("fallbacks");
  });

  it("onbekende sourceRef van de provider → invalid-output", async () => {
    const outcome = mockV2Ready(r.segments);
    outcome.trainingDirections[0].sourceRefs = ["S99"];
    const { service } = claudeReturning({ stop_reason: "end_turn", parsed_output: { result: outcome } });
    expect(await kindOf(service.analyze(r))).toBe("invalid-output");
  });

  it.each<[string, ParseResult | Error]>([
    ["refusal", { stop_reason: "refusal", stop_details: { category: "bio" }, parsed_output: null }],
    ["incomplete", { stop_reason: "max_tokens", parsed_output: null }],
    ["empty", { stop_reason: "end_turn", parsed_output: null }],
    ["invalid-output", new Anthropic.AnthropicError("Failed to parse structured output")],
    ["rate-limit", new Anthropic.RateLimitError(429, undefined, "rate", new Headers())],
  ])("%s", async (kind, result) => {
    const { service } = claudeReturning(result);
    expect(await kindOf(service.analyze(r))).toBe(kind);
  });

  it("unsuitable wordt ongewijzigd doorgegeven", async () => {
    const { service } = claudeReturning({ stop_reason: "end_turn", parsed_output: { result: MOCK_V2_UNSUITABLE } });
    await expect(service.analyze(r)).resolves.toEqual(MOCK_V2_UNSUITABLE);
  });
});

describe("withAnalysisLoggingV2", () => {
  const SECRET = "Een fictieve situatie met de zin over het keuzemoment.";

  it("logt alleen metadata: versies, uitkomst en aantallen; geen inhoud, segmenten of refs", async () => {
    const entries: AnalysisLogEntryV2[] = [];
    const r = request("casus", `${SECRET} De professional twijfelt.`);
    const outcome: AnalysisOutcome = mockV2Ready(r.segments);
    const service = withAnalysisLoggingV2({ analyze: async () => outcome }, { provider: "claude", model: "claude-opus-5-5", effort: "medium" }, (e) => entries.push(e));
    await service.analyze(r);

    expect(entries[0]).toMatchObject({
      event: "certum.analysis",
      provider: "claude",
      model: "claude-opus-5-5",
      effort: "medium",
      promptVersion: "training-analysis/v2",
      contractVersion: "analysis-contract/v2",
      inputKind: "casus",
      segmentCount: r.segments.length,
      outcome: "success",
      analysisOutcome: "ready",
    });
    const logged = JSON.stringify(entries);
    for (const content of [SECRET, outcome.summary, outcome.professionalDilemma, "sourceRefs", '"S1"', "meldcode"]) {
      expect(logged).not.toContain(content);
    }
  });
});

describe("createTrainingAnalysisServiceV2", () => {
  it("mock zonder configuratie; claude zonder sleutel geeft een config-fout (geen stille terugval)", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const outcome = await createTrainingAnalysisServiceV2({}).analyze(request("onderwerp", "Omgaan met weerstand"));
    expect(outcome.outcome).toBe("needs_adjustment");
    expect(() => createTrainingAnalysisServiceV2({ CERTUM_ANALYSIS_PROVIDER: "claude" })).toThrow(AnalysisError);
  });
});
