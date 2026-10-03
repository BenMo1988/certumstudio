import type { AnalysisOutcome } from "./types";

/** Waarom (nog) niet door kan worden gegaan naar Training Generation. */
export type ProceedBlockerV2 =
  | "preflight"
  | "data_policy"
  | "not_ready"
  | "geen-richting"
  | "onbekende-richting";

/** Uitkomst van de poorten vóór de analyse, zoals de server die heeft vastgesteld. */
export interface InputGateState {
  preflightPassed: boolean;
  syntheticDataAttested: boolean;
}

/**
 * De centrale domeinpoort naar Training Generation. Alleen `ready` met een werkelijk bestaande, gekozen
 * richting, na een geslaagde preflight en een geldige synthetic-only-attestatie, mag door. Iedere andere
 * uitkomst stopt hier.
 *
 * De UI gebruikt deze regel voor directe feedback; een toekomstige server-side stap ("training opbouwen")
 * moet dezelfde regel opnieuw toepassen en mag nooit alleen op de UI vertrouwen.
 */
export function getProceedBlockerV2(
  outcome: AnalysisOutcome,
  selectedDirectionId: string | null,
  gate: InputGateState,
): ProceedBlockerV2 | null {
  if (!gate.preflightPassed) return "preflight";
  if (!gate.syntheticDataAttested) return "data_policy";
  if (outcome.outcome !== "ready") return "not_ready";
  if (selectedDirectionId === null) return "geen-richting";
  if (!outcome.trainingDirections.some((d) => d.id === selectedDirectionId)) return "onbekende-richting";
  return null;
}
