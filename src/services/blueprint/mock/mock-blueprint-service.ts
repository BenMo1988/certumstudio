import { composeTrainingBlueprint } from "@/modules/training-blueprint/compose";
import { buildBlueprintGenerationInput } from "@/modules/training-blueprint/generation-input";
import type { TrainingBlueprint } from "@/modules/training-blueprint/schema";
import type { BlueprintRequest, TrainingBlueprintService } from "../services";

/**
 * Mock Blueprint Generation. Doet geen echte didactische analyse en verzint geen nieuwe feiten:
 * kern, leerdoel en sourceRefs komen letterlijk uit de analyse en de gekozen richting.
 *
 * Mock-heuristieken (alleen om de flow te kunnen testen):
 * - ambiguïteit: multiple_defensible_actions als de focus van de richting een keuze tussen opties (" of ") of een open
 *   handelwijze ("kiest hoe") noemt; single_best_action alleen als de richting geen open keuze laat;
 * - prestatie: gesprek_voeren als de focus over reageren of een gesprek gaat, anders keuze_maken_en_onderbouwen;
 * - sourceNeeds: één generieke, te valideren kennisvraag over de afweging; nooit een bron.
 *
 * Gebruikt hetzelfde provider-inputcontract als de Claude-provider (geen sourceCandidates, geen andere richtingen) en
 * ontwerpt, net als Claude, alleen het ontwerp; de vaste velden komen uit composeTrainingBlueprint.
 */
export class MockTrainingBlueprintService implements TrainingBlueprintService {
  async generate(request: BlueprintRequest): Promise<TrainingBlueprint> {
    const input = buildBlueprintGenerationInput({
      inputKind: request.input.kind,
      analysis: request.analysis,
      segments: request.segments,
      selectedDirectionId: request.selectedDirectionId,
    });
    const { selectedDirection: direction, professionalCore: core } = input;

    // Open keuze: opties (" of ") of een open handelwijze ("kiest hoe", "bepalen hoe"). Eén beste route alleen als de
    // richting zelf geen open keuze laat.
    const multiple = / of |\b(kiest|kiezen|bepaalt|bepalen) hoe\b/i.test(direction.focus);
    // Hele woorden: "gezinsgesprek" (een geplande afspraak) is geen handelen in een gesprek.
    const conversational = /\b(reageert|reageren|gesprek|zegt|vraagt)\b/i.test(direction.focus);

    return composeTrainingBlueprint({
      title: direction.title,
      participantRole: "De deelnemer is de professional uit de beschreven situatie.",
      scenarioPremise: core.summary,
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
      sourceNeeds: [
        {
          question: "Welke gevalideerde kennis ondersteunt de professionele afweging in dit keuzemoment?",
          sourceType: "nog_te_bepalen",
          whyNeeded: "De Bron-fase moet de afweging na het handelen onderbouwen met gevalideerde kennis.",
        },
      ],
      learningArc: {
        context: {
          participantKnows: "De situatie zoals beschreven, tot en met het moment waarop de professional moet kiezen.",
          deliberatelyUnknown: "Hoe betrokkenen op de keuze zullen reageren en hoe de situatie zich daarna ontwikkelt.",
          tensionArises: core.professionalDilemma,
        },
        actie: {
          participantMust: direction.focus,
          performanceType: conversational ? "gesprek_voeren" : "keuze_maken_en_onderbouwen",
        },
        reflectie: {
          looksBackOn: "De eigen gemaakte keuze in het keuzemoment en het effect dat de deelnemer ervan verwacht.",
          explicitTradeOff: core.professionalDilemma,
        },
        feedback: {
          respondsTo: "Het handelen van de deelnemer én de onderbouwing van de gemaakte afweging.",
          dimensions: ["Afweging van de belangen uit het dilemma.", "Uitvoering en toon van het handelen."],
          multipleDefensibleHandling: multiple
            ? "Meerdere keuzes zijn verdedigbaar; feedback beoordeelt de kwaliteit van de afweging en de uitvoering, niet welke route is gekozen."
            : null,
        },
        bron: {
          knowledgeQuestions: ["Welke gevalideerde kennis ondersteunt deze afweging?"],
          sourceTypes: ["nog_te_bepalen"],
        },
        toets: {
          demonstrate: "Dezelfde professionele afweging maken en onderbouwen.",
          transferEvidence: "De deelnemer past de afweging toe in een vergelijkbare situatie met andere details.",
          newDecisionPoint: "Een vergelijkbaar keuzemoment in een andere, nieuwe situatie binnen hetzelfde werkveld.",
        },
      },
    }, input);
  }
}
