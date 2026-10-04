import {
  resolveBlockTarget,
  resolveDeterministicResult,
  type BlockContentResult,
} from "@/modules/block-content";
import { AnalysisError } from "../analysis/errors";
import type { BlockContentRequest, BlockContentService } from "./services";

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
  const target = resolveBlockTarget(request.blueprint, request.blockPlan, request.plannedBlockId, request.validatedSources);
  if (!target) throw new AnalysisError("config", "Onbekend gepland blok.");
  const deterministic = resolveDeterministicResult(target, request.blueprint);
  if (deterministic) return { block: deterministic, deterministic: true };
  return { block: await getService().generate(request), deterministic: false };
}
