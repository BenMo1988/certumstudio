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
    expect(result).toEqual({
      text: "Antwoord.",
      stopReason: "end_turn",
      usage: { inputTokens: 10, outputTokens: 3 },
      response: { maxTokens: 1200, visibleChars: 9, visibleWords: 1, contentBlockTypes: ["text"], thinkingBlockPresent: false },
    });
    const req = calls[0] as { system: string; messages: { role: string }[]; max_tokens: number; output_config: { effort: string } };
    expect(req.system).toContain(config.personaInstructions);
    expect(req.system).toContain(config.firstMessage);
    expect(req.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(req.max_tokens).toBe(1200);
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

  it("feedback gebruikt participant-feedback/v1.1 met een compact didactisch budget; de technische limiet blijft headroom", async () => {
    const { client, calls } = fakeClient(ok);
    await new ClaudePreviewRuntimeService(client, CLAUDE_PREVIEW_DEFAULTS).feedback({ instructions: "x", context: [] });
    const req = calls[0] as { system: string; max_tokens: number };
    expect(req.system).toContain("ongeveer 350 tot 500 woorden");
    for (const rule of ["hooguit drie korte inhoudelijke onderdelen", "concrete sterkte", "concrete aanscherping", "criteria uit de goedgekeurde instructies", "Je kent het gesprek of de simulatie zelf niet", "Introduceer geen theorie"]) {
      expect(req.system).toContain(rule);
    }
    expect(req.max_tokens).toBe(4000);
  });

  it("de stop reason gaat mee, zodat de runtimelaag max_tokens als afgekapt kan behandelen", async () => {
    const truncated = { stop_reason: "max_tokens", content: [{ type: "text", text: "Een halve zin die" }], usage: { input_tokens: 10, output_tokens: 1500 } };
    const runtime = new ClaudePreviewRuntimeService(fakeClient(truncated).client, CLAUDE_PREVIEW_DEFAULTS);
    expect(await runtime.feedback({ instructions: "x", context: [] })).toMatchObject({ stopReason: "max_tokens", usage: { inputTokens: 10, outputTokens: 1500 } });
    const empty = new ClaudePreviewRuntimeService(fakeClient({ stop_reason: "max_tokens", content: [] }).client, CLAUDE_PREVIEW_DEFAULTS);
    expect(await empty.chatReply({ config, goalReached: false, history: [{ role: "persona", text: config.firstMessage }, { role: "participant", text: "Hoi" }] })).toMatchObject({ stopReason: "max_tokens" });
  });

  it("Step 17E: alleen de technische headroom verandert; promptversies, effort en retries blijven gelijk", async () => {
    const { PARTICIPANT_CHAT_V1_PROMPT_VERSION } = await import("@/knowledge/prompts/participant-chat-v1");
    const { PARTICIPANT_FEEDBACK_V1_1_PROMPT_VERSION } = await import("@/knowledge/prompts/participant-feedback-v1-1");
    expect(PARTICIPANT_CHAT_V1_PROMPT_VERSION).toBe("participant-chat/v1");
    expect(PARTICIPANT_FEEDBACK_V1_1_PROMPT_VERSION).toBe("participant-feedback/v1.1");
    expect(CLAUDE_PREVIEW_DEFAULTS).toMatchObject({ model: "claude-opus-5-5", chatEffort: "low", effort: "medium", chatMaxTokens: 1200, feedbackMaxTokens: 4000, maxRetries: 0 });
  });

  it("responsmetadata: alleen aantallen en bloktypes, thinking-aanwezigheid zonder thinking-inhoud", async () => {
    const withThinking = {
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "GEHEIME-REDENERING", signature: "sig" },
        { type: "text", text: "Drie woorden hier." },
      ],
      usage: { input_tokens: 2000, output_tokens: 900 },
    };
    const result = await new ClaudePreviewRuntimeService(fakeClient(withThinking).client, CLAUDE_PREVIEW_DEFAULTS).feedback({ instructions: "x", context: [] });
    expect(result.text).toBe("Drie woorden hier.");
    expect(result.response).toEqual({ maxTokens: 4000, visibleChars: 18, visibleWords: 3, contentBlockTypes: ["thinking", "text"], thinkingBlockPresent: true });
    expect(JSON.stringify(result.response)).not.toContain("GEHEIME");
    expect(JSON.stringify(result.response)).not.toContain("Drie");
    // Geen thinking-tokenaantal: de API geeft dat niet apart, dus het wordt niet afgeleid.
    expect(Object.keys(result.response)).not.toContain("thinkingTokens");
    const plain = await new ClaudePreviewRuntimeService(fakeClient(ok).client, CLAUDE_PREVIEW_DEFAULTS).chatReply({ config, goalReached: false, history: [{ role: "persona", text: config.firstMessage }, { role: "participant", text: "Hoi" }] });
    expect(plain.response).toMatchObject({ maxTokens: 1200, contentBlockTypes: ["text"], thinkingBlockPresent: false });
  });

  it("refusal en leeg antwoord worden providerneutrale fouten", async () => {
    const refusal = new ClaudePreviewRuntimeService(fakeClient({ stop_reason: "refusal", content: [] }).client, CLAUDE_PREVIEW_DEFAULTS);
    await expect(refusal.feedback({ instructions: "x", context: [] })).rejects.toMatchObject({ kind: "refusal" });
    const empty = new ClaudePreviewRuntimeService(fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: " " }] }).client, CLAUDE_PREVIEW_DEFAULTS);
    await expect(empty.feedback({ instructions: "x", context: [] })).rejects.toMatchObject({ kind: "empty" });
  });
});
