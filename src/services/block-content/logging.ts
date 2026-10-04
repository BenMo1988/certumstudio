import { BLOCK_CONTENT_VERSION } from "@/modules/block-content/schema";
import { AnalysisError, type AnalysisErrorKind } from "../analysis/errors";
import { BlockContentValidationError, type BlockContentValidationStage } from "./diagnostics";
import type { BlockContentService } from "./services";

export interface BlockContentServiceInfo {
  provider: "mock" | "claude";
  model?: string;
  effort?: string;
  promptVersion?: string;
}

/**
 * Privacyveilige logregel voor één Block Content-generatie: alleen technische metadata. Nooit blokinhoud, Blueprint- of
 * plantekst, leerdoel, dilemma, instructies, vragen, opties of berichten.
 */
export interface BlockContentGenerationLogEntry {
  event: "certum.block_content_generation";
  provider: BlockContentServiceInfo["provider"];
  model?: string;
  effort?: string;
  promptVersion?: string;
  contentContractVersion: string;
  /** "block" voor een gepland blok; "frame" voor Vaste Start en Vast Einde. */
  target: "block" | "frame";
  plannedBlockId?: string;
  catalogBlockId?: string;
  certumPhase?: string;
  durationMs: number;
  outcome: "success" | "error";
  resultStatus?: string;
  estimatedMinutes?: number | null;
  errorKind?: AnalysisErrorKind | "unknown";
  validationStage?: BlockContentValidationStage;
  violationCodes?: string[];
}

type Logger = (entry: BlockContentGenerationLogEntry) => void;

const defaultLogger: Logger = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.outcome === "error") console.warn(line);
  else console.info(line);
};

/** Wikkelt iedere Block Content-implementatie in dezelfde metadata-logging. */
export function withBlockContentLogging(
  service: BlockContentService,
  info: BlockContentServiceInfo,
  log: Logger = defaultLogger,
): BlockContentService {
  const base = {
    event: "certum.block_content_generation" as const,
    provider: info.provider,
    ...(info.model && { model: info.model }),
    ...(info.effort && { effort: info.effort }),
    ...(info.promptVersion && { promptVersion: info.promptVersion }),
    contentContractVersion: BLOCK_CONTENT_VERSION,
  };
  const failure = (error: unknown) => ({
    outcome: "error" as const,
    errorKind: error instanceof AnalysisError ? error.kind : ("unknown" as const),
    ...(error instanceof BlockContentValidationError && { validationStage: error.stage, violationCodes: [...error.codes] }),
  });

  return {
    async generate(request) {
      const startedAt = performance.now();
      const planned = request.blockPlan.plannedBlocks.find((b) => b.id === request.plannedBlockId);
      const blockBase = {
        ...base,
        target: "block" as const,
        plannedBlockId: request.plannedBlockId,
        ...(planned && { catalogBlockId: planned.catalogBlockId, certumPhase: planned.certumPhase }),
      };
      try {
        const result = await service.generate(request);
        log({
          ...blockBase,
          durationMs: Math.round(performance.now() - startedAt),
          outcome: "success",
          resultStatus: result.body.status,
          estimatedMinutes: result.accreditation.estimatedMinutes,
        });
        return result;
      } catch (error) {
        log({ ...blockBase, durationMs: Math.round(performance.now() - startedAt), ...failure(error) });
        throw error;
      }
    },
    async generateFrame(request) {
      const startedAt = performance.now();
      try {
        const frame = await service.generateFrame(request);
        log({ ...base, target: "frame", durationMs: Math.round(performance.now() - startedAt), outcome: "success" });
        return frame;
      } catch (error) {
        log({ ...base, target: "frame", durationMs: Math.round(performance.now() - startedAt), ...failure(error) });
        throw error;
      }
    },
  };
}
