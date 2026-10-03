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
