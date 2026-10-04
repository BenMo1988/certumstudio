import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import blueprints from "./fixtures/approved-blueprints.json";
import plans from "./fixtures/approved-block-plans.json";

/** Alleen voor tests: goedgekeurde Blueprints en Block Plans uit de BLP-evals (synthetische data). */
export type PlanCaseId = "BLP-001" | "BLP-002" | "BLP-003" | "BLP-001-MEDIA" | "BLP-002-UNPROVEN-FEEDBACK";

type PlanCase = { blueprint: string; plan: BcOnlineBlockPlan };

export function fixtureCase(id: PlanCaseId): { blueprint: TrainingBlueprintV2; blockPlan: BcOnlineBlockPlan } {
  const planCase = (plans.cases as unknown as Record<PlanCaseId, PlanCase>)[id];
  const blueprint = (blueprints.cases as unknown as Record<string, { blueprint: TrainingBlueprintV2 }>)[planCase.blueprint].blueprint;
  return { blueprint: structuredClone(blueprint), blockPlan: structuredClone(planCase.plan) };
}
