import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { ValidatedSource } from "@/modules/sources/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import { BlockContentResultSchema, TrainingContentPackageSchema, isMediaBlock, type BlockContentResult } from "./schema";
import { deriveDuration, deriveReadiness, deriveUnresolvedRequirements, type SourceCoverage } from "./compose";
import { resolveBlockTarget, type BlockTarget } from "./target";

/** Codes voor overtreden Block Content-regels. Bevatten bewust geen inhoud. */
export type BlockContentViolation =
  | "schema"
  | "onbekend-blok"
  | "trusted-veld-gewijzigd"
  | "bloktype-gewijzigd"
  | "status-niet-toegestaan"
  | "bronverwijzing-onbekend"
  | "bronverwijzing-dubbel"
  | "bronbehoefte-zonder-ref"
  | "bronverwijzing-zonder-bron"
  | "url-verzonnen"
  | "sleutelwoorddoel-bij-meerdere-routes"
  | "ai-context-niet-aangetoond"
  | "voorwaarde-bron-ongeldig"
  | "voorwaarde-waarde-ongeldig"
  | "juist-antwoord-ongeldig";

/** Een concrete URL is het enige deterministisch herkenbare verzonnen asset of bronverwijzing. */
const URL = /https?:\/\/|www\./i;

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/**
 * Domeincontrole van één blokresultaat tegen het goedgekeurde Block Plan en de Blueprint. Alleen structurele regels;
 * geen vrije-tekstheuristieken (wat natuurlijke taal bedoelt, bewaken prompt, evals en menselijke review).
 * - trusted velden (id, volgorde, fase, bloktype, werkvorm, routebeleid) gelijk aan het doelblok; het bloktype van de
 *   inhoud gelijk aan dat van het geplande blok;
 * - de status is toegestaan voor dit blok (media → `needs_asset`, Bron → `needs_source`, AI Feedback of Conditionele
 *   logica zonder eerder vraagblok → `blocked_by_capability`);
 * - sourceNeedRefs bestaan in de Blueprint, zonder dubbelingen; `needs_source` noemt er minstens één; gegenereerde
 *   Bron-inhoud verwijst alleen naar sourceNeeds die een gevalideerde bron dekt (organisatiekennis wordt nooit ingevuld);
 * - nergens een URL;
 * - Chat simulatie bij `open_choice`: geen sleutelwoorddoel dat één route afdwingt;
 * - AI Feedback: alleen aantoonbare context (eerdere vraagblokken), exact zoals afgeleid;
 * - Conditionele logica: de bron is een eerder vraagblok; bij een eerder goedgekeurde Poll of Meerkeuze moet een
 *   gelijk-aan-waarde een bestaande optie zijn; `heeft_geantwoord` heeft geen waarde;
 * - Meerkeuze en Toets: het juiste antwoord bestaat.
 */
export function checkBlockContentInvariants(
  candidate: unknown,
  context: {
    blueprint: TrainingBlueprintV2;
    blockPlan: BcOnlineBlockPlan;
    approvedEarlierContent?: BlockContentResult[];
    /** Current gevalideerde bronnen waarop een Bron-blok mag steunen (zie `resolveBlockTarget`). */
    validatedSources?: ValidatedSource[];
  },
): BlockContentViolation[] {
  const parsed = BlockContentResultSchema.safeParse(candidate);
  if (!parsed.success) return ["schema"];
  const result = parsed.data;
  const target = resolveBlockTarget(context.blueprint, context.blockPlan, result.plannedBlockId, context.validatedSources);
  if (!target) return ["onbekend-blok"];
  const violations = new Set<BlockContentViolation>();

  if (
    result.sequence !== target.block.sequence ||
    result.certumPhase !== target.block.certumPhase ||
    result.routePolicy !== target.routePolicy ||
    result.accreditation.workform !== target.workform
  ) {
    violations.add("trusted-veld-gewijzigd");
  }
  if (result.catalogBlockId !== target.block.catalogBlockId) violations.add("bloktype-gewijzigd");
  if (result.body.status === "generated" && result.body.content.catalogBlockId !== target.block.catalogBlockId) {
    violations.add("bloktype-gewijzigd");
  }
  if (!target.allowedStatuses.includes(result.body.status)) violations.add("status-niet-toegestaan");
  if (result.body.status === "needs_asset" && !isMediaBlock(target.block.catalogBlockId)) violations.add("status-niet-toegestaan");

  const refs = result.accreditation.sourceNeedRefs;
  if (refs.some((r) => !target.sourceNeedIds.includes(r))) violations.add("bronverwijzing-onbekend");
  if (new Set(refs).size !== refs.length) violations.add("bronverwijzing-dubbel");
  if (result.body.status === "needs_source" && refs.length === 0) violations.add("bronbehoefte-zonder-ref");
  if (
    target.block.certumPhase === "bron" &&
    result.body.status === "generated" &&
    refs.some((r) => !target.sources.some((s) => s.sourceNeedRefs.includes(r)))
  ) {
    violations.add("bronverwijzing-zonder-bron");
  }

  if (strings(result.body).some((s) => URL.test(s)) || strings(result.accreditation).some((s) => URL.test(s))) {
    violations.add("url-verzonnen");
  }

  if (result.body.status === "generated") {
    for (const v of checkContent(result.body.content, target, context.approvedEarlierContent ?? [])) violations.add(v);
  }
  return [...violations];
}

function checkContent(
  content: Extract<BlockContentResult["body"], { status: "generated" }>["content"],
  target: BlockTarget,
  approvedEarlier: BlockContentResult[],
): BlockContentViolation[] {
  const violations: BlockContentViolation[] = [];
  switch (content.catalogBlockId) {
    case "certum.bco.chat-simulatie":
      if (target.routePolicy === "open_choice" && content.goal !== null) violations.push("sleutelwoorddoel-bij-meerdere-routes");
      break;
    case "certum.bco.ai-feedback":
      if (
        !sameIds(content.availableContext, target.provenContextBlockIds) ||
        !sameIds(content.unavailableContext, target.unprovenContextBlockIds)
      ) {
        violations.push("ai-context-niet-aangetoond");
      }
      break;
    case "certum.bco.conditionele-logica": {
      if (!target.provenContextBlockIds.includes(content.sourceBlockId)) {
        violations.push("voorwaarde-bron-ongeldig");
        break;
      }
      if ((content.condition === "heeft_geantwoord") !== (content.value === null)) violations.push("voorwaarde-waarde-ongeldig");
      const earlier = approvedEarlier.find((b) => b.plannedBlockId === content.sourceBlockId);
      if (content.condition === "antwoord_is_gelijk_aan" && earlier?.body.status === "generated") {
        const c = earlier.body.content;
        if ((c.catalogBlockId === "certum.bco.poll" || c.catalogBlockId === "certum.bco.meerkeuze") && !c.options.includes(content.value ?? "")) {
          violations.push("voorwaarde-waarde-ongeldig");
        }
      }
      break;
    }
    case "certum.bco.meerkeuze":
      if (content.correctOptionIndex >= content.options.length) violations.push("juist-antwoord-ongeldig");
      break;
    case "certum.bco.toets":
      if (content.questions.some((q) => q.type === "meerkeuze" && q.correctOptionIndex >= q.options.length)) {
        violations.push("juist-antwoord-ongeldig");
      }
      break;
  }
  return violations;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export type ContentPackageViolation =
  | "schema"
  | "blok-niet-in-plan"
  | "blok-dubbel"
  | "volgorde-wijkt-af"
  | "trusted-veld-gewijzigd"
  | "afgeleid-veld-wijkt-af"
  | BlockContentViolation;

/**
 * Controle van een volledig Training Content Package: versies, titel en leerdoel uit de Blueprint, ieder blok uit het
 * plan (hooguit één keer, in planvolgorde) en geldig, en alle afgeleide velden (duur, unresolved requirements,
 * readiness) exact zoals afgeleid.
 */
export function checkContentPackageInvariants(
  candidate: unknown,
  context: { blueprint: TrainingBlueprintV2; blockPlan: BcOnlineBlockPlan; sourceCoverage?: SourceCoverage },
): ContentPackageViolation[] {
  const parsed = TrainingContentPackageSchema.safeParse(candidate);
  if (!parsed.success) return ["schema"];
  const pkg = parsed.data;
  const { blueprint, blockPlan } = context;
  const violations = new Set<ContentPackageViolation>();

  if (
    pkg.title !== blueprint.title ||
    pkg.learningGoal !== blueprint.learningGoal ||
    pkg.blueprintVersion !== blueprint.version ||
    pkg.blockPlanVersion !== blockPlan.version ||
    pkg.start.title !== blueprint.title ||
    !sameIds(pkg.start.learningGoals, [blueprint.learningGoal])
  ) {
    violations.add("trusted-veld-gewijzigd");
  }

  const ids = pkg.blocks.map((b) => b.plannedBlockId);
  if (ids.some((id) => !blockPlan.plannedBlocks.some((p) => p.id === id))) violations.add("blok-niet-in-plan");
  if (new Set(ids).size !== ids.length) violations.add("blok-dubbel");
  const sequences = pkg.blocks.map((b) => b.sequence);
  if (sequences.some((s, i) => i > 0 && s <= sequences[i - 1])) violations.add("volgorde-wijkt-af");

  for (const block of pkg.blocks) {
    const approvedEarlier = pkg.blocks.filter((b) => b.sequence < block.sequence && b.reviewStatus === "approved");
    for (const v of checkBlockContentInvariants(block, { blueprint, blockPlan, approvedEarlierContent: approvedEarlier })) violations.add(v);
  }

  if (
    pkg.start.estimatedDurationMinutes !== deriveDuration(blockPlan, pkg.blocks) ||
    JSON.stringify(pkg.unresolvedRequirements) !== JSON.stringify(deriveUnresolvedRequirements(blockPlan, pkg.blocks, context.sourceCoverage)) ||
    pkg.readiness !== deriveReadiness(blockPlan, pkg.blocks)
  ) {
    violations.add("afgeleid-veld-wijkt-af");
  }
  if (strings(pkg.start).concat(strings(pkg.end)).some((s) => URL.test(s))) violations.add("url-verzonnen");
  return [...violations];
}
