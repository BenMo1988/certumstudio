import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2/types";
import { TrainingBlueprintSchema, type TrainingBlueprint } from "./schema";

/** Codes voor overtreden Blueprint-regels. Bevatten bewust geen inhoud. */
export type BlueprintViolation =
  | "schema"
  | "onbekende-richting"
  | "leerdoel-niet-gekoppeld"
  | "dilemma-gewijzigd"
  | "onbekende-sourceref"
  | "sourceref-buiten-richting"
  | "ambiguiteit-zonder-behandeling"
  | "behandeling-zonder-ambiguiteit"
  | "vaag-succescriterium"
  | "bronverwijzing-verzonnen";

/** Formuleringen die op begrip in plaats van observeerbaar handelen wijzen. */
const VAGUE_CRITERION = /^\s*de deelnemer (begrijpt|weet|kent|beseft|snapt|is zich bewust)\b/i;
/** Signalen van een concrete bron (URL, jaartal tussen haakjes, artikelnummer); die horen pas na validatie. */
const CONCRETE_SOURCE = /https?:\/\/|www\.|\(\s*(19|20)\d{2}\s*\)|\bart(ikel)?\.?\s*\d+/i;

/**
 * Domeincontrole van een Blueprint tegen de analyse waaruit hij ontstond.
 * - de gekozen richting bestaat in de `ready`-analyse;
 * - het leerdoel is het leerdoel van die richting; het dilemma is dat van de analyse;
 * - sourceRefs bestaan in de segmenten én horen bij de gekozen richting;
 * - multiple_defensible_actions vraagt een expliciete behandeling in de Feedback-intentie (en andersom);
 * - succescriteria zijn observeerbaar; Bron bevat geen concrete bronverwijzingen.
 */
export function checkBlueprintInvariants(
  candidate: unknown,
  context: { analysis: ReadyOutcome; segments: SourceSegment[] },
): BlueprintViolation[] {
  const parsed = TrainingBlueprintSchema.safeParse(candidate);
  if (!parsed.success) return ["schema"];
  const blueprint: TrainingBlueprint = parsed.data;
  const violations = new Set<BlueprintViolation>();

  const direction = context.analysis.trainingDirections.find((d) => d.id === blueprint.selectedDirectionId);
  if (!direction) return ["onbekende-richting"];

  if (blueprint.learningGoal !== direction.proposedLearningGoal) violations.add("leerdoel-niet-gekoppeld");
  if (blueprint.professionalDilemma !== context.analysis.professionalDilemma) violations.add("dilemma-gewijzigd");

  const known = new Set(context.segments.map((s) => s.id));
  if (blueprint.sourceRefs.some((ref) => !known.has(ref))) violations.add("onbekende-sourceref");
  if (blueprint.sourceRefs.some((ref) => !direction.sourceRefs.includes(ref))) violations.add("sourceref-buiten-richting");

  const handling = blueprint.learningArc.feedback.multipleDefensibleHandling;
  if (blueprint.ambiguity === "multiple_defensible_actions" && !handling) violations.add("ambiguiteit-zonder-behandeling");
  if (blueprint.ambiguity === "single_best_action" && handling) violations.add("behandeling-zonder-ambiguiteit");

  if (blueprint.successCriteria.some((c) => VAGUE_CRITERION.test(c))) violations.add("vaag-succescriterium");

  const bronTexts = [
    ...blueprint.sourceNeeds.flatMap((n) => [n.question, n.whyNeeded]),
    ...blueprint.learningArc.bron.knowledgeQuestions,
  ];
  if (bronTexts.some((t) => CONCRETE_SOURCE.test(t))) violations.add("bronverwijzing-verzonnen");

  return [...violations];
}
