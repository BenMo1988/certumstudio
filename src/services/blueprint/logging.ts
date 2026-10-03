import { TRAINING_BLUEPRINT_VERSION, type Ambiguity } from "@/modules/training-blueprint/schema";
import type { AgentInput } from "@/modules/training-agent";
import { AnalysisError, type AnalysisErrorKind } from "../analysis/errors";
import type { BlueprintRequest } from "./services";

export interface BlueprintServiceInfo {
  provider: "mock" | "claude";
  model?: string;
  effort?: string;
  /** Alleen bij een provider met prompt. */
  promptVersion?: string;
  /** Contractversie van de gegenereerde Blueprint; standaard blueprint-contract/v1. */
  contractVersion?: string;
}

/** Wat de logging van een Blueprint leest: alleen de ambiguïteit en aantallen, nooit inhoud. */
interface LoggableBlueprint {
  ambiguity: Ambiguity;
  successCriteria: unknown[];
  assumptions: unknown[];
  sourceNeeds: unknown[];
}

/**
 * Privacyveilige logregel voor één Blueprint-generatie: alleen technische metadata en aantallen.
 * Nooit de input, analyse, segmenten, gekozen richting (ook de id niet: die is betekenisdragend), leerdoel,
 * dilemma, Blueprint-inhoud, sourceNeeds of aannames.
 */
export interface BlueprintGenerationLogEntry {
  event: "certum.blueprint_generation";
  provider: BlueprintServiceInfo["provider"];
  model?: string;
  effort?: string;
  promptVersion?: string;
  blueprintContractVersion: string;
  inputKind: AgentInput["kind"];
  durationMs: number;
  outcome: "success" | "error";
  errorKind?: AnalysisErrorKind | "unknown";
  ambiguity?: Ambiguity;
  successCriteria?: number;
  assumptions?: number;
  sourceNeeds?: number;
}

type Logger = (entry: BlueprintGenerationLogEntry) => void;

const defaultLogger: Logger = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.outcome === "error") console.warn(line);
  else console.info(line);
};

/** Wikkelt iedere Blueprint-implementatie in dezelfde metadata-logging. */
export function withBlueprintLogging<B extends LoggableBlueprint, R extends Pick<BlueprintRequest, "input"> = BlueprintRequest>(
  service: { generate(request: R): Promise<B> },
  info: BlueprintServiceInfo,
  log: Logger = defaultLogger,
): { generate(request: R): Promise<B> } {
  return {
    async generate(request) {
      const startedAt = performance.now();
      const base = {
        event: "certum.blueprint_generation" as const,
        provider: info.provider,
        ...(info.model && { model: info.model }),
        ...(info.effort && { effort: info.effort }),
        ...(info.promptVersion && { promptVersion: info.promptVersion }),
        blueprintContractVersion: info.contractVersion ?? TRAINING_BLUEPRINT_VERSION,
        inputKind: request.input.kind,
      };
      try {
        const blueprint = await service.generate(request);
        log({
          ...base,
          durationMs: Math.round(performance.now() - startedAt),
          outcome: "success",
          ambiguity: blueprint.ambiguity,
          successCriteria: blueprint.successCriteria.length,
          assumptions: blueprint.assumptions.length,
          sourceNeeds: blueprint.sourceNeeds.length,
        });
        return blueprint;
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
