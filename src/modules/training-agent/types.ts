import type { z } from "zod";
import type {
  InputAnalysisSchema,
  PrivacyLevelSchema,
  SuitabilityVerdictSchema,
  TrainingDirectionSchema,
} from "./analysis-schema";

/**
 * De drie soorten input die de Certum Training Agent verwerkt.
 *
 * Of een casus voldoende geanonimiseerd is, wordt niet door de invoer
 * beweerd maar beoordeeld in de analyse (zie `PrivacyAssessment`).
 */
export type AgentInput =
  | { kind: "onderwerp"; text: string }
  | { kind: "praktijkvraag"; text: string }
  | { kind: "casus"; text: string };

/*
 * Certum Analyse. Vaste flow: Input → Analyse → menselijke keuze → Training.
 * De types volgen uit het runtime-schema in analysis-schema.ts, zodat type,
 * provider-output en validatie niet uit elkaar kunnen lopen.
 */
export type InputAnalysis = z.infer<typeof InputAnalysisSchema>;
export type TrainingDirection = z.infer<typeof TrainingDirectionSchema>;
export type SuitabilityVerdict = z.infer<typeof SuitabilityVerdictSchema>;
export type SuitabilityAssessment = InputAnalysis["suitability"];
export type PrivacyLevel = z.infer<typeof PrivacyLevelSchema>;
export type PrivacyAssessment = InputAnalysis["privacyAssessment"];
