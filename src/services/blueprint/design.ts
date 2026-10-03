import { z } from "zod";
import { TrainingBlueprintSchema } from "@/modules/training-blueprint/schema";

/**
 * Wat een provider werkelijk ontwerpt: het domeinschema min de velden die vóór Blueprint Generation al
 * betrouwbaar vaststaan. Afgeleid met `.omit()`, dus geen tweede handmatig bijgehouden schema; het blijft strict,
 * zodat een provider de vaste velden ook niet ongevraagd kan meesturen.
 *
 * De vaste velden (contractversie, doelgroep, gekozen richting, leerdoel, dilemma, sourceRefs) voegt de server toe met
 * `composeTrainingBlueprint` (modules/training-blueprint/compose.ts).
 */
export const BlueprintDesignSchema = TrainingBlueprintSchema.omit({
  version: true,
  targetAudience: true,
  selectedDirectionId: true,
  learningGoal: true,
  professionalDilemma: true,
  sourceRefs: true,
});

export type BlueprintDesign = z.infer<typeof BlueprintDesignSchema>;
