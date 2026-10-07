export {
  BC_ONLINE_BLOCK_PLAN_VERSION,
  BcOnlineBlockPlanSchema,
  type BcOnlineBlockPlan,
  type CapabilityGap,
  type PlannedBlock,
} from "./schema";
export { checkBlockPlanInvariants, type BlockPlanBlueprintSource, type BlockPlanViolation } from "./validation";
export {
  PlannedBlockAdditionSchema,
  PlannedBlockEditSchema,
  applyPlannedBlockAddition,
  applyPlannedBlockEdit,
  composeBlockPlan,
  type BlockPlanDesign,
  type PlannedBlockAddition,
  type PlannedBlockEdit,
} from "./compose";
