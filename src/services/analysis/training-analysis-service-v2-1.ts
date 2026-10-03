import type { AnalysisOutcomeV21 } from "@/modules/training-agent/v2-1";
import type { AnalysisRequestV2 } from "./training-analysis-service-v2";

/**
 * Contract voor de Certum Analyse-engine, Analysis Contract V2.1. Zelfde eisen als V2 (geldige uitkomst,
 * `checkOutcomeInvariants` vóór teruggave, niets opslaan, geen inhoud loggen), met `routePolicy` per ready-richting.
 * Een V2.1-uitkomst is structureel ook een V2-uitkomst; de V2-interface blijft daarom bruikbaar voor de poorten.
 */
export interface TrainingAnalysisServiceV21 {
  analyze(request: AnalysisRequestV2): Promise<AnalysisOutcomeV21>;
}
