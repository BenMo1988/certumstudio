import { LEARNING_LINE_ARCHITECT_PROMPT_VERSION } from "@/knowledge/prompts/learning-line-architect-v1";
import { createClaudeClient } from "../analysis/claude/claude-training-analysis-service";
import { ClaudeLearningLineArchitect } from "./claude-learning-line-architect";
import { readLearningLineConfig } from "./config";
import { withLearningLineLogging } from "./logging";
import { MockLearningLineArchitect } from "./mock-learning-line-architect";
import type { LearningLineArchitectService } from "./services";

/**
 * Kiest de Leerlijn Architect op basis van CERTUM_LEARNING_LINE_PROVIDER (standaard mock). Geen terugval naar mock.
 * Wordt pas aangeroepen nadat de server-side poort (preflight + synthetic_only) toestemming heeft gegeven.
 */
export function createLearningLineArchitect(env?: Record<string, string | undefined>): LearningLineArchitectService {
  const config = readLearningLineConfig(env);
  switch (config.provider) {
    case "mock":
      return withLearningLineLogging(new MockLearningLineArchitect(), { provider: "mock" });
    case "claude": {
      const { apiKey, ...settings } = config.claude;
      return withLearningLineLogging(new ClaudeLearningLineArchitect(createClaudeClient({ apiKey, ...settings }), settings), {
        provider: "claude",
        model: settings.model,
        effort: settings.effort,
        promptVersion: LEARNING_LINE_ARCHITECT_PROMPT_VERSION,
      });
    }
  }
}

/** Herkomst voor een opgeslagen ontwerprevision. */
export function learningLineProvenance(env?: Record<string, string | undefined>): { promptVersion: string | null; modelVersion: string | null } {
  try {
    const config = readLearningLineConfig(env);
    if (config.provider === "claude") return { promptVersion: LEARNING_LINE_ARCHITECT_PROMPT_VERSION, modelVersion: `${config.claude.model} · ${config.claude.effort}` };
    return { promptVersion: "mock", modelVersion: "mock" };
  } catch {
    return { promptVersion: null, modelVersion: null };
  }
}

export type { LearningLineArchitectService } from "./services";
