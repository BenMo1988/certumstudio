import { z } from "zod";
import type { BlockPlanDesign } from "@/modules/block-plan/compose";
import { BcOnlineBlockPlanSchema, PlannedBlockSchema } from "@/modules/block-plan/schema";

/**
 * Wat een Block Plan-provider werkelijk ontwerpt: het domeinschema `bc-online-block-plan/v1` zonder de velden die uit
 * de goedgekeurde Blueprint of vaste Certum-regels volgen. Volledig afgeleid met `.omit()`/`.pick()`/`.extend()`, dus
 * geen tweede handmatig schema; alle objecten blijven strict. `catalogBlockId` blijft de enum van planbare
 * catalogus-ids, zodat structured output een onbekend blok al uitsluit.
 */
const shape = BcOnlineBlockPlanSchema.shape;

export const BlockPlanDesignSchema = BcOnlineBlockPlanSchema.omit({
  version: true,
  blueprintVersion: true,
  courseShell: true,
  startIntent: true,
  plannedBlocks: true,
}).extend({
  courseShell: shape.courseShell.pick({ description: true }),
  startIntent: shape.startIntent.pick({ explanationIntent: true }),
  plannedBlocks: z.array(PlannedBlockSchema.omit({ id: true, sequence: true })).min(1).max(20),
});

export type BlockPlanDesignOutput = z.infer<typeof BlockPlanDesignSchema>;

// Compile-time: het afgeleide schema en het compose-contract beschrijven exact hetzelfde ontwerp.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const designMatchesCompose: Same<BlockPlanDesignOutput, BlockPlanDesign> = true;
void designMatchesCompose;
