import { getCatalogBlock, type BcOnlineCapability } from "@/knowledge/platform/bc-online-block-catalog";
import { CERTUM_PHASES, type Ambiguity, type PerformanceType } from "@/modules/training-blueprint/schema";
import { BcOnlineBlockPlanSchema, type BcOnlineBlockPlan } from "./schema";

/** Codes voor overtreden Block Plan-regels. Bevatten bewust geen inhoud. */
export type BlockPlanViolation =
  | "schema"
  | "volgorde-ongeldig"
  | "dubbele-id"
  | "fase-zonder-blok-of-gap"
  | "fasen-niet-in-volgorde"
  | "titel-wijkt-af"
  | "leerdoel-ontbreekt"
  | "juist-antwoord-bij-meerdere-routes"
  | "bronverwijzing-verzonnen";

/**
 * Catalogus-capabilities waarmee open professioneel handelen of afwegen zichtbaar wordt: een rollenspelgesprek, een
 * open antwoord of een schriftelijke productie. Afgeleid uit `bc-online-block-catalog/v1`, geen nieuw veld.
 */
const OPEN_PERFORMANCE_CAPABILITIES: readonly BcOnlineCapability[] = ["ai_rollenspel_chat", "open_antwoord", "schriftelijke_productie"];
/** Een concrete bron in het plan: alleen een URL is betrouwbaar deterministisch te herkennen. */
const CONCRETE_SOURCE = /https?:\/\/|www\./i;

function showsOpenPerformance(catalogBlockId: string): boolean {
  const capabilities: readonly string[] = getCatalogBlock(catalogBlockId)?.observedCapabilities ?? [];
  return OPEN_PERFORMANCE_CAPABILITIES.some((c) => capabilities.includes(c));
}

/**
 * Het deel van een goedgekeurde Blueprint dat het Block Plan leest. Blueprint V1 en V2 voldoen allebei; het Block Plan
 * is daarmee onafhankelijk van de Blueprint-contractversie.
 */
export interface BlockPlanBlueprintSource {
  version: string;
  title: string;
  learningGoal: string;
  ambiguity: Ambiguity;
  learningArc: { actie: { performanceType: PerformanceType } };
}

/**
 * Domeincontrole van een Block Plan tegen de goedgekeurde Blueprint.
 * - alleen bekende, planbare catalogusblokken (via het schema: een onbekend type faalt);
 * - sequence is 1..n zonder gaten, id's uniek;
 * - iedere Certum-fase heeft minstens één blok óf een capabilityGap; fasen volgen de methodiekvolgorde;
 * - titel en leerdoel komen uit de Blueprint (het plan bepaalt de inhoud niet);
 * - bij multiple_defensible_actions bevatten Actie en Toets, voor zover ze blokken hebben, minstens één blok waarmee
 *   open professioneel handelen of afwegen zichtbaar wordt (Chat simulatie, Open vraag, Productie). Een blok met één
 *   juist antwoord (Meerkeuze, formele Toets) mag aanvullend bestaan, maar nooit de enige uitvoeringsvorm zijn;
 * - geen concrete bron-URL.
 *
 * Branching is structureel uitgesloten: het bestaat niet als catalogus-capability en niet als bloktype (gesloten lijst
 * via het schema); wat niet kan, staat in een capabilityGap met hooguit een `partial` workaround met beperking.
 *
 * Bewust NIET afgedwongen: een formeel Toetsblok in de fase Toets, sleutelwoorden in een Chat simulatie, en elke
 * vrije-tekstheuristiek (eindcontent, of een blok dat een capability semantisch overclaimt). Code kan niet betrouwbaar
 * vaststellen wat natuurlijke taal bedoelt; dat bewaken catalogus-context, prompt, evals en human approval.
 */
export function checkBlockPlanInvariants(candidate: unknown, blueprint: BlockPlanBlueprintSource): BlockPlanViolation[] {
  const parsed = BcOnlineBlockPlanSchema.safeParse(candidate);
  if (!parsed.success) return ["schema"];
  const plan: BcOnlineBlockPlan = parsed.data;
  const violations = new Set<BlockPlanViolation>();

  const sequences = plan.plannedBlocks.map((b) => b.sequence).sort((a, b) => a - b);
  if (sequences.some((s, i) => s !== i + 1)) violations.add("volgorde-ongeldig");
  if (new Set(plan.plannedBlocks.map((b) => b.id)).size !== plan.plannedBlocks.length) violations.add("dubbele-id");

  for (const phase of CERTUM_PHASES) {
    const covered =
      plan.plannedBlocks.some((b) => b.certumPhase === phase) || plan.capabilityGaps.some((g) => g.certumPhase === phase);
    if (!covered) violations.add("fase-zonder-blok-of-gap");
  }

  const ordered = [...plan.plannedBlocks].sort((a, b) => a.sequence - b.sequence);
  const phaseIndex = ordered.map((b) => CERTUM_PHASES.indexOf(b.certumPhase));
  if (phaseIndex.some((p, i) => i > 0 && p < phaseIndex[i - 1])) violations.add("fasen-niet-in-volgorde");

  if (plan.courseShell.title !== blueprint.title) violations.add("titel-wijkt-af");
  if (!plan.startIntent.learningGoals.includes(blueprint.learningGoal)) violations.add("leerdoel-ontbreekt");

  if (blueprint.ambiguity === "multiple_defensible_actions") {
    for (const phase of ["actie", "toets"] as const) {
      const blocks = plan.plannedBlocks.filter((b) => b.certumPhase === phase);
      if (blocks.length > 0 && !blocks.some((b) => showsOpenPerformance(b.catalogBlockId))) {
        violations.add("juist-antwoord-bij-meerdere-routes");
      }
    }
  }

  const allTexts = [
    plan.courseShell.description,
    plan.startIntent.explanationIntent,
    plan.endIntent.closingIntent,
    plan.endIntent.summaryIntent ?? "",
    plan.endIntent.followUpRecommendation ?? "",
    ...plan.plannedBlocks.flatMap((b) => [b.purpose, b.whyThisBlock, ...b.configurationIntent.map((c) => c.intent)]),
    ...plan.capabilityGaps.flatMap((g) => [g.need, g.whyNeeded, g.workaround?.description ?? "", g.workaround?.limitation ?? ""]),
  ];
  if (allTexts.some((t) => CONCRETE_SOURCE.test(t))) violations.add("bronverwijzing-verzonnen");

  return [...violations];
}
