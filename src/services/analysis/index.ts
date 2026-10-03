import "server-only";
import { MockTrainingAnalysisService } from "./mock/mock-training-analysis-service";
import type { TrainingAnalysisService } from "./training-analysis-service";

export type { TrainingAnalysisService } from "./training-analysis-service";

/**
 * De enige plek waar gekozen wordt welke implementatie de analyse uitvoert.
 * Een echte provider (bijv. Claude) komt hier later achter, zonder dat
 * de rest van de app verandert.
 */
export function getTrainingAnalysisService(): TrainingAnalysisService {
  return new MockTrainingAnalysisService();
}
