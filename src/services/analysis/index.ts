import "server-only";
import { createTrainingAnalysisServiceV2 } from "./factory";
import type { TrainingAnalysisServiceV2 } from "./training-analysis-service-v2";

export { AnalysisError, type AnalysisErrorKind } from "./errors";
export type { TrainingAnalysisService } from "./training-analysis-service";
export type { AnalysisRequestV2, TrainingAnalysisServiceV2 } from "./training-analysis-service-v2";

/**
 * De actieve analyse-engine van de app: Analysis Contract V2 (training-analysis/v2).
 * Welke implementatie (mock of claude) volgt uit CERTUM_ANALYSIS_PROVIDER; zie config.ts.
 * De v1-implementaties blijven bestaan (createTrainingAnalysisService) maar zijn niet meer aangesloten.
 */
export function getTrainingAnalysisService(): TrainingAnalysisServiceV2 {
  return createTrainingAnalysisServiceV2();
}
