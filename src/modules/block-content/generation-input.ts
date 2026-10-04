import { getCatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import type { BlockContentResult } from "./schema";
import type { BlockTarget } from "./target";

/**
 * Wat een Block Content-provider te zien krijgt. Uitsluitend downstream-materiaal:
 * - de goedgekeurde Blueprint, zonder `sourceRefs` en `selectedDirectionId` (verwijzingen naar de oorspronkelijke
 *   invoer en de analyse);
 * - het goedgekeurde Block Plan;
 * - het doelblok en zijn catalogusdefinitie;
 * - eerder goedgekeurde blokinhoud (alleen gegenereerde inhoud van eerdere blokken);
 * - de trusted context (routebeleid, toegestane statussen, sourceNeed-ids, aantoonbare AI-context).
 * Nooit de oorspronkelijke casus, de analyse, niet-gekozen richtingen of bronsegmenten.
 */
export interface BlockContentGenerationInput {
  blueprint: Omit<TrainingBlueprintV2, "sourceRefs" | "selectedDirectionId">;
  blockPlan: BcOnlineBlockPlan;
  targetBlock: BlockTarget["block"];
  catalogDefinition: {
    certumCatalogId: string;
    visibleName: string;
    observedFields: { name: string; optional?: boolean; note?: string }[];
    knownLimitations: string[];
  };
  approvedEarlierContent: { plannedBlockId: string; catalogBlockId: string; content: unknown }[];
  /**
   * Alleen bij een Bron-blok met dekking: de gevalideerde bronnen die aan de vereiste sourceNeeds gekoppeld zijn. Het
   * enige waarop Bron-inhoud mag steunen; nooit candidate-bronnen of andere bronnen van de training.
   */
  validatedSources: { sourceId: string; title: string; sourceType: string; author: string | null; publisher: string | null; publicationDate: string | null; url: string | null; sourceNeedRefs: string[]; relevantContent: string }[];
  trustedContext: {
    routePolicy: BlockTarget["routePolicy"];
    allowedStatuses: BlockTarget["allowedStatuses"];
    sourceNeedIds: string[];
    provenContextBlockIds: string[];
    unprovenContextBlockIds: string[];
  };
}

export function buildBlockContentGenerationInput(input: {
  blueprint: TrainingBlueprintV2;
  blockPlan: BcOnlineBlockPlan;
  target: BlockTarget;
  approvedEarlierContent: BlockContentResult[];
}): BlockContentGenerationInput {
  const { target } = input;
  const { sourceRefs, selectedDirectionId, ...blueprint } = input.blueprint;
  void sourceRefs;
  void selectedDirectionId;
  const catalog = getCatalogBlock(target.block.catalogBlockId)!;
  return {
    blueprint,
    blockPlan: input.blockPlan,
    targetBlock: target.block,
    catalogDefinition: {
      certumCatalogId: catalog.certumCatalogId,
      visibleName: catalog.visibleName,
      observedFields: catalog.observedFields,
      knownLimitations: catalog.knownLimitations,
    },
    validatedSources: target.sources.map((s) => ({
      sourceId: s.sourceId,
      title: s.title,
      sourceType: s.sourceType,
      author: s.author,
      publisher: s.publisher,
      publicationDate: s.publicationDate,
      url: s.url,
      sourceNeedRefs: s.sourceNeedRefs,
      relevantContent: s.relevantContent,
    })),
    approvedEarlierContent: input.approvedEarlierContent
      .filter((b) => b.sequence < target.block.sequence && b.reviewStatus === "approved" && b.body.status === "generated")
      .map((b) => ({
        plannedBlockId: b.plannedBlockId,
        catalogBlockId: b.catalogBlockId,
        content: b.body.status === "generated" ? b.body.content : null,
      })),
    trustedContext: {
      routePolicy: target.routePolicy,
      allowedStatuses: target.allowedStatuses,
      sourceNeedIds: target.sourceNeedIds,
      provenContextBlockIds: target.provenContextBlockIds,
      unprovenContextBlockIds: target.unprovenContextBlockIds,
    },
  };
}
