import { getCatalogBlock, type CatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import type { BcOnlineBlockPlan, PlannedBlock } from "@/modules/block-plan/schema";
import type { ValidatedSource } from "@/modules/sources/schema";
import { routePolicyFor, sourceNeedScope, type RoutePolicy, type TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
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
  /**
   * Alleen bij een Bron-blok: de sourceNeeds die gedekt moeten zijn voordat Bron-inhoud mag ontstaan (de professionele
   * Bron-refs; zijn die er niet, dan alle Bron-refs) en de current gevalideerde bronnen die aan een Bron-ref gekoppeld
   * zijn. Andere bronnen van de training krijgt het blok niet.
   */
  requiredSourceNeedIds: string[];
  /**
   * Alleen bij een Bron-blok: organisatiegebonden Bron-refs zonder gevalideerde organisatiebron. Die blokkeren niet,
   * maar de inhoud mag er nooit een antwoord op geven (hoogstens de deelnemer naar de eigen werkwijze verwijzen).
   */
  uncoveredOrganisationSpecificNeedIds: string[];
  sources: ValidatedSource[];
  /** Of de gevalideerde bronnen iedere vereiste sourceNeed dekken; alleen dan mag Bron-inhoud worden gegenereerd. */
  sourcesCover: boolean;
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

/** De sourceNeeds waarop een Bron-blok steunt: de Bron-refs van de Blueprint, of anders alle sourceNeeds. */
export function requiredSourceNeedsFor(blueprint: TrainingBlueprintV2): string[] {
  const ids = blueprint.sourceNeeds.map((s) => s.id);
  const bronRefs = blueprint.learningArc.bron.sourceNeedRefs.filter((r) => ids.includes(r));
  return bronRefs.length > 0 ? bronRefs : ids;
}

/**
 * De Bron-refs die gedekt moeten zijn voordat Bron-inhoud mag ontstaan: de professionele (`professional`, ook legacy
 * zonder scope). Organisatiegebonden kennis blokkeert een generieke training niet. Heeft het Bron-blok alleen
 * organisatiegebonden refs, dan moeten die gedekt zijn: zonder enige gevalideerde kennis is er geen Bron-inhoud.
 */
export function blockingSourceNeedsFor(blueprint: TrainingBlueprintV2): string[] {
  const required = requiredSourceNeedsFor(blueprint);
  const professional = required.filter((id) => sourceNeedScope(blueprint.sourceNeeds.find((s) => s.id === id) ?? {}) === "professional");
  return professional.length > 0 ? professional : required;
}

/** De organisatiegebonden Bron-refs (scope `organisation_specific`). */
export function organisationSpecificNeedsFor(blueprint: TrainingBlueprintV2): string[] {
  const blocking = blockingSourceNeedsFor(blueprint);
  return requiredSourceNeedsFor(blueprint).filter((id) => !blocking.includes(id));
}

export function resolveBlockTarget(
  blueprint: TrainingBlueprintV2,
  plan: BcOnlineBlockPlan,
  plannedBlockId: string,
  validatedSources: ValidatedSource[] = [],
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
  const isBron = block.certumPhase === "bron";
  const bronRefs = isBron ? requiredSourceNeedsFor(blueprint) : [];
  const requiredSourceNeedIds = isBron ? blockingSourceNeedsFor(blueprint) : [];
  const sources = isBron ? validatedSources.filter((s) => s.sourceNeedRefs.some((r) => bronRefs.includes(r))) : [];
  const covered = (id: string) => sources.some((s) => s.sourceNeedRefs.includes(id));
  const sourcesCover = isBron && requiredSourceNeedIds.length > 0 && requiredSourceNeedIds.every(covered);
  const uncoveredOrganisationSpecificNeedIds = isBron ? organisationSpecificNeedsFor(blueprint).filter((id) => !covered(id)) : [];

  return {
    block,
    catalog,
    workform: catalog.visibleName,
    routePolicy: routePolicyFor(blueprint.ambiguity),
    allowedStatuses: allowedStatusesFor(block, provenContextBlockIds, sourceNeedIds, sourcesCover),
    sourceNeedIds,
    provenContextBlockIds,
    unprovenContextBlockIds,
    requiredSourceNeedIds,
    uncoveredOrganisationSpecificNeedIds,
    sources,
    sourcesCover,
  };
}

/**
 * - Media: nooit een URL of asset verzinnen → alleen `needs_asset`.
 * - Bron: zonder gevalideerde bronnen die iedere vereiste sourceNeed dekken → alleen `needs_source` (nooit
 *   kenniscontent). Met dekking: `generated` op basis van uitsluitend die bronnen, of eerlijk `needs_source` als de
 *   aangeleverde broninhoud onvoldoende is.
 * - AI Feedback zonder eerder vraagblok, of Conditionele logica zonder eerder vraagblok: er is geen aantoonbare
 *   context → alleen `blocked_by_capability`.
 * - Overig: `generated`, of eerlijk `needs_source` (alleen als de Blueprint sourceNeeds heeft) of
 *   `blocked_by_capability`.
 */
function allowedStatusesFor(block: PlannedBlock, provenContext: string[], sourceNeedIds: string[], sourcesCover: boolean): BlockContentStatus[] {
  if (isMediaBlock(block.catalogBlockId)) return ["needs_asset"];
  // Zonder sourceNeeds is er niets om te valideren; dan is het blok niet eerlijk te vullen.
  if (block.certumPhase === "bron") {
    if (sourceNeedIds.length === 0) return ["blocked_by_capability"];
    return sourcesCover ? ["generated", "needs_source"] : ["needs_source"];
  }
  const needsQuestionContext =
    block.catalogBlockId === "certum.bco.ai-feedback" || block.catalogBlockId === "certum.bco.conditionele-logica";
  if (needsQuestionContext && provenContext.length === 0) return ["blocked_by_capability"];
  return sourceNeedIds.length > 0
    ? ["generated", "needs_source", "blocked_by_capability"]
    : ["generated", "blocked_by_capability"];
}
