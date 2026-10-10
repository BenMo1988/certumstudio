import { LEARNING_LINE_VERSION } from "@/modules/learning-lines";
import { AnalysisError, type AnalysisErrorKind } from "../analysis/errors";
import { LearningLineValidationError } from "./claude-learning-line-architect";
import type { LearningLineArchitectService } from "./services";

/**
 * Privacyveilige logregel voor één leerlijnontwerp: alleen technische metadata en aantallen. Nooit de prompt, de
 * revisie-aanwijzing of ontwerptekst.
 */
export interface LearningLineGenerationLogEntry {
  event: "certum.learning_line_generation";
  provider: "mock" | "claude";
  model?: string;
  effort?: string;
  promptVersion?: string;
  contractVersion: string;
  revision: boolean;
  durationMs: number;
  outcome: "success" | "error";
  errorKind?: AnalysisErrorKind | "unknown";
  validationStage?: LearningLineValidationError["stage"];
  violationCodes?: string[];
  modules?: number;
}

type Logger = (entry: LearningLineGenerationLogEntry) => void;

const defaultLogger: Logger = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.outcome === "error") console.warn(line);
  else console.info(line);
};

export function withLearningLineLogging(
  service: LearningLineArchitectService,
  info: { provider: "mock" | "claude"; model?: string; effort?: string; promptVersion?: string },
  log: Logger = defaultLogger,
): LearningLineArchitectService {
  return {
    async generate(request) {
      const startedAt = performance.now();
      const base = {
        event: "certum.learning_line_generation" as const,
        provider: info.provider,
        ...(info.model && { model: info.model }),
        ...(info.effort && { effort: info.effort }),
        ...(info.promptVersion && { promptVersion: info.promptVersion }),
        contractVersion: LEARNING_LINE_VERSION,
        revision: request.revision !== undefined,
      };
      try {
        const design = await service.generate(request);
        log({ ...base, durationMs: Math.round(performance.now() - startedAt), outcome: "success", modules: design.modules.length });
        return design;
      } catch (error) {
        log({
          ...base,
          durationMs: Math.round(performance.now() - startedAt),
          outcome: "error",
          errorKind: error instanceof AnalysisError ? error.kind : "unknown",
          ...(error instanceof LearningLineValidationError && { validationStage: error.stage, violationCodes: [...error.codes] }),
        });
        throw error;
      }
    },
  };
}
