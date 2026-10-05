import type { z } from "zod";
import { BC_ONLINE_BLOCK_PLAN_VERSION, PlannedBlockSchema, type BcOnlineBlockPlan, type PlannedBlock } from "./schema";
import type { BlockPlanBlueprintSource } from "./validation";

/**
 * Wat een Block Plan-provider ontwerpt: de keuze en volgorde van bestaande blokken, hun intenties, de start- en
 * eindintentie en eventuele capability gaps. Alles wat uit de goedgekeurde Blueprint of vaste Certum-regels volgt, voegt
 * de server toe (zie `composeBlockPlan`).
 */
export type BlockPlanDesign = Omit<
  BcOnlineBlockPlan,
  "version" | "blueprintVersion" | "courseShell" | "startIntent" | "plannedBlocks" | "endIntent"
> & {
  courseShell: Pick<BcOnlineBlockPlan["courseShell"], "description">;
  startIntent: Pick<BcOnlineBlockPlan["startIntent"], "explanationIntent">;
  plannedBlocks: Omit<PlannedBlock, "id" | "sequence">[];
  endIntent: Omit<BcOnlineBlockPlan["endIntent"], "followUpRecommendation">;
};

/**
 * Stelt een volledig Block Plan samen uit het ontwerp en de goedgekeurde Blueprint. Trusted, server-side:
 * - versie en `blueprintVersion`;
 * - de titel (letterlijk uit de Blueprint) en het leerdoel als enige leerdoel;
 * - `skjPoints: null` en `status: "concept"` (vaste Certum-regels);
 * - tijdsduur `null`: die is pas te schatten als de blokinhoud bestaat (Block Content, later);
 * - blok-ids (`blok-n`) en `sequence` (1..n) in de volgorde van het ontwerp;
 * - `followUpRecommendation: null`: de Blueprint modelleert (nog) geen vervolgactiviteit, dus het Block Plan voegt er
 *   geen toe (geen intervisie, coaching of vervolgopdracht).
 * De trusted velden worden als laatste gezet; daarna volgen Zod en `checkBlockPlanInvariants`.
 */
export function composeBlockPlan(design: BlockPlanDesign, blueprint: BlockPlanBlueprintSource): BcOnlineBlockPlan {
  return {
    ...design,
    version: BC_ONLINE_BLOCK_PLAN_VERSION,
    blueprintVersion: blueprint.version,
    courseShell: {
      description: design.courseShell.description,
      title: blueprint.title,
      estimatedDurationMinutes: null,
      skjPoints: null,
      status: "concept",
    },
    startIntent: {
      explanationIntent: design.startIntent.explanationIntent,
      estimatedDurationMinutes: null,
      learningGoals: [blueprint.learningGoal],
    },
    plannedBlocks: design.plannedBlocks.map((block, i) => ({ ...block, id: `blok-${i + 1}`, sequence: i + 1 })),
    endIntent: { ...design.endIntent, followUpRecommendation: null },
  };
}

/**
 * Human Block Plan Override (Full Training Pilot TR-0014): wat een opleider aan één gepland blok mag wijzigen vóórdat
 * hij het plan goedkeurt, zonder het plan opnieuw te laten genereren. Alleen het uitvoeringsmiddel en de intenties;
 * id, volgorde, Certum-fase, titel, leerdoel, routebeleid en capability gaps blijven trusted. Strict: een onbekend veld
 * (bijv. `certumPhase`) wordt geweigerd.
 */
export const PlannedBlockEditSchema = PlannedBlockSchema.pick({
  catalogBlockId: true,
  purpose: true,
  whyThisBlock: true,
  configurationIntent: true,
}).strict();

export type PlannedBlockEdit = z.infer<typeof PlannedBlockEditSchema>;

/**
 * Een nieuw Block Plan met de handmatige wijziging van één gepland blok; het origineel blijft ongewijzigd. `null` als het
 * blok niet bestaat. Het resultaat moet daarna opnieuw door Zod en `checkBlockPlanInvariants` (catalogus, fasen,
 * open-choice-regels, geen bron-URL); de opslaglaag doet dat bij iedere nieuwe revision opnieuw.
 */
export function applyPlannedBlockEdit(plan: BcOnlineBlockPlan, plannedBlockId: string, edit: PlannedBlockEdit): BcOnlineBlockPlan | null {
  if (!plan.plannedBlocks.some((b) => b.id === plannedBlockId)) return null;
  return {
    ...plan,
    plannedBlocks: plan.plannedBlocks.map((b) => (b.id === plannedBlockId ? { ...b, ...edit } : b)),
  };
}
