import "server-only";
import { createBlockPlanService, createTrainingBlueprintService } from "./factory";
import type { BlockPlanService, TrainingBlueprintService } from "./services";

export type { BlockPlanService, BlueprintRequest, TrainingBlueprintService } from "./services";

/**
 * Blueprint Generation: mock of Claude volgens CERTUM_BLUEPRINT_PROVIDER (zie config.ts); standaard mock.
 * De UI kent geen provider.
 */
export function getTrainingBlueprintService(): TrainingBlueprintService {
  return createTrainingBlueprintService();
}

/** Block Plan Generation: alleen mock. Er is nog geen AI-provider of prompt voor het Block Plan. */
export function getBlockPlanService(): BlockPlanService {
  return createBlockPlanService();
}
