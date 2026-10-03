/*
 * Menselijke goedkeuringspoorten na de analyse.
 *
 * Volgorde: ready-analyse + gekozen richting → Blueprint → (mens keurt goed) → Block Plan → (mens keurt goed)
 * → later pas export naar BC Online via een adapter die nog niet bestaat.
 * Niets hiervan wordt nu persistent opgeslagen.
 */

export type ApprovalStatus = "concept" | "approved";

export interface ApprovalState {
  status: ApprovalStatus;
}

export type BlockPlanGenerationBlocker = "blueprint_not_approved";

/** Een Block Plan mag alleen ontstaan uit een door een mens goedgekeurde Blueprint. */
export function getBlockPlanGenerationBlocker(blueprint: ApprovalState): BlockPlanGenerationBlocker | null {
  return blueprint.status === "approved" ? null : "blueprint_not_approved";
}

export type ExportBlocker = "blueprint_not_approved" | "block_plan_not_approved" | "adapter_not_available";

/**
 * Toekomstige export naar BC Online: pas na beide menselijke goedkeuringen, en pas als de BC Online Adapter
 * bestaat. Die bestaat in V1 bewust nog niet, dus export is altijd geblokkeerd.
 */
export function getExportBlocker(blueprint: ApprovalState, blockPlan: ApprovalState): ExportBlocker {
  if (blueprint.status !== "approved") return "blueprint_not_approved";
  if (blockPlan.status !== "approved") return "block_plan_not_approved";
  return "adapter_not_available";
}
