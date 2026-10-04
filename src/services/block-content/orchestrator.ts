import { composeContentPackage, type BlockContentResult, type TrainingContentPackage } from "@/modules/block-content";
import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import { AnalysisError, type AnalysisErrorKind } from "../analysis/errors";
import type { BlockContentService } from "./services";

export interface ContentGenerationFailure {
  plannedBlockId: string;
  errorKind: AnalysisErrorKind | "unknown";
}

/**
 * Genereert Vaste Start/Einde en daarna ieder gepland blok, één voor één in planvolgorde (één aanroep per blok).
 * Een fout bij een blok stopt de reeks: de blokken tot dan toe blijven in het pakket, de rest staat als
 * `not_generated` open (geen stille terugval, geen extra aanroepen na een providerfout). Een fout bij Start/Einde wordt
 * doorgegeven. Bij een eerste generatie is nog geen inhoud goedgekeurd, dus krijgt geen blok eerdere inhoud mee.
 */
export async function generateTrainingContentPackage(
  service: BlockContentService,
  input: { blueprint: TrainingBlueprintV2; blockPlan: BcOnlineBlockPlan },
): Promise<{ package: TrainingContentPackage; failure: ContentGenerationFailure | null }> {
  const frame = await service.generateFrame(input);
  const blocks: BlockContentResult[] = [];
  let failure: ContentGenerationFailure | null = null;
  for (const planned of [...input.blockPlan.plannedBlocks].sort((a, b) => a.sequence - b.sequence)) {
    try {
      blocks.push(await service.generate({ ...input, plannedBlockId: planned.id, approvedEarlierContent: [] }));
    } catch (error) {
      failure = { plannedBlockId: planned.id, errorKind: error instanceof AnalysisError ? error.kind : "unknown" };
      break;
    }
  }
  return { package: composeContentPackage({ ...input, frame, blocks }), failure };
}
