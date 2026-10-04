"use server";

import { getBlockContentService } from "@/services/block-content";
import { runBlockRegenerationFlow, runTrainingContentFlow, type BlockRegenerationResult, type ContentFlowResult } from "./content-flow";

/**
 * Server Actions voor Block Content. Alle invoer wordt opnieuw gevalideerd; de poorten staan in content-flow.ts.
 * Slaat niets op.
 */
const approval = (approved: unknown) => ({ status: approved === true ? ("approved" as const) : ("concept" as const) });

export async function generateTrainingContent(
  blueprint: unknown,
  blueprintApproved: unknown,
  blockPlan: unknown,
  blockPlanApproved: unknown,
): Promise<ContentFlowResult> {
  return runTrainingContentFlow(blueprint, approval(blueprintApproved), blockPlan, approval(blockPlanApproved), {
    getService: getBlockContentService,
  });
}

export async function regenerateBlockContent(
  blueprint: unknown,
  blueprintApproved: unknown,
  blockPlan: unknown,
  blockPlanApproved: unknown,
  plannedBlockId: unknown,
  earlierContent: unknown,
): Promise<BlockRegenerationResult> {
  return runBlockRegenerationFlow(
    blueprint,
    approval(blueprintApproved),
    blockPlan,
    approval(blockPlanApproved),
    plannedBlockId,
    earlierContent,
    { getService: getBlockContentService },
  );
}
