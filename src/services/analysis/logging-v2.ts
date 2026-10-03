import { TRAINING_ANALYSIS_V2_PROMPT_VERSION } from "@/knowledge/prompts/training-analysis-v2";
import type { AgentInput } from "@/modules/training-agent";
import { ANALYSIS_CONTRACT_VERSION, type AnalysisOutcomeKind } from "@/modules/training-agent/v2";
import { AnalysisError, type AnalysisErrorKind } from "./errors";
import type { AnalysisServiceInfo } from "./logging";
import type { TrainingAnalysisServiceV2 } from "./training-analysis-service-v2";

/**
 * Privacyveilige logregel voor een V2-analyse-aanroep: alleen technische metadata.
 * Nooit de input, bronsegmenten, sourceRefs, sourceCandidates, prompt of output-inhoud.
 */
export interface AnalysisLogEntryV2 {
  event: "certum.analysis";
  provider: string;
  model?: string;
  effort?: string;
  promptVersion: string;
  contractVersion: string;
  inputKind: AgentInput["kind"];
  inputLength: number;
  segmentCount: number;
  durationMs: number;
  outcome: "success" | "error";
  errorKind?: AnalysisErrorKind | "unknown";
  analysisOutcome?: AnalysisOutcomeKind;
}

type Logger = (entry: AnalysisLogEntryV2) => void;

const defaultLogger: Logger = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.outcome === "error") console.warn(line);
  else console.info(line);
};

/** Wikkelt iedere V2-implementatie in dezelfde metadata-logging. */
export function withAnalysisLoggingV2(
  service: TrainingAnalysisServiceV2,
  info: AnalysisServiceInfo,
  log: Logger = defaultLogger,
): TrainingAnalysisServiceV2 {
  return {
    async analyze(request) {
      const startedAt = performance.now();
      const base = {
        event: "certum.analysis" as const,
        provider: info.provider,
        ...(info.model && { model: info.model }),
        ...(info.effort && { effort: info.effort }),
        promptVersion: TRAINING_ANALYSIS_V2_PROMPT_VERSION,
        contractVersion: ANALYSIS_CONTRACT_VERSION,
        inputKind: request.input.kind,
        inputLength: request.input.text.length,
        segmentCount: request.segments.length,
      };
      try {
        const outcome = await service.analyze(request);
        log({
          ...base,
          durationMs: Math.round(performance.now() - startedAt),
          outcome: "success",
          analysisOutcome: outcome.outcome,
        });
        return outcome;
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
