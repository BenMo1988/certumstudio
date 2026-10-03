import { InputAnalysisSchema } from "./analysis-schema";

/** Codes voor overtreden businessregels. Bevatten bewust geen inhoud uit de analyse. */
export type AnalysisInvariantViolation =
  | "schema"
  | "lege-tekst"
  | "dubbele-richting-id"
  | "privacy-zonder-omschrijving";

/**
 * Domeincontrole na ontvangst van een analyse. Structured output garandeert
 * de vorm; deze functie bewaakt betekenis en businessregels. Wordt door
 * iedere provider-implementatie aangeroepen voordat een analyse de app in gaat.
 */
export function checkAnalysisInvariants(candidate: unknown): AnalysisInvariantViolation[] {
  const parsed = InputAnalysisSchema.safeParse(candidate);
  if (!parsed.success) return ["schema"];
  const analysis = parsed.data;
  const violations: AnalysisInvariantViolation[] = [];

  const requiredTexts = [
    analysis.summary,
    analysis.professionalDilemma,
    analysis.proposedLearningGoal,
    analysis.suitability.explanation,
    analysis.rationale,
    ...analysis.trainingDirections.flatMap((d) => [d.id, d.title, d.description, d.proposedLearningGoal]),
  ];
  if (requiredTexts.some((text) => text.trim().length === 0)) violations.push("lege-tekst");

  const ids = analysis.trainingDirections.map((direction) => direction.id);
  if (new Set(ids).size !== ids.length) violations.push("dubbele-richting-id");

  const { level, description } = analysis.privacyAssessment;
  if (level !== "geen" && !description?.trim()) violations.push("privacy-zonder-omschrijving");

  return violations;
}
