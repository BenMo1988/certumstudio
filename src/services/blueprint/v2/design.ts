import { z } from "zod";
import { MAX_ITEMS } from "@/modules/training-blueprint/schema";
import {
  ActieV2Schema,
  DecisionPointV2Schema,
  LearningArcV2Schema,
  SourceNeedV2Schema,
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
  // De reikwijdte (scope) classificeert de provider nog niet: het Claude-contract blijft ongewijzigd. Zonder scope is een
  // sourceNeed `professional`. Classificatie door de provider volgt later, met eigen prompt en evals.
  sourceNeeds: z.array(SourceNeedV2Schema.omit({ scope: true })).max(MAX_ITEMS),
});

export type BlueprintV2DesignOutput = z.infer<typeof BlueprintV2DesignSchema>;

// Compile-time: het afgeleide schema en het compose-contract beschrijven exact hetzelfde ontwerp.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const designMatchesCompose: Same<BlueprintV2DesignOutput, BlueprintV2Design> = true;
void designMatchesCompose;
