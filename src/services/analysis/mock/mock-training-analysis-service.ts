import type { AgentInput, InputAnalysis } from "@/modules/training-agent";
import type { TrainingAnalysisService } from "../training-analysis-service";
import {
  MOCK_ANALYSIS_CASUS,
  MOCK_ANALYSIS_CASUS_BLOCKED,
  MOCK_ANALYSIS_ONDERWERP,
  MOCK_ANALYSIS_PRAKTIJKVRAAG,
  MOCK_ANALYSIS_UNSUITABLE,
} from "./mock-analyses";

/**
 * Mock-implementatie met vaste, fictieve analyses. Doet geen echte analyse.
 *
 * Keuze van het scenario:
 * - standaard per inputsoort (onderwerp → "aanpassen", praktijkvraag → "geschikt",
 *   casus → "geschikt" met privacy-aandachtspunt);
 * - tekst bevat `#ongeschikt` → ongeschikte input (elke soort);
 * - casus-tekst bevat `#blokkeren` → privacyblokkade.
 *
 * De markeringen zijn alleen bedoeld om alle toestanden te kunnen testen.
 */
export class MockTrainingAnalysisService implements TrainingAnalysisService {
  constructor(private readonly delayMs = 700) {}

  async analyze(input: AgentInput): Promise<InputAnalysis> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return structuredClone(this.pick(input));
  }

  private pick(input: AgentInput): InputAnalysis {
    const text = input.text.toLowerCase();
    if (text.includes("#ongeschikt")) return MOCK_ANALYSIS_UNSUITABLE;

    switch (input.kind) {
      case "onderwerp":
        return MOCK_ANALYSIS_ONDERWERP;
      case "praktijkvraag":
        return MOCK_ANALYSIS_PRAKTIJKVRAAG;
      case "casus":
        return text.includes("#blokkeren") ? MOCK_ANALYSIS_CASUS_BLOCKED : MOCK_ANALYSIS_CASUS;
    }
  }
}
