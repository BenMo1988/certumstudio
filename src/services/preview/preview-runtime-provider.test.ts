import { describe, expect, it } from "vitest";
import type { ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { ClaudePreviewRuntimeService } from "./claude-preview-runtime";
import { CLAUDE_PREVIEW_DEFAULTS, readPreviewConfig } from "./config";
import { createPreviewRuntimeService } from "./index";
import type { PreviewChatConfig } from "./services";

/* Participant Preview-runtime: factory en de vorm van de Claude-aanvraag, met een nep-client (0 echte aanroepen). */

const config: PreviewChatConfig = {
  personaName: "Fictieve ouder",
  personaInstructions: "Je bent bezorgd en wantrouwig.",
  scenarioContext: "Een synthetisch gesprek op kantoor.",
  firstMessage: "Waarom moet ik hier zijn?",
  goal: null,
};

function fakeClient(reply: unknown) {
  const calls: Record<string, unknown>[] = [];
  const client = {
    messages: {
      create: async (req: Record<string, unknown>) => {
        calls.push(req);
        return reply;
      },
    },
  } as unknown as ClaudeMessagesClient;
  return { client, calls };
}

const ok = { stop_reason: "end_turn", content: [{ type: "text", text: "Antwoord." }], usage: { input_tokens: 10, output_tokens: 3 } };

describe("Participant Preview-runtime", () => {
  it("standaard mock; claude zonder sleutel is een configuratiefout, geen terugval", () => {
    expect(readPreviewConfig({})).toEqual({ provider: "mock" });
    expect(createPreviewRuntimeService({}).info.provider).toBe("mock");
    expect(() => readPreviewConfig({ CERTUM_PREVIEW_PROVIDER: "claude" })).toThrow(/ANTHROPIC_API_KEY/);
    expect(() => readPreviewConfig({ CERTUM_PREVIEW_PROVIDER: "gpt" })).toThrow();
    expect(CLAUDE_PREVIEW_DEFAULTS.maxRetries).toBe(0);
  });

  it("chat: trusted configuratie in de systeeminstructie, alternerende berichten vanaf de eerste deelnemerbeurt", async () => {
    const { client, calls } = fakeClient(ok);
    const runtime = new ClaudePreviewRuntimeService(client, CLAUDE_PREVIEW_DEFAULTS);
    const result = await runtime.chatReply({
      config,
      goalReached: false,
      history: [
        { role: "persona", text: config.firstMessage },
        { role: "participant", text: "Ik wil het begrijpen." },
        { role: "persona", text: "Begrijpen?" },
        { role: "participant", text: "Ja." },
      ],
    });
    expect(result).toEqual({ text: "Antwoord.", usage: { inputTokens: 10, outputTokens: 3 } });
    const req = calls[0] as { system: string; messages: { role: string }[]; max_tokens: number; output_config: { effort: string } };
    expect(req.system).toContain(config.personaInstructions);
    expect(req.system).toContain(config.firstMessage);
    expect(req.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(req.max_tokens).toBe(CLAUDE_PREVIEW_DEFAULTS.chatMaxTokens);
    expect(req.output_config.effort).toBe(CLAUDE_PREVIEW_DEFAULTS.chatEffort);
  });

  it("feedback: alleen de instructies en de meegegeven context", async () => {
    const { client, calls } = fakeClient(ok);
    const runtime = new ClaudePreviewRuntimeService(client, CLAUDE_PREVIEW_DEFAULTS);
    await runtime.feedback({ instructions: "Geef feedback op de afweging.", context: [{ plannedBlockId: "blok-3", blockTitle: "Vraag", question: "Wat doe je?", answer: "Ik vraag door." }] });
    const req = calls[0] as { messages: { content: string }[] };
    expect(req.messages).toHaveLength(1);
    expect(req.messages[0].content).toContain("Geef feedback op de afweging.");
    expect(req.messages[0].content).toContain("Ik vraag door.");
  });

  it("refusal en leeg antwoord worden providerneutrale fouten", async () => {
    const refusal = new ClaudePreviewRuntimeService(fakeClient({ stop_reason: "refusal", content: [] }).client, CLAUDE_PREVIEW_DEFAULTS);
    await expect(refusal.feedback({ instructions: "x", context: [] })).rejects.toMatchObject({ kind: "refusal" });
    const empty = new ClaudePreviewRuntimeService(fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: " " }] }).client, CLAUDE_PREVIEW_DEFAULTS);
    await expect(empty.feedback({ instructions: "x", context: [] })).rejects.toMatchObject({ kind: "empty" });
  });
});
