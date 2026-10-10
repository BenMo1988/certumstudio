import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { SOURCE_SELECTOR_PROMPT_VERSION, SOURCE_SELECTOR_V1_INSTRUCTIONS, buildSourceSelectorV1Request } from "@/knowledge/prompts/source-selector-v1";
import { createClaudeClient, toAnalysisError, type ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { AnalysisError, type AnalysisErrorKind } from "../analysis/errors";
import { readLearningLineConfig, type ClaudeLearningLineSettings } from "./config";

/*
 * Bronselectie voor Gate 1: per sourceNeed welke bibliotheekpassages passen. Uitsluitend ids uit de aangeleverde
 * bibliotheek (het schema laat niets anders toe en de server controleert opnieuw). Geen tekst, geen nieuwe bron.
 * Provider via CERTUM_LEARNING_LINE_PROVIDER (onderdeel van de Leerlijn Engine); geen retry, geen fallback.
 */

export interface SourceSelectionRequest {
  training: { title: string; learningGoal: string };
  sourceNeeds: { id: string; question: string; whyNeeded: string }[];
  library: { libraryId: string; title: string; publisher: string | null; relevantContent: string }[];
}

/** sourceNeed-id → gekozen bibliotheek-ids (hooguit drie, best passend eerst). */
export type SourceSelection = Record<string, string[]>;

export interface SourceSelectorService {
  select(request: SourceSelectionRequest): Promise<SourceSelection>;
}

/** Alleen bestaande ids, per sourceNeed uniek en hooguit drie. */
export function sanitizeSelection(selection: SourceSelection, request: SourceSelectionRequest): SourceSelection {
  const ids = new Set(request.library.map((l) => l.libraryId));
  return Object.fromEntries(request.sourceNeeds.map((n) => [n.id, [...new Set((selection[n.id] ?? []).filter((id) => ids.has(id)))].slice(0, 3)]));
}

/** Mock: deterministisch de eerste bibliotheekpassage voor iedere sourceNeed (of niets bij een lege bibliotheek). */
export class MockSourceSelector implements SourceSelectorService {
  async select(request: SourceSelectionRequest): Promise<SourceSelection> {
    const first = request.library[0]?.libraryId;
    return Object.fromEntries(request.sourceNeeds.map((n) => [n.id, first ? [first] : []]));
  }
}

export const CLAUDE_SOURCE_SELECTOR_DEFAULTS = { model: "claude-opus-5-5", effort: "low", maxTokens: 4_000, timeoutMs: 120_000, maxRetries: 0 } as const;

export class ClaudeSourceSelector implements SourceSelectorService {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeLearningLineSettings, "apiKey">,
  ) {}

  async select(request: SourceSelectionRequest): Promise<SourceSelection> {
    if (request.library.length === 0 || request.sourceNeeds.length === 0) return Object.fromEntries(request.sourceNeeds.map((n) => [n.id, []]));
    const schema = z.strictObject({
      selections: z.array(
        z.strictObject({
          sourceNeedId: z.enum(request.sourceNeeds.map((n) => n.id) as [string, ...string[]]),
          libraryIds: z.array(z.enum(request.library.map((l) => l.libraryId) as [string, ...string[]])).max(3),
        }),
      ),
    });
    let response;
    try {
      response = await this.client.messages.parse({
        model: this.settings.model,
        max_tokens: this.settings.maxTokens,
        system: SOURCE_SELECTOR_V1_INSTRUCTIONS,
        messages: [{ role: "user", content: buildSourceSelectorV1Request(request) }],
        output_config: { effort: this.settings.effort, format: zodOutputFormat(schema) },
      });
    } catch (error) {
      throw toAnalysisError(error);
    }
    if (response.stop_reason === "refusal") throw new AnalysisError("refusal", "Claude weigerde de bronselectie.");
    if (response.stop_reason === "max_tokens") throw new AnalysisError("incomplete", "Bronselectie afgekapt op max_tokens.");
    const parsed = schema.safeParse(response.parsed_output);
    if (!parsed.success) throw new AnalysisError("invalid-output", "Bronselectie ongeldig.");
    return sanitizeSelection(Object.fromEntries(parsed.data.selections.map((s) => [s.sourceNeedId, s.libraryIds])), request);
  }
}

export interface SourceSelectionLogEntry {
  event: "certum.source_selection";
  provider: "mock" | "claude";
  model?: string;
  effort?: string;
  promptVersion?: string;
  durationMs: number;
  outcome: "success" | "error";
  errorKind?: AnalysisErrorKind | "unknown";
  sourceNeeds: number;
  librarySize: number;
  selected?: number;
}

/** Alleen metadata: nooit kennisvragen, titels of passages. */
function withLogging(service: SourceSelectorService, info: { provider: "mock" | "claude"; model?: string; effort?: string }, log: (e: SourceSelectionLogEntry) => void): SourceSelectorService {
  return {
    async select(request) {
      const started = performance.now();
      const base = {
        event: "certum.source_selection" as const,
        ...info,
        ...(info.provider === "claude" && { promptVersion: SOURCE_SELECTOR_PROMPT_VERSION }),
        sourceNeeds: request.sourceNeeds.length,
        librarySize: request.library.length,
      };
      try {
        const selection = await service.select(request);
        log({ ...base, durationMs: Math.round(performance.now() - started), outcome: "success", selected: Object.values(selection).reduce((n, ids) => n + ids.length, 0) });
        return selection;
      } catch (error) {
        log({ ...base, durationMs: Math.round(performance.now() - started), outcome: "error", errorKind: error instanceof AnalysisError ? error.kind : "unknown" });
        throw error;
      }
    },
  };
}

export function createSourceSelector(env?: Record<string, string | undefined>, log: (e: SourceSelectionLogEntry) => void = (e) => console.info(JSON.stringify(e))): SourceSelectorService {
  const config = readLearningLineConfig(env);
  if (config.provider === "mock") return withLogging(new MockSourceSelector(), { provider: "mock" }, log);
  const { apiKey, ...base } = config.claude;
  const settings = { ...base, ...CLAUDE_SOURCE_SELECTOR_DEFAULTS };
  return withLogging(new ClaudeSourceSelector(createClaudeClient({ apiKey, ...settings }), settings), { provider: "claude", model: settings.model, effort: settings.effort }, log);
}
