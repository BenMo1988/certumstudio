import { TRAINING_BLOCK_CONTENT_V1_1_PROMPT_VERSION } from "@/knowledge/prompts/training-block-content-v1-1";
import { createClaudeClient } from "../analysis/claude/claude-training-analysis-service";
import { ClaudeBlockContentService } from "./claude-block-content-service";
import { readBlockContentConfig } from "./config";
import { withBlockContentLogging } from "./logging";
import { MockBlockContentService } from "./mock/mock-block-content-service";
import type { BlockContentService } from "./services";

/**
 * Kiest de Block Content-implementatie op basis van CERTUM_BLOCK_CONTENT_PROVIDER (standaard mock). Gooit een
 * `AnalysisError("config")` als de configuratie onvolledig is. Geen terugval van Claude naar mock. Wordt pas
 * aangeroepen nadat de server-side poorten (content-flow.ts) toestemming hebben gegeven.
 */
export function createBlockContentService(env?: Record<string, string | undefined>): BlockContentService {
  const config = readBlockContentConfig(env);
  switch (config.provider) {
    case "mock":
      return withBlockContentLogging(new MockBlockContentService(), { provider: "mock" });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      const client = createClaudeClient({ apiKey, ...settings });
      return withBlockContentLogging(new ClaudeBlockContentService(client, settings), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
        promptVersion: TRAINING_BLOCK_CONTENT_V1_1_PROMPT_VERSION,
      });
    }
  }
}
