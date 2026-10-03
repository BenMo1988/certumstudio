import { z } from "zod";
import { METHODOLOGY_STEPS, type MethodologyStepId } from "@/knowledge";

/*
 * Training Blueprint V1: de didactische waarheid van een training.
 *
 * Vraag: wat moet de deelnemer meemaken, doen, overwegen, leren en opnieuw kunnen toepassen?
 * Een Blueprint bevat ontwerpintenties, geen uiteindelijke content: geen dialogen, antwoordopties,
 * toetsvragen of uitgeschreven teksten. Tekstvelden zijn daarom bewust begrensd.
 *
 * De zes Certum-fasen zijn didactische functies, geen BC Online-bloktypen.
 */

/** Contractversie. Bewust een andere id dan de promptversie (training-blueprint/v1). */
export const TRAINING_BLUEPRINT_VERSION = "blueprint-contract/v1";

/** Maximale lengte van een intentie- of beschrijvingsveld: ruim genoeg voor een intentie, te kort voor content. */
export const MAX_INTENT_LENGTH = 600;
export const MAX_ITEMS = 3;

const intent = (description: string) => z.string().min(1).max(MAX_INTENT_LENGTH).describe(description);

export const AMBIGUITY = ["single_best_action", "multiple_defensible_actions"] as const;

/** Soort kennisbron die in de Bron-fase gevalideerd moet worden. Geen concrete bron. */
export const SOURCE_TYPES = [
  "wet_regelgeving",
  "richtlijn_protocol",
  "beroepscode",
  "methodiek",
  "wetenschappelijk_onderzoek",
  "organisatiebeleid",
  "nog_te_bepalen",
] as const;

export const PERFORMANCE_TYPES = ["gesprek_voeren", "keuze_maken_en_onderbouwen", "informatie_wegen", "schriftelijk_formuleren"] as const;

export const AssumptionSchema = z.strictObject({
  assumption: intent("Ontwerpaanname: een keuze van de ontwerper, geen feit uit de bron."),
  reason: intent("Waarom deze ontwerpaanname nodig is."),
});

export const SourceNeedSchema = z.strictObject({
  question: intent("Kennisvraag die in de Bron-fase gevalideerd moet worden."),
  sourceType: z.enum(SOURCE_TYPES),
  whyNeeded: intent("Waarom deze kennis nodig is voor de training."),
});

export const LearningArcSchema = z.strictObject({
  context: z.strictObject({
    participantKnows: intent("Wat de deelnemer minimaal weet."),
    deliberatelyUnknown: intent("Wat bewust nog onbekend blijft."),
    tensionArises: intent("Waar de professionele spanning ontstaat."),
  }),
  actie: z.strictObject({
    participantMust: intent("Wat de deelnemer moet kiezen, doen, zeggen of nalaten. Geen definitieve antwoordopties."),
    performanceType: z.enum(PERFORMANCE_TYPES),
  }),
  reflectie: z.strictObject({
    looksBackOn: intent("Waarop de deelnemer terugkijkt: de eigen gemaakte keuze."),
    explicitTradeOff: intent("Welke afweging expliciet gemaakt moet worden."),
  }),
  feedback: z.strictObject({
    respondsTo: intent("Waarop feedback reageert: handelen én afweging."),
    dimensions: z.array(intent("Dimensie van professioneel handelen.")).min(1).max(MAX_ITEMS),
    /** Verplicht bij multiple_defensible_actions; null bij single_best_action. */
    multipleDefensibleHandling: z.string().min(1).max(MAX_INTENT_LENGTH).nullable(),
  }),
  bron: z.strictObject({
    knowledgeQuestions: z.array(intent("Te valideren kennisvraag.")).max(MAX_ITEMS),
    sourceTypes: z.array(z.enum(SOURCE_TYPES)).max(MAX_ITEMS),
  }),
  toets: z.strictObject({
    demonstrate: intent("Wat opnieuw moet worden aangetoond."),
    transferEvidence: intent("Hoe transfer zichtbaar wordt."),
    newDecisionPoint: intent("Welk nieuw of vergelijkbaar professioneel keuzemoment passend kan zijn."),
  }),
});

export const TrainingBlueprintSchema = z.strictObject({
  version: z.literal(TRAINING_BLUEPRINT_VERSION),
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
  decisionPoint: intent("Eén concreet professioneel keuzemoment."),
  ambiguity: z.enum(AMBIGUITY),
  successCriteria: z.array(intent("Observeerbaar handelen of onderbouwen.")).min(1).max(MAX_ITEMS),
  assumptions: z.array(AssumptionSchema).max(MAX_ITEMS),
  sourceNeeds: z.array(SourceNeedSchema).max(MAX_ITEMS),
  learningArc: LearningArcSchema,
});

export type TrainingBlueprint = z.infer<typeof TrainingBlueprintSchema>;
export type Ambiguity = (typeof AMBIGUITY)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];
export type PerformanceType = (typeof PERFORMANCE_TYPES)[number];

/**
 * De zes Certum-fasen komen uit de methodiek (knowledge/methodology.ts), niet uit een eigen lijst.
 * De sleutels van learningArc zijn statisch; een test bewaakt dat ze exact gelijk zijn aan de methodiek.
 */
export const CERTUM_PHASES = METHODOLOGY_STEPS.map((step) => step.id) as [MethodologyStepId, ...MethodologyStepId[]];
export type CertumPhase = MethodologyStepId;
