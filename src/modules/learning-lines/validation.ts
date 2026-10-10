import { LearningLineDesignSchema, MODULE_COUNT, MODULE_IDS, type LearningLineDesign } from "./schema";

/*
 * Betekenisregels van een leerlijn bovenop het schema. Alleen structurele, deterministische controles; of zes modules
 * inhoudelijk werkelijk verschillende spanningen oefenen, bewaken prompt, evals en Gate 1 (de mens).
 */

export const LEARNING_LINE_VIOLATIONS = [
  "schema",
  "aantal-modules",
  "volgorde",
  "module-id",
  "dubbele-titel",
  "dubbele-sourceneed",
  "lege-progressie",
] as const;
export type LearningLineViolation = (typeof LEARNING_LINE_VIOLATIONS)[number];

export function checkLearningLineInvariants(candidate: unknown): LearningLineViolation[] {
  const parsed = LearningLineDesignSchema.safeParse(candidate);
  if (!parsed.success) {
    const modules = (candidate as { modules?: unknown } | null)?.modules;
    return Array.isArray(modules) && modules.length !== MODULE_COUNT ? ["aantal-modules"] : ["schema"];
  }
  return checkDesign(parsed.data);
}

function checkDesign(design: LearningLineDesign): LearningLineViolation[] {
  const violations = new Set<LearningLineViolation>();
  if (design.modules.length !== MODULE_COUNT) violations.add("aantal-modules");
  design.modules.forEach((m, i) => {
    // Exact de volgorde 1..6 in de lijst, en id M1..M6 hoort bij die positie.
    if (m.sequence !== i + 1) violations.add("volgorde");
    if (m.id !== MODULE_IDS[i]) violations.add("module-id");
    const needIds = m.sourceNeeds.map((s) => s.id);
    if (new Set(needIds).size !== needIds.length) violations.add("dubbele-sourceneed");
  });
  const titles = design.modules.map((m) => m.title.trim().toLowerCase());
  if (new Set(titles).size !== titles.length) violations.add("dubbele-titel");
  if (!design.progression.rationale.trim() || !design.progression.difficultyArc.trim()) violations.add("lege-progressie");
  return [...violations];
}
