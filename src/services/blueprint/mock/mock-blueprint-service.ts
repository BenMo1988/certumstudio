import { TRAINING_BLUEPRINT_VERSION, type TrainingBlueprint } from "@/modules/training-blueprint/schema";
import type { BlueprintRequest, TrainingBlueprintService } from "../services";

/**
 * Mock Blueprint Generation. Doet geen echte didactische analyse en verzint geen nieuwe feiten:
 * kern, leerdoel en sourceRefs komen letterlijk uit de analyse en de gekozen richting.
 *
 * Mock-heuristieken (alleen om de flow te kunnen testen):
 * - ambiguïteit: multiple_defensible_actions als de focus van de richting een keuze tussen opties noemt (" of ");
 * - prestatie: gesprek_voeren als de focus over reageren of een gesprek gaat, anders keuze_maken_en_onderbouwen;
 * - sourceNeeds: afgeleid van de (interne) sourceCandidates, als te valideren kennisvraag; nooit als bron.
 */
export class MockTrainingBlueprintService implements TrainingBlueprintService {
  async generate({ analysis, selectedDirectionId }: BlueprintRequest): Promise<TrainingBlueprint> {
    const direction = analysis.trainingDirections.find((d) => d.id === selectedDirectionId);
    if (!direction) throw new Error("Onbekende richting.");

    const multiple = / of /i.test(direction.focus);
    // Hele woorden: "gezinsgesprek" (een geplande afspraak) is geen handelen in een gesprek.
    const conversational = /\b(reageert|reageren|gesprek|zegt|vraagt)\b/i.test(direction.focus);

    return {
      version: TRAINING_BLUEPRINT_VERSION,
      title: direction.title,
      targetAudience: analysis.targetAudience,
      learningGoal: direction.proposedLearningGoal,
      professionalDilemma: analysis.professionalDilemma,
      selectedDirectionId: direction.id,
      sourceRefs: [...direction.sourceRefs],
      participantRole: "De deelnemer is de professional uit de beschreven situatie.",
      scenarioPremise: analysis.summary,
      decisionPoint: direction.focus,
      ambiguity: multiple ? "multiple_defensible_actions" : "single_best_action",
      successCriteria: [
        "De deelnemer maakt in het keuzemoment een concrete keuze en voert die zichtbaar uit.",
        "De deelnemer onderbouwt de keuze met omstandigheden uit de situatie en benoemt wat de keuze kost.",
      ],
      assumptions: [
        {
          assumption: "Ontwerpaanname: de deelnemer heeft dezelfde rol en handelingsruimte als de professional in de bron.",
          reason: "De bron beschrijft de rol niet volledig; zonder deze aanname is het keuzemoment niet te oefenen.",
        },
      ],
      sourceNeeds: analysis.sourceCandidates.map((candidate) => ({
        question: `Welke gevalideerde kennis over "${candidate.term}" is relevant voor deze afweging?`,
        sourceType: "nog_te_bepalen" as const,
        whyNeeded: candidate.whyPossiblyRelevant,
      })),
      learningArc: {
        context: {
          participantKnows: "De situatie zoals beschreven, tot en met het moment waarop de professional moet kiezen.",
          deliberatelyUnknown: "Hoe betrokkenen op de keuze zullen reageren en hoe de situatie zich daarna ontwikkelt.",
          tensionArises: analysis.professionalDilemma,
        },
        actie: {
          participantMust: direction.focus,
          performanceType: conversational ? "gesprek_voeren" : "keuze_maken_en_onderbouwen",
        },
        reflectie: {
          looksBackOn: "De eigen gemaakte keuze in het keuzemoment en het effect dat de deelnemer ervan verwacht.",
          explicitTradeOff: analysis.professionalDilemma,
        },
        feedback: {
          respondsTo: "Het handelen van de deelnemer én de onderbouwing van de gemaakte afweging.",
          dimensions: ["Afweging van de belangen uit het dilemma.", "Uitvoering en toon van het handelen."],
          multipleDefensibleHandling: multiple
            ? "Meerdere keuzes zijn verdedigbaar; feedback beoordeelt de kwaliteit van de afweging en de uitvoering, niet welke route is gekozen."
            : null,
        },
        bron: {
          knowledgeQuestions: analysis.sourceCandidates.map((c) => `Welke gevalideerde kennis over "${c.term}" ondersteunt deze afweging?`),
          sourceTypes: analysis.sourceCandidates.length > 0 ? ["nog_te_bepalen"] : [],
        },
        toets: {
          demonstrate: "Dezelfde professionele afweging maken en onderbouwen.",
          transferEvidence: "De deelnemer past de afweging toe in een vergelijkbare situatie met andere details.",
          newDecisionPoint: "Een vergelijkbaar keuzemoment in een andere, nieuwe situatie binnen hetzelfde werkveld.",
        },
      },
    };
  }
}
