import { TRAINING_BLUEPRINT_PROMPT_VERSION } from "@/knowledge/prompts/training-blueprint-v1";
import { createClaudeClient } from "../analysis/claude/claude-training-analysis-service";
import { ClaudeTrainingBlueprintService } from "./claude/claude-training-blueprint-service";
import { readBlueprintConfig } from "./config";
import { withBlueprintLogging } from "./logging";
import { MockBlockPlanService } from "./mock/mock-block-plan-service";
import { MockTrainingBlueprintService } from "./mock/mock-blueprint-service";
import type { BlockPlanService, TrainingBlueprintService } from "./services";

/**
 * Kiest de Blueprint-implementatie op basis van CERTUM_BLUEPRINT_PROVIDER. Gooit een `AnalysisError("config")` als
 * de configuratie onvolledig is. Bewust geen terugval van Claude naar mock: een fout blijft een fout.
 * Wordt pas aangeroepen nadat de server-side poorten in blueprint-flow.ts toestemming hebben gegeven.
 */
export function createTrainingBlueprintService(env?: Record<string, string | undefined>): TrainingBlueprintService {
  const config = readBlueprintConfig(env);
  switch (config.provider) {
    case "mock":
      return withBlueprintLogging(new MockTrainingBlueprintService(), { provider: "mock" });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      const client = createClaudeClient({ apiKey, ...settings });
      return withBlueprintLogging(new ClaudeTrainingBlueprintService(client, settings), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
        promptVersion: TRAINING_BLUEPRINT_PROMPT_VERSION,
      });
    }
  }
}

/** Block Plan Generation blijft in deze fase uitsluitend mock. */
export function createBlockPlanService(): BlockPlanService {
  return new MockBlockPlanService();
}
