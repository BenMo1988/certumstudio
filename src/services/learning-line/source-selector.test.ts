import { describe, expect, it, vi } from "vitest";
import { SOURCE_SELECTOR_V1_INSTRUCTIONS } from "@/knowledge/prompts/source-selector-v1";
import type { ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { CLAUDE_SOURCE_SELECTOR_DEFAULTS, ClaudeSourceSelector, MockSourceSelector, createSourceSelector, sanitizeSelection, type SourceSelectionLogEntry, type SourceSelectionRequest } from "./source-selector";

/* Bronselectie (Gate Compression V1): alleen ids uit de bibliotheek, nooit tekst. 0 echte AI-aanroepen. */

const request: SourceSelectionRequest = {
  training: { title: "Grens onder druk", learningGoal: "De deelnemer maakt een grens begrijpelijk." },
  sourceNeeds: [
    { id: "SN1", question: "Wat zeggen gevalideerde bronnen over verwachtingen?", whyNeeded: "Verdieping." },
    { id: "SN2", question: "Wanneer herwegen?", whyNeeded: "Herwegen." },
  ],
  library: [
    { libraryId: "aaaa000011112222", title: "Beroepscode", publisher: "Fictief", relevantContent: "Passage QW-1." },
    { libraryId: "bbbb000011112222", title: "Richtlijn", publisher: null, relevantContent: "Passage QW-2." },
  ],
};

function claudeReturning(output: unknown) {
  const parse = vi.fn(async (req: unknown) => (void req, { stop_reason: "end_turn", parsed_output: output }));
  return { service: new ClaudeSourceSelector({ messages: { parse } } as unknown as ClaudeMessagesClient, { ...CLAUDE_SOURCE_SELECTOR_DEFAULTS, apiKey: undefined } as never), parse };
}

describe("bronselectie", () => {
  it("Claude kiest alleen ids; de server houdt alleen bestaande, unieke ids over (max. drie)", async () => {
    const { service, parse } = claudeReturning({ selections: [{ sourceNeedId: "SN1", libraryIds: ["bbbb000011112222", "aaaa000011112222"] }, { sourceNeedId: "SN2", libraryIds: [] }] });
    expect(await service.select(request)).toEqual({ SN1: ["bbbb000011112222", "aaaa000011112222"], SN2: [] });
    expect(parse).toHaveBeenCalledTimes(1);
    const sent = parse.mock.calls[0][0] as { system: string; output_config: { effort: string } };
    expect(sent.system).toBe(SOURCE_SELECTOR_V1_INSTRUCTIONS);
    expect(sent.output_config.effort).toBe("low");
    expect(sanitizeSelection({ SN1: ["onbekend", "aaaa000011112222", "aaaa000011112222"] }, request)).toEqual({ SN1: ["aaaa000011112222"], SN2: [] });
  });

  it("een lege bibliotheek of geen sourceNeeds: geen aanroep", async () => {
    const { service, parse } = claudeReturning({ selections: [] });
    expect(await service.select({ ...request, library: [] })).toEqual({ SN1: [], SN2: [] });
    expect(parse).not.toHaveBeenCalled();
  });

  it("de mock is deterministisch en de factory staat standaard op mock; logs zonder inhoud", async () => {
    expect(await new MockSourceSelector().select(request)).toEqual({ SN1: ["aaaa000011112222"], SN2: ["aaaa000011112222"] });
    const logs: SourceSelectionLogEntry[] = [];
    await createSourceSelector({}, (e) => logs.push(e)).select(request);
    expect(logs).toEqual([expect.objectContaining({ event: "certum.source_selection", provider: "mock", outcome: "success", sourceNeeds: 2, librarySize: 2, selected: 2 })]);
    expect(JSON.stringify(logs)).not.toMatch(/QW-|Beroepscode|verwachtingen/);
  });
});
