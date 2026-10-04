import { BC_ONLINE_BLOCK_PLAN_VERSION, type BcOnlineBlockPlan, type PlannedBlock } from "./schema";
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
