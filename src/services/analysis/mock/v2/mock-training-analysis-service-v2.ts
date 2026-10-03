import { checkOutcomeInvariants, type AnalysisOutcome } from "@/modules/training-agent/v2";
import { AnalysisError } from "../../errors";
import type { AnalysisRequestV2, TrainingAnalysisServiceV2 } from "../../training-analysis-service-v2";
import { MOCK_V2_BLOCKED, MOCK_V2_NEEDS_ADJUSTMENT, MOCK_V2_UNSUITABLE, mockV2Ready } from "./mock-outcomes";

/**
 * Mock-implementatie van Analysis Contract V2. Doet geen echte analyse.
 *
 * Keuze van de uitkomst:
 * - tekst bevat `#blokkeren` → blocked (provider-vangnet na een geslaagde preflight);
 * - `#ongeschikt` → unsuitable; `#afbakenen` → needs_adjustment; `#kader` → ready met een gecontroleerd begrip;
 * - anders per inputsoort: onderwerp → needs_adjustment; praktijkvraag → ready;
 *   casus → ready als de tekst een keuzemoment noemt (eenvoudige woordheuristiek), anders unsuitable.
 *
 * De heuristiek is alleen bedoeld om de flow en de evals met een mock te kunnen doorlopen.
 */
const DECISION_MARKERS = /twijfel|afweg|dilemma|kiezen|keuze|maar moet|weet niet of/i;

export class MockTrainingAnalysisServiceV2 implements TrainingAnalysisServiceV2 {
  constructor(private readonly delayMs = 700) {}

  async analyze({ input, segments }: AnalysisRequestV2): Promise<AnalysisOutcome> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    const outcome = structuredClone(this.pick(input.kind, input.text, segments));
    // Ook de mock houdt zich aan het contract.
    const violations = checkOutcomeInvariants(outcome, segments);
    if (violations.length > 0) throw new AnalysisError("invalid-output", `Mock schendt domeinregels: ${violations.join(", ")}.`);
    return outcome;
  }

  private pick(kind: string, text: string, segments: AnalysisRequestV2["segments"]): AnalysisOutcome {
    const lower = text.toLowerCase();
    if (lower.includes("#blokkeren")) return MOCK_V2_BLOCKED;
    if (lower.includes("#ongeschikt")) return MOCK_V2_UNSUITABLE;
    if (lower.includes("#afbakenen")) return MOCK_V2_NEEDS_ADJUSTMENT;
    if (lower.includes("#kader")) return mockV2Ready(segments, true);
    switch (kind) {
      case "onderwerp":
        return MOCK_V2_NEEDS_ADJUSTMENT;
      case "praktijkvraag":
        return mockV2Ready(segments);
      default:
        return DECISION_MARKERS.test(text) ? mockV2Ready(segments) : MOCK_V2_UNSUITABLE;
    }
  }
}
