import { z } from "zod";

/*
 * Analysis Contract V2: één runtime-schema (Zod) als bron voor types, structured output en validatie.
 *
 * De uitkomst bepaalt welke velden bestaan (discriminated union op `outcome`). Een ongeschikte of
 * geblokkeerde analyse kán daardoor structureel geen leerdoel of trainingsrichtingen bevatten.
 *
 * Structured output: de provider krijgt `{ result: AnalysisOutcome }` (object als root). De API dwingt de
 * veldsets per variant af (anyOf + additionalProperties: false); de SDK geeft `literal`/`enum` en maxima
 * alleen als beschrijving door. Deze Zod-schema's controleren die na ontvangst; businessregels staan in
 * validation.ts.
 */

export const ANALYSIS_CONTRACT_VERSION = "analysis-contract/v2";

/** Maximum voor alle keuzelijsten in het contract. */
export const MAX_LIST_ITEMS = 3;

export const DECISION_AREAS = ["geschiktheid", "dilemma", "leerdoel", "doelgroep", "richtingkeuze"] as const;

const text = (description: string) => z.string().describe(description);

export const DecisionRelevantGapSchema = z.strictObject({
  question: text("Vraag naar ontbrekende informatie."),
  affects: z.enum(DECISION_AREAS).describe("Welke beslissing het antwoord kan veranderen."),
  howItChangesTheDecision: text("Hoe een ander antwoord die beslissing concreet verandert."),
});

export const PossibleScopingSchema = z.strictObject({
  id: text("Korte unieke slug in kleine letters."),
  title: text("Korte titel van de afbakening."),
  description: text("Welke concrete situatie deze afbakening zou opleveren, als voorstel."),
  whatTheUserShouldAdd: text("Welke informatie de gebruiker aan de input moet toevoegen."),
});

export const AbstractionNoteSchema = z.strictObject({
  feature: text("Kenmerk van de input dat bij trainingsontwikkeling algemener moet, zonder het letterlijk te herhalen."),
  advice: text("Hoe het algemener kan."),
});

export const SourceCandidateSchema = z.strictObject({
  term: text("Mogelijk relevant kader, methodiek, richtlijn of wet voor de latere Bron-fase."),
  whyPossiblyRelevant: text("Waarom dit mogelijk relevant is, gekoppeld aan de input. Geen vaststelling."),
});

export const PrivacyFindingSchema = z.strictObject({
  category: text("Soort gegeven, bijv. 'naam' of 'adres'. Nooit de waarde zelf."),
  description: text("Algemene omschrijving zonder de gevoelige waarde te herhalen."),
});

export const TrainingDirectionV2Schema = z.strictObject({
  id: text("Korte unieke slug in kleine letters."),
  title: text("Korte titel van de trainingsrichting."),
  focus: text("De professionele keuze in de gerefereerde bronsegmenten; geen nieuwe gebeurtenissen."),
  proposedLearningGoal: text("Leerdoel voor deze richting: 'De deelnemer kan ...'."),
  sourceRefs: z
    .array(text("Id van een aangeleverd bronsegment, bijv. 'S2'."))
    .min(1)
    .describe("Bronsegmenten waarop deze richting is gebaseerd; minimaal één."),
});

export const BlockedOutcomeSchema = z.strictObject({
  outcome: z.literal("blocked"),
  reason: text("Algemene reden waarom verwerking stopt, zonder gevoelige waarden."),
  privacyFindings: z.array(PrivacyFindingSchema).min(1).max(10),
  nextStep: text("Wat de gebruiker nu moet doen."),
});

export const UnsuitableOutcomeSchema = z.strictObject({
  outcome: z.literal("unsuitable"),
  summary: text("Korte zakelijke samenvatting van de input."),
  explanation: text("Waarom er geen betekenisvol professioneel dilemma of keuzemoment is."),
  whatWouldMakeItSuitable: z.array(z.string()).min(1).max(MAX_LIST_ITEMS),
});

export const NeedsAdjustmentOutcomeSchema = z.strictObject({
  outcome: z.literal("needs_adjustment"),
  summary: text("Korte zakelijke samenvatting van de input."),
  provisionalProfessionalCore: z
    .string()
    .nullable()
    .describe("Voorlopige professionele kern, alleen als die verantwoord uit de input volgt; anders null."),
  decisionRelevantGaps: z.array(DecisionRelevantGapSchema).min(1).max(MAX_LIST_ITEMS),
  possibleScopings: z.array(PossibleScopingSchema).min(1).max(MAX_LIST_ITEMS),
  abstractionNotes: z.array(AbstractionNoteSchema).max(MAX_LIST_ITEMS),
  rationale: text("Korte uitleg voor de gebruiker (2-3 zinnen). Geen interne redenering."),
});

export const ReadyOutcomeSchema = z.strictObject({
  outcome: z.literal("ready"),
  summary: text("Korte zakelijke samenvatting; uitspraken blijven toegeschreven aan wie ze doet."),
  professionalDilemma: text("Het centrale professionele dilemma, alleen op basis van de input."),
  proposedLearningGoal: text("Voorgesteld leerdoel: 'De deelnemer kan ...'."),
  targetAudience: z
    .string()
    .nullable()
    .describe("Doelgroep, alleen als die verantwoord uit de input volgt; anders null."),
  trainingDirections: z.array(TrainingDirectionV2Schema).min(1).max(MAX_LIST_ITEMS),
  decisionRelevantGaps: z.array(DecisionRelevantGapSchema).max(MAX_LIST_ITEMS),
  abstractionNotes: z.array(AbstractionNoteSchema).max(MAX_LIST_ITEMS),
  sourceCandidates: z.array(SourceCandidateSchema).max(MAX_LIST_ITEMS),
  rationale: text("Korte uitleg voor de gebruiker (2-3 zinnen). Geen interne redenering."),
});

export const AnalysisOutcomeSchema = z.discriminatedUnion("outcome", [
  BlockedOutcomeSchema,
  UnsuitableOutcomeSchema,
  NeedsAdjustmentOutcomeSchema,
  ReadyOutcomeSchema,
]);

/** Wat de provider via structured output teruggeeft: een object als root, met de uitkomst in `result`. */
export const AnalysisResponseSchema = z.strictObject({ result: AnalysisOutcomeSchema });
