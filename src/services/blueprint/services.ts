import type { AgentInput } from "@/modules/training-agent";
import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2/types";
import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { TrainingBlueprint } from "@/modules/training-blueprint/schema";

/** Wat een Blueprint-generator krijgt: alleen een `ready`-analyse met een gekozen, bestaande richting. */
export interface BlueprintRequest {
  input: AgentInput;
  analysis: ReadyOutcome;
  segments: SourceSegment[];
  selectedDirectionId: string;
}

/** Provider-onafhankelijk contract voor Blueprint Generation. V1: alleen een mock. */
export interface TrainingBlueprintService {
  generate(request: BlueprintRequest): Promise<TrainingBlueprint>;
}

/** Provider-onafhankelijk contract voor Block Plan Generation op basis van een goedgekeurde Blueprint. V1: mock. */
export interface BlockPlanService {
  generate(blueprint: TrainingBlueprint): Promise<BcOnlineBlockPlan>;
}
