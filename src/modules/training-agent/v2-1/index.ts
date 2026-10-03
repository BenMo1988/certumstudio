/*
 * Analysis Contract V2.1 (analysis-contract/v2.1). Alleen ready.trainingDirections[].routePolicy is nieuw.
 * Grounding, invarianten (checkOutcomeInvariants), segmentatie, epistemische discipline en de proceed-poort zijn die van
 * V2 (../v2) en gelden ongewijzigd: een V2.1-uitkomst is structureel ook een geldige V2-uitkomst plus routePolicy.
 */
export {
  ANALYSIS_CONTRACT_V21_VERSION,
  AnalysisOutcomeV21Schema,
  AnalysisResponseV21Schema,
  DIRECTION_ROUTE_POLICIES,
  ReadyOutcomeV21Schema,
  TrainingDirectionV21Schema,
  type AnalysisOutcomeV21,
  type DirectionRoutePolicy,
  type ReadyOutcomeV21,
  type TrainingDirectionV21,
} from "./schema";
export { checkOutcomeInvariantsV21, toV2Outcome } from "./validation";
