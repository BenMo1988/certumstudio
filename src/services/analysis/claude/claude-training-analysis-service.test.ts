import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { TRAINING_ANALYSIS_INSTRUCTIONS } from "@/knowledge/prompts/training-analysis";
import type { InputAnalysis } from "@/modules/training-agent";
import { CLAUDE_ANALYSIS_DEFAULTS } from "../config";
import { AnalysisError } from "../errors";
import { MOCK_ANALYSIS_CASUS } from "../mock/mock-analyses";
import {
  ClaudeTrainingAnalysisService,
  toAnalysisError,
  type ClaudeMessagesClient,
} from "./claude-training-analysis-service";

/*
 * Geen echte API-aanroepen: de SDK-client wordt vervangen door een stub die
 * een vooraf bepaald antwoord of een SDK-fout teruggeeft.
 */

type ParseResult = { stop_reason: string; stop_details?: { category: string | null } | null; parsed_output: unknown };

function serviceReturning(result: ParseResult | Error) {
  const parse = vi.fn<(request: unknown) => Promise<ParseResult>>(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeTrainingAnalysisService(client, CLAUDE_ANALYSIS_DEFAULTS), parse };
}

const INPUT = { kind: "casus" as const, text: "Een leerling vraagt om geheimhouding." };

async function kindOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof AnalysisError ? error.kind : "geen AnalysisError";
  }
  return "geen fout";
}

describe("ClaudeTrainingAnalysisService", () => {
  it("geeft een geldige analyse door en stuurt het juiste verzoek", async () => {
    const { service, parse } = serviceReturning({ stop_reason: "end_turn", parsed_output: MOCK_ANALYSIS_CASUS });
    await expect(service.analyze(INPUT)).resolves.toEqual(MOCK_ANALYSIS_CASUS);

    const request = parse.mock.calls[0][0] as Record<string, unknown> & {
      messages: { content: string }[];
      output_config: { effort: string; format: { type: string } };
    };
    expect(request.model).toBe(CLAUDE_ANALYSIS_DEFAULTS.model);
    expect(request.system).toBe(TRAINING_ANALYSIS_INSTRUCTIONS);
    expect(request.output_config.effort).toBe(CLAUDE_ANALYSIS_DEFAULTS.effort);
    expect(request.output_config.format.type).toBe("json_schema");
    expect(request.messages[0].content).toContain('<invoer soort="casus">');
    expect(request.messages[0].content).toContain(INPUT.text);
    // Geen model-fallback en geen beta-headers: het gekozen model voert de analyse uit.
    expect(request).not.toHaveProperty("fallbacks");
    expect(request).not.toHaveProperty("betas");
  });

  it("refusal → AnalysisError refusal", async () => {
    const { service } = serviceReturning({
      stop_reason: "refusal",
      stop_details: { category: "bio" },
      parsed_output: null,
    });
    expect(await kindOf(service.analyze(INPUT))).toBe("refusal");
  });

  it("afgekapt op max_tokens → incomplete", async () => {
    const { service } = serviceReturning({ stop_reason: "max_tokens", parsed_output: null });
    expect(await kindOf(service.analyze(INPUT))).toBe("incomplete");
  });

  it("lege output → empty", async () => {
    const { service } = serviceReturning({ stop_reason: "end_turn", parsed_output: null });
    expect(await kindOf(service.analyze(INPUT))).toBe("empty");
  });

  it("output die domeinregels schendt → invalid-output", async () => {
    const broken: InputAnalysis = {
      ...MOCK_ANALYSIS_CASUS,
      privacyAssessment: { level: "blokkeren", description: null },
    };
    const { service } = serviceReturning({ stop_reason: "end_turn", parsed_output: broken });
    expect(await kindOf(service.analyze(INPUT))).toBe("invalid-output");
  });

  it("SDK-fout bij het parsen van de output → invalid-output", async () => {
    const { service } = serviceReturning(new Anthropic.AnthropicError("Failed to parse structured output"));
    expect(await kindOf(service.analyze(INPUT))).toBe("invalid-output");
  });
});

describe("toAnalysisError", () => {
  const headers = new Headers();

  it.each([
    ["timeout", new Anthropic.APIConnectionTimeoutError()],
    ["connection", new Anthropic.APIConnectionError({ message: "down" })],
    ["rate-limit", new Anthropic.RateLimitError(429, undefined, "rate", headers)],
    ["auth", new Anthropic.AuthenticationError(401, undefined, "auth", headers)],
    ["provider", new Anthropic.InternalServerError(529, undefined, "overloaded", headers)],
    ["provider", new TypeError("onverwacht")],
  ])("%s", (kind, error) => {
    expect(toAnalysisError(error).kind).toBe(kind);
  });

  it("neemt geen providerberichten over in de foutmelding", () => {
    const error = toAnalysisError(new Anthropic.RateLimitError(429, undefined, "org-123 limit details", headers));
    expect(error.message).not.toContain("org-123");
  });
});
