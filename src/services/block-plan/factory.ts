import { TRAINING_BLOCK_PLAN_PROMPT_VERSION } from "@/knowledge/prompts/training-block-plan-v1";
import { createClaudeClient } from "../analysis/claude/claude-training-analysis-service";
import { MockBlockPlanService } from "../blueprint/mock/mock-block-plan-service";
import type { BlockPlanService } from "../blueprint/services";
import { ClaudeBlockPlanService } from "./claude-block-plan-service";
import { readBlockPlanConfig } from "./config";
import { withBlockPlanLogging } from "./logging";

/**
 * Kiest de Block Plan-implementatie op basis van CERTUM_BLOCK_PLAN_PROVIDER (standaard mock). Gooit een
 * `AnalysisError("config")` als de configuratie onvolledig is. Geen terugval van Claude naar mock.
 * Wordt pas aangeroepen nadat de server-side poort in blueprint-flow.ts (goedgekeurde, geldige Blueprint) toestemming
 * heeft gegeven.
 */
export function createBlockPlanService(env?: Record<string, string | undefined>): BlockPlanService {
  const config = readBlockPlanConfig(env);
  switch (config.provider) {
    case "mock":
      return withBlockPlanLogging(new MockBlockPlanService(), { provider: "mock" });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      const client = createClaudeClient({ apiKey, ...settings });
      return withBlockPlanLogging(new ClaudeBlockPlanService(client, settings), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
        promptVersion: TRAINING_BLOCK_PLAN_PROMPT_VERSION,
      });
    }
  }
}
