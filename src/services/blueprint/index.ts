import "server-only";
import { createBlockPlanService, createTrainingBlueprintServiceV2 } from "./factory";
import type { BlockPlanService, TrainingBlueprintServiceV2 } from "./services";

export type { BlockPlanService, BlueprintRequest, TrainingBlueprintService, TrainingBlueprintServiceV2 } from "./services";

/**
 * De actieve Blueprint Generation: Blueprint Contract V2 (training-blueprint/v2), mock of Claude volgens
 * CERTUM_BLUEPRINT_PROVIDER (zie config.ts); standaard mock. De UI kent geen provider.
 * V1 (createTrainingBlueprintService) blijft bestaan als baseline, maar is niet meer aangesloten.
 */
export function getTrainingBlueprintService(): TrainingBlueprintServiceV2 {
  return createTrainingBlueprintServiceV2();
}

/** Block Plan Generation: alleen mock. Er is nog geen AI-provider of prompt voor het Block Plan. */
export function getBlockPlanService(): BlockPlanService {
  return createBlockPlanService();
}
