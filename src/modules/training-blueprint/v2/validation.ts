import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2/types";
import { TrainingBlueprintV2Schema, routePolicyFor, type TrainingBlueprintV2 } from "./schema";

/** Codes voor overtreden Blueprint V2-regels. Bevatten bewust geen inhoud. */
export type BlueprintV2Violation =
  | "schema"
  | "onbekende-richting"
  | "leerdoel-niet-gekoppeld"
  | "dilemma-gewijzigd"
  | "doelgroep-gewijzigd"
  | "onbekende-sourceref"
  | "sourceref-buiten-richting"
  | "ambiguiteit-zonder-behandeling"
  | "behandeling-zonder-ambiguiteit"
  | "routebeleid-inconsistent"
  | "voorgeschreven-route-bij-meerdere-routes"
  | "vaag-succescriterium"
  | "bronverwijzing-verzonnen"
  | "uitvoeringsblok-gekozen"
  | "sourceneed-id-ongeldig"
  | "bron-ref-onbekend"
  | "bron-ref-dubbel"
  | "sourceneed-niet-gebruikt"
  | "bron-kennisvraag-buiten-sourceneeds"
  | "aanname-sluit-context-uit";

// Gelijk aan V1 (../validation.ts), dat ongewijzigd blijft.
const VAGUE_CRITERION = /^\s*de deelnemer (begrijpt|weet|kent|beseft|snapt|is zich bewust)\b/i;
const CONCRETE_SOURCE = /https?:\/\/|www\.|\(\s*(19|20)\d{2}\s*\)|\bart(ikel)?\.?\s*\d+/i;
const EXECUTION_BLOCK = /\b(chat[\s-]?simulatie|conditionele logica|ai[\s-]feedback|bc online)\b/i;

/**
 * Formuleringen waarmee een aanname context uit de situatie haalt in plaats van een onbekende in te vullen
 * (zoals in de V1-baseline van BP-001). Bewust smal; de prompt en de evals dragen de rest van de regel.
 */
const EXCLUDES_CONTEXT =
  /\b(buiten beschouwing|niet als centra(al|le)|(speelt|spelen) (in deze simulatie )?(geen rol|niet)|(wordt|worden) niet (uitgewerkt|meegenomen|betrokken)|niet aanwezig|weggelaten|laten we weg)\b/i;

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

/**
 * Domeincontrole van een Blueprint V2 tegen de analyse waaruit hij ontstond. Naast de V1-regels:
 * - routebeleid: `decisionPoint.routePolicy` en `actie.routePolicy` volgen uit `ambiguity`;
 * - bij meerdere verdedigbare routes is `voorgeschreven_handeling` geen beoordelingsgrond in Feedback of Toets;
 * - `sourceNeeds` hebben ids SN1…SNn; Bron verwijst alleen naar bestaande ids, zonder dubbelingen, gebruikt elke
 *   sourceNeed en stelt zelf geen kennisvragen;
 * - aannames halen geen context uit de situatie.
 */
export function checkBlueprintV2Invariants(
  candidate: unknown,
  context: { analysis: ReadyOutcome; segments: SourceSegment[] },
): BlueprintV2Violation[] {
  const parsed = TrainingBlueprintV2Schema.safeParse(candidate);
  if (!parsed.success) return ["schema"];
  const blueprint: TrainingBlueprintV2 = parsed.data;
  const violations = new Set<BlueprintV2Violation>();

  // Trusted context
  const direction = context.analysis.trainingDirections.find((d) => d.id === blueprint.selectedDirectionId);
  if (!direction) return ["onbekende-richting"];
  if (blueprint.learningGoal !== direction.proposedLearningGoal) violations.add("leerdoel-niet-gekoppeld");
  if (blueprint.professionalDilemma !== context.analysis.professionalDilemma) violations.add("dilemma-gewijzigd");
  if (blueprint.targetAudience !== context.analysis.targetAudience) violations.add("doelgroep-gewijzigd");
  const known = new Set(context.segments.map((s) => s.id));
  if (blueprint.sourceRefs.some((ref) => !known.has(ref))) violations.add("onbekende-sourceref");
  if (blueprint.sourceRefs.some((ref) => !direction.sourceRefs.includes(ref))) violations.add("sourceref-buiten-richting");

  // Ambiguïteit bestuurt de structuur
  const multiple = blueprint.ambiguity === "multiple_defensible_actions";
  const handling = blueprint.learningArc.feedback.multipleDefensibleHandling;
  if (multiple && !handling) violations.add("ambiguiteit-zonder-behandeling");
  if (!multiple && handling) violations.add("behandeling-zonder-ambiguiteit");
  const policy = routePolicyFor(blueprint.ambiguity);
  if (blueprint.decisionPoint.routePolicy !== policy || blueprint.learningArc.actie.routePolicy !== policy) {
    violations.add("routebeleid-inconsistent");
  }
  const bases = [...blueprint.learningArc.feedback.evaluationBasis, ...blueprint.learningArc.toets.evaluationBasis];
  if (multiple && bases.includes("voorgeschreven_handeling")) violations.add("voorgeschreven-route-bij-meerdere-routes");

  // Succescriteria, bronnen, uitvoeringsblokken (als V1)
  if (blueprint.successCriteria.some((c) => VAGUE_CRITERION.test(c))) violations.add("vaag-succescriterium");
  const bronTexts = [
    ...blueprint.sourceNeeds.flatMap((n) => [n.question, n.whyNeeded]),
    blueprint.learningArc.bron.learningIntent,
  ];
  if (bronTexts.some((t) => CONCRETE_SOURCE.test(t))) violations.add("bronverwijzing-verzonnen");
  if (allStrings(blueprint).some((t) => EXECUTION_BLOCK.test(t))) violations.add("uitvoeringsblok-gekozen");

  // sourceNeeds zijn de enige kenniswaarheid; Bron verwijst ernaar
  const ids = blueprint.sourceNeeds.map((n) => n.id);
  if (ids.some((id, i) => id !== `SN${i + 1}`)) violations.add("sourceneed-id-ongeldig");
  const refs = blueprint.learningArc.bron.sourceNeedRefs;
  if (refs.some((ref) => !ids.includes(ref))) violations.add("bron-ref-onbekend");
  if (new Set(refs).size !== refs.length) violations.add("bron-ref-dubbel");
  if (ids.some((id) => !refs.includes(id))) violations.add("sourceneed-niet-gebruikt");
  if (blueprint.learningArc.bron.learningIntent.includes("?")) violations.add("bron-kennisvraag-buiten-sourceneeds");

  // Aannames vullen onbekenden in; ze halen geen context uit de situatie
  if (blueprint.assumptions.some((a) => EXCLUDES_CONTEXT.test(a.assumption))) violations.add("aanname-sluit-context-uit");

  return [...violations];
}
