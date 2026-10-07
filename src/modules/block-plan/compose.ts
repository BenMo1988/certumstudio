import { z } from "zod";
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

/**
 * Human Block Plan Override, toevoegen: de opleider voegt een ontbrekend gepland blok toe op een gekozen positie (vóór
 * of na een bestaand blok, of aan het einde). Alleen fase, bloktype, doel, motivering en configuratie-intenties; id en
 * volgorde zet de server. Strict: onbekende velden (bijv. `id` of `sequence`) worden geweigerd.
 */
export const PlannedBlockAdditionSchema = z.strictObject({
  block: PlannedBlockSchema.pick({
    certumPhase: true,
    catalogBlockId: true,
    purpose: true,
    whyThisBlock: true,
    configurationIntent: true,
  }).strict(),
  placement: z.discriminatedUnion("position", [
    z.strictObject({ position: z.literal("end") }),
    z.strictObject({ position: z.enum(["before", "after"]), anchorBlockId: z.string().min(1) }),
  ]),
});

export type PlannedBlockAddition = z.infer<typeof PlannedBlockAdditionSchema>;

const BLOCK_ID = /^blok-([1-9][0-9]*)$/;

/**
 * Een nieuw Block Plan met één handmatig toegevoegd blok; het origineel blijft ongewijzigd. `null` als het ankerblok niet
 * bestaat. Bestaande ids blijven gelijk; het nieuwe blok krijgt `blok-(hoogste nummer + 1)` en de volgorde wordt
 * deterministisch hernummerd naar 1..n. Daarna gelden dezelfde Zod-regels en `checkBlockPlanInvariants` als voor een
 * gegenereerd plan (catalogus, fasen in methodiekvolgorde, open-choice-regels, geen bron-URL, maximum aantal blokken).
 */
export function applyPlannedBlockAddition(plan: BcOnlineBlockPlan, addition: PlannedBlockAddition): { plan: BcOnlineBlockPlan; addedBlockId: string } | null {
  const ordered = [...plan.plannedBlocks].sort((a, b) => a.sequence - b.sequence);
  let index = ordered.length;
  if (addition.placement.position !== "end") {
    const anchor = ordered.findIndex((b) => b.id === (addition.placement as { anchorBlockId: string }).anchorBlockId);
    if (anchor < 0) return null;
    index = addition.placement.position === "before" ? anchor : anchor + 1;
  }
  const highest = Math.max(0, ...plan.plannedBlocks.map((b) => Number(BLOCK_ID.exec(b.id)?.[1] ?? 0)));
  const addedBlockId = `blok-${highest + 1}`;
  const added: PlannedBlock = { id: addedBlockId, sequence: 0, ...addition.block };
  const next = [...ordered.slice(0, index), added, ...ordered.slice(index)].map((b, i) => ({ ...b, sequence: i + 1 }));
  return { plan: { ...plan, plannedBlocks: next }, addedBlockId };
}
