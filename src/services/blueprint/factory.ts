import { TRAINING_BLUEPRINT_PROMPT_VERSION } from "@/knowledge/prompts/training-blueprint-v1";
import { TRAINING_BLUEPRINT_V2_PROMPT_VERSION } from "@/knowledge/prompts/training-blueprint-v2";
import { TRAINING_BLUEPRINT_V21_PROMPT_VERSION } from "@/knowledge/prompts/training-blueprint-v2-1";
import { TRAINING_BLUEPRINT_V2_VERSION } from "@/modules/training-blueprint/v2/schema";
import { createClaudeClient } from "../analysis/claude/claude-training-analysis-service";
import { ClaudeTrainingBlueprintService } from "./claude/claude-training-blueprint-service";
import { readBlueprintConfig } from "./config";
import { withBlueprintLogging } from "./logging";
import { MockBlockPlanService } from "./mock/mock-block-plan-service";
import { MockTrainingBlueprintService } from "./mock/mock-blueprint-service";
import type {
  BlockPlanService,
  TrainingBlueprintService,
  TrainingBlueprintServiceV2,
  TrainingBlueprintServiceV21,
} from "./services";
import { ClaudeTrainingBlueprintServiceV21 } from "./v2/claude-training-blueprint-service-v2-1";
import { MockTrainingBlueprintServiceV21 } from "./v2/mock-blueprint-service-v2-1";
import { ClaudeTrainingBlueprintServiceV2 } from "./v2/claude-training-blueprint-service-v2";
import { MockTrainingBlueprintServiceV2 } from "./v2/mock-blueprint-service-v2";

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

/**
 * Blueprint Contract V2: zelfde configuratie (CERTUM_BLUEPRINT_PROVIDER, CLAUDE_BLUEPRINT_DEFAULTS), eigen prompt en
 * contractversie. Ook hier geen terugval van Claude naar mock.
 */
export function createTrainingBlueprintServiceV2(env?: Record<string, string | undefined>): TrainingBlueprintServiceV2 {
  const config = readBlueprintConfig(env);
  switch (config.provider) {
    case "mock":
      return withBlueprintLogging(new MockTrainingBlueprintServiceV2(), {
        provider: "mock",
        contractVersion: TRAINING_BLUEPRINT_V2_VERSION,
      });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      const client = createClaudeClient({ apiKey, ...settings });
      return withBlueprintLogging(new ClaudeTrainingBlueprintServiceV2(client, settings), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
        promptVersion: TRAINING_BLUEPRINT_V2_PROMPT_VERSION,
        contractVersion: TRAINING_BLUEPRINT_V2_VERSION,
      });
    }
  }
}

/**
 * Blueprint Contract V2 met trusted routebeleid uit Analysis V2.1 (prompt training-blueprint/v2.1). Zelfde configuratie
 * en defaults; geen terugval van Claude naar mock.
 */
export function createTrainingBlueprintServiceV21(env?: Record<string, string | undefined>): TrainingBlueprintServiceV21 {
  const config = readBlueprintConfig(env);
  switch (config.provider) {
    case "mock":
      return withBlueprintLogging(new MockTrainingBlueprintServiceV21(), {
        provider: "mock",
        contractVersion: TRAINING_BLUEPRINT_V2_VERSION,
      });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      const client = createClaudeClient({ apiKey, ...settings });
      return withBlueprintLogging(new ClaudeTrainingBlueprintServiceV21(client, settings), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
        promptVersion: TRAINING_BLUEPRINT_V21_PROMPT_VERSION,
        contractVersion: TRAINING_BLUEPRINT_V2_VERSION,
      });
    }
  }
}

/** Block Plan Generation blijft in deze fase uitsluitend mock. */
export function createBlockPlanService(): BlockPlanService {
  return new MockBlockPlanService();
}
