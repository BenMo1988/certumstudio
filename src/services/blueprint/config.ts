import type { ClaudeAnalysisSettings } from "../analysis/config";
import { AnalysisError } from "../analysis/errors";

/*
 * De enige configuratieplek voor Blueprint Generation: welke provider en welk model. Alleen server-side.
 * Los van CERTUM_ANALYSIS_PROVIDER: een echte analyse betekent niet automatisch een betaalde Blueprint-aanroep.
 *
 * .env.local:
 *   CERTUM_BLUEPRINT_PROVIDER=mock     (standaard als niets is ingesteld)
 *   CERTUM_BLUEPRINT_PROVIDER=claude   (vereist ANTHROPIC_API_KEY)
 */

export const BLUEPRINT_PROVIDERS = ["mock", "claude"] as const;
export type BlueprintProvider = (typeof BLUEPRINT_PROVIDERS)[number];

/** Dezelfde vorm als de analyse-instellingen; eigen waarden. */
export type ClaudeBlueprintSettings = ClaudeAnalysisSettings;

export type BlueprintConfig = { provider: "mock" } | { provider: "claude"; claude: ClaudeBlueprintSettings };

/** Claude-instellingen voor Blueprint Generation. Hier, en alleen hier, staat het Blueprint-model. */
export const CLAUDE_BLUEPRINT_DEFAULTS = {
  model: "claude-opus-5-5",
  // Zelfde filosofie als de analyse: voorlopig "medium", later met de BP-evalset te herijken.
  effort: "medium",
  maxTokens: 16_000,
  timeoutMs: 120_000,
  maxRetries: 2,
} as const satisfies Omit<ClaudeBlueprintSettings, "apiKey">;

type Env = Record<string, string | undefined>;

export function readBlueprintConfig(env: Env = process.env): BlueprintConfig {
  const raw = env.CERTUM_BLUEPRINT_PROVIDER?.trim().toLowerCase() || "mock";
  if (!BLUEPRINT_PROVIDERS.includes(raw as BlueprintProvider)) {
    throw new AnalysisError(
      "config",
      `Onbekende CERTUM_BLUEPRINT_PROVIDER "${raw}". Kies uit: ${BLUEPRINT_PROVIDERS.join(", ")}.`,
    );
  }
  if (raw === "mock") return { provider: "mock" };

  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalysisError(
      "config",
      "CERTUM_BLUEPRINT_PROVIDER=claude, maar ANTHROPIC_API_KEY ontbreekt. Zet de sleutel in .env.local.",
    );
  }
  return { provider: "claude", claude: { apiKey, ...CLAUDE_BLUEPRINT_DEFAULTS } };
}
