import type { AgentInput } from "@/modules/training-agent";
import type { AnalysisOutcome, SourceSegment } from "@/modules/training-agent/v2";

/** Wat een V2-engine krijgt: de input plus de server-side bepaalde bronsegmenten. */
export interface AnalysisRequestV2 {
  input: AgentInput;
  segments: SourceSegment[];
}

/**
 * Contract voor de Certum Analyse-engine, Analysis Contract V2.
 *
 * Provider-onafhankelijk. Eisen aan iedere implementatie:
 * - geeft een geldige `AnalysisOutcome` terug (exact één van blocked/unsuitable/needs_adjustment/ready);
 * - controleert die met `checkOutcomeInvariants` (o.a. bestaande sourceRefs) vóór teruggave;
 * - slaat de input niet op en logt geen inhoud.
 *
 * De v1-interface (`TrainingAnalysisService`) blijft naast deze versie bestaan.
 */
export interface TrainingAnalysisServiceV2 {
  analyze(request: AnalysisRequestV2): Promise<AnalysisOutcome>;
}
