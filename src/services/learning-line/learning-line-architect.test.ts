import { describe, expect, it, vi } from "vitest";
import { LEARNING_LINE_ARCHITECT_V1_INSTRUCTIONS } from "@/knowledge/prompts/learning-line-architect-v1";
import type { ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { ClaudeLearningLineArchitect, LearningLineValidationError } from "./claude-learning-line-architect";
import { CLAUDE_LEARNING_LINE_DEFAULTS, readLearningLineConfig } from "./config";
import { withLearningLineLogging, type LearningLineGenerationLogEntry } from "./logging";
import { mockLearningLineDesign } from "./mock-learning-line-architect";

/* Leerlijn Architect: configuratie, Claude-provider zonder echte aanroepen, logging zonder inhoud. */

const PROMPT = "Ontwikkel een leerlijn voor jeugd- en gezinsprofessionals over professioneel begrenzen onder druk.";
const { version, ...architectOutput } = mockLearningLineDesign(PROMPT);
void version;

function claudeReturning(output: unknown) {
  const parse = vi.fn(async (request: unknown) => (void request, { stop_reason: "end_turn", parsed_output: output }));
  return { service: new ClaudeLearningLineArchitect({ messages: { parse } } as unknown as ClaudeMessagesClient, CLAUDE_LEARNING_LINE_DEFAULTS), parse };
}

describe("configuratie", () => {
  it("standaard mock; claude zonder sleutel faalt veilig; eigen defaults zonder retry", () => {
    expect(readLearningLineConfig({})).toEqual({ provider: "mock" });
    expect(() => readLearningLineConfig({ CERTUM_LEARNING_LINE_PROVIDER: "claude" })).toThrow(/ANTHROPIC_API_KEY/);
    expect(readLearningLineConfig({ CERTUM_ANALYSIS_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" })).toEqual({ provider: "mock" });
    expect(CLAUDE_LEARNING_LINE_DEFAULTS).toMatchObject({ model: "claude-opus-5-5", effort: "medium", maxRetries: 0 });
  });
});

describe("Claude-provider (zonder echte aanroepen)", () => {
  it("één aanroep; de server zet de contractversie; de prompt bevat het lengtebudget en exact zes modules", async () => {
    const { service, parse } = claudeReturning(architectOutput);
    const design = await service.generate({ prompt: PROMPT });
    expect(design.version).toBe("certum-learning-line/v1");
    expect(design.modules).toHaveLength(6);
    expect(parse).toHaveBeenCalledTimes(1);
    const sent = parse.mock.calls[0][0] as { system: string; messages: { content: string }[] };
    expect(sent.system).toBe(LEARNING_LINE_ARCHITECT_V1_INSTRUCTIONS);
    expect(sent.system).toContain("exact zes modules");
    expect(sent.system).toContain("## Lengtebudget");
    expect(sent.messages[0].content).toContain(PROMPT);
  });

  it("een revisie stuurt de vorige versie en de ene aanwijzing mee", async () => {
    const { service, parse } = claudeReturning(architectOutput);
    await service.generate({ prompt: PROMPT, revision: { previous: mockLearningLineDesign(PROMPT), feedback: "Maak module 6 complexer." } });
    const content = (parse.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content;
    expect(content).toContain("<vorige_versie>");
    expect(content).toContain("Maak module 6 complexer.");
  });

  it("vijf modules: ongeldig, één aanroep, geen retry of reparatie", async () => {
    const { service, parse } = claudeReturning({ ...architectOutput, modules: architectOutput.modules.slice(0, 5) });
    const error = await service.generate({ prompt: PROMPT }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LearningLineValidationError);
    expect(error).toMatchObject({ kind: "invalid-output", stage: "schema_validation" });
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("verkeerde volgorde: domeininvariant, alleen codes", async () => {
    const m = architectOutput.modules;
    const { service } = claudeReturning({ ...architectOutput, modules: [m[1], m[0], ...m.slice(2)] });
    expect(await service.generate({ prompt: PROMPT }).catch((e: unknown) => e)).toMatchObject({ stage: "domain_invariant", codes: expect.arrayContaining(["volgorde"]) });
  });
});

describe("logging", () => {
  it("alleen metadata: geen prompt, aanwijzing of ontwerptekst", async () => {
    const entries: LearningLineGenerationLogEntry[] = [];
    const { service } = claudeReturning(architectOutput);
    const logged = withLearningLineLogging(service, { provider: "claude", model: "claude-opus-5-5", effort: "medium", promptVersion: "learning-line-architect/v1" }, (e) => entries.push(e));
    await logged.generate({ prompt: PROMPT, revision: { previous: mockLearningLineDesign(PROMPT), feedback: "Geheime aanwijzing QX-1." } });
    expect(entries).toEqual([expect.objectContaining({ event: "certum.learning_line_generation", outcome: "success", modules: 6, revision: true })]);
    const json = JSON.stringify(entries);
    for (const value of ["begrenzen", "QX-1", architectOutput.modules[0].title]) expect(json).not.toContain(value);
  });
});
