import {
  CONTROLLED_TERMS,
  controlledTermRegex,
  type ControlledTermCategory,
} from "@/knowledge/controlled-terms";
import type { AnalysisOutcome } from "./types";

/** Een gecontroleerd begrip dat in een gebruikersgericht veld staat maar niet in de input. */
export interface EpistemicFlag {
  term: string;
  category: ControlledTermCategory;
  /** Veldpad, bijv. "professionalDilemma" of "trainingDirections[1].focus". Bevat geen inhoud. */
  field: string;
}

/** De gebruikersgerichte tekstvelden per uitkomst. `sourceCandidates` hoort hier bewust niet bij. */
export function userFacingFields(outcome: AnalysisOutcome): { field: string; text: string }[] {
  const f = (field: string, value: string | null | undefined) => (value ? [{ field, text: value }] : []);
  switch (outcome.outcome) {
    case "blocked":
      return [
        ...f("reason", outcome.reason),
        ...f("nextStep", outcome.nextStep),
        ...outcome.privacyFindings.flatMap((p, i) => f(`privacyFindings[${i}].description`, p.description)),
      ];
    case "unsuitable":
      return [
        ...f("summary", outcome.summary),
        ...f("explanation", outcome.explanation),
        ...outcome.whatWouldMakeItSuitable.flatMap((w, i) => f(`whatWouldMakeItSuitable[${i}]`, w)),
      ];
    case "needs_adjustment":
      return [
        ...f("summary", outcome.summary),
        ...f("provisionalProfessionalCore", outcome.provisionalProfessionalCore),
        ...outcome.decisionRelevantGaps.flatMap((g, i) => [
          ...f(`decisionRelevantGaps[${i}].question`, g.question),
          ...f(`decisionRelevantGaps[${i}].howItChangesTheDecision`, g.howItChangesTheDecision),
        ]),
        ...outcome.possibleScopings.flatMap((s, i) => [
          ...f(`possibleScopings[${i}].title`, s.title),
          ...f(`possibleScopings[${i}].description`, s.description),
          ...f(`possibleScopings[${i}].whatTheUserShouldAdd`, s.whatTheUserShouldAdd),
        ]),
        ...outcome.abstractionNotes.flatMap((a, i) => [
          ...f(`abstractionNotes[${i}].feature`, a.feature),
          ...f(`abstractionNotes[${i}].advice`, a.advice),
        ]),
        ...f("rationale", outcome.rationale),
      ];
    case "ready":
      return [
        ...f("summary", outcome.summary),
        ...f("professionalDilemma", outcome.professionalDilemma),
        ...f("proposedLearningGoal", outcome.proposedLearningGoal),
        ...f("targetAudience", outcome.targetAudience),
        ...outcome.trainingDirections.flatMap((d, i) => [
          ...f(`trainingDirections[${i}].title`, d.title),
          ...f(`trainingDirections[${i}].focus`, d.focus),
          ...f(`trainingDirections[${i}].proposedLearningGoal`, d.proposedLearningGoal),
        ]),
        ...outcome.decisionRelevantGaps.flatMap((g, i) => [
          ...f(`decisionRelevantGaps[${i}].question`, g.question),
          ...f(`decisionRelevantGaps[${i}].howItChangesTheDecision`, g.howItChangesTheDecision),
        ]),
        ...outcome.abstractionNotes.flatMap((a, i) => [
          ...f(`abstractionNotes[${i}].feature`, a.feature),
          ...f(`abstractionNotes[${i}].advice`, a.advice),
        ]),
        ...f("rationale", outcome.rationale),
      ];
  }
}

/**
 * Deterministische epistemische controle: welke gecontroleerde begrippen staan in gebruikersgerichte velden
 * zonder dat ze letterlijk in de input voorkomen? Blokkeert niets; het resultaat wordt zichtbaar gemarkeerd,
 * als aantal gelogd en in evals als harde bevinding behandeld. Niet uitputtend (zie controlled-terms).
 */
export function findEpistemicFlags(outcome: AnalysisOutcome, inputText: string): EpistemicFlag[] {
  const flags: EpistemicFlag[] = [];
  for (const term of CONTROLLED_TERMS) {
    const regex = controlledTermRegex(term);
    if (regex.test(inputText)) continue; // staat in de input: normaal gebruik toegestaan
    for (const { field, text } of userFacingFields(outcome)) {
      if (regex.test(text)) flags.push({ term: term.term, category: term.category, field });
    }
  }
  return flags;
}
