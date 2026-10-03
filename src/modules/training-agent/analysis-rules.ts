import type { InputAnalysis } from "./types";

export const MAX_TRAINING_DIRECTIONS = 3;

/** Maximale lengte van ingevoerde tekst, in tekens. */
export const MAX_INPUT_LENGTH = 10_000;

/** Waarom een analyse (nog) niet door kan naar de volgende fase. */
export type ProceedBlocker =
  | "privacy"
  | "ongeschikt"
  | "geen-richting"
  | "onbekende-richting";

/**
 * Bepaalt of de gekozen trainingsrichting gebruikt mag worden.
 *
 * Dit is de enige plek waar die regel staat. UI en (later) de server-kant van
 * de volgende fase roepen allebei deze functie aan, zodat een privacyblokkade
 * of een ongeschikte input op geen enkele route omzeild kan worden.
 * Volgorde = prioriteit: privacy weegt het zwaarst.
 */
export function getProceedBlocker(
  analysis: InputAnalysis,
  selectedDirectionId: string | null,
): ProceedBlocker | null {
  if (analysis.privacyAssessment.level === "blokkeren") return "privacy";
  if (analysis.suitability.verdict === "ongeschikt") return "ongeschikt";
  if (selectedDirectionId === null) return "geen-richting";
  if (!analysis.trainingDirections.some((direction) => direction.id === selectedDirectionId)) {
    return "onbekende-richting";
  }
  return null;
}

/** True als de analyse als geheel geblokkeerd is, ongeacht de gekozen richting. */
export function isAnalysisBlocked(analysis: InputAnalysis): boolean {
  const blocker = getProceedBlocker(analysis, analysis.trainingDirections[0].id);
  return blocker === "privacy" || blocker === "ongeschikt";
}
