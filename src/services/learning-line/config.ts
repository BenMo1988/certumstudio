import type { ClaudeAnalysisSettings } from "../analysis/config";
import { AnalysisError } from "../analysis/errors";

/*
 * De enige configuratieplek voor de Leerlijn Architect. Alleen server-side. Los van de andere providers.
 *
 * .env.local:
 *   CERTUM_LEARNING_LINE_PROVIDER=mock     (standaard als niets is ingesteld)
 *   CERTUM_LEARNING_LINE_PROVIDER=claude   (vereist ANTHROPIC_API_KEY; één betaalde aanroep per ontwerp of revisie)
 */

export const LEARNING_LINE_PROVIDERS = ["mock", "claude"] as const;
export type LearningLineProvider = (typeof LEARNING_LINE_PROVIDERS)[number];

export type ClaudeLearningLineSettings = ClaudeAnalysisSettings;
export type LearningLineConfig = { provider: "mock" } | { provider: "claude"; claude: ClaudeLearningLineSettings };

/** Claude-instellingen voor de Leerlijn Architect. Hier, en alleen hier. */
export const CLAUDE_LEARNING_LINE_DEFAULTS = {
  model: "claude-opus-5-5",
  effort: "medium",
  // Zes moduleopdrachten plus thinking: ruime technische headroom; de lengte begrenst de prompt.
  maxTokens: 24_000,
  timeoutMs: 180_000,
  // 0: een SDK-retry kan een onzichtbare tweede (betaalde) generatie zijn.
  maxRetries: 0,
} as const satisfies Omit<ClaudeLearningLineSettings, "apiKey">;

export function readLearningLineConfig(env: Record<string, string | undefined> = process.env): LearningLineConfig {
  const raw = env.CERTUM_LEARNING_LINE_PROVIDER?.trim().toLowerCase() || "mock";
  if (!LEARNING_LINE_PROVIDERS.includes(raw as LearningLineProvider)) {
    throw new AnalysisError("config", `Onbekende CERTUM_LEARNING_LINE_PROVIDER "${raw}". Kies uit: ${LEARNING_LINE_PROVIDERS.join(", ")}.`);
  }
  if (raw === "mock") return { provider: "mock" };
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new AnalysisError("config", "CERTUM_LEARNING_LINE_PROVIDER=claude, maar ANTHROPIC_API_KEY ontbreekt. Zet de sleutel in .env.local.");
  return { provider: "claude", claude: { apiKey, ...CLAUDE_LEARNING_LINE_DEFAULTS } };
}
