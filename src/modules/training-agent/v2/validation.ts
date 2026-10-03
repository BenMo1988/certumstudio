import { runPrivacyPreflight } from "@/modules/privacy";
import { AnalysisOutcomeSchema } from "./schema";
import type { AnalysisOutcome, SourceSegment } from "./types";

/** Codes voor overtreden businessregels. Bevatten bewust geen inhoud. */
export type OutcomeInvariantViolation =
  | "schema"
  | "lege-tekst"
  | "dubbele-id"
  | "onbekende-sourceref"
  | "dubbele-sourceref"
  | "privacywaarde-herhaald";

/**
 * Domeincontrole na ontvangst van een V2-uitkomst. Het schema bewaakt de vorm per uitkomst (incl. maxima);
 * deze functie bewaakt de businessregels:
 * - verplichte teksten zijn niet leeg;
 * - id's van richtingen en afbakeningen zijn uniek;
 * - iedere `sourceRef` bestaat in de werkelijk aangeleverde segmenten en komt per richting één keer voor;
 * - een provider-`blocked` herhaalt geen direct herkenbare waarden (lokale preflight op de eigen tekst).
 */
export function checkOutcomeInvariants(candidate: unknown, segments: SourceSegment[]): OutcomeInvariantViolation[] {
  const parsed = AnalysisOutcomeSchema.safeParse(candidate);
  if (!parsed.success) return ["schema"];
  const outcome: AnalysisOutcome = parsed.data;
  const violations = new Set<OutcomeInvariantViolation>();

  const texts: string[] = [];
  switch (outcome.outcome) {
    case "blocked":
      texts.push(outcome.reason, outcome.nextStep, ...outcome.privacyFindings.flatMap((p) => [p.category, p.description]));
      break;
    case "unsuitable":
      texts.push(outcome.summary, outcome.explanation, ...outcome.whatWouldMakeItSuitable);
      break;
    case "needs_adjustment":
      texts.push(
        outcome.summary,
        outcome.rationale,
        ...outcome.decisionRelevantGaps.flatMap((g) => [g.question, g.howItChangesTheDecision]),
        ...outcome.possibleScopings.flatMap((s) => [s.id, s.title, s.description, s.whatTheUserShouldAdd]),
        ...outcome.abstractionNotes.flatMap((a) => [a.feature, a.advice]),
      );
      if (new Set(outcome.possibleScopings.map((s) => s.id)).size !== outcome.possibleScopings.length) {
        violations.add("dubbele-id");
      }
      break;
    case "ready": {
      texts.push(
        outcome.summary,
        outcome.professionalDilemma,
        outcome.proposedLearningGoal,
        outcome.rationale,
        ...outcome.trainingDirections.flatMap((d) => [d.id, d.title, d.focus, d.proposedLearningGoal]),
        ...outcome.decisionRelevantGaps.flatMap((g) => [g.question, g.howItChangesTheDecision]),
        ...outcome.abstractionNotes.flatMap((a) => [a.feature, a.advice]),
        ...outcome.sourceCandidates.flatMap((c) => [c.term, c.whyPossiblyRelevant]),
      );
      if (new Set(outcome.trainingDirections.map((d) => d.id)).size !== outcome.trainingDirections.length) {
        violations.add("dubbele-id");
      }
      const known = new Set(segments.map((s) => s.id));
      for (const direction of outcome.trainingDirections) {
        if (direction.sourceRefs.some((ref) => !known.has(ref))) violations.add("onbekende-sourceref");
        if (new Set(direction.sourceRefs).size !== direction.sourceRefs.length) violations.add("dubbele-sourceref");
      }
      break;
    }
  }

  if (texts.some((t) => t.trim().length === 0)) violations.add("lege-tekst");

  if (outcome.outcome === "blocked") {
    const ownText = [outcome.reason, outcome.nextStep, ...outcome.privacyFindings.map((p) => p.description)].join("\n");
    if (runPrivacyPreflight(ownText).status === "blocked") violations.add("privacywaarde-herhaald");
  }

  return [...violations];
}
