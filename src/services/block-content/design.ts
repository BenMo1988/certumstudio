import { z } from "zod";
import type { BlockContentDesign, BlockTarget, FrameDesign } from "@/modules/block-content";
import {
  ACCREDITATION_FIELDS,
  ASSET_REQUIREMENT_FIELDS,
  BLOCKED_FIELDS,
  CONTENT_FIELDS,
  EndContentSchema,
  NEEDS_SOURCE_FIELDS,
  StartContentSchema,
  isMediaBlock,
  type BlockContentStatus,
  type ContentBlockId,
} from "@/modules/block-content/schema";

/**
 * Het ontwerpschema voor één doelblok, afgeleid uit het domeinschema `block-content/v1` en het doelblok. Per request:
 * - alleen de statussen die voor dit blok mogelijk zijn (media → needs_asset, Bron → needs_source, …);
 * - bij `generated` alleen de velden van dít bloktype, zonder trusted velden (`catalogBlockId`, AI-context,
 *   `minimumWords` van een Productie);
 * - bij `open_choice` een Chat simulatie zonder gespreksdoel (`goal: null`);
 * - bij Conditionele logica alleen eerdere vraagblokken als bron;
 * - sourceNeedRefs alleen uit de bestaande Blueprint-ids.
 * Structured output sluit zo al veel uit; Zod en de domeininvarianten controleren daarna opnieuw.
 */
export function buildBlockContentDesignSchema(target: BlockTarget): z.ZodType<{ result: BlockContentDesign }> {
  const accreditation = z.strictObject({
    ...ACCREDITATION_FIELDS,
    sourceNeedRefs:
      target.sourceNeedIds.length > 0
        ? z.array(z.enum(target.sourceNeedIds as [string, ...string[]])).max(3).describe("Alleen bestaande sourceNeed-ids.")
        : z.array(z.string()).max(0).describe("Deze Blueprint heeft geen sourceNeeds."),
  });
  const variants = target.allowedStatuses.map((status) => variant(status, target, accreditation));
  const result = variants.length === 1 ? variants[0] : z.discriminatedUnion("status", variants as [z.ZodObject, z.ZodObject, ...z.ZodObject[]]);
  return z.strictObject({ result }) as unknown as z.ZodType<{ result: BlockContentDesign }>;
}

function variant(status: BlockContentStatus, target: BlockTarget, accreditation: z.ZodObject): z.ZodObject {
  const base = { status: z.literal(status), accreditation };
  switch (status) {
    case "generated":
      return z.strictObject({ ...base, content: contentSchema(target) });
    case "needs_source":
      return z.strictObject({ ...base, ...NEEDS_SOURCE_FIELDS });
    case "needs_asset":
      return z.strictObject({ ...base, assetRequirement: z.strictObject(ASSET_REQUIREMENT_FIELDS) });
    case "blocked_by_capability":
      return z.strictObject({ ...base, ...BLOCKED_FIELDS });
  }
}

function contentSchema(target: BlockTarget): z.ZodObject {
  const id = target.block.catalogBlockId;
  if (isMediaBlock(id)) throw new Error("Een mediablok heeft geen te genereren inhoud.");
  const fields: Record<string, z.ZodType> = { ...CONTENT_FIELDS[id as ContentBlockId] };
  if (id === "certum.bco.ai-feedback") {
    delete fields.availableContext;
    delete fields.unavailableContext;
  }
  // V1: een lengte-eis is geen generatiekeuze; zonder trusted bron zet de server hem op null (compose).
  if (id === "certum.bco.productie") delete fields.minimumWords;
  if (id === "certum.bco.chat-simulatie" && target.routePolicy === "open_choice") {
    fields.goal = z.null().describe("Geen gespreksdoel: bij meerdere verdedigbare routes dwingt een sleutelwoorddoel één route af.");
  }
  if (id === "certum.bco.conditionele-logica" && target.provenContextBlockIds.length > 0) {
    fields.sourceBlockId = z.enum(target.provenContextBlockIds as [string, ...string[]]).describe("Een eerder vraagblok.");
  }
  return z.strictObject(fields);
}

/** Ontwerpschema voor Vaste Start en Vast Einde: alleen de teksten; titel, leerdoel, duur en vervolg zijn trusted. */
export const FrameDesignSchema = z.strictObject({
  introduction: StartContentSchema.shape.introduction,
  closingText: EndContentSchema.shape.closingText,
  summary: EndContentSchema.shape.summary,
});

// Compile-time: het frame-ontwerpschema en het compose-contract beschrijven hetzelfde.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const frameMatchesCompose: Same<z.infer<typeof FrameDesignSchema>, FrameDesign> = true;
void frameMatchesCompose;
