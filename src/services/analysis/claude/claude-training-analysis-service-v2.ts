import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  TRAINING_ANALYSIS_V2_INSTRUCTIONS,
  buildTrainingAnalysisV2Request,
} from "@/knowledge/prompts/training-analysis-v2";
import {
  AnalysisResponseSchema,
  checkOutcomeInvariants,
  type AnalysisOutcome,
} from "@/modules/training-agent/v2";
import type { ClaudeAnalysisSettings } from "../config";
import { AnalysisError } from "../errors";
import type { AnalysisRequestV2, TrainingAnalysisServiceV2 } from "../training-analysis-service-v2";
import { toAnalysisError, type ClaudeMessagesClient } from "./claude-training-analysis-service";

/**
 * Certum Analyse via Claude volgens Analysis Contract V2 en training-analysis/v2.
 * Structured output met `{ result: AnalysisOutcome }` als root; Zod controleert de union na ontvangst.
 * Geen model-fallback (zie CLAUDE.md).
 */
export class ClaudeTrainingAnalysisServiceV2 implements TrainingAnalysisServiceV2 {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeAnalysisSettings, "apiKey">,
  ) {}

  async analyze({ input, segments }: AnalysisRequestV2): Promise<AnalysisOutcome> {
    let response;
    try {
      response = await this.client.messages.parse({
        model: this.settings.model,
        max_tokens: this.settings.maxTokens,
        system: TRAINING_ANALYSIS_V2_INSTRUCTIONS,
        messages: [{ role: "user", content: buildTrainingAnalysisV2Request({ kind: input.kind, segments }) }],
        output_config: {
          effort: this.settings.effort,
          format: zodOutputFormat(AnalysisResponseSchema),
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

    const outcome = response.parsed_output?.result;
    if (!outcome) {
      throw new AnalysisError("empty", `Geen geparste output (stop_reason: ${response.stop_reason}).`);
    }

    const violations = checkOutcomeInvariants(outcome, segments);
    if (violations.length > 0) {
      throw new AnalysisError("invalid-output", `Analyse schendt domeinregels: ${violations.join(", ")}.`);
    }
    return outcome;
  }
}
