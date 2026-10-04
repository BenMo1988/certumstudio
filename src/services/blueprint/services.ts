import type { AgentInput } from "@/modules/training-agent";
import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2/types";
import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { TrainingBlueprint } from "@/modules/training-blueprint/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import type { ReadyOutcomeV21 } from "@/modules/training-agent/v2-1";

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

/** V2.1-request: een Analysis V2.1-uitkomst, zodat het routebeleid van de gekozen richting trusted meegaat. */
export interface BlueprintRequestV21 extends Omit<BlueprintRequest, "analysis"> {
  analysis: ReadyOutcomeV21;
}

/** Blueprint Contract V2 met trusted routebeleid (prompt training-blueprint/v2.1). */
export interface TrainingBlueprintServiceV21 {
  generate(request: BlueprintRequestV21): Promise<TrainingBlueprintV2>;
}

/** Een goedgekeurde, server-side gevalideerde Blueprint: de enige didactische input voor het Block Plan. */
export type ApprovedBlueprint = TrainingBlueprint | TrainingBlueprintV2;

/**
 * Wat een Block Plan-generator krijgt: uitsluitend de goedgekeurde Blueprint. Nooit de oorspronkelijke input, de
 * analyse of bronsegmenten. De catalogus en versies voegt de provider zelf toe.
 */
export interface BlockPlanRequest {
  blueprint: ApprovedBlueprint;
}

/** Provider-onafhankelijk contract voor Block Plan Generation (mock of Claude). */
export interface BlockPlanService {
  generate(request: BlockPlanRequest): Promise<BcOnlineBlockPlan>;
}
