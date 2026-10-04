import {
  BlockContentResultSchema,
  checkBlockContentInvariants,
  composeBlockContent,
  composeFrame,
  resolveBlockTarget,
  type BlockContentResult,
  type BlockTarget,
  type FrameContent,
} from "@/modules/block-content";
import { AnalysisError } from "../analysis/errors";
import { buildBlockContentDesignSchema, FrameDesignSchema } from "./design";
import { BlockContentValidationError, zodIssueCodes } from "./diagnostics";
import type { BlockContentRequest, FrameContentRequest } from "./services";

/** Het doelblok van een request; een onbekend `plannedBlockId` is een fout van de aanroeper, geen providerfout. */
export function targetOf(request: BlockContentRequest): BlockTarget {
  const target = resolveBlockTarget(request.blueprint, request.blockPlan, request.plannedBlockId);
  if (!target) throw new AnalysisError("config", "Onbekend gepland blok.");
  return target;
}

/**
 * De gedeelde weg van ontwerp naar blokresultaat, voor mock én Claude: 1. Zod op het ontwerp (per doelblok),
 * 2. trusted samenstellen, 3. Zod op het volledige resultaat, 4. `checkBlockContentInvariants`. Geen reparatie.
 */
export function finalizeBlockContent(candidate: unknown, target: BlockTarget, request: BlockContentRequest): BlockContentResult {
  const design = buildBlockContentDesignSchema(target).safeParse(candidate);
  if (!design.success) throw new BlockContentValidationError("schema_validation", zodIssueCodes(design.error));
  const parsed = BlockContentResultSchema.safeParse(composeBlockContent(design.data.result, target));
  if (!parsed.success) throw new BlockContentValidationError("schema_validation", zodIssueCodes(parsed.error));
  const violations = checkBlockContentInvariants(parsed.data, request);
  if (violations.length > 0) throw new BlockContentValidationError("domain_invariant", violations);
  return parsed.data;
}

export function finalizeFrame(candidate: unknown, request: FrameContentRequest): FrameContent {
  const design = FrameDesignSchema.safeParse(candidate);
  if (!design.success) throw new BlockContentValidationError("schema_validation", zodIssueCodes(design.error));
  if ([design.data.introduction, design.data.closingText, design.data.summary ?? ""].some((s) => /https?:\/\/|www\./i.test(s))) {
    throw new BlockContentValidationError("domain_invariant", ["url-verzonnen"]);
  }
  return composeFrame(design.data, request.blueprint);
}
