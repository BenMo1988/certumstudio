import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  TRAINING_BLUEPRINT_V1_INSTRUCTIONS,
  buildTrainingBlueprintV1Request,
} from "@/knowledge/prompts/training-blueprint-v1";
import {
  TrainingBlueprintSchema,
  buildBlueprintGenerationInput,
  checkBlueprintInvariants,
  type TrainingBlueprint,
} from "@/modules/training-blueprint";
import { toAnalysisError, type ClaudeMessagesClient } from "../../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../../analysis/errors";
import type { ClaudeBlueprintSettings } from "../config";
import type { BlueprintRequest, TrainingBlueprintService } from "../services";

/**
 * Blueprint Generation via Claude (Certum Learning Architect, prompt training-blueprint/v1).
 *
 * Structured output op basis van het domeinschema `TrainingBlueprintSchema` (een object als root, dus geen wrapper).
 * Geldig pas na: 1. structured-output parsing, 2. Zod, 3. Blueprint-invarianten tegen de analyse.
 * Geen reparatie, geen tweede aanroep en geen model-fallback: ongeldig is `invalid-output`.
 */
export class ClaudeTrainingBlueprintService implements TrainingBlueprintService {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeBlueprintSettings, "apiKey">,
  ) {}

  async generate(request: BlueprintRequest): Promise<TrainingBlueprint> {
    // Alleen het provider-inputcontract gaat naar Claude, niet de volledige analyse of input.
    const generationInput = buildBlueprintGenerationInput({
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
        system: TRAINING_BLUEPRINT_V1_INSTRUCTIONS,
        messages: [{ role: "user", content: buildTrainingBlueprintV1Request(generationInput) }],
        output_config: {
          effort: this.settings.effort,
          format: zodOutputFormat(TrainingBlueprintSchema),
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

    // Zod opnieuw expliciet: de SDK geeft literal/enum en maxima alleen als beschrijving aan het model door.
    const parsed = TrainingBlueprintSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new AnalysisError("invalid-output", "Blueprint voldoet niet aan het schema.");
    }
    const violations = checkBlueprintInvariants(parsed.data, { analysis: request.analysis, segments: request.segments });
    if (violations.length > 0) {
      throw new AnalysisError("invalid-output", `Blueprint schendt domeinregels: ${violations.join(", ")}.`);
    }
    return parsed.data;
  }
}
