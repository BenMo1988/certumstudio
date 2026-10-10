import type { LearningLineState, ModuleProduction } from "@/modules/learning-lines/packages";
import { MODULE_IDS, plannedStudyMinutes } from "@/modules/learning-lines/schema";
import { humanRequired, isHumanRequired, type AccreditationProfile, type HumanRequired } from "./types";

/*
 * SKJ-profiel V1: een indieningsklaar pakket voor menselijke controle, afgeleid uit de leerlijnstand. SKJ is een
 * ontwerprandvoorwaarde, geen ontwerpleider: dit profiel leest de leerlijn, het stuurt haar niet.
 *
 * - Geen portaalautomatisering, geen indiening, geen betaling.
 * - Geen punten berekenen of beloven: dat bepaalt het register (`skjPoints` blijft overal null; hier HUMAN_REQUIRED).
 * - Deskundigheidsgebied, aanbieder, ontwikkelaars, trainers/beoordelaars en contacturen levert een mens aan.
 */

export const SKJ_PACKAGE_VERSION = "certum-skj-package/v1";

const MISSING_PRODUCTION = "De module is nog niet Training gereed; vul aan zodra de goedgekeurde inhoud er is.";

function moduleEntry(spec: LearningLineState["design"]["modules"][number], p: ModuleProduction) {
  const blocks = p.content?.blocks ?? [];
  const workforms = [...new Set(blocks.map((b) => b.accreditation.workform))].sort();
  const roles = [...new Set(blocks.map((b) => b.accreditation.assessmentRole).filter((r) => r !== "none"))].sort();
  const produced = blocks.reduce((sum, b) => sum + (b.accreditation.estimatedMinutes ?? 0), 0);
  return {
    sequence: spec.sequence,
    title: p.content?.title ?? spec.title,
    learningGoals: p.learningGoal ? [p.learningGoal] : spec.learningGoals,
    learningGoalsBasis: p.learningGoal ? ("approved_blueprint" as const) : ("planned" as const),
    content: spec.uniqueProfessionalTension,
    workforms: p.ready ? workforms : humanRequired(MISSING_PRODUCTION),
    assessment: { direction: spec.assessmentDirection, roles: p.ready ? roles : humanRequired(MISSING_PRODUCTION) },
    studyLoadMinutes: p.ready ? produced : spec.estimatedMinutes,
    studyLoadBasis: p.ready ? ("approved_blocks" as const) : ("planned" as const),
  };
}

export function buildSkjPackage(state: LearningLineState) {
  const productions = MODULE_IDS.map((id) => state.modules.find((m) => m.moduleId === id));
  const modules = state.design.modules.map((spec, i) => moduleEntry(spec, productions[i] ?? { moduleId: spec.id, trainingCode: null, stageLabel: null, ready: false, learningGoal: null, content: null, sources: [] }));
  const allReady = productions.every((p) => p?.ready);
  const sources = dedupe(productions.flatMap((p) => p?.sources ?? []).map(({ title, sourceType, author, publisher, publicationDate, url }) => ({ title, sourceType, author, publisher, publicationDate, url })));
  const workforms = allReady ? [...new Set(modules.flatMap((m) => (Array.isArray(m.workforms) ? m.workforms : [])))].sort() : humanRequired(MISSING_PRODUCTION);

  const pkg = {
    version: SKJ_PACKAGE_VERSION,
    register: "SKJ",
    submission: "manual_after_human_review" as const,
    title: state.design.title,
    targetAudience: state.design.targetAudience,
    goalAndRelevance: { professionalProblem: state.design.professionalProblem, promise: state.design.promise, professionalRelevance: state.design.professionalRelevance },
    overarchingCompetency: state.design.overarchingCompetency,
    programme: modules,
    workforms,
    assessment: { arc: state.design.assessmentArc, perModule: modules.map((m) => ({ sequence: m.sequence, ...m.assessment })) },
    studyLoad: {
      selfStudyMinutes: allReady ? modules.reduce((sum, m) => sum + m.studyLoadMinutes, 0) : plannedStudyMinutes(state.design),
      basis: allReady ? ("approved_blocks" as const) : ("planned" as const),
      contactHours: humanRequired("Online leerlijn: bevestig of er contactmomenten zijn en hoeveel uur."),
    },
    sources: sources.length > 0 ? sources : humanRequired("Er zijn nog geen gevalideerde bronnen; die ontstaan per module in de Bron-fase."),
    coherence: { progression: state.design.progression, overlapPrevention: state.design.overlapPrevention },
    expertiseDomain: humanRequired("Het deskundigheidsgebied en de SKJ-mapping kiest een mens; Certum stelt die niet vast."),
    provider: humanRequired("Gegevens van de aanbieder (Bureau Certum) aanvullen."),
    developers: humanRequired("Namen en deskundigheid van de ontwikkelaars aanvullen."),
    trainersAndAssessors: humanRequired("Wie beoordeelt of begeleidt, met deskundigheid; of bevestig dat dit niet van toepassing is."),
    points: humanRequired("Het aantal punten stelt het register vast; Certum berekent of belooft geen punten."),
  };
  return { ...pkg, readiness: { modulesReady: productions.filter((p) => p?.ready).length, humanRequired: humanRequiredPaths(pkg) } };
}

export type SkjPackage = ReturnType<typeof buildSkjPackage>;

export const SKJ_PROFILE: AccreditationProfile<SkjPackage> = { id: "skj", label: "SKJ", version: SKJ_PACKAGE_VERSION, build: buildSkjPackage };

function dedupe<T>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Alle veldpaden die een mens nog moet aanleveren, in vaste volgorde. */
export function humanRequiredPaths(value: unknown, path = ""): string[] {
  if (isHumanRequired(value)) return [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => humanRequiredPaths(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => humanRequiredPaths(v, path ? `${path}.${k}` : k));
  }
  return [];
}

export type { HumanRequired };
