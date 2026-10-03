import {
  AnalysisOutcomeV21Schema,
  checkOutcomeInvariantsV21,
  type AnalysisOutcomeV21,
  type DirectionRoutePolicy,
} from "@/modules/training-agent/v2-1";
import { AnalysisError } from "../../errors";
import type { AnalysisRequestV2 } from "../../training-analysis-service-v2";
import type { TrainingAnalysisServiceV21 } from "../../training-analysis-service-v2-1";
import { MockTrainingAnalysisServiceV2 } from "../v2/mock-training-analysis-service-v2";

/**
 * Mock voor Analysis Contract V2.1: exact de V2-mock (zelfde scenario's en markers), met een routePolicy per
 * ready-richting. De V2-mockrichtingen krijgen een vaste classificatie die bij hun leerdoel past:
 * - `keuzemoment` ("de opties wegen en een onderbouwde keuze maken") → open_choice;
 * - `aanleiding` ("feitelijk en zonder oordeel benoemen wat hij of zij waarneemt") → prescribed_action.
 * Andere uitkomsten blijven exact de V2-uitkomsten.
 */
const MOCK_ROUTE_POLICIES: Record<string, DirectionRoutePolicy> = {
  keuzemoment: "open_choice",
  aanleiding: "prescribed_action",
};

export class MockTrainingAnalysisServiceV21 implements TrainingAnalysisServiceV21 {
  private readonly v2: MockTrainingAnalysisServiceV2;

  constructor(delayMs = 700) {
    this.v2 = new MockTrainingAnalysisServiceV2(delayMs);
  }

  async analyze(request: AnalysisRequestV2): Promise<AnalysisOutcomeV21> {
    const outcome = await this.v2.analyze(request);
    const result: AnalysisOutcomeV21 =
      outcome.outcome === "ready"
        ? {
            ...outcome,
            trainingDirections: outcome.trainingDirections.map((d) => ({
              ...d,
              routePolicy: MOCK_ROUTE_POLICIES[d.id] ?? "open_choice",
            })),
          }
        : outcome;
    // Ook de mock houdt zich aan het contract.
    const parsed = AnalysisOutcomeV21Schema.safeParse(result);
    if (!parsed.success || checkOutcomeInvariantsV21(parsed.data, request.segments).length > 0) {
      throw new AnalysisError("invalid-output", "Mock schendt het V2.1-contract.");
    }
    return parsed.data;
  }
}
