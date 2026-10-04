import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { ApprovalState } from "@/modules/training-blueprint/gates";
import { deriveDuration, deriveReadiness, deriveUnresolvedRequirements } from "./compose";
import type { BlockContentResult, ReviewStatus, TrainingContentPackage } from "./schema";

/*
 * Menselijke poorten rond Block Content. Volgorde: Blueprint goedgekeurd → Block Plan goedgekeurd → inhoud per blok
 * (concept) → per blok goedkeuren of laten herzien. Niets hiervan wordt nu persistent opgeslagen.
 */

export type BlockContentGenerationBlocker = "blueprint_not_approved" | "block_plan_not_approved";

/** Block Content mag alleen ontstaan na beide menselijke goedkeuringen. */
export function getBlockContentGenerationBlocker(
  blueprint: ApprovalState,
  blockPlan: ApprovalState,
): BlockContentGenerationBlocker | null {
  if (blueprint.status !== "approved") return "blueprint_not_approved";
  if (blockPlan.status !== "approved") return "block_plan_not_approved";
  return null;
}

export type BlockApprovalBlocker = "not_generated";

/** Alleen gegenereerde inhoud kan worden goedgekeurd; een open bron-, asset- of capabilitybehoefte niet. */
export function getBlockApprovalBlocker(block: BlockContentResult): BlockApprovalBlocker | null {
  return block.body.status === "generated" ? null : "not_generated";
}

/** Herberekent alle afgeleide velden van het pakket na een wijziging in de blokken. */
function withBlocks(pkg: TrainingContentPackage, plan: BcOnlineBlockPlan, blocks: BlockContentResult[]): TrainingContentPackage {
  const ordered = [...blocks].sort((a, b) => a.sequence - b.sequence);
  return {
    ...pkg,
    blocks: ordered,
    start: { ...pkg.start, estimatedDurationMinutes: deriveDuration(plan, ordered) },
    unresolvedRequirements: deriveUnresolvedRequirements(plan, ordered),
    readiness: deriveReadiness(plan, ordered),
  };
}

/**
 * Zet de reviewstatus van één blok. Goedkeuren kan alleen bij gegenereerde inhoud (zie `getBlockApprovalBlocker`);
 * anders blijft het pakket ongewijzigd. `needs_revision` en terug naar `draft` kunnen altijd.
 */
export function setBlockReviewStatus(
  pkg: TrainingContentPackage,
  plan: BcOnlineBlockPlan,
  plannedBlockId: string,
  reviewStatus: ReviewStatus,
): TrainingContentPackage {
  const block = pkg.blocks.find((b) => b.plannedBlockId === plannedBlockId);
  if (!block) return pkg;
  if (reviewStatus === "approved" && getBlockApprovalBlocker(block) !== null) return pkg;
  return withBlocks(pkg, plan, pkg.blocks.map((b) => (b === block ? { ...b, reviewStatus } : b)));
}

/** Vervangt (of voegt toe) het resultaat van één blok na (her)generatie. Nieuwe inhoud is altijd weer `draft`. */
export function replaceBlockContent(
  pkg: TrainingContentPackage,
  plan: BcOnlineBlockPlan,
  result: BlockContentResult,
): TrainingContentPackage {
  const others = pkg.blocks.filter((b) => b.plannedBlockId !== result.plannedBlockId);
  return withBlocks(pkg, plan, [...others, { ...result, reviewStatus: "draft" }]);
}
