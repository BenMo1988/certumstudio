import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  TRAINING_ANALYSIS_V21_INSTRUCTIONS,
  buildTrainingAnalysisV21Request,
} from "@/knowledge/prompts/training-analysis-v2-1";
import {
  AnalysisOutcomeV21Schema,
  AnalysisResponseV21Schema,
  checkOutcomeInvariantsV21,
  type AnalysisOutcomeV21,
} from "@/modules/training-agent/v2-1";
import type { ClaudeAnalysisSettings } from "../config";
import { AnalysisError } from "../errors";
import type { AnalysisRequestV2 } from "../training-analysis-service-v2";
import type { TrainingAnalysisServiceV21 } from "../training-analysis-service-v2-1";
import { toAnalysisError, type ClaudeMessagesClient } from "./claude-training-analysis-service";

/**
 * Certum Analyse via Claude volgens Analysis Contract V2.1 en training-analysis/v2.1.
 * Gelijk aan de V2-service, met het V2.1-schema en de V2.1-prompt. Dezelfde V2-invarianten, via checkOutcomeInvariantsV21 (o.a. bestaande
 * sourceRefs). Geen model-fallback, geen reparatie, geen tweede aanroep.
 */
export class ClaudeTrainingAnalysisServiceV21 implements TrainingAnalysisServiceV21 {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeAnalysisSettings, "apiKey">,
  ) {}

  async analyze({ input, segments }: AnalysisRequestV2): Promise<AnalysisOutcomeV21> {
    let response;
    try {
      response = await this.client.messages.parse({
        model: this.settings.model,
        max_tokens: this.settings.maxTokens,
        system: TRAINING_ANALYSIS_V21_INSTRUCTIONS,
        messages: [{ role: "user", content: buildTrainingAnalysisV21Request({ kind: input.kind, segments }) }],
        output_config: {
          effort: this.settings.effort,
          format: zodOutputFormat(AnalysisResponseV21Schema),
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

    const candidate = response.parsed_output?.result;
    if (!candidate) {
      throw new AnalysisError("empty", `Geen geparste output (stop_reason: ${response.stop_reason}).`);
    }
    // Zod expliciet: de SDK geeft enum/literal en maxima alleen als beschrijving aan het model door.
    const parsed = AnalysisOutcomeV21Schema.safeParse(candidate);
    if (!parsed.success) {
      throw new AnalysisError("invalid-output", "Analyse voldoet niet aan Analysis Contract V2.1.");
    }
    const outcome = parsed.data;

    const violations = checkOutcomeInvariantsV21(outcome, segments);
    if (violations.length > 0) {
      throw new AnalysisError("invalid-output", `Analyse schendt domeinregels: ${violations.join(", ")}.`);
    }
    return outcome;
  }
}
