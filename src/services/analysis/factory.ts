import {
  ClaudeTrainingAnalysisService,
  createClaudeClient,
} from "./claude/claude-training-analysis-service";
import { readAnalysisConfig } from "./config";
import { withAnalysisLogging } from "./logging";
import { MockTrainingAnalysisService } from "./mock/mock-training-analysis-service";
import type { TrainingAnalysisService } from "./training-analysis-service";
import { ClaudeTrainingAnalysisServiceV2 } from "./claude/claude-training-analysis-service-v2";
import { withAnalysisLoggingV2 } from "./logging-v2";
import { MockTrainingAnalysisServiceV2 } from "./mock/v2/mock-training-analysis-service-v2";
import type { TrainingAnalysisServiceV2 } from "./training-analysis-service-v2";
import {
  TRAINING_ANALYSIS_V211_INSTRUCTIONS,
  TRAINING_ANALYSIS_V211_PROMPT_VERSION,
} from "@/knowledge/prompts/training-analysis-v2-1-1";
import { ANALYSIS_CONTRACT_V21_VERSION } from "@/modules/training-agent/v2-1";
import { ClaudeTrainingAnalysisServiceV21 } from "./claude/claude-training-analysis-service-v2-1";
import { MockTrainingAnalysisServiceV21 } from "./mock/v2-1/mock-training-analysis-service-v2-1";
import type { TrainingAnalysisServiceV21 } from "./training-analysis-service-v2-1";

/**
 * Kiest de implementatie op basis van de configuratie. Gooit een
 * `AnalysisError("config")` als de configuratie onvolledig is.
 *
 * Er is bewust geen automatische terugval van Claude naar mock: een falende
 * Claude-aanroep moet als fout zichtbaar worden, niet als nep-analyse.
 */
export function createTrainingAnalysisService(env?: Record<string, string | undefined>): TrainingAnalysisService {
  const config = readAnalysisConfig(env);
  switch (config.provider) {
    case "mock":
      return withAnalysisLogging(new MockTrainingAnalysisService(), { provider: "mock" });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      const client = createClaudeClient({ apiKey, ...settings });
      return withAnalysisLogging(new ClaudeTrainingAnalysisService(client, settings), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
      });
    }
  }
}

/**
 * Analysis Contract V2: kiest de implementatie op basis van dezelfde configuratie (CERTUM_ANALYSIS_PROVIDER).
 * Ook hier geen automatische terugval van Claude naar mock.
 */
export function createTrainingAnalysisServiceV2(env?: Record<string, string | undefined>): TrainingAnalysisServiceV2 {
  const config = readAnalysisConfig(env);
  switch (config.provider) {
    case "mock":
      return withAnalysisLoggingV2(new MockTrainingAnalysisServiceV2(), { provider: "mock" });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      const client = createClaudeClient({ apiKey, ...settings });
      return withAnalysisLoggingV2(new ClaudeTrainingAnalysisServiceV2(client, settings), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
      });
    }
  }
}

/**
 * Analysis Contract V2.1 met prompt training-analysis/v2.1.1 (de v2.1-prompt plus suitability vóór routebeleid).
 * Zelfde configuratie (CERTUM_ANALYSIS_PROVIDER, CLAUDE_ANALYSIS_DEFAULTS). Geen automatische terugval naar mock.
 */
export function createTrainingAnalysisServiceV21(env?: Record<string, string | undefined>): TrainingAnalysisServiceV21 {
  const config = readAnalysisConfig(env);
  const versions = { promptVersion: TRAINING_ANALYSIS_V211_PROMPT_VERSION, contractVersion: ANALYSIS_CONTRACT_V21_VERSION };
  switch (config.provider) {
    case "mock":
      return withAnalysisLoggingV2(new MockTrainingAnalysisServiceV21(), { provider: "mock", ...versions });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      const client = createClaudeClient({ apiKey, ...settings });
      return withAnalysisLoggingV2(new ClaudeTrainingAnalysisServiceV21(client, settings, TRAINING_ANALYSIS_V211_INSTRUCTIONS), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
        ...versions,
      });
    }
  }
}
