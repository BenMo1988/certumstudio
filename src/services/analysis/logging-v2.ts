import { TRAINING_ANALYSIS_V2_PROMPT_VERSION } from "@/knowledge/prompts/training-analysis-v2";
import type { AgentInput } from "@/modules/training-agent";
import { ANALYSIS_CONTRACT_VERSION, type AnalysisOutcome, type AnalysisOutcomeKind } from "@/modules/training-agent/v2";
import { AnalysisError, type AnalysisErrorKind } from "./errors";
import type { AnalysisServiceInfo } from "./logging";
import type { AnalysisRequestV2 } from "./training-analysis-service-v2";

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
  /** Alleen bij V2.1: aantal ready-richtingen per routebeleid. Nooit titels, focus of leerdoelen. */
  openChoiceDirections?: number;
  prescribedActionDirections?: number;
}

/** Versies van de engine; standaard Analysis Contract V2 met training-analysis/v2. */
export interface AnalysisVersionInfo {
  promptVersion?: string;
  contractVersion?: string;
}

/** Telt het routebeleid van ready-richtingen (V2.1); undefined als de richtingen geen routebeleid hebben. */
function countRoutePolicies(outcome: AnalysisOutcome) {
  if (outcome.outcome !== "ready") return {};
  const policies = outcome.trainingDirections.map((d) => (d as { routePolicy?: string }).routePolicy);
  if (policies.some((p) => p === undefined)) return {};
  return {
    openChoiceDirections: policies.filter((p) => p === "open_choice").length,
    prescribedActionDirections: policies.filter((p) => p === "prescribed_action").length,
  };
}

type Logger = (entry: AnalysisLogEntryV2) => void;

const defaultLogger: Logger = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.outcome === "error") console.warn(line);
  else console.info(line);
};

/** Wikkelt iedere V2- en V2.1-implementatie in dezelfde metadata-logging. */
export function withAnalysisLoggingV2<O extends AnalysisOutcome>(
  service: { analyze(request: AnalysisRequestV2): Promise<O> },
  info: AnalysisServiceInfo & AnalysisVersionInfo,
  log: Logger = defaultLogger,
): { analyze(request: AnalysisRequestV2): Promise<O> } {
  return {
    async analyze(request) {
      const startedAt = performance.now();
      const base = {
        event: "certum.analysis" as const,
        provider: info.provider,
        ...(info.model && { model: info.model }),
        ...(info.effort && { effort: info.effort }),
        promptVersion: info.promptVersion ?? TRAINING_ANALYSIS_V2_PROMPT_VERSION,
        contractVersion: info.contractVersion ?? ANALYSIS_CONTRACT_VERSION,
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
          ...countRoutePolicies(outcome),
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
