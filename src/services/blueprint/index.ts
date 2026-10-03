import "server-only";
import { MockBlockPlanService } from "./mock/mock-block-plan-service";
import { MockTrainingBlueprintService } from "./mock/mock-blueprint-service";
import type { BlockPlanService, TrainingBlueprintService } from "./services";

export type { BlockPlanService, BlueprintRequest, TrainingBlueprintService } from "./services";

/**
 * V1: Blueprint en Block Plan worden alleen door mocks gemaakt. Er is bewust nog geen AI-provider of prompt;
 * die komt pas na beoordeling van contract, catalogus, UX en mockflow.
 */
export function getTrainingBlueprintService(): TrainingBlueprintService {
  return new MockTrainingBlueprintService();
}

export function getBlockPlanService(): BlockPlanService {
  return new MockBlockPlanService();
}
