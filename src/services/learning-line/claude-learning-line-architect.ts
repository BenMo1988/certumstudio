import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { LEARNING_LINE_ARCHITECT_V1_INSTRUCTIONS, buildLearningLineArchitectV1Request } from "@/knowledge/prompts/learning-line-architect-v1";
import {
  LearningLineArchitectDesignSchema,
  LearningLineDesignSchema,
  checkLearningLineInvariants,
  composeLearningLineDesign,
  type LearningLineDesign,
} from "@/modules/learning-lines";
import { toAnalysisError, type ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../analysis/errors";
import { zodIssueCodes } from "../block-plan/diagnostics";
import type { ClaudeLearningLineSettings } from "./config";
import type { LearningLineArchitectRequest, LearningLineArchitectService } from "./services";

/** Inhoudsvrije diagnose bij een ongeldig ontwerp: alleen de fase en codes (veldpad/violation), nooit tekst. */
export class LearningLineValidationError extends AnalysisError {
  constructor(
    readonly stage: "structured_output" | "schema_validation" | "domain_invariant",
    readonly codes: readonly string[],
  ) {
    super("invalid-output", `Leerlijnontwerp ongeldig (${stage}${codes.length ? `: ${codes.join(", ")}` : ""}).`);
    this.name = "LearningLineValidationError";
  }
}

/**
 * Leerlijn Architect via Claude (prompt learning-line-architect/v1). Eén aanroep, geen reparatie, geen retry, geen
 * fallback. Geldig pas na structured output, Zod op het ontwerp, samenstellen, Zod op het contract en de invarianten
 * (exact zes modules, volgorde M1..M6, unieke titels, progressie).
 */
export class ClaudeLearningLineArchitect implements LearningLineArchitectService {
  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudeLearningLineSettings, "apiKey">,
  ) {}

  async generate(request: LearningLineArchitectRequest): Promise<LearningLineDesign> {
    let response;
    try {
      response = await this.client.messages.parse({
        model: this.settings.model,
        max_tokens: this.settings.maxTokens,
        system: LEARNING_LINE_ARCHITECT_V1_INSTRUCTIONS,
        messages: [{ role: "user", content: buildLearningLineArchitectV1Request(request) }],
        output_config: { effort: this.settings.effort, format: zodOutputFormat(LearningLineArchitectDesignSchema) },
      });
    } catch (error) {
      const mapped = toAnalysisError(error);
      if (mapped.kind === "invalid-output") throw new LearningLineValidationError("structured_output", []);
      throw mapped;
    }
    if (response.stop_reason === "refusal") throw new AnalysisError("refusal", "Claude weigerde het leerlijnontwerp.");
    if (response.stop_reason === "max_tokens") throw new AnalysisError("incomplete", "Leerlijnontwerp afgekapt op max_tokens.");
    if (!response.parsed_output) throw new AnalysisError("empty", `Geen geparste output (stop_reason: ${response.stop_reason}).`);

    const design = LearningLineArchitectDesignSchema.safeParse(response.parsed_output);
    if (!design.success) throw new LearningLineValidationError("schema_validation", zodIssueCodes(design.error));
    const composed = LearningLineDesignSchema.safeParse(composeLearningLineDesign(design.data));
    if (!composed.success) throw new LearningLineValidationError("schema_validation", zodIssueCodes(composed.error));
    const violations = checkLearningLineInvariants(composed.data);
    if (violations.length > 0) throw new LearningLineValidationError("domain_invariant", violations);
    return composed.data;
  }
}
