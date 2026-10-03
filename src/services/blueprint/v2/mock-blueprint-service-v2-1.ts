import {
  buildBlueprintGenerationInputV21,
  composeTrainingBlueprintV21,
  type TrainingBlueprintV2,
} from "@/modules/training-blueprint/v2";
import type { BlueprintRequestV21, TrainingBlueprintServiceV21 } from "../services";
import { buildMockBlueprintV2Design } from "./mock-blueprint-service-v2";

/**
 * Mock Blueprint Generation met trusted routebeleid. Hetzelfde mock-ontwerp als V2, maar de ambiguïteit volgt uit het
 * routebeleid van de Analysis-richting in plaats van uit een focusheuristiek. Het ontwerp bevat geen ambiguïteit; die
 * voegt composeTrainingBlueprintV21 toe.
 */
export class MockTrainingBlueprintServiceV21 implements TrainingBlueprintServiceV21 {
  async generate(request: BlueprintRequestV21): Promise<TrainingBlueprintV2> {
    const input = buildBlueprintGenerationInputV21({
      inputKind: request.input.kind,
      analysis: request.analysis,
      segments: request.segments,
      selectedDirectionId: request.selectedDirectionId,
    });
    const { ambiguity: _derived, ...design } = buildMockBlueprintV2Design(input, input.selectedDirection.routePolicy === "open_choice");
    void _derived;
    return composeTrainingBlueprintV21(design, input);
  }
}
