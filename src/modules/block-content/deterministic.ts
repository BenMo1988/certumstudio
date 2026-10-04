import { NOT_EVIDENCED_CAPABILITIES } from "@/knowledge/platform/bc-online-block-catalog";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import { composeBlockContent, type BlockAccreditationDesign, type BlockContentDesign } from "./compose";
import type { BlockContentResult } from "./schema";
import type { BlockTarget } from "./target";

/** Standaard toetsfunctie per Certum-fase voor resultaten zonder provider (en de mock). Een schatting, geen oordeel. */
export const DEFAULT_ASSESSMENT_ROLE = {
  context: "none",
  actie: "formative",
  reflectie: "formative",
  feedback: "formative",
  bron: "none",
  toets: "transfer",
} as const satisfies Record<BlockTarget["block"]["certumPhase"], BlockAccreditationDesign["assessmentRole"]>;

const fit = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

const AI_CONTEXT = NOT_EVIDENCED_CAPABILITIES.find((c) => c.id === "ai_context_buiten_vraagblokken")!;

/** Of een doelblok inhoud van een provider nodig heeft. Zo niet, dan bepaalt de server het resultaat zelf. */
export function needsProvider(target: BlockTarget): boolean {
  return target.allowedStatuses.includes("generated");
}

/**
 * Het resultaat voor een doelblok dat structureel niet gegenereerd kan of mag worden, volledig server-side en zonder
 * provider (geen AI-aanroep):
 * - media → `needs_asset` (assettype uit het bloktype; beschrijving uit het Block Plan, nooit een URL of bestand);
 * - Bron → `needs_source` (alleen de sourceNeeds van de Blueprint; geen kennisinhoud);
 * - AI Feedback of Conditionele logica zonder eerder vraagblok, of Bron zonder sourceNeeds →
 *   `blocked_by_capability` met de concrete afhankelijkheid.
 * Geeft `null` als het blok wél gegenereerd kan worden; alleen dan wordt er een provider aangemaakt.
 * Alle teksten komen uit de goedgekeurde Blueprint, het Block Plan en de catalogus.
 */
export function resolveDeterministicResult(target: BlockTarget, blueprint: TrainingBlueprintV2): BlockContentResult | null {
  if (needsProvider(target)) return null;
  const { block } = target;
  const accreditation: BlockAccreditationDesign = {
    learningGoalContribution: fit(block.purpose, 500),
    assessmentRole: DEFAULT_ASSESSMENT_ROLE[block.certumPhase],
    estimatedMinutes: null,
    sourceNeedRefs: [],
  };
  const intents = block.configurationIntent.map((c) => c.intent).join(" ");

  let design: BlockContentDesign;
  switch (target.allowedStatuses[0]) {
    case "needs_asset":
      design = {
        status: "needs_asset",
        accreditation,
        assetRequirement: { why: fit(block.whyThisBlock, 800), desiredContent: fit(intents || block.purpose, 1200), captionIntent: null },
      };
      break;
    case "needs_source": {
      const bronRefs = blueprint.learningArc.bron.sourceNeedRefs.filter((r) => target.sourceNeedIds.includes(r));
      const refs = bronRefs.length > 0 ? bronRefs : target.sourceNeedIds;
      const needs = blueprint.sourceNeeds.filter((s) => refs.includes(s.id));
      design = {
        status: "needs_source",
        accreditation: { ...accreditation, sourceNeedRefs: refs },
        whatToValidate: fit(needs.map((s) => `${s.id}: ${s.question}`).join(" "), 1000),
        generatableAfterValidation: fit(`Na validatie: ${block.purpose}`, 1000),
      };
      break;
    }
    default:
      design = { status: "blocked_by_capability", accreditation, ...blockedDependency(target) };
  }
  return composeBlockContent(design, target);
}

function blockedDependency(target: BlockTarget): { missingCapability: string; why: string } {
  const unproven = target.unprovenContextBlockIds.length > 0 ? target.unprovenContextBlockIds.join(", ") : "geen";
  switch (target.block.catalogBlockId) {
    case "certum.bco.ai-feedback":
      return {
        missingCapability: `${AI_CONTEXT.id}: ${AI_CONTEXT.description}`,
        why: `AI Feedback ontvangt aantoonbaar alleen antwoorden op eerdere vraagblokken; vóór dit blok staat er geen. Eerdere invoer die niet aantoonbaar als context beschikbaar is: ${unproven}.`,
      };
    case "certum.bco.conditionele-logica":
      return {
        missingCapability: "Een eerder vraagblok als bron voor de voorwaarde.",
        why: "Conditionele logica werkt op een eerder antwoord; vóór dit blok staat geen vraagblok.",
      };
    default:
      return {
        missingCapability: "Een gevalideerde bron voor dit Bron-blok.",
        why: "De Blueprint bevat geen sourceNeeds; er is niets om te valideren en geen kennisinhoud die gemaakt mag worden.",
      };
  }
}
