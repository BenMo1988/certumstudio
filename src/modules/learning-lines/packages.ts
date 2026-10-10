import type { BlockContentResult, TrainingContentPackage } from "@/modules/block-content";
import type { SourceKind } from "@/modules/sources/schema";
import { MODULE_IDS, plannedStudyMinutes, type LearningLineDesign, type ModuleId } from "./schema";

/*
 * De afleidbare pakketten van een leerlijn. Pure functies over de opgeslagen stand (`LearningLineState`): dezelfde
 * persisted state geeft altijd hetzelfde pakket. Niets wordt hier opgeslagen; geen tijdstempels, geen willekeur.
 *
 * - Certum Package: de volledige interne stand (metadata, modules, blokken, bronnen, toetsing, studielast, readiness,
 *   provenance) voor Bureau Certum.
 * - Tom Package: transport-agnostisch overdrachtscontract voor een externe leeromgeving. Alleen wat nodig is om de
 *   leerlijn te reconstrueren; geen Studio-interne ids, hashes, model- of promptversies, invoer of analyse.
 * - Accreditatiepakketten (SKJ, …) bouwt `modules/accreditation` op deze stand; ze zitten niet in de kern.
 */

/** Een current, gevalideerde bron zoals een module hem gebruikt (zonder broninhoud). */
export interface ModuleSourceReference {
  title: string;
  sourceType: SourceKind;
  author: string | null;
  publisher: string | null;
  publicationDate: string | null;
  url: string | null;
  sourceNeedRefs: string[];
}

/** De productiestand van één module, afgeleid uit het Training Record van de gekoppelde training. */
export interface ModuleProduction {
  moduleId: ModuleId;
  /** null: voor deze module is nog geen training aangemaakt. */
  trainingCode: string | null;
  stageLabel: string | null;
  /** Training gereed: alle onderdelen in de current versie goedgekeurd. */
  ready: boolean;
  /** Leerdoel uit de goedgekeurde Blueprint (canoniek zodra die er is). */
  learningGoal: string | null;
  /** Alleen bij `ready`: het goedgekeurde inhoudspakket. */
  content: TrainingContentPackage | null;
  sources: ModuleSourceReference[];
}

export interface LearningLineState {
  line: { code: string; title: string };
  design: LearningLineDesign;
  designRevisionNo: number;
  designHash: string;
  designApproved: boolean;
  /** Precies zes, in de volgorde M1..M6. */
  modules: ModuleProduction[];
}

export const CERTUM_PACKAGE_VERSION = "certum-learning-line-package/v1";
export const TOM_PACKAGE_VERSION = "certum-tom-package/v1";

const blockMinutes = (blocks: BlockContentResult[]) => blocks.reduce((sum, b) => sum + (b.accreditation.estimatedMinutes ?? 0), 0);

function ordered(state: LearningLineState): ModuleProduction[] {
  return MODULE_IDS.map((id) => state.modules.find((m) => m.moduleId === id) ?? emptyProduction(id));
}

export function emptyProduction(moduleId: ModuleId): ModuleProduction {
  return { moduleId, trainingCode: null, stageLabel: null, ready: false, learningGoal: null, content: null, sources: [] };
}

export function buildCertumPackage(state: LearningLineState) {
  const productions = ordered(state);
  const modules = state.design.modules.map((spec, i) => {
    const p = productions[i];
    const blocks = [...(p.content?.blocks ?? [])].sort((a, b) => a.sequence - b.sequence);
    return {
      moduleId: spec.id,
      sequence: spec.sequence,
      title: spec.title,
      uniqueProfessionalTension: spec.uniqueProfessionalTension,
      learningFunction: spec.learningFunction,
      routePolicy: spec.routePolicy,
      plannedLearningGoals: spec.learningGoals,
      approvedLearningGoal: p.learningGoal,
      successCriteria: spec.successCriteria,
      assessmentDirection: spec.assessmentDirection,
      sourceNeeds: spec.sourceNeeds,
      production: { trainingCode: p.trainingCode, stage: p.stageLabel, ready: p.ready },
      blocks: blocks.map((b) => ({
        sequence: b.sequence,
        plannedBlockId: b.plannedBlockId,
        certumPhase: b.certumPhase,
        catalogBlockId: b.catalogBlockId,
        workform: b.accreditation.workform,
        assessmentRole: b.accreditation.assessmentRole,
        estimatedMinutes: b.accreditation.estimatedMinutes,
        status: b.body.status,
        reviewStatus: b.reviewStatus,
      })),
      sources: p.sources,
      studyLoad: { plannedMinutes: spec.estimatedMinutes, producedMinutes: p.ready ? blockMinutes(blocks) : null },
    };
  });
  const ready = productions.filter((p) => p.ready).length;
  return {
    version: CERTUM_PACKAGE_VERSION,
    learningLine: {
      code: state.line.code,
      title: state.design.title,
      targetAudience: state.design.targetAudience,
      professionalProblem: state.design.professionalProblem,
      overarchingCompetency: state.design.overarchingCompetency,
      promise: state.design.promise,
      professionalRelevance: state.design.professionalRelevance,
      progression: state.design.progression,
      overlapPrevention: state.design.overlapPrevention,
      assessmentArc: state.design.assessmentArc,
    },
    modules,
    studyLoad: {
      plannedMinutes: plannedStudyMinutes(state.design),
      producedMinutes: ready === modules.length ? modules.reduce((sum, m) => sum + (m.studyLoad.producedMinutes ?? 0), 0) : null,
    },
    readiness: { designApproved: state.designApproved, modulesReady: ready, modulesTotal: modules.length, complete: state.designApproved && ready === modules.length },
    provenance: { learningLineContract: state.design.version, designRevision: state.designRevisionNo, designHash: state.designHash },
  };
}

export type CertumPackage = ReturnType<typeof buildCertumPackage>;

/**
 * Tom Package: alleen deelnemerinhoud, configuratie en volgorde. Een module die nog niet gereed is, staat erin met
 * `status: "not_ready"` en zonder inhoud. Bron-referenties zonder broninhoud (geen passages).
 */
export function buildTomPackage(state: LearningLineState) {
  const productions = ordered(state);
  return {
    version: TOM_PACKAGE_VERSION,
    learningLine: { title: state.design.title, targetAudience: state.design.targetAudience, promise: state.design.promise, moduleCount: state.design.modules.length },
    modules: state.design.modules.map((spec, i) => {
      const p = productions[i];
      if (!p.ready || !p.content) return { sequence: spec.sequence, title: spec.title, status: "not_ready" as const };
      const c = p.content;
      return {
        sequence: spec.sequence,
        title: c.title,
        status: "ready" as const,
        learningGoal: c.learningGoal,
        estimatedMinutes: blockMinutes(c.blocks),
        start: { title: c.start.title, introduction: c.start.introduction, learningGoals: c.start.learningGoals },
        blocks: [...c.blocks]
          .sort((a, b) => a.sequence - b.sequence)
          .map((b) => ({
            sequence: b.sequence,
            blockKey: b.plannedBlockId,
            certumPhase: b.certumPhase,
            blockType: b.catalogBlockId,
            workform: b.accreditation.workform,
            assessmentRole: b.accreditation.assessmentRole,
            estimatedMinutes: b.accreditation.estimatedMinutes,
            content: b.body.status === "generated" ? b.body.content : null,
          })),
        end: { closingText: c.end.closingText, summary: c.end.summary },
        references: p.sources.map(({ title, sourceType, author, publisher, publicationDate, url }) => ({ title, sourceType, author, publisher, publicationDate, url })),
      };
    }),
  };
}

export type TomPackage = ReturnType<typeof buildTomPackage>;
