import "server-only";
import { createTrainingAnalysisServiceV21 } from "./factory";
import type { TrainingAnalysisServiceV21 } from "./training-analysis-service-v2-1";

export { AnalysisError, type AnalysisErrorKind } from "./errors";
export type { TrainingAnalysisService } from "./training-analysis-service";
export type { AnalysisRequestV2, TrainingAnalysisServiceV2 } from "./training-analysis-service-v2";
export type { TrainingAnalysisServiceV21 } from "./training-analysis-service-v2-1";

/**
 * De actieve analyse-engine van de app: Analysis Contract V2.1 (training-analysis/v2.1), mock of Claude volgens
 * CERTUM_ANALYSIS_PROVIDER; zie config.ts. V2 (createTrainingAnalysisServiceV2) en V1 blijven bestaan als baseline,
 * maar zijn niet meer aangesloten.
 */
export function getTrainingAnalysisService(): TrainingAnalysisServiceV21 {
  return createTrainingAnalysisServiceV21();
}
