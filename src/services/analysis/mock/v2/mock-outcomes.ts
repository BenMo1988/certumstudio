import type {
  BlockedOutcome,
  NeedsAdjustmentOutcome,
  ReadyOutcome,
  SourceSegment,
  UnsuitableOutcome,
} from "@/modules/training-agent/v2";

/*
 * Fictieve, representatieve V2-uitkomsten voor de mockservice. Alleen gebruikt door
 * MockTrainingAnalysisServiceV2, nooit door de UI. Bevatten geen gecontroleerde begrippen in
 * gebruikersgerichte velden, behalve de bewuste #kader-variant.
 */

export const MOCK_V2_BLOCKED: BlockedOutcome = {
  outcome: "blocked",
  reason: "De input bevat direct herleidbare persoonsgegevens die de lokale controle niet heeft herkend.",
  privacyFindings: [
    { category: "naam", description: "Een volledige naam van een betrokkene." },
    { category: "adres", description: "Een adres dat naar een woning herleidbaar is." },
  ],
  nextStep: "Verwijder of vervang deze gegevens door algemene omschrijvingen en start de analyse opnieuw.",
};

export const MOCK_V2_UNSUITABLE: UnsuitableOutcome = {
  outcome: "unsuitable",
  summary: "De input beschrijft een routinematige informatieoverdracht die zonder bijzonderheden verloopt.",
  explanation:
    "Er is geen spanning tussen belangen en geen moment waarop de professional een betekenisvolle keuze maakt. Zonder zo'n keuzemoment is er geen basis voor een praktijksimulatie.",
  whatWouldMakeItSuitable: [
    "Een moment waarop de professional moet kiezen hoe hij of zij reageert.",
    "Een spanning tussen twee legitieme belangen of verwachtingen.",
  ],
};

export const MOCK_V2_NEEDS_ADJUSTMENT: NeedsAdjustmentOutcome = {
  outcome: "needs_adjustment",
  summary: "De input noemt een thema, maar beschrijft geen concrete situatie, betrokkenen of keuzemoment.",
  provisionalProfessionalCore: null,
  decisionRelevantGaps: [
    {
      question: "In welke beroepssituatie speelt dit thema?",
      affects: "dilemma",
      howItChangesTheDecision: "Zonder situatie is niet te bepalen welke afweging centraal staat.",
    },
    {
      question: "Voor welke professionals is de training bedoeld?",
      affects: "doelgroep",
      howItChangesTheDecision: "De doelgroep bepaalt welke keuzemomenten herkenbaar en relevant zijn.",
    },
  ],
  possibleScopings: [
    {
      id: "gesprek-met-client",
      title: "Een gesprek met een cliënt",
      description: "Voorstel: het thema afbakenen tot één gesprek waarin de professional moet kiezen hoe te reageren.",
      whatTheUserShouldAdd: "Wie de gesprekspartner is, wat er gebeurt en welke keuze de professional heeft.",
    },
    {
      id: "samenwerking-collega",
      title: "Samenwerking met een collega",
      description: "Voorstel: het thema afbakenen tot een situatie in de samenwerking binnen een team.",
      whatTheUserShouldAdd: "Welke afspraak of werkwijze ter discussie staat en wat de professional overweegt.",
    },
  ],
  abstractionNotes: [],
  rationale:
    "Het thema is relevant, maar zonder concrete situatie is er nog geen keuzemoment om te oefenen. Een afbakening maakt een gerichte analyse mogelijk.",
};

/** Ready-uitkomst; sourceRefs worden aan de werkelijk aangeleverde segmenten gekoppeld. */
export function mockV2Ready(segments: SourceSegment[], withControlledTerm = false): ReadyOutcome {
  const first = segments[0].id;
  const last = segments[segments.length - 1].id;
  const middle = segments[Math.floor(segments.length / 2)].id;
  return {
    outcome: "ready",
    summary: "Een professional staat in een gesprek voor een keuze tussen twee legitieme belangen.",
    professionalDilemma: withControlledTerm
      ? "Ruimte geven aan de wens van de betrokkene, tegenover de zorgplicht van de professional."
      : "Ruimte geven aan de wens van de betrokkene, tegenover de eigen professionele verantwoordelijkheid.",
    proposedLearningGoal:
      "De deelnemer kan in deze situatie de belangen benoemen, een onderbouwde keuze maken en die keuze transparant bespreken.",
    targetAudience: null,
    trainingDirections: [
      {
        id: "keuzemoment",
        title: "Het keuzemoment zelf",
        focus: "De keuze die de professional op dit moment in het gesprek moet maken.",
        proposedLearningGoal: "De deelnemer kan de opties wegen en een onderbouwde keuze maken.",
        sourceRefs: [last],
      },
      {
        id: "aanleiding",
        title: "De aanleiding bespreekbaar maken",
        focus: "Hoe de professional benoemt wat er in de situatie gebeurt.",
        proposedLearningGoal: "De deelnemer kan feitelijk en zonder oordeel benoemen wat hij of zij waarneemt.",
        sourceRefs: [...new Set([first, middle])],
      },
    ],
    decisionRelevantGaps: [
      {
        question: "Welke rol heeft de professional in deze situatie?",
        affects: "doelgroep",
        howItChangesTheDecision: "De rol bepaalt voor welke professionals de training herkenbaar is.",
      },
    ],
    abstractionNotes: [],
    sourceCandidates: [{ term: "meldcode", whyPossiblyRelevant: "Mogelijk relevant als er later zorgen over veiligheid ontstaan." }],
    rationale:
      "De input bevat een concreet moment waarop de professional moet kiezen. Dat is een goede basis voor een praktijksimulatie.",
  };
}
