import { z } from "zod";

/*
 * Certum Analyse: het ene runtime-schema.
 *
 * Bron van waarheid voor:
 * - de TypeScript-types (`InputAnalysis` e.d. via z.infer, zie types.ts);
 * - de outputstructuur die een AI-provider moet volgen (structured output);
 * - validatie van ontvangen analyses.
 *
 * Het schema bewaakt de vorm. Betekenis en businessregels staan in
 * analysis-rules.ts (checkAnalysisInvariants, getProceedBlocker).
 * De beschrijvingen (.describe) gaan mee naar de provider als veldtoelichting.
 */

export const MAX_TRAINING_DIRECTIONS = 3;

export const SuitabilityVerdictSchema = z
  .enum(["geschikt", "aanpassen", "ongeschikt"])
  .describe(
    "geschikt: bruikbaar zoals het is. aanpassen: bruikbaar, maar bijv. te breed, te weinig professioneel dilemma of eerst te anonimiseren. ongeschikt: geen professionele situatie of keuze; kan niet door.",
  );

export const PrivacyLevelSchema = z
  .enum(["geen", "aandachtspunt", "blokkeren"])
  .describe(
    "geen: geen privacyprobleem gedetecteerd. aandachtspunt: mogelijk herleidbaar, gebruiker moet het bewust beoordelen. blokkeren: direct herleidbare persoonsgegevens; kan niet door.",
  );

export const TrainingDirectionSchema = z.object({
  id: z.string().describe("Korte unieke slug in kleine letters, bijv. 'grens-stellen'."),
  title: z.string().describe("Korte titel van de trainingsrichting."),
  description: z.string().describe("Eén of twee zinnen: welke situatie en welke keuze staan centraal."),
  proposedLearningGoal: z.string().describe("Leerdoel voor deze richting, geformuleerd als 'De deelnemer kan ...'."),
});

export const InputAnalysisSchema = z.object({
  summary: z.string().describe("Korte zakelijke samenvatting van de ingevoerde situatie."),
  professionalDilemma: z.string().describe("Het centrale professionele dilemma: welke belangen of waarden staan tegenover elkaar."),
  proposedLearningGoal: z.string().describe("Voorgesteld leerdoel, geformuleerd als 'De deelnemer kan ...'."),
  targetAudience: z
    .string()
    .nullable()
    .describe("Voorgestelde doelgroep, alleen als die verantwoord uit de invoer af te leiden is; anders null."),
  suitability: z.object({
    verdict: SuitabilityVerdictSchema,
    explanation: z.string().describe("Korte toelichting op het oordeel."),
  }),
  trainingDirections: z
    .array(TrainingDirectionSchema)
    .min(1)
    .max(MAX_TRAINING_DIRECTIONS)
    .describe("1 tot maximaal 3 zinvolle trainingsrichtingen."),
  privacyAssessment: z.object({
    level: PrivacyLevelSchema,
    description: z
      .string()
      .nullable()
      .describe("Korte omschrijving van de bevinding, zonder de gevoelige gegevens zelf te herhalen; null bij 'geen'."),
  }),
  missingInformation: z
    .array(z.string())
    .describe("Relevante informatie die mogelijk ontbreekt; lege lijst als er niets ontbreekt."),
  rationale: z
    .string()
    .describe("Korte uitleg voor de gebruiker waarom deze analyse wordt voorgesteld (2-3 zinnen). Geen interne redenering."),
});
