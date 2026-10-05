import type { ClaudeAnalysisSettings } from "../analysis/config";
import { AnalysisError } from "../analysis/errors";

/*
 * De enige configuratieplek voor de Participant Preview-runtime. Alleen server-side; los van de andere providers.
 *
 * .env.local:
 *   CERTUM_PREVIEW_PROVIDER=mock     (standaard als niets is ingesteld)
 *   CERTUM_PREVIEW_PROVIDER=claude   (vereist ANTHROPIC_API_KEY; iedere chatbeurt en iedere feedback is een betaalde call)
 */

export const PREVIEW_PROVIDERS = ["mock", "claude"] as const;
export type PreviewProvider = (typeof PREVIEW_PROVIDERS)[number];

export type ClaudePreviewSettings = ClaudeAnalysisSettings & { chatMaxTokens: number; feedbackMaxTokens: number; chatEffort: ClaudeAnalysisSettings["effort"] };

export type PreviewConfig = { provider: "mock" } | { provider: "claude"; claude: ClaudePreviewSettings };

/**
 * Claude-instellingen voor de preview-runtime. Hier, en alleen hier. Chat op lage effort (natuurlijke, snelle
 * gespreksbeurten), feedback op medium. Platte tekst, geen structured output. Geen fallbackmodel.
 */
export const CLAUDE_PREVIEW_DEFAULTS = {
  model: "claude-opus-5-5",
  effort: "medium",
  chatEffort: "low",
  maxTokens: 1_500,
  chatMaxTokens: 600,
  feedbackMaxTokens: 1_500,
  timeoutMs: 60_000,
  // 0: een SDK-retry kan een onzichtbare tweede (betaalde) beurt zijn.
  maxRetries: 0,
} as const satisfies Omit<ClaudePreviewSettings, "apiKey">;

type Env = Record<string, string | undefined>;

export function readPreviewConfig(env: Env = process.env): PreviewConfig {
  const raw = env.CERTUM_PREVIEW_PROVIDER?.trim().toLowerCase() || "mock";
  if (!PREVIEW_PROVIDERS.includes(raw as PreviewProvider)) {
    throw new AnalysisError("config", `Onbekende CERTUM_PREVIEW_PROVIDER "${raw}". Kies uit: ${PREVIEW_PROVIDERS.join(", ")}.`);
  }
  if (raw === "mock") return { provider: "mock" };
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new AnalysisError("config", "CERTUM_PREVIEW_PROVIDER=claude, maar ANTHROPIC_API_KEY ontbreekt. Zet de sleutel in .env.local.");
  return { provider: "claude", claude: { apiKey, ...CLAUDE_PREVIEW_DEFAULTS } };
}
