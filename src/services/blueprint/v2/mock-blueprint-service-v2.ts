import {
  buildBlueprintGenerationInputV2,
  composeTrainingBlueprintV2,
  type BlueprintGenerationInputV2,
  type BlueprintV2Design,
  type TrainingBlueprintV2,
} from "@/modules/training-blueprint/v2";
import type { BlueprintRequest, TrainingBlueprintServiceV2 } from "../services";

/**
 * Mock Blueprint Generation V2. Zelfde heuristieken als de V1-mock (ambiguïteit uit een open keuze in de focus,
 * prestatie uit gespreksmarkers), met de V2-structuur:
 * - bij meerdere routes een open opdracht in keuzemoment en Actie, zonder voorgeschreven handeling;
 * - één sourceNeed (SN1) waar Bron alleen naar verwijst;
 * - geen aannames die context uitsluiten.
 * Ontwerpt alleen het ontwerpdeel; vaste velden en routebeleid komen uit composeTrainingBlueprintV2.
 */
export class MockTrainingBlueprintServiceV2 implements TrainingBlueprintServiceV2 {
  async generate(request: BlueprintRequest): Promise<TrainingBlueprintV2> {
    const input = buildBlueprintGenerationInputV2({
      inputKind: request.input.kind,
      analysis: request.analysis,
      segments: request.segments,
      selectedDirectionId: request.selectedDirectionId,
    });
    // V2: de mock leidt de ambiguïteit af uit de focus (heuristiek). V2.1 krijgt haar trusted uit de analyse.
    const multiple = / of |\b(kiest|kiezen|bepaalt|bepalen) hoe\b/i.test(input.selectedDirection.focus);
    return composeTrainingBlueprintV2(buildMockBlueprintV2Design(input, multiple), input);
  }
}

/**
 * Mock-scenario: staat deze marker in de (synthetische) invoer, dan formuleert de mock drie kennisbehoeften, waarvan
 * SN3 inhoudelijk over de werkwijze van de eigen organisatie gaat (zoals in TR-0014). De mock classificeert de scope
 * niet: dat doet de opleider in de SourceNeed Scope Review. Alleen voor tests en browserbewijs.
 */
export const MOCK_ORGANISATION_SPECIFIC = "#organisatie";

/** Het mock-ontwerp voor een gegeven ambiguïteit; gedeeld door de V2- en de V2.1-mock. */
export function buildMockBlueprintV2Design(
  input: Pick<BlueprintGenerationInputV2, "selectedDirection" | "professionalCore">,
  multiple: boolean,
): BlueprintV2Design {
  const { selectedDirection: direction, professionalCore: core } = input;
  const organisationSpecific = JSON.stringify(input).includes(MOCK_ORGANISATION_SPECIFIC);
  const conversational = /\b(reageert|reageren|gesprek|zegt|vraagt)\b/i.test(direction.focus);

  return {
    title: direction.title,
    participantRole: "De deelnemer is de professional uit de beschreven situatie.",
    scenarioPremise: core.summary,
    decisionPoint: {
      task: multiple
        ? `In het keuzemoment zelf een route kiezen en uitvoeren. ${direction.focus}`
        : `In het keuzemoment de professioneel gewenste handeling uitvoeren. ${direction.focus}`,
    },
    ambiguity: multiple ? "multiple_defensible_actions" : "single_best_action",
    successCriteria: [
      "De deelnemer maakt in het keuzemoment een concrete keuze en voert die zichtbaar uit.",
      "De deelnemer onderbouwt de keuze met omstandigheden uit de situatie en benoemt wat de keuze kost.",
    ],
    assumptions: [
      {
        assumption: "De simulatie start op het moment waarop de professional moet kiezen.",
        reason: "Het exacte startmoment staat niet in de bron en is nodig om het keuzemoment te kunnen oefenen.",
      },
    ],
    sourceNeeds: [
      {
        id: "SN1",
        question: "Welke gevalideerde kennis ondersteunt de professionele afweging in dit keuzemoment?",
        sourceType: "nog_te_bepalen",
        whyNeeded: "De Bron-fase moet de afweging na het handelen onderbouwen met gevalideerde kennis.",
      },
      ...(organisationSpecific
        ? [
            {
              id: "SN2",
              question: "Welke gesprekstechnieken helpen om een oplopend gesprek te de-escaleren zonder de relatie te verliezen?",
              sourceType: "methodiek" as const,
              whyNeeded: "De deelnemer moet de uitvoering van het gesprek kunnen toetsen aan beproefde principes.",
            },
            {
              id: "SN3",
              question: "Welke interne werkwijze of afspraak geldt binnen de eigen organisatie voor deze situatie?",
              sourceType: "organisatiebeleid" as const,
              whyNeeded: "De handelingsruimte hangt mede af van de afspraken van de organisatie van de deelnemer.",
            },
          ]
        : []),
    ],
    learningArc: {
      context: {
        participantKnows: "De situatie zoals beschreven, tot en met het moment waarop de professional moet kiezen.",
        deliberatelyUnknown: "Hoe betrokkenen op de keuze zullen reageren en hoe de situatie zich daarna ontwikkelt.",
        tensionArises: core.professionalDilemma,
      },
      actie: {
        participantMust: multiple
          ? "Zelf een professioneel verdedigbare route kiezen en die uitvoeren; er is niet één voorgeschreven route."
          : "De professioneel gewenste handeling in het keuzemoment uitvoeren.",
        performanceType: conversational ? "gesprek_voeren" : "keuze_maken_en_onderbouwen",
      },
      reflectie: {
        looksBackOn: "De eigen gemaakte keuze in het keuzemoment en het effect dat de deelnemer ervan verwacht.",
        explicitTradeOff: core.professionalDilemma,
      },
      feedback: {
        respondsTo: "Het handelen van de deelnemer én de onderbouwing van de gemaakte afweging.",
        dimensions: ["Afweging van de belangen uit het dilemma.", "Uitvoering en toon van het handelen."],
        evaluationBasis: multiple ? ["afweging", "onderbouwing", "uitvoering"] : ["voorgeschreven_handeling", "uitvoering"],
        multipleDefensibleHandling: multiple
          ? "Meerdere keuzes zijn verdedigbaar; feedback beoordeelt de kwaliteit van de afweging en de uitvoering, niet welke route is gekozen."
          : null,
      },
      bron: {
        learningIntent: "Gevalideerde kennis na het handelen koppelen aan de eigen gemaakte afweging.",
        sourceNeedRefs: organisationSpecific ? ["SN1", "SN2", "SN3"] : ["SN1"],
      },
      toets: {
        demonstrate: "Dezelfde professionele afweging maken en onderbouwen.",
        transferEvidence: "De deelnemer past de afweging toe in een vergelijkbare situatie met andere details.",
        newDecisionPoint: "Een vergelijkbaar keuzemoment in een andere, nieuwe situatie binnen hetzelfde werkveld.",
        evaluationBasis: multiple ? ["afweging", "aansluiting_op_situatie"] : ["voorgeschreven_handeling"],
      },
    },
  };
}
