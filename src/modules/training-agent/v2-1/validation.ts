import { checkOutcomeInvariants, type AnalysisOutcome, type OutcomeInvariantViolation, type SourceSegment } from "../v2";
import { AnalysisOutcomeV21Schema, type AnalysisOutcomeV21 } from "./schema";

/** De V2-weergave van een V2.1-uitkomst: identiek, zonder routePolicy. */
export function toV2Outcome(outcome: AnalysisOutcomeV21): AnalysisOutcome {
  if (outcome.outcome !== "ready") return outcome;
  return {
    ...outcome,
    trainingDirections: outcome.trainingDirections.map((d) => ({
      id: d.id,
      title: d.title,
      focus: d.focus,
      proposedLearningGoal: d.proposedLearningGoal,
      sourceRefs: d.sourceRefs,
    })),
  };
}

/**
 * Domeinregels voor een V2.1-uitkomst: het V2.1-schema (incl. geldig routePolicy), daarna exact de V2-invarianten
 * (unieke ids, bestaande sourceRefs zonder dubbelingen, geen lege teksten, provider-blocked zonder waarden).
 * Er komen geen nieuwe regels bij; de samenhang focus ↔ routePolicy ↔ leerdoel wordt via prompt en evals beoordeeld.
 */
export function checkOutcomeInvariantsV21(candidate: unknown, segments: SourceSegment[]): OutcomeInvariantViolation[] {
  const parsed = AnalysisOutcomeV21Schema.safeParse(candidate);
  if (!parsed.success) return ["schema"];
  return checkOutcomeInvariants(toV2Outcome(parsed.data), segments);
}
