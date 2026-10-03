import { buildBlueprintGenerationInput, type BlueprintGenerationInput } from "../generation-input";
import {
  TRAINING_BLUEPRINT_V2_VERSION,
  routePolicyFor,
  type TrainingBlueprintV2,
} from "./schema";

/** Provider-input voor V2: exact dezelfde inhoud als V1, met de V2-contractversie. */
export type BlueprintGenerationInputV2 = Omit<BlueprintGenerationInput, "contractVersion"> & {
  contractVersion: typeof TRAINING_BLUEPRINT_V2_VERSION;
};

export function buildBlueprintGenerationInputV2(
  args: Parameters<typeof buildBlueprintGenerationInput>[0],
): BlueprintGenerationInputV2 {
  return { ...buildBlueprintGenerationInput(args), contractVersion: TRAINING_BLUEPRINT_V2_VERSION };
}

/** Vaste velden: de provider genereert ze nooit. */
export type TrustedBlueprintV2Field =
  | "version"
  | "targetAudience"
  | "selectedDirectionId"
  | "learningGoal"
  | "professionalDilemma"
  | "sourceRefs";

/** Wat een provider ontwerpt: de Blueprint zonder vaste velden en zonder het (afgeleide) routebeleid. */
export type BlueprintV2Design = Omit<TrainingBlueprintV2, TrustedBlueprintV2Field | "decisionPoint" | "learningArc"> & {
  decisionPoint: Omit<TrainingBlueprintV2["decisionPoint"], "routePolicy">;
  learningArc: Omit<TrainingBlueprintV2["learningArc"], "actie"> & {
    actie: Omit<TrainingBlueprintV2["learningArc"]["actie"], "routePolicy">;
  };
};

/**
 * Stelt een volledige Blueprint V2 samen: trusted context, het ontwerp van de provider en het routebeleid dat de server
 * afleidt uit de gekozen ambiguïteit. Vaste en afgeleide velden worden als laatste gezet, zodat een ontwerp ze nooit
 * kan overschrijven. Daarna volgen Zod en `checkBlueprintV2Invariants`.
 */
export function composeTrainingBlueprintV2(design: BlueprintV2Design, input: BlueprintGenerationInputV2): TrainingBlueprintV2 {
  const routePolicy = routePolicyFor(design.ambiguity);
  return {
    ...design,
    decisionPoint: { ...design.decisionPoint, routePolicy },
    learningArc: { ...design.learningArc, actie: { ...design.learningArc.actie, routePolicy } },
    version: TRAINING_BLUEPRINT_V2_VERSION,
    targetAudience: input.professionalCore.targetAudience,
    selectedDirectionId: input.selectedDirection.id,
    learningGoal: input.selectedDirection.proposedLearningGoal,
    professionalDilemma: input.professionalCore.professionalDilemma,
    sourceRefs: [...input.selectedDirection.sourceRefs],
  };
}
