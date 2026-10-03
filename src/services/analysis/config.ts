import { AnalysisError } from "./errors";

/*
 * De enige configuratieplek voor de analyse-engine: welke provider, welk
 * model en welke limieten. Alleen server-side; leest environment variables.
 *
 * .env.local:
 *   CERTUM_ANALYSIS_PROVIDER=mock     (standaard als niets is ingesteld)
 *   CERTUM_ANALYSIS_PROVIDER=claude   (vereist ANTHROPIC_API_KEY)
 *   CERTUM_ANALYSIS_MAX_RETRIES=0     (optioneel, voor evalruns: één poging zonder SDK-transportretries)
 */

export const ANALYSIS_PROVIDERS = ["mock", "claude"] as const;
export type AnalysisProvider = (typeof ANALYSIS_PROVIDERS)[number];

export interface ClaudeAnalysisSettings {
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
}

export type AnalysisConfig =
  | { provider: "mock" }
  | { provider: "claude"; claude: ClaudeAnalysisSettings };

/** Claude-instellingen voor Certum Analyse. Hier, en alleen hier, staat het model. */
export const CLAUDE_ANALYSIS_DEFAULTS = {
  model: "claude-opus-5-5",
  // Voorlopig "medium". Of "high" aantoonbaar betere Certum-analyses geeft,
  // wordt later met een vaste evalset bepaald.
  effort: "medium",
  maxTokens: 16_000,
  // Per poging; de SDK probeert bij time-out, 429 en 5xx maximaal maxRetries keer opnieuw.
  timeoutMs: 90_000,
  maxRetries: 2,
} as const satisfies Omit<ClaudeAnalysisSettings, "apiKey">;

type Env = Record<string, string | undefined>;

export function readAnalysisConfig(env: Env = process.env): AnalysisConfig {
  const raw = env.CERTUM_ANALYSIS_PROVIDER?.trim().toLowerCase() || "mock";
  if (!ANALYSIS_PROVIDERS.includes(raw as AnalysisProvider)) {
    throw new AnalysisError(
      "config",
      `Onbekende CERTUM_ANALYSIS_PROVIDER "${raw}". Kies uit: ${ANALYSIS_PROVIDERS.join(", ")}.`,
    );
  }

  if (raw === "mock") return { provider: "mock" };

  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalysisError(
      "config",
      "CERTUM_ANALYSIS_PROVIDER=claude, maar ANTHROPIC_API_KEY ontbreekt. Zet de sleutel in .env.local.",
    );
  }
  return { provider: "claude", claude: { apiKey, ...CLAUDE_ANALYSIS_DEFAULTS, maxRetries: readMaxRetries(env) } };
}

/**
 * Optionele override voor evalruns: een SDK-retry (time-out, verbinding, 408/409/429/5xx) kan een onzichtbare tweede
 * generatie zijn. Alleen 0 t/m de standaardwaarde; zonder variabele geldt CLAUDE_ANALYSIS_DEFAULTS.maxRetries.
 */
function readMaxRetries(env: Env): number {
  const raw = env.CERTUM_ANALYSIS_MAX_RETRIES?.trim();
  if (!raw) return CLAUDE_ANALYSIS_DEFAULTS.maxRetries;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > CLAUDE_ANALYSIS_DEFAULTS.maxRetries) {
    throw new AnalysisError(
      "config",
      `Ongeldige CERTUM_ANALYSIS_MAX_RETRIES "${raw}". Kies 0 t/m ${CLAUDE_ANALYSIS_DEFAULTS.maxRetries}.`,
    );
  }
  return value;
}
