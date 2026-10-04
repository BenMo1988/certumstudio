import { getCatalogBlock, type CatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import type { BcOnlineBlockPlan, PlannedBlock } from "@/modules/block-plan/schema";
import { routePolicyFor, type RoutePolicy, type TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import { isMediaBlock, type BlockContentStatus } from "./schema";

/**
 * Alles wat over een doelblok vaststaat vóórdat er inhoud is: afgeleid uit het goedgekeurde Block Plan, de Blueprint en
 * de catalogus. Mock, Claude-provider, compose en validatie gebruiken dezelfde afleiding.
 */
export interface BlockTarget {
  block: PlannedBlock;
  catalog: CatalogBlock;
  /** Werkvorm voor accreditatie: de zichtbare naam van het catalogusblok. */
  workform: string;
  routePolicy: RoutePolicy;
  /** Welke statussen voor dit blok mogelijk zijn (structureel, niet op tekst). */
  allowedStatuses: BlockContentStatus[];
  /** Bestaande sourceNeed-ids van de Blueprint. */
  sourceNeedIds: string[];
  /** Eerdere vraagblokken waarvan AI Feedback aantoonbaar de antwoorden krijgt. */
  provenContextBlockIds: string[];
  /** Eerdere invoerblokken waarvan niet is aangetoond dat AI Feedback ze krijgt (bijv. Productie, Chat simulatie). */
  unprovenContextBlockIds: string[];
}

/**
 * Een vraagblok in de zin van de catalogus ("Ontvangt antwoorden op eerdere vraagblokken"): een blok met het waargenomen
 * veld "Vraag" (Meerkeuze, Open vraag, Poll). Afgeleid uit `observedFields`, geen eigen lijst.
 */
export function isQuestionBlock(catalogBlockId: string): boolean {
  return getCatalogBlock(catalogBlockId)?.observedFields.some((f) => f.name === "Vraag") ?? false;
}

/** Een blok waarin de deelnemer iets invoert (categorie actie, productie of afronding). */
function takesParticipantInput(catalogBlockId: string): boolean {
  const category = getCatalogBlock(catalogBlockId)?.category;
  return category === "actie" || category === "productie" || category === "afronding";
}

export function earlierBlocks(plan: BcOnlineBlockPlan, block: PlannedBlock): PlannedBlock[] {
  return plan.plannedBlocks.filter((b) => b.sequence < block.sequence).sort((a, b) => a.sequence - b.sequence);
}

export function resolveBlockTarget(
  blueprint: TrainingBlueprintV2,
  plan: BcOnlineBlockPlan,
  plannedBlockId: string,
): BlockTarget | null {
  const block = plan.plannedBlocks.find((b) => b.id === plannedBlockId);
  const catalog = block && getCatalogBlock(block.catalogBlockId);
  if (!block || !catalog) return null;

  const earlier = earlierBlocks(plan, block);
  const provenContextBlockIds = earlier.filter((b) => isQuestionBlock(b.catalogBlockId)).map((b) => b.id);
  const unprovenContextBlockIds = earlier
    .filter((b) => takesParticipantInput(b.catalogBlockId) && !isQuestionBlock(b.catalogBlockId))
    .map((b) => b.id);
  const sourceNeedIds = blueprint.sourceNeeds.map((s) => s.id);

  return {
    block,
    catalog,
    workform: catalog.visibleName,
    routePolicy: routePolicyFor(blueprint.ambiguity),
    allowedStatuses: allowedStatusesFor(block, provenContextBlockIds, sourceNeedIds),
    sourceNeedIds,
    provenContextBlockIds,
    unprovenContextBlockIds,
  };
}

/**
 * - Media: nooit een URL of asset verzinnen → alleen `needs_asset`.
 * - Bron: er is (nog) geen gevalideerde bron (geen Source Workspace) → alleen `needs_source`; nooit kenniscontent.
 * - AI Feedback zonder eerder vraagblok, of Conditionele logica zonder eerder vraagblok: er is geen aantoonbare
 *   context → alleen `blocked_by_capability`.
 * - Overig: `generated`, of eerlijk `needs_source` (alleen als de Blueprint sourceNeeds heeft) of
 *   `blocked_by_capability`.
 */
function allowedStatusesFor(block: PlannedBlock, provenContext: string[], sourceNeedIds: string[]): BlockContentStatus[] {
  if (isMediaBlock(block.catalogBlockId)) return ["needs_asset"];
  // Zonder sourceNeeds is er niets om te valideren; dan is het blok niet eerlijk te vullen.
  if (block.certumPhase === "bron") return sourceNeedIds.length > 0 ? ["needs_source"] : ["blocked_by_capability"];
  const needsQuestionContext =
    block.catalogBlockId === "certum.bco.ai-feedback" || block.catalogBlockId === "certum.bco.conditionele-logica";
  if (needsQuestionContext && provenContext.length === 0) return ["blocked_by_capability"];
  return sourceNeedIds.length > 0
    ? ["generated", "needs_source", "blocked_by_capability"]
    : ["generated", "blocked_by_capability"];
}
