"use server";

import { parsePreflightAcknowledgement } from "@/modules/privacy";
import { MAX_INPUT_LENGTH, parseInputKind } from "@/modules/training-agent";
import { getBlockPlanService, getTrainingBlueprintService } from "@/services/blueprint";
import { runBlockPlanFlow, runBlueprintFlowV21, type BlockPlanFlowResult, type BlueprintFlowResultV2 } from "./blueprint-flow";

/**
 * Server Actions voor Blueprint en Block Plan. Alle invoer wordt hier opnieuw gevalideerd; de poorten worden
 * server-side afgedwongen in blueprint-flow.ts. Slaat niets op.
 */
export async function generateBlueprint(
  kind: unknown,
  text: unknown,
  acknowledgement: unknown,
  analysis: unknown,
  selectedDirectionId: unknown,
): Promise<BlueprintFlowResultV2> {
  const inputKind = parseInputKind(kind);
  if (!inputKind || typeof text !== "string" || typeof selectedDirectionId !== "string") {
    return { status: "rejected", reason: "invalid_analysis" };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INPUT_LENGTH) return { status: "rejected", reason: "input_gate" };
  return runBlueprintFlowV21(
    { kind: inputKind, text: trimmed },
    parsePreflightAcknowledgement(acknowledgement),
    analysis,
    selectedDirectionId,
    { getService: getTrainingBlueprintService },
  );
}

export async function generateBlockPlan(blueprint: unknown, blueprintApproved: unknown): Promise<BlockPlanFlowResult> {
  return runBlockPlanFlow(blueprint, { status: blueprintApproved === true ? "approved" : "concept" }, {
    getService: getBlockPlanService,
  });
}
