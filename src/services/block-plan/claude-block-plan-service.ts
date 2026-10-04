import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  TRAINING_BLOCK_PLAN_V1_INSTRUCTIONS,
  buildTrainingBlockPlanV1Request,
} from "@/knowledge/prompts/training-block-plan-v1";
import { composeBlockPlan } from "@/modules/block-plan/compose";
import { BC_ONLINE_BLOCK_PLAN_VERSION, BcOnlineBlockPlanSchema, type BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import { checkBlockPlanInvariants } from "@/modules/block-plan/validation";
import { toAnalysisError, type ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../analysis/errors";
import type { BlockPlanRequest, BlockPlanService } from "../blueprint/services";
import type { ClaudeBlockPlanSettings } from "./config";
import { BlockPlanDesignSchema } from "./design";

/**
 * Block Plan Generation via Claude (Certum Implementation Architect, prompt training-block-plan/v1).
 *
 * Input: uitsluitend de goedgekeurde Blueprint, de catalogus en versies. Claude ontwerpt `BlockPlanDesignSchema`; de
 * server voegt de vaste velden toe. Geldig pas na: 1. structured output, 2. Zod op het ontwerp, 3. samenstellen,
 * 4. Zod op het volledige Block Plan, 5. `checkBlockPlanInvariants`. Geen reparatie of tweede aanroep, geen fallback.
 */
export class ClaudeBlockPlanService implements BlockPlanService {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeBlockPlanSettings, "apiKey">,
  ) {}

  async generate({ blueprint }: BlockPlanRequest): Promise<BcOnlineBlockPlan> {
    let response;
    try {
      response = await this.client.messages.parse({
        model: this.settings.model,
        max_tokens: this.settings.maxTokens,
        system: TRAINING_BLOCK_PLAN_V1_INSTRUCTIONS,
        messages: [
          {
            role: "user",
            content: buildTrainingBlockPlanV1Request({
              blueprint,
              blueprintVersion: blueprint.version,
              contractVersion: BC_ONLINE_BLOCK_PLAN_VERSION,
            }),
          },
        ],
        output_config: {
          effort: this.settings.effort,
          format: zodOutputFormat(BlockPlanDesignSchema),
        },
      });
    } catch (error) {
      throw toAnalysisError(error);
    }

    if (response.stop_reason === "refusal") {
      const category = response.stop_details?.category ?? "onbekend";
      throw new AnalysisError("refusal", `Claude weigerde het Block Plan (categorie: ${category}).`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new AnalysisError("incomplete", "Block Plan afgekapt op max_tokens.");
    }
    const candidate = response.parsed_output;
    if (!candidate) {
      throw new AnalysisError("empty", `Geen geparste output (stop_reason: ${response.stop_reason}).`);
    }

    const design = BlockPlanDesignSchema.safeParse(candidate);
    if (!design.success) {
      throw new AnalysisError("invalid-output", "Block Plan-ontwerp voldoet niet aan het schema.");
    }
    const parsed = BcOnlineBlockPlanSchema.safeParse(composeBlockPlan(design.data, blueprint));
    if (!parsed.success) {
      throw new AnalysisError("invalid-output", "Block Plan voldoet niet aan het schema.");
    }
    const violations = checkBlockPlanInvariants(parsed.data, blueprint);
    if (violations.length > 0) {
      throw new AnalysisError("invalid-output", `Block Plan schendt domeinregels: ${violations.join(", ")}.`);
    }
    return parsed.data;
  }
}
