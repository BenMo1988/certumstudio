import type { AgentInput } from "@/modules/training-agent";
import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2";
import type { ReadyOutcomeV21 } from "@/modules/training-agent/v2-1";
import { toV2Outcome } from "@/modules/training-agent/v2-1";
import {
  buildBlueprintGenerationInputV2,
  composeTrainingBlueprintV2,
  type BlueprintGenerationInputV2,
  type BlueprintV2Design,
} from "./compose";
import { ambiguityFor, type RoutePolicy, type TrainingBlueprintV2 } from "./schema";

/*
 * Trusted routebeleid (prompt training-blueprint/v2.1, contract blijft blueprint-contract/v2).
 *
 * De ambiguïteit van de Blueprint wordt niet meer door de provider gekozen, maar server-side afgeleid uit het
 * routebeleid van de gekozen Analysis V2.1-richting (`ambiguityFor`). Daarna leidt `composeTrainingBlueprintV2` het
 * routebeleid van keuzemoment en Actie weer uit die ambiguïteit af:
 * Analysis routePolicy → Blueprint ambiguity → decisionPoint/Actie routePolicy.
 */

/** Provider-input V2.1: de V2-input plus het (trusted) routebeleid van de gekozen richting. */
export type BlueprintGenerationInputV21 = Omit<BlueprintGenerationInputV2, "selectedDirection"> & {
  selectedDirection: BlueprintGenerationInputV2["selectedDirection"] & { routePolicy: RoutePolicy };
};

/** Wat een V2.1-provider ontwerpt: het V2-ontwerp zonder ambiguïteit. */
export type BlueprintV21Design = Omit<BlueprintV2Design, "ambiguity">;

export function buildBlueprintGenerationInputV21(args: {
  inputKind: AgentInput["kind"];
  analysis: ReadyOutcomeV21;
  segments: SourceSegment[];
  selectedDirectionId: string;
}): BlueprintGenerationInputV21 {
  const direction = args.analysis.trainingDirections.find((d) => d.id === args.selectedDirectionId);
  if (!direction) throw new Error("Onbekende richting.");
  // Geen stille gok: zonder bewezen routebeleid is er geen V2.1-input.
  if (direction.routePolicy !== "open_choice" && direction.routePolicy !== "prescribed_action") {
    throw new Error("Richting zonder geldig routebeleid.");
  }
  const v2 = buildBlueprintGenerationInputV2({ ...args, analysis: toV2Outcome(args.analysis) as ReadyOutcome });
  return { ...v2, selectedDirection: { ...v2.selectedDirection, routePolicy: direction.routePolicy } };
}

/**
 * Stelt een volledige Blueprint V2 samen uit een V2.1-ontwerp: ambiguïteit uit het trusted routebeleid, daarna de
 * bestaande V2-samenstelling (vaste velden en afgeleid routebeleid). Een ambiguïteit in het ontwerp wordt altijd
 * overschreven. Daarna volgen Zod en `checkBlueprintV2Invariants`.
 */
export function composeTrainingBlueprintV21(design: BlueprintV21Design, input: BlueprintGenerationInputV21): TrainingBlueprintV2 {
  const ambiguity = ambiguityFor(input.selectedDirection.routePolicy);
  const { routePolicy: _trusted, ...direction } = input.selectedDirection;
  void _trusted;
  return composeTrainingBlueprintV2({ ...design, ambiguity }, { ...input, selectedDirection: direction });
}
