import { z } from "zod";
import {
  ActieV2Schema,
  DecisionPointV2Schema,
  LearningArcV2Schema,
  TrainingBlueprintV2Schema,
} from "@/modules/training-blueprint/v2/schema";
import type { BlueprintV2Design } from "@/modules/training-blueprint/v2";

/**
 * Wat een V2-provider werkelijk ontwerpt: het domeinschema V2 zonder vaste velden en zonder het routebeleid, dat de
 * server uit `ambiguity` afleidt. Volledig afgeleid met `.omit()`/`.extend()`, dus geen tweede handmatig bijgehouden
 * schema; alle objecten blijven strict.
 */
export const BlueprintV2DesignSchema = TrainingBlueprintV2Schema.omit({
  version: true,
  targetAudience: true,
  selectedDirectionId: true,
  learningGoal: true,
  professionalDilemma: true,
  sourceRefs: true,
  decisionPoint: true,
  learningArc: true,
}).extend({
  decisionPoint: DecisionPointV2Schema.omit({ routePolicy: true }),
  learningArc: LearningArcV2Schema.extend({ actie: ActieV2Schema.omit({ routePolicy: true }) }),
});

export type BlueprintV2DesignOutput = z.infer<typeof BlueprintV2DesignSchema>;

// Compile-time: het afgeleide schema en het compose-contract beschrijven exact hetzelfde ontwerp.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const designMatchesCompose: Same<BlueprintV2DesignOutput, BlueprintV2Design> = true;
void designMatchesCompose;
