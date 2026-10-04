import { BC_ONLINE_CATALOG_VERSION } from "@/knowledge/platform/bc-online-block-catalog";
import { BC_ONLINE_BLOCK_PLAN_VERSION } from "@/modules/block-plan/schema";
import { AnalysisError, type AnalysisErrorKind } from "../analysis/errors";
import type { BlockPlanService } from "../blueprint/services";
import { BlockPlanValidationError, type BlockPlanValidationStage } from "./diagnostics";

export interface BlockPlanServiceInfo {
  provider: "mock" | "claude";
  model?: string;
  effort?: string;
  /** Alleen bij een provider met prompt. */
  promptVersion?: string;
}

/**
 * Privacyveilige logregel voor één Block Plan-generatie: alleen technische metadata en aantallen. Nooit Blueprint-tekst,
 * leerdoel, dilemma, configuratie-intenties, blokdoelen of sourceNeeds.
 */
export interface BlockPlanGenerationLogEntry {
  event: "certum.block_plan_generation";
  provider: BlockPlanServiceInfo["provider"];
  model?: string;
  effort?: string;
  promptVersion?: string;
  contractVersion: string;
  catalogVersion: string;
  blueprintVersion: string;
  durationMs: number;
  outcome: "success" | "error";
  errorKind?: AnalysisErrorKind | "unknown";
  /** Alleen bij invalid-output: de validatiefase en inhoudsvrije codes (violation codes of `<zod-code>@<veldpad>`). */
  validationStage?: BlockPlanValidationStage;
  violationCodes?: string[];
  plannedBlocks?: number;
  capabilityGaps?: number;
}

type Logger = (entry: BlockPlanGenerationLogEntry) => void;

const defaultLogger: Logger = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.outcome === "error") console.warn(line);
  else console.info(line);
};

/** Wikkelt iedere Block Plan-implementatie in dezelfde metadata-logging. */
export function withBlockPlanLogging(service: BlockPlanService, info: BlockPlanServiceInfo, log: Logger = defaultLogger): BlockPlanService {
  return {
    async generate(request) {
      const startedAt = performance.now();
      const base = {
        event: "certum.block_plan_generation" as const,
        provider: info.provider,
        ...(info.model && { model: info.model }),
        ...(info.effort && { effort: info.effort }),
        ...(info.promptVersion && { promptVersion: info.promptVersion }),
        contractVersion: BC_ONLINE_BLOCK_PLAN_VERSION,
        catalogVersion: BC_ONLINE_CATALOG_VERSION,
        blueprintVersion: request.blueprint.version,
      };
      try {
        const plan = await service.generate(request);
        log({
          ...base,
          durationMs: Math.round(performance.now() - startedAt),
          outcome: "success",
          plannedBlocks: plan.plannedBlocks.length,
          capabilityGaps: plan.capabilityGaps.length,
        });
        return plan;
      } catch (error) {
        log({
          ...base,
          durationMs: Math.round(performance.now() - startedAt),
          outcome: "error",
          errorKind: error instanceof AnalysisError ? error.kind : "unknown",
          ...(error instanceof BlockPlanValidationError && { validationStage: error.stage, violationCodes: [...error.codes] }),
        });
        throw error;
      }
    },
  };
}
