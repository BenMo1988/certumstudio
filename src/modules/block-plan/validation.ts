import { CERTUM_PHASES, type TrainingBlueprint } from "@/modules/training-blueprint/schema";
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
  | "juist-antwoord-bij-meerdere-routes";

/**
 * Domeincontrole van een Block Plan tegen de goedgekeurde Blueprint.
 * - alleen bekende, planbare catalogusblokken (via het schema: een onbekend type faalt);
 * - sequence is 1..n zonder gaten, id's uniek;
 * - iedere Certum-fase heeft minstens één blok óf een capabilityGap; fasen volgen de methodiekvolgorde;
 * - titel en leerdoel komen uit de Blueprint (het plan bepaalt de inhoud niet);
 * - bij multiple_defensible_actions geen Meerkeuze met één juist antwoord in Actie.
 *
 * Bewust NIET afgedwongen: een formeel Toetsblok in de fase Toets, sleutelwoorden in een Chat simulatie.
 */
export function checkBlockPlanInvariants(candidate: unknown, blueprint: TrainingBlueprint): BlockPlanViolation[] {
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
    plan.plannedBlocks.some((b) => b.certumPhase === "actie" && b.catalogBlockId === "certum.bco.meerkeuze")
  ) {
    violations.add("juist-antwoord-bij-meerdere-routes");
  }

  return [...violations];
}
