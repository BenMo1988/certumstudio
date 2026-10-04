import {
  composeContentPackage,
  resolveBlockTarget,
  resolveDeterministicResult,
  type BlockContentResult,
  type TrainingContentPackage,
} from "@/modules/block-content";
import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import { AnalysisError, type AnalysisErrorKind } from "../analysis/errors";
import type { BlockContentRequest, BlockContentService } from "./services";

export interface ContentGenerationFailure {
  plannedBlockId: string;
  errorKind: AnalysisErrorKind | "unknown";
}

/** Maakt de provider pas bij de eerste echte aanroep, en hooguit één keer. */
export function lazyService(getService: () => BlockContentService): () => BlockContentService {
  let service: BlockContentService | undefined;
  return () => (service ??= getService());
}

/**
 * Eén blok: eerst de server-side beslissing, daarna pas (en alleen dan) de provider.
 *
 *   resolveBlockTarget → kan het blok gegenereerd worden?
 *     nee → needs_source / needs_asset / blocked_by_capability, server-side; 0 providercreaties, 0 aanroepen
 *     ja  → provider aanmaken (lazy) → één aanroep → generated (of een eerlijke status van de provider)
 */
export async function generateBlockContent(
  getService: () => BlockContentService,
  request: BlockContentRequest,
): Promise<{ block: BlockContentResult; deterministic: boolean }> {
  const target = resolveBlockTarget(request.blueprint, request.blockPlan, request.plannedBlockId);
  if (!target) throw new AnalysisError("config", "Onbekend gepland blok.");
  const deterministic = resolveDeterministicResult(target, request.blueprint);
  if (deterministic) return { block: deterministic, deterministic: true };
  return { block: await getService().generate(request), deterministic: false };
}

/**
 * Het Training Content Package. Vaste Start en Vast Einde worden één keer per training gemaakt (trainingsniveau, niet
 * per blok); daarna ieder gepland blok één voor één in planvolgorde. Blokken die niet gegenereerd kunnen worden, lost
 * de server zelf op zonder provideraanroep. Een fout bij een blok stopt de reeks: de blokken tot dan toe blijven in het
 * pakket, de rest staat als `not_generated` open (geen stille terugval, geen extra aanroepen na een providerfout).
 * Bij een eerste generatie is nog geen inhoud goedgekeurd, dus krijgt geen blok eerdere inhoud mee.
 */
export async function generateTrainingContentPackage(
  getService: () => BlockContentService,
  input: { blueprint: TrainingBlueprintV2; blockPlan: BcOnlineBlockPlan },
): Promise<{
  package: TrainingContentPackage;
  failure: ContentGenerationFailure | null;
  deterministicBlocks: number;
  providerBlocks: number;
}> {
  const service = lazyService(getService);
  const frame = await service().generateFrame(input);
  const blocks: BlockContentResult[] = [];
  let failure: ContentGenerationFailure | null = null;
  let deterministicBlocks = 0;
  for (const planned of [...input.blockPlan.plannedBlocks].sort((a, b) => a.sequence - b.sequence)) {
    try {
      const result = await generateBlockContent(service, { ...input, plannedBlockId: planned.id, approvedEarlierContent: [] });
      blocks.push(result.block);
      if (result.deterministic) deterministicBlocks += 1;
    } catch (error) {
      failure = { plannedBlockId: planned.id, errorKind: error instanceof AnalysisError ? error.kind : "unknown" };
      break;
    }
  }
  return {
    package: composeContentPackage({ ...input, frame, blocks }),
    failure,
    deterministicBlocks,
    providerBlocks: blocks.length - deterministicBlocks,
  };
}
