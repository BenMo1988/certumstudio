/**
 * De drie soorten input die de Certum Training Agent (later) verwerkt.
 *
 * Alleen types: de agent zelf is nog niet gebouwd.
 */
export type AgentInput =
  | { kind: "onderwerp"; text: string }
  | { kind: "praktijkvraag"; text: string }
  | { kind: "casus"; text: string; anonymized: true };

/**
 * Resultaat van de analysestap. De agent bepaalt eerst dilemma en leerdoel
 * en bouwt pas daarna de training.
 */
export interface InputAnalysis {
  dilemma: string;
  learningGoal: string;
}
