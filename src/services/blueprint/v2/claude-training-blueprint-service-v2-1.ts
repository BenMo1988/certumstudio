import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  TRAINING_BLUEPRINT_V21_INSTRUCTIONS,
  buildTrainingBlueprintV21Request,
} from "@/knowledge/prompts/training-blueprint-v2-1";
import { TRAINING_BLUEPRINT_V22_INSTRUCTIONS, buildTrainingBlueprintV22Request } from "@/knowledge/prompts/training-blueprint-v2-2";
import { toV2Outcome } from "@/modules/training-agent/v2-1";
import type { ReadyOutcome } from "@/modules/training-agent/v2";
import {
  TrainingBlueprintV2Schema,
  buildBlueprintGenerationInputV21,
  checkBlueprintV2Invariants,
  composeTrainingBlueprintV21,
  type TrainingBlueprintV2,
} from "@/modules/training-blueprint/v2";
import { toAnalysisError, type ClaudeMessagesClient } from "../../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../../analysis/errors";
import type { ClaudeBlueprintSettings } from "../config";
import type { BlueprintRequestV21, TrainingBlueprintServiceV21 } from "../services";
import { BlueprintV21DesignSchema } from "./design-v2-1";

/**
 * Blueprint Generation via Claude met trusted routebeleid (prompt training-blueprint/v2.1, contract blueprint-contract/v2).
 *
 * Claude ontwerpt `BlueprintV21DesignSchema` (zonder ambiguïteit). De server leidt de ambiguïteit af uit het
 * routebeleid van de Analysis-richting en voegt de vaste velden toe. Geldig pas na: structured output, Zod op het
 * ontwerp, samenstellen, Zod op de volledige Blueprint en `checkBlueprintV2Invariants`. Geen reparatie of tweede
 * aanroep, geen model-fallback.
 */
export class ClaudeTrainingBlueprintServiceV21 implements TrainingBlueprintServiceV21 {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeBlueprintSettings, "apiKey">,
  ) {}

  async generate(request: BlueprintRequestV21): Promise<TrainingBlueprintV2> {
    const generationInput = buildBlueprintGenerationInputV21({
      inputKind: request.input.kind,
      analysis: request.analysis,
      segments: request.segments,
      selectedDirectionId: request.selectedDirectionId,
    });

    let response;
    try {
      response = await this.client.messages.parse({
        model: this.settings.model,
        max_tokens: this.settings.maxTokens,
        // Gerichte revisie (training-blueprint/v2.2) alleen met een menselijke toelichting; anders exact v2.1.
        system: request.revision ? TRAINING_BLUEPRINT_V22_INSTRUCTIONS : TRAINING_BLUEPRINT_V21_INSTRUCTIONS,
        messages: [
          {
            role: "user",
            content: request.revision
              ? buildTrainingBlueprintV22Request(generationInput, request.revision)
              : buildTrainingBlueprintV21Request(generationInput),
          },
        ],
        output_config: {
          effort: this.settings.effort,
          format: zodOutputFormat(BlueprintV21DesignSchema),
        },
      });
    } catch (error) {
      throw toAnalysisError(error);
    }

    if (response.stop_reason === "refusal") {
      const category = response.stop_details?.category ?? "onbekend";
      throw new AnalysisError("refusal", `Claude weigerde de Blueprint (categorie: ${category}).`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new AnalysisError("incomplete", "Blueprint afgekapt op max_tokens.");
    }
    const candidate = response.parsed_output;
    if (!candidate) {
      throw new AnalysisError("empty", `Geen geparste output (stop_reason: ${response.stop_reason}).`);
    }

    const design = BlueprintV21DesignSchema.safeParse(candidate);
    if (!design.success) {
      throw new AnalysisError("invalid-output", "Blueprint-ontwerp voldoet niet aan het schema.");
    }
    const parsed = TrainingBlueprintV2Schema.safeParse(composeTrainingBlueprintV21(design.data, generationInput));
    if (!parsed.success) {
      throw new AnalysisError("invalid-output", "Blueprint voldoet niet aan het schema.");
    }
    const analysis = toV2Outcome(request.analysis) as ReadyOutcome;
    const violations = checkBlueprintV2Invariants(parsed.data, { analysis, segments: request.segments });
    if (violations.length > 0) {
      throw new AnalysisError("invalid-output", `Blueprint schendt domeinregels: ${violations.join(", ")}.`);
    }
    return parsed.data;
  }
}
