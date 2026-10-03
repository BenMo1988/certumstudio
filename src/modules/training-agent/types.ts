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

/* ------------------------------------------------------------------ */
/* Certum Analyse                                                      */
/* Vaste flow: Input → Analyse → menselijke keuze → Training.          */
/* ------------------------------------------------------------------ */

/** Is de input bruikbaar als basis voor een praktijksimulatie? */
export type SuitabilityVerdict =
  /** Bruikbaar zoals het is. */
  | "geschikt"
  /** Bruikbaar, maar bijv. te breed, te weinig dilemma of eerst te anonimiseren. */
  | "aanpassen"
  /** Niet bruikbaar; kan niet door naar de volgende fase. */
  | "ongeschikt";

export interface SuitabilityAssessment {
  verdict: SuitabilityVerdict;
  /** Korte toelichting op het oordeel. */
  explanation: string;
}

export type PrivacyLevel =
  /** Geen privacyprobleem gedetecteerd. */
  | "geen"
  /** Mogelijk herleidbaar; de gebruiker moet het bewust beoordelen. */
  | "aandachtspunt"
  /** Herleidbare persoonsgegevens; kan niet door naar de volgende fase. */
  | "blokkeren";

export interface PrivacyAssessment {
  level: PrivacyLevel;
  /** Korte omschrijving van de bevinding; leeg bij "geen". */
  description?: string;
}

/** Een mogelijke uitwerking van de input tot training. */
export interface TrainingDirection {
  id: string;
  title: string;
  description: string;
  proposedLearningGoal: string;
}

export interface InputAnalysis {
  /** Korte zakelijke samenvatting van de ingevoerde situatie. */
  summary: string;
  /** Het centrale professionele dilemma. */
  professionalDilemma: string;
  proposedLearningGoal: string;
  /** Alleen gevuld als de doelgroep uit de input af te leiden is. */
  targetAudience?: string;
  suitability: SuitabilityAssessment;
  /** Minimaal 1 en maximaal 3 richtingen (max. bewaakt door `MAX_TRAINING_DIRECTIONS`). */
  trainingDirections: [TrainingDirection, ...TrainingDirection[]];
  privacyAssessment: PrivacyAssessment;
  /** Relevante informatie die mogelijk ontbreekt; leeg als er niets ontbreekt. */
  missingInformation: string[];
  /**
   * Korte uitleg voor de gebruiker waarom deze analyse wordt voorgesteld.
   * Geen opgeslagen interne redenering van een model.
   */
  rationale: string;
}
