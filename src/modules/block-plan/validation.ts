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
  | "eindcontent-in-plan"
  | "bronverwijzing-verzonnen"
  | "branching-als-capability";

/** Blokken met één juist antwoord (Meerkeuze, formele Toets): geen kernactiviteit bij meerdere verdedigbare routes. */
const ONE_CORRECT_ANSWER_BLOCKS = ["certum.bco.meerkeuze", "certum.bco.toets"] as const;
/** Een letterlijke vraag of geciteerde tekst in een configuratie-intentie is eindcontent (Block Content, later). */
const END_CONTENT = /\?|["“”„]/;
/** Signalen van een concrete bron (gelijk aan de Blueprint-regel): URL, jaartal tussen haakjes, artikelnummer. */
const CONCRETE_SOURCE = /https?:\/\/|www\.|\(\s*(19|20)\d{2}\s*\)|\bart(ikel)?\.?\s*\d+/i;
/** Branching is niet ondersteund: een gepland blok mag zich niet als vertakking of routering voordoen. */
const BRANCHING_CLAIM = /\bbranch|vertakk|\brouteer|\broutering|doorstu(ur|ren)/i;

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
 * - bij multiple_defensible_actions geen blok met één juist antwoord (Meerkeuze, formele Toets) in Actie of Toets;
 * - geen eindcontent in configuratie-intenties (geen letterlijke vragen of geciteerde tekst);
 * - geen concrete bronverwijzingen;
 * - geen gepland blok dat zich als vertakking of routering voordoet (branching blijft een capabilityGap).
 *
 * Bewust NIET afgedwongen: een formeel Toetsblok in de fase Toets, sleutelwoorden in een Chat simulatie.
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

  if (
    blueprint.ambiguity === "multiple_defensible_actions" &&
    plan.plannedBlocks.some(
      (b) =>
        (b.certumPhase === "actie" || b.certumPhase === "toets") &&
        (ONE_CORRECT_ANSWER_BLOCKS as readonly string[]).includes(b.catalogBlockId),
    )
  ) {
    violations.add("juist-antwoord-bij-meerdere-routes");
  }

  if (plan.plannedBlocks.some((b) => b.configurationIntent.some((c) => END_CONTENT.test(c.intent)))) {
    violations.add("eindcontent-in-plan");
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

  if (
    plan.plannedBlocks.some((b) =>
      [b.purpose, b.whyThisBlock, ...b.configurationIntent.flatMap((c) => [c.setting, c.intent])].some((t) => BRANCHING_CLAIM.test(t)),
    )
  ) {
    violations.add("branching-als-capability");
  }

  return [...violations];
}
