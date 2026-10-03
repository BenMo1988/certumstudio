import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  TRAINING_ANALYSIS_INSTRUCTIONS,
  buildTrainingAnalysisRequest,
} from "@/knowledge/prompts/training-analysis";
import {
  InputAnalysisSchema,
  checkAnalysisInvariants,
  type AgentInput,
  type InputAnalysis,
} from "@/modules/training-agent";
import type { ClaudeAnalysisSettings } from "../config";
import { AnalysisError } from "../errors";
import type { TrainingAnalysisService } from "../training-analysis-service";

/** Het deel van de SDK-client dat deze service gebruikt (vervangbaar in tests). */
export type ClaudeMessagesClient = Pick<Anthropic, "messages">;

export function createClaudeClient(settings: ClaudeAnalysisSettings): ClaudeMessagesClient {
  return new Anthropic({
    apiKey: settings.apiKey,
    timeout: settings.timeoutMs,
    maxRetries: settings.maxRetries,
  });
}

/**
 * Certum Analyse via Claude, met structured output op basis van het
 * domeinschema. Alles wat Claude-specifiek is, blijft in deze klasse.
 */
export class ClaudeTrainingAnalysisService implements TrainingAnalysisService {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeAnalysisSettings, "apiKey">,
  ) {}

  async analyze(input: AgentInput): Promise<InputAnalysis> {
    let response;
    try {
      // Bewust geen model-fallback: in de evaluatiefase moet vaststaan welk model
      // de analyse maakte. Een weigering wordt hieronder een "refusal"-fout.
      response = await this.client.messages.parse({
        model: this.settings.model,
        max_tokens: this.settings.maxTokens,
        system: TRAINING_ANALYSIS_INSTRUCTIONS,
        messages: [{ role: "user", content: buildTrainingAnalysisRequest(input) }],
        output_config: {
          effort: this.settings.effort,
          format: zodOutputFormat(InputAnalysisSchema),
        },
      });
    } catch (error) {
      throw toAnalysisError(error);
    }

    if (response.stop_reason === "refusal") {
      const category = response.stop_details?.category ?? "onbekend";
      throw new AnalysisError("refusal", `Claude weigerde de analyse (categorie: ${category}).`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new AnalysisError("incomplete", "Analyse afgekapt op max_tokens.");
    }

    const analysis = response.parsed_output;
    if (!analysis) {
      throw new AnalysisError("empty", `Geen geparste output (stop_reason: ${response.stop_reason}).`);
    }

    const violations = checkAnalysisInvariants(analysis);
    if (violations.length > 0) {
      throw new AnalysisError("invalid-output", `Analyse schendt domeinregels: ${violations.join(", ")}.`);
    }
    return analysis;
  }
}

/** Vertaalt SDK-fouten naar provider-onafhankelijke fouten, zonder providerdetails door te geven. */
export function toAnalysisError(error: unknown): AnalysisError {
  if (error instanceof AnalysisError) return error;
  // Meest specifiek eerst: time-out is een subklasse van connection error.
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AnalysisError("timeout", "Claude-aanroep verliep (time-out).");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AnalysisError("connection", "Claude niet bereikbaar.");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AnalysisError("rate-limit", "Claude rate limit (429).");
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AnalysisError("auth", `Claude weigert de sleutel (${error.status}).`);
  }
  if (error instanceof Anthropic.APIError) {
    return new AnalysisError("provider", `Claude API-fout (${error.status ?? "geen status"}).`);
  }
  // Overige SDK-fout: output kwam binnen maar paste niet in het schema (client-side validatie).
  if (error instanceof Anthropic.AnthropicError) {
    return new AnalysisError("invalid-output", "Output kon niet als analyse worden gelezen.");
  }
  return new AnalysisError("provider", "Onverwachte fout tijdens de analyse.");
}
