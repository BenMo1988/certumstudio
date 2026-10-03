import { describe, expect, it, vi } from "vitest";
import { TRAINING_ANALYSIS_V21_INSTRUCTIONS } from "@/knowledge/prompts/training-analysis-v2-1";
import {
  TRAINING_ANALYSIS_V211_INSTRUCTIONS,
  TRAINING_ANALYSIS_V211_PROMPT_VERSION,
} from "@/knowledge/prompts/training-analysis-v2-1-1";
import type { ClaudeMessagesClient } from "@/services/analysis/claude/claude-training-analysis-service";
import { ClaudeTrainingAnalysisServiceV21 } from "@/services/analysis/claude/claude-training-analysis-service-v2-1";
import { CLAUDE_ANALYSIS_DEFAULTS, readAnalysisConfig } from "@/services/analysis/config";
import { AnalysisError } from "@/services/analysis/errors";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { segmentInput } from "../v2";
import { ANALYSIS_CONTRACT_V21_VERSION } from ".";

const SECTION_START = "Bepaal eerst suitability.";
const ANCHOR = 'Geef bij "ready" iedere trainingsrichting een "routePolicy".';

describe("prompt training-analysis/v2.1.1", () => {
  it("is exact v2.1 plus één ingevoegde alinea in de routebeleid-sectie; contract blijft v2.1", () => {
    expect(TRAINING_ANALYSIS_V211_PROMPT_VERSION).toBe("training-analysis/v2.1.1");
    expect(ANALYSIS_CONTRACT_V21_VERSION).toBe("analysis-contract/v2.1");
    const start = TRAINING_ANALYSIS_V211_INSTRUCTIONS.indexOf(SECTION_START);
    const end = TRAINING_ANALYSIS_V211_INSTRUCTIONS.indexOf(ANCHOR);
    expect(start).toBeGreaterThan(TRAINING_ANALYSIS_V211_INSTRUCTIONS.indexOf("## Trainingsrichtingen: routebeleid en leerdoel"));
    expect(end).toBeGreaterThan(start);
    const withoutInsert = TRAINING_ANALYSIS_V211_INSTRUCTIONS.slice(0, start) + TRAINING_ANALYSIS_V211_INSTRUCTIONS.slice(end);
    expect(withoutInsert).toBe(TRAINING_ANALYSIS_V21_INSTRUCTIONS);
  });

  it("zet suitability vóór routebeleid en maakt prescribed_action ondergeschikt", () => {
    const p = TRAINING_ANALYSIS_V211_INSTRUCTIONS;
    expect(p).toContain("Bepaal eerst suitability.");
    expect(p).toMatch(/"prescribed_action" betekent niet dat iedere expliciete werkinstructie geschikt is/);
    expect(p).toMatch(/blijft "unsuitable", ook als de beschreven procedure één vaste handelingslijn heeft/);
    expect(p).toMatch(/de beroepssituatie betekenisvol professioneel handelen vraagt/);
    expect(p).toMatch(/er een relevante spanning, beoordeling of trigger aanwezig is/);
    expect(p).toMatch(/één handelingslijn uiteindelijk normatief of inhoudelijk leidend is/);
  });

  it("bevat geen evalcase-voorbeeld", () => {
    expect(TRAINING_ANALYSIS_V211_INSTRUCTIONS).not.toMatch(/nooduitgang|dozen|inspectieronde|groepsactiviteit/i);
  });
});

describe("actieve analyse-engine gebruikt v2.1.1", () => {
  it("de factory logt training-analysis/v2.1.1 met contract v2.1 (mock)", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const segments = segmentInput("Een professional twijfelt of hij moet ingrijpen. Hij moet kiezen.");
    await createTrainingAnalysisServiceV21({}).analyze({ input: { kind: "praktijkvraag", text: "x" }, segments });
    const line = JSON.parse(String(info.mock.calls.at(-1)![0])) as { promptVersion: string; contractVersion: string };
    expect(line).toMatchObject({ promptVersion: "training-analysis/v2.1.1", contractVersion: "analysis-contract/v2.1" });
    info.mockRestore();
  });

  it("de Claude-service stuurt de geïnjecteerde v2.1.1-instructies; zonder injectie blijft het v2.1", async () => {
    const parse = vi.fn(async () => ({ stop_reason: "end_turn", parsed_output: null }));
    const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
    const request = { input: { kind: "casus" as const, text: "x" }, segments: segmentInput("Een zin.") };
    await new ClaudeTrainingAnalysisServiceV21(client, CLAUDE_ANALYSIS_DEFAULTS, TRAINING_ANALYSIS_V211_INSTRUCTIONS).analyze(request).catch(() => {});
    await new ClaudeTrainingAnalysisServiceV21(client, CLAUDE_ANALYSIS_DEFAULTS).analyze(request).catch(() => {});
    const systems = parse.mock.calls.map((c) => (c as unknown as [{ system: string }])[0].system);
    expect(systems).toEqual([TRAINING_ANALYSIS_V211_INSTRUCTIONS, TRAINING_ANALYSIS_V21_INSTRUCTIONS]);
  });
});

describe("maxRetries-override voor evalruns", () => {
  const claudeEnv = { CERTUM_ANALYSIS_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" };

  it("zonder override blijft de productiewaarde", () => {
    const config = readAnalysisConfig(claudeEnv);
    expect(config.provider === "claude" && config.claude.maxRetries).toBe(CLAUDE_ANALYSIS_DEFAULTS.maxRetries);
  });

  it("CERTUM_ANALYSIS_MAX_RETRIES=0 geeft één poging", () => {
    const config = readAnalysisConfig({ ...claudeEnv, CERTUM_ANALYSIS_MAX_RETRIES: "0" });
    expect(config.provider === "claude" && config.claude.maxRetries).toBe(0);
  });

  it.each(["-1", "3", "twee", "1.5"])("ongeldige waarde %s is een config-fout", (value) => {
    expect(() => readAnalysisConfig({ ...claudeEnv, CERTUM_ANALYSIS_MAX_RETRIES: value })).toThrow(AnalysisError);
  });

  it("de override heeft geen effect op de mock", () => {
    expect(readAnalysisConfig({ CERTUM_ANALYSIS_MAX_RETRIES: "0" })).toEqual({ provider: "mock" });
  });
});
