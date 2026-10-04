import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildTrainingFrameV1Request } from "@/knowledge/prompts/training-block-content-v1";
import {
  TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS,
  TRAINING_FRAME_V1_1_INSTRUCTIONS,
  buildTrainingBlockContentV1_1Request,
} from "@/knowledge/prompts/training-block-content-v1-1";
import {
  BLOCK_CONTENT_VERSION,
  buildBlockContentGenerationInput,
  type BlockContentResult,
  type FrameContent,
} from "@/modules/block-content";
import { toAnalysisError, type ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../analysis/errors";
import type { ClaudeBlockContentSettings } from "./config";
import { buildBlockContentDesignSchema, FrameDesignSchema } from "./design";
import { BlockContentValidationError } from "./diagnostics";
import { finalizeBlockContent, finalizeFrame, targetOf } from "./finalize";
import type { BlockContentRequest, BlockContentService, FrameContentRequest } from "./services";

type ParseRequest = Parameters<ClaudeMessagesClient["messages"]["parse"]>[0];

/**
 * Block Content via Claude (Certum Content Writer, prompt training-block-content/v1.1). Eén aanroep per doelblok.
 *
 * Input: uitsluitend downstream-materiaal (`buildBlockContentGenerationInput`). Claude ontwerpt alleen wat het
 * ontwerpschema van dít doelblok toelaat; de server voegt de trusted velden toe. Geldig pas na structured output,
 * Zod op het ontwerp, samenstellen, Zod op het resultaat en `checkBlockContentInvariants`. Geen reparatie, geen tweede
 * aanroep, geen fallback.
 */
export class ClaudeBlockContentService implements BlockContentService {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeBlockContentSettings, "apiKey">,
  ) {}

  async generate(request: BlockContentRequest): Promise<BlockContentResult> {
    const target = targetOf(request);
    const input = buildBlockContentGenerationInput({ ...request, target });
    const candidate = await this.call(
      TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS,
      buildTrainingBlockContentV1_1Request({ ...input, contractVersion: BLOCK_CONTENT_VERSION }),
      buildBlockContentDesignSchema(target),
    );
    return finalizeBlockContent(candidate, target, request);
  }

  async generateFrame(request: FrameContentRequest): Promise<FrameContent> {
    const { sourceRefs, selectedDirectionId, ...blueprint } = request.blueprint;
    void sourceRefs;
    void selectedDirectionId;
    const candidate = await this.call(
      TRAINING_FRAME_V1_1_INSTRUCTIONS,
      buildTrainingFrameV1Request({ blueprint, blockPlan: request.blockPlan }),
      FrameDesignSchema,
    );
    return finalizeFrame(candidate, request);
  }

  private async call(system: string, content: string, schema: Parameters<typeof zodOutputFormat>[0]): Promise<unknown> {
    let response;
    try {
      response = await this.client.messages.parse({
        model: this.settings.model,
        max_tokens: this.settings.maxTokens,
        system,
        messages: [{ role: "user", content }],
        output_config: { effort: this.settings.effort, format: zodOutputFormat(schema) },
      } as ParseRequest);
    } catch (error) {
      const mapped = toAnalysisError(error);
      // De SDK-melding kan inhoud bevatten en wordt niet doorgegeven.
      if (mapped.kind === "invalid-output") throw new BlockContentValidationError("structured_output", []);
      throw mapped;
    }
    if (response.stop_reason === "refusal") {
      const category = response.stop_details?.category ?? "onbekend";
      throw new AnalysisError("refusal", `Claude weigerde de Block Content (categorie: ${category}).`);
    }
    if (response.stop_reason === "max_tokens") throw new AnalysisError("incomplete", "Block Content afgekapt op max_tokens.");
    if (!response.parsed_output) {
      throw new AnalysisError("empty", `Geen geparste output (stop_reason: ${response.stop_reason}).`);
    }
    return response.parsed_output;
  }
}
