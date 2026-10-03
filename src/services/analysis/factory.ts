import {
  ClaudeTrainingAnalysisService,
  createClaudeClient,
} from "./claude/claude-training-analysis-service";
import { readAnalysisConfig } from "./config";
import { withAnalysisLogging } from "./logging";
import { MockTrainingAnalysisService } from "./mock/mock-training-analysis-service";
import type { TrainingAnalysisService } from "./training-analysis-service";

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
