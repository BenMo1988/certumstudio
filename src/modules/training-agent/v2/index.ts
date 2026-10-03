/*
 * Analysis Contract V2. Naast v1 (../analysis-schema.ts e.a.), dat ongewijzigd blijft als historische baseline.
 * `getProceedBlockerV2` en `segmentInput` zijn zonder Zod bruikbaar in de UI.
 */
export type * from "./types";
export type { EpistemicFlag } from "./epistemic";
export type { ProceedBlockerV2, InputGateState } from "./rules";
export type { OutcomeInvariantViolation } from "./validation";
export {
  ANALYSIS_CONTRACT_VERSION,
  AnalysisOutcomeSchema,
  AnalysisResponseSchema,
  DECISION_AREAS,
  MAX_LIST_ITEMS,
} from "./schema";
export { SEGMENTATION_VERSION, segmentInput } from "./segments";
export { findEpistemicFlags, userFacingFields } from "./epistemic";
export { getProceedBlockerV2 } from "./rules";
export { checkOutcomeInvariants } from "./validation";
