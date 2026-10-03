import type { BlueprintGenerationInput } from "./generation-input";
import { TRAINING_BLUEPRINT_VERSION, type TrainingBlueprint } from "./schema";

/** De velden die vóór Blueprint Generation al vaststaan en die een provider nooit genereert. */
export type TrustedBlueprintField = "version" | "selectedDirectionId" | "learningGoal" | "professionalDilemma" | "sourceRefs";

/**
 * Stelt een volledige Blueprint samen: trusted context uit de gevalideerde analyse en gekozen richting, plus het
 * ontwerp van de provider. De trusted velden worden als laatste gezet, zodat een ontwerp ze nooit kan overschrijven.
 * Het resultaat is nog niet gevalideerd: daarna volgen Zod en `checkBlueprintInvariants`.
 */
export function composeTrainingBlueprint(
  design: Omit<TrainingBlueprint, TrustedBlueprintField>,
  input: BlueprintGenerationInput,
): TrainingBlueprint {
  return {
    ...design,
    version: TRAINING_BLUEPRINT_VERSION,
    selectedDirectionId: input.selectedDirection.id,
    learningGoal: input.selectedDirection.proposedLearningGoal,
    professionalDilemma: input.professionalCore.professionalDilemma,
    sourceRefs: [...input.selectedDirection.sourceRefs],
  };
}
