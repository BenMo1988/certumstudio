import { TRAINING_ANALYSIS_PROMPT_VERSION } from "@/knowledge/prompts/training-analysis";
import type { AgentInput, InputAnalysis } from "@/modules/training-agent";
import { AnalysisError, type AnalysisErrorKind } from "./errors";
import type { TrainingAnalysisService } from "./training-analysis-service";

/**
 * Privacyveilige logregel: alleen technische metadata.
 * Nooit de input-tekst, prompt of providerresponse; casussen kunnen
 * herleidbare gegevens bevatten.
 */
export interface AnalysisLogEntry {
  event: "certum.analysis";
  provider: string;
  /** Alleen bij een echte provider; ontbreekt bij de mock. */
  model?: string;
  effort?: string;
  promptVersion: string;
  inputKind: AgentInput["kind"];
  inputLength: number;
  durationMs: number;
  outcome: "success" | "error";
  errorKind?: AnalysisErrorKind | "unknown";
  privacyLevel?: InputAnalysis["privacyAssessment"]["level"];
  verdict?: InputAnalysis["suitability"]["verdict"];
}

type Logger = (entry: AnalysisLogEntry) => void;

/** Vaste configuratie van de implementatie, voor herleidbaarheid tijdens evaluaties. */
export interface AnalysisServiceInfo {
  provider: string;
  model?: string;
  effort?: string;
}

const defaultLogger: Logger = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.outcome === "error") console.warn(line);
  else console.info(line);
};

/** Wikkelt iedere implementatie in dezelfde metadata-logging. */
export function withAnalysisLogging(
  service: TrainingAnalysisService,
  info: AnalysisServiceInfo,
  log: Logger = defaultLogger,
): TrainingAnalysisService {
  return {
    async analyze(input) {
      const startedAt = performance.now();
      const base = {
        event: "certum.analysis" as const,
        provider: info.provider,
        ...(info.model && { model: info.model }),
        ...(info.effort && { effort: info.effort }),
        promptVersion: TRAINING_ANALYSIS_PROMPT_VERSION,
        inputKind: input.kind,
        inputLength: input.text.length,
      };
      try {
        const analysis = await service.analyze(input);
        log({
          ...base,
          durationMs: Math.round(performance.now() - startedAt),
          outcome: "success",
          privacyLevel: analysis.privacyAssessment.level,
          verdict: analysis.suitability.verdict,
        });
        return analysis;
      } catch (error) {
        log({
          ...base,
          durationMs: Math.round(performance.now() - startedAt),
          outcome: "error",
          errorKind: error instanceof AnalysisError ? error.kind : "unknown",
        });
        throw error;
      }
    },
  };
}
