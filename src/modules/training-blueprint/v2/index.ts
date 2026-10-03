/*
 * Blueprint Contract V2 (blueprint-contract/v2). Naast V1 (../index.ts), dat ongewijzigd blijft als baseline.
 */
export {
  EVALUATION_BASES,
  ROUTE_POLICIES,
  SOURCE_NEED_ID,
  TRAINING_BLUEPRINT_V2_VERSION,
  TrainingBlueprintV2Schema,
  routePolicyFor,
  type EvaluationBasis,
  type RoutePolicy,
  type SourceNeedV2,
  type TrainingBlueprintV2,
} from "./schema";
export { checkBlueprintV2Invariants, type BlueprintV2Violation } from "./validation";
export {
  buildBlueprintGenerationInputV2,
  composeTrainingBlueprintV2,
  type BlueprintGenerationInputV2,
  type BlueprintV2Design,
  type TrustedBlueprintV2Field,
} from "./compose";
