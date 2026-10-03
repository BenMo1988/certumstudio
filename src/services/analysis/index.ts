import "server-only";
import { createTrainingAnalysisService } from "./factory";
import type { TrainingAnalysisService } from "./training-analysis-service";

export { AnalysisError, type AnalysisErrorKind } from "./errors";
export type { TrainingAnalysisService } from "./training-analysis-service";

/**
 * De analyse-engine voor de app. Welke implementatie (mock of claude) volgt
 * uit CERTUM_ANALYSIS_PROVIDER; zie config.ts. De rest van de app kent alleen
 * het contract.
 */
export function getTrainingAnalysisService(): TrainingAnalysisService {
  return createTrainingAnalysisService();
}
