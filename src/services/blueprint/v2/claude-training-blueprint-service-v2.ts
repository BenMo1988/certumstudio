import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  TRAINING_BLUEPRINT_V2_INSTRUCTIONS,
  buildTrainingBlueprintV2Request,
} from "@/knowledge/prompts/training-blueprint-v2";
import {
  TrainingBlueprintV2Schema,
  buildBlueprintGenerationInputV2,
  checkBlueprintV2Invariants,
  composeTrainingBlueprintV2,
  type TrainingBlueprintV2,
} from "@/modules/training-blueprint/v2";
import { toAnalysisError, type ClaudeMessagesClient } from "../../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../../analysis/errors";
import type { ClaudeBlueprintSettings } from "../config";
import type { BlueprintRequest, TrainingBlueprintServiceV2 } from "../services";
import { BlueprintV2DesignSchema } from "./design";

/**
 * Blueprint Generation V2 via Claude (Certum Learning Architect, prompt training-blueprint/v2).
 *
 * Claude ontwerpt alleen `BlueprintV2DesignSchema`. De server voegt de vaste velden en het routebeleid toe.
 * Geldig pas na: 1. structured-output parsing, 2. Zod op het ontwerp, 3. samenstellen, 4. Zod op de volledige
 * Blueprint V2, 5. `checkBlueprintV2Invariants`. Geen reparatie, geen tweede aanroep, geen model-fallback.
 */
export class ClaudeTrainingBlueprintServiceV2 implements TrainingBlueprintServiceV2 {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeBlueprintSettings, "apiKey">,
  ) {}

  async generate(request: BlueprintRequest): Promise<TrainingBlueprintV2> {
    const generationInput = buildBlueprintGenerationInputV2({
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
        system: TRAINING_BLUEPRINT_V2_INSTRUCTIONS,
        messages: [{ role: "user", content: buildTrainingBlueprintV2Request(generationInput) }],
        output_config: {
          effort: this.settings.effort,
          format: zodOutputFormat(BlueprintV2DesignSchema),
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

    const design = BlueprintV2DesignSchema.safeParse(candidate);
    if (!design.success) {
      throw new AnalysisError("invalid-output", "Blueprint-ontwerp voldoet niet aan het schema.");
    }
    const parsed = TrainingBlueprintV2Schema.safeParse(composeTrainingBlueprintV2(design.data, generationInput));
    if (!parsed.success) {
      throw new AnalysisError("invalid-output", "Blueprint voldoet niet aan het schema.");
    }
    const violations = checkBlueprintV2Invariants(parsed.data, { analysis: request.analysis, segments: request.segments });
    if (violations.length > 0) {
      throw new AnalysisError("invalid-output", `Blueprint schendt domeinregels: ${violations.join(", ")}.`);
    }
    return parsed.data;
  }
}
