import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { BlockContentResult, FrameContent } from "@/modules/block-content";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";

/**
 * Wat een Block Content-generator krijgt: de goedgekeurde Blueprint en het goedgekeurde Block Plan, precies één doelblok
 * en eventueel eerder goedgekeurde blokinhoud. Wat de provider daarvan te zien krijgt, bepaalt
 * `buildBlockContentGenerationInput` (modules/block-content/generation-input.ts). Nooit de oorspronkelijke input, de
 * analyse of bronsegmenten.
 */
export interface BlockContentRequest {
  blueprint: TrainingBlueprintV2;
  blockPlan: BcOnlineBlockPlan;
  plannedBlockId: string;
  approvedEarlierContent: BlockContentResult[];
}

/** Vaste Start en Vast Einde: alleen Blueprint en Block Plan. */
export interface FrameContentRequest {
  blueprint: TrainingBlueprintV2;
  blockPlan: BcOnlineBlockPlan;
}

/** Provider-onafhankelijk contract voor Block Content (mock of Claude). Eén aanroep is één blok. */
export interface BlockContentService {
  generate(request: BlockContentRequest): Promise<BlockContentResult>;
  generateFrame(request: FrameContentRequest): Promise<FrameContent>;
}
