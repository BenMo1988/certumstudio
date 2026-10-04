import type { ClaudeAnalysisSettings } from "../analysis/config";
import { AnalysisError } from "../analysis/errors";

/*
 * De enige configuratieplek voor Block Plan Generation. Alleen server-side. Los van de analyse- en Blueprint-provider.
 *
 * .env.local:
 *   CERTUM_BLOCK_PLAN_PROVIDER=mock     (standaard als niets is ingesteld)
 *   CERTUM_BLOCK_PLAN_PROVIDER=claude   (vereist ANTHROPIC_API_KEY)
 */

export const BLOCK_PLAN_PROVIDERS = ["mock", "claude"] as const;
export type BlockPlanProvider = (typeof BLOCK_PLAN_PROVIDERS)[number];

export type ClaudeBlockPlanSettings = ClaudeAnalysisSettings;

export type BlockPlanConfig = { provider: "mock" } | { provider: "claude"; claude: ClaudeBlockPlanSettings };

/** Claude-instellingen voor Block Plan Generation. Hier, en alleen hier, staat het Block Plan-model. */
export const CLAUDE_BLOCK_PLAN_DEFAULTS = {
  model: "claude-opus-5-5",
  effort: "medium",
  maxTokens: 16_000,
  timeoutMs: 120_000,
  // 0: een SDK-retry (time-out, verbinding, 408/409/429/5xx) kan een onzichtbare tweede generatie zijn.
  maxRetries: 0,
} as const satisfies Omit<ClaudeBlockPlanSettings, "apiKey">;

type Env = Record<string, string | undefined>;

export function readBlockPlanConfig(env: Env = process.env): BlockPlanConfig {
  const raw = env.CERTUM_BLOCK_PLAN_PROVIDER?.trim().toLowerCase() || "mock";
  if (!BLOCK_PLAN_PROVIDERS.includes(raw as BlockPlanProvider)) {
    throw new AnalysisError(
      "config",
      `Onbekende CERTUM_BLOCK_PLAN_PROVIDER "${raw}". Kies uit: ${BLOCK_PLAN_PROVIDERS.join(", ")}.`,
    );
  }
  if (raw === "mock") return { provider: "mock" };

  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalysisError(
      "config",
      "CERTUM_BLOCK_PLAN_PROVIDER=claude, maar ANTHROPIC_API_KEY ontbreekt. Zet de sleutel in .env.local.",
    );
  }
  return { provider: "claude", claude: { apiKey, ...CLAUDE_BLOCK_PLAN_DEFAULTS } };
}
