import "server-only";
import { createBlockPlanService, createTrainingBlueprintServiceV21 } from "./factory";
import type { BlockPlanService, TrainingBlueprintServiceV21 } from "./services";

export type {
  BlockPlanService,
  BlueprintRequest,
  BlueprintRequestV21,
  TrainingBlueprintService,
  TrainingBlueprintServiceV2,
  TrainingBlueprintServiceV21,
} from "./services";

/**
 * De actieve Blueprint Generation: Blueprint Contract V2 met trusted routebeleid uit Analysis V2.1 (prompt
 * training-blueprint/v2.1), mock of Claude volgens CERTUM_BLUEPRINT_PROVIDER; standaard mock. De UI kent geen provider.
 * V2 (createTrainingBlueprintServiceV2) en V1 blijven bestaan als baseline, maar zijn niet meer aangesloten.
 */
export function getTrainingBlueprintService(): TrainingBlueprintServiceV21 {
  return createTrainingBlueprintServiceV21();
}

/** Block Plan Generation: mock of Claude volgens CERTUM_BLOCK_PLAN_PROVIDER (services/block-plan); standaard mock. */
export function getBlockPlanService(): BlockPlanService {
  return createBlockPlanService();
}
