import { z } from "zod";
import {
  AMBIGUITY,
  AssumptionSchema,
  MAX_INTENT_LENGTH,
  MAX_ITEMS,
  PERFORMANCE_TYPES,
  SOURCE_TYPES,
  type Ambiguity,
} from "../schema";

/*
 * Blueprint Contract V2. Naast V1 (../schema.ts), dat ongewijzigd blijft als baseline (tag blueprint-v1-baseline).
 *
 * Alleen gewijzigd waar de V1-baseline bewijs gaf:
 * - ambiguïteit bepaalt de structuur: `decisionPoint` en `actie` dragen een `routePolicy`, die de server afleidt uit
 *   `ambiguity`; Feedback en Toets benoemen hun beoordelingsgrond als vaste categorieën;
 * - `sourceNeeds` (met ids SN1…) is de enige inhoudelijke bron van waarheid voor Bron; Bron verwijst er alleen naar.
 * Al het overige is gelijk aan V1.
 */

export const TRAINING_BLUEPRINT_V2_VERSION = "blueprint-contract/v2";

const intent = (description: string) => z.string().min(1).max(MAX_INTENT_LENGTH).describe(description);

/** Hoe het keuzemoment met routes omgaat. Wordt server-side afgeleid uit `ambiguity`, nooit door een provider gekozen. */
export const ROUTE_POLICIES = ["open_choice", "prescribed_action"] as const;
export type RoutePolicy = (typeof ROUTE_POLICIES)[number];

export function routePolicyFor(ambiguity: Ambiguity): RoutePolicy {
  return ambiguity === "multiple_defensible_actions" ? "open_choice" : "prescribed_action";
}

/**
 * De enige mapping van het routebeleid van een Analysis-richting (V2.1) naar de Blueprint-ambiguïteit. Exact de inverse
 * van `routePolicyFor`, zodat Analysis-routebeleid → ambiguïteit → routebeleid van keuzemoment en Actie één doorlopende
 * waarheid is.
 */
export function ambiguityFor(routePolicy: RoutePolicy): Ambiguity {
  return routePolicy === "open_choice" ? "multiple_defensible_actions" : "single_best_action";
}

/**
 * Waarop Feedback en Toets beoordelen. `voorgeschreven_handeling` (heeft de deelnemer de normatief gewenste handeling
 * uitgevoerd?) is alleen toegestaan bij `single_best_action`; bij meerdere verdedigbare routes is routekeuze nooit
 * een beoordelingsgrond.
 */
export const EVALUATION_BASES = [
  "afweging",
  "aansluiting_op_situatie",
  "onderbouwing",
  "proportionaliteit",
  "consequenties",
  "uitvoering",
  "voorgeschreven_handeling",
] as const;
export type EvaluationBasis = (typeof EVALUATION_BASES)[number];

const evaluationBasis = z
  .array(z.enum(EVALUATION_BASES))
  .min(1)
  .max(EVALUATION_BASES.length)
  .describe("Beoordelingsgronden; 'voorgeschreven_handeling' alleen bij single_best_action.");

export const SOURCE_NEED_ID = /^SN[1-9]$/;

/**
 * Reikwijdte van een kennisbehoefte (Full Training Pilot TR-0014):
 * - `professional`: publieke of professionele kennis; vereist een gevalideerde bron, anders blijft Bron `needs_source`;
 * - `organisation_specific`: de werkwijze van de eigen organisatie van de deelnemer. Zonder organisatiebron wordt er
 *   niets ingevuld of vervangen; het blijft zichtbaar als aandachtspunt, maar blokkeert een generieke training niet.
 * Optioneel en expliciet: een sourceNeed zonder scope (legacy) is `professional`. Nooit afgeleid uit tekst of trefwoorden.
 */
export const SOURCE_NEED_SCOPES = ["professional", "organisation_specific"] as const;
export type SourceNeedScope = (typeof SOURCE_NEED_SCOPES)[number];

export const SourceNeedV2Schema = z.strictObject({
  id: z.string().regex(SOURCE_NEED_ID).describe("Stabiele id: SN1, SN2, SN3 in volgorde."),
  question: intent("Kennisvraag die in de Bron-fase gevalideerd moet worden."),
  sourceType: z.enum(SOURCE_TYPES),
  whyNeeded: intent("Waarom deze kennis nodig is voor de training."),
  scope: z.enum(SOURCE_NEED_SCOPES).optional(),
});

/** De reikwijdte van een sourceNeed; zonder expliciete scope (legacy) altijd `professional`. */
export const sourceNeedScope = (need: { scope?: SourceNeedScope }): SourceNeedScope => need.scope ?? "professional";

export const DecisionPointV2Schema = z.strictObject({
  task: intent(
    "Wat de deelnemer in het keuzemoment moet kiezen of doen. Bij open_choice een open opdracht zonder voorgeschreven oplossing.",
  ),
  routePolicy: z.enum(ROUTE_POLICIES),
});

export const ActieV2Schema = z.strictObject({
  participantMust: intent("Wat de deelnemer moet kiezen, doen, zeggen of nalaten. Geen definitieve antwoordopties."),
  performanceType: z.enum(PERFORMANCE_TYPES),
  routePolicy: z.enum(ROUTE_POLICIES),
});

export const LearningArcV2Schema = z.strictObject({
  context: z.strictObject({
    participantKnows: intent("Wat de deelnemer minimaal weet."),
    deliberatelyUnknown: intent("Wat bewust nog onbekend blijft."),
    tensionArises: intent("Waar de professionele spanning ontstaat."),
  }),
  actie: ActieV2Schema,
  reflectie: z.strictObject({
    looksBackOn: intent("Waarop de deelnemer terugkijkt: de eigen gemaakte keuze."),
    explicitTradeOff: intent("Welke afweging expliciet gemaakt moet worden."),
  }),
  feedback: z.strictObject({
    respondsTo: intent("Waarop feedback reageert: handelen én afweging."),
    dimensions: z.array(intent("Dimensie van professioneel handelen.")).min(1).max(MAX_ITEMS),
    evaluationBasis,
    /** Verplicht bij multiple_defensible_actions; null bij single_best_action. */
    multipleDefensibleHandling: z.string().min(1).max(MAX_INTENT_LENGTH).nullable(),
  }),
  bron: z.strictObject({
    learningIntent: intent("Hoe gevalideerde kennis na het handelen de eerdere keuze verdiept. Geen kennisvragen."),
    sourceNeedRefs: z.array(z.string().regex(SOURCE_NEED_ID)).max(MAX_ITEMS).describe("Ids van sourceNeeds."),
  }),
  toets: z.strictObject({
    demonstrate: intent("Wat opnieuw moet worden aangetoond."),
    transferEvidence: intent("Hoe transfer zichtbaar wordt."),
    newDecisionPoint: intent("Welk nieuw of vergelijkbaar professioneel keuzemoment passend kan zijn."),
    evaluationBasis,
  }),
});

export const TrainingBlueprintV2Schema = z.strictObject({
  version: z.literal(TRAINING_BLUEPRINT_V2_VERSION),
  // Identiteit
  title: z.string().min(1).max(120),
  targetAudience: z.string().min(1).max(MAX_INTENT_LENGTH).nullable(),
  learningGoal: intent("Leerdoel, gekoppeld aan de gekozen trainingsrichting."),
  // Professionele kern
  professionalDilemma: intent("Het professionele dilemma uit de analyse."),
  selectedDirectionId: z.string().min(1),
  sourceRefs: z.array(z.string()).min(1),
  participantRole: intent("De rol van de deelnemer in de simulatie."),
  scenarioPremise: z.string().min(1).max(900),
  decisionPoint: DecisionPointV2Schema,
  ambiguity: z.enum(AMBIGUITY),
  successCriteria: z.array(intent("Observeerbaar handelen of onderbouwen.")).min(1).max(MAX_ITEMS),
  assumptions: z.array(AssumptionSchema).max(MAX_ITEMS),
  sourceNeeds: z.array(SourceNeedV2Schema).max(MAX_ITEMS),
  learningArc: LearningArcV2Schema,
});

export type TrainingBlueprintV2 = z.infer<typeof TrainingBlueprintV2Schema>;
export type SourceNeedV2 = z.infer<typeof SourceNeedV2Schema>;
