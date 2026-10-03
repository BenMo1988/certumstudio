import type { AgentInput } from "@/modules/training-agent";
import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2/types";
import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { BlockPlanBlueprintSource } from "@/modules/block-plan/validation";
import type { TrainingBlueprint } from "@/modules/training-blueprint/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";

/** Wat een Blueprint-generator krijgt: alleen een `ready`-analyse met een gekozen, bestaande richting. */
export interface BlueprintRequest {
  input: AgentInput;
  analysis: ReadyOutcome;
  segments: SourceSegment[];
  selectedDirectionId: string;
}

/**
 * Provider-onafhankelijk contract voor Blueprint Generation (mock of Claude).
 * Het request is de server-side gevalideerde context; wat een provider te zien krijgt, bepaalt
 * `buildBlueprintGenerationInput` (modules/training-blueprint/generation-input.ts).
 */
export interface TrainingBlueprintService {
  generate(request: BlueprintRequest): Promise<TrainingBlueprint>;
}

/** Zelfde contract voor Blueprint Contract V2 (blueprint-contract/v2). */
export interface TrainingBlueprintServiceV2 {
  generate(request: BlueprintRequest): Promise<TrainingBlueprintV2>;
}

/** Provider-onafhankelijk contract voor Block Plan Generation op basis van een goedgekeurde Blueprint. V1: mock. */
export interface BlockPlanService {
  generate(blueprint: BlockPlanBlueprintSource): Promise<BcOnlineBlockPlan>;
}
