import type { ClaudeAnalysisSettings } from "../analysis/config";
import { AnalysisError } from "../analysis/errors";

/*
 * De enige configuratieplek voor Block Content. Alleen server-side. Los van analyse-, Blueprint- en Block Plan-provider.
 *
 * .env.local:
 *   CERTUM_BLOCK_CONTENT_PROVIDER=mock     (standaard als niets is ingesteld)
 *   CERTUM_BLOCK_CONTENT_PROVIDER=claude   (vereist ANTHROPIC_API_KEY)
 */

export const BLOCK_CONTENT_PROVIDERS = ["mock", "claude"] as const;
export type BlockContentProvider = (typeof BLOCK_CONTENT_PROVIDERS)[number];

export type ClaudeBlockContentSettings = ClaudeAnalysisSettings;

export type BlockContentConfig = { provider: "mock" } | { provider: "claude"; claude: ClaudeBlockContentSettings };

/** Claude-instellingen voor Block Content. Hier, en alleen hier, staat het Block Content-model. */
export const CLAUDE_BLOCK_CONTENT_DEFAULTS = {
  model: "claude-opus-5-5",
  effort: "medium",
  maxTokens: 16_000,
  timeoutMs: 120_000,
  // 0: een SDK-retry kan een onzichtbare tweede generatie zijn.
  maxRetries: 0,
} as const satisfies Omit<ClaudeBlockContentSettings, "apiKey">;

type Env = Record<string, string | undefined>;

export function readBlockContentConfig(env: Env = process.env): BlockContentConfig {
  const raw = env.CERTUM_BLOCK_CONTENT_PROVIDER?.trim().toLowerCase() || "mock";
  if (!BLOCK_CONTENT_PROVIDERS.includes(raw as BlockContentProvider)) {
    throw new AnalysisError(
      "config",
      `Onbekende CERTUM_BLOCK_CONTENT_PROVIDER "${raw}". Kies uit: ${BLOCK_CONTENT_PROVIDERS.join(", ")}.`,
    );
  }
  if (raw === "mock") return { provider: "mock" };

  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalysisError(
      "config",
      "CERTUM_BLOCK_CONTENT_PROVIDER=claude, maar ANTHROPIC_API_KEY ontbreekt. Zet de sleutel in .env.local.",
    );
  }
  return { provider: "claude", claude: { apiKey, ...CLAUDE_BLOCK_CONTENT_DEFAULTS } };
}
