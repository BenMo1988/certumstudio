import { describe, expect, it } from "vitest";
import type { TrainingContentPackage } from "@/modules/block-content";
import { ACCREDITATION_PROFILES, buildSkjPackage, humanRequiredPaths } from "@/modules/accreditation";
import { runPrivacyPreflight } from "@/modules/privacy";
import { MAX_INPUT_LENGTH } from "@/modules/training-agent";
import { mockLearningLineDesign } from "@/services/learning-line/mock-learning-line-architect";
import fixture from "../../../test/fixtures/tr-0018-package.json";
import {
  LearningLineDesignSchema,
  MODULE_IDS,
  buildCertumPackage,
  buildTomPackage,
  checkLearningLineInvariants,
  emptyProduction,
  moduleTrainingInputText,
  plannedStudyMinutes,
  type LearningLineState,
  type ModuleProduction,
} from "./index";

/* Certum Learning Line V1: contract, invarianten, module-invoer en de drie afgeleide pakketten. 0 AI-aanroepen. */

const PROMPT = "Ontwikkel een leerlijn voor jeugd- en gezinsprofessionals over professioneel begrenzen onder druk.";
const design = mockLearningLineDesign(PROMPT);
const content = { ...(fixture.package as unknown as TrainingContentPackage), readiness: "approved" as const };

const readyProduction = (moduleId: (typeof MODULE_IDS)[number]): ModuleProduction => ({
  moduleId,
  trainingCode: `TR-90${moduleId.slice(1)}`,
  stageLabel: "Training gereed",
  ready: true,
  learningGoal: content.learningGoal,
  content,
  sources: [{ title: "Synthetische richtlijn", sourceType: "guideline", author: null, publisher: "Fictief Kenniscentrum", publicationDate: "2025", url: null, sourceNeedRefs: ["SN1"] }],
});

const state = (modules: ModuleProduction[]): LearningLineState => ({
  line: { code: "LL-0001", title: design.title },
  design,
  designRevisionNo: 1,
  designHash: "a".repeat(64),
  designApproved: true,
  modules,
});

describe("contract: exact zes modules", () => {
  it("het mockontwerp is geldig: zes modules M1..M6 in volgorde, met progressie", () => {
    expect(LearningLineDesignSchema.safeParse(design).success).toBe(true);
    expect(checkLearningLineInvariants(design)).toEqual([]);
    expect(design.modules.map((m) => [m.id, m.sequence])).toEqual(MODULE_IDS.map((id, i) => [id, i + 1]));
    expect(design.progression.rationale.length).toBeGreaterThan(0);
    expect(new Set(design.modules.map((m) => m.id)).size).toBe(6);
  });

  it("vijf of zeven modules is ongeldig", () => {
    for (const modules of [design.modules.slice(0, 5), [...design.modules, { ...design.modules[0], id: "M1" }]]) {
      expect(LearningLineDesignSchema.safeParse({ ...design, modules }).success).toBe(false);
      expect(checkLearningLineInvariants({ ...design, modules })).toEqual(["aantal-modules"]);
    }
  });

  it("volgorde, module-ids, dubbele titels en dubbele sourceNeeds worden geweigerd", () => {
    const swapped = [design.modules[1], design.modules[0], ...design.modules.slice(2)];
    expect(checkLearningLineInvariants({ ...design, modules: swapped })).toEqual(expect.arrayContaining(["volgorde", "module-id"]));
    const duplicateTitle = design.modules.map((m, i) => (i === 1 ? { ...m, title: design.modules[0].title } : m));
    expect(checkLearningLineInvariants({ ...design, modules: duplicateTitle })).toContain("dubbele-titel");
    const duplicateNeed = design.modules.map((m, i) => (i === 0 ? { ...m, sourceNeeds: [m.sourceNeeds[0], m.sourceNeeds[0]] } : m));
    expect(checkLearningLineInvariants({ ...design, modules: duplicateNeed })).toContain("dubbele-sourceneed");
  });

  it("zonder progressie is het ontwerp ongeldig", () => {
    expect(checkLearningLineInvariants({ ...design, progression: { rationale: "", difficultyArc: "" } })).toEqual(["schema"]);
  });

  it("studielastvoorstel is de som van de zes modules", () => {
    expect(plannedStudyMinutes(design)).toBe(design.modules.reduce((s, m) => s + m.estimatedMinutes, 0));
  });
});

describe("ModuleSpec → invoer voor de bestaande Training Engine", () => {
  it("deterministisch, binnen de invoergrens en zonder preflight-bevindingen in de mock", () => {
    for (const m of design.modules) {
      const text = moduleTrainingInputText(design, m);
      expect(text).toBe(moduleTrainingInputText(mockLearningLineDesign(PROMPT), m));
      expect(text.length).toBeLessThanOrEqual(MAX_INPUT_LENGTH);
      expect(text).toContain(m.title);
      expect(text).toContain("volledig fictief");
      expect(runPrivacyPreflight(text).status).toBe("safe");
    }
  });
});

describe("pakketten", () => {
  const ready = state(MODULE_IDS.map(readyProduction));
  const partial = state([readyProduction("M1"), ...MODULE_IDS.slice(1).map(emptyProduction)]);

  it("deterministisch: dezelfde stand geeft hetzelfde pakket", () => {
    expect(buildCertumPackage(ready)).toEqual(buildCertumPackage(structuredClone(ready)));
    expect(buildTomPackage(ready)).toEqual(buildTomPackage(structuredClone(ready)));
    expect(buildSkjPackage(ready)).toEqual(buildSkjPackage(structuredClone(ready)));
  });

  it("Certum Package: zes modules in volgorde, studielast, readiness en provenance", () => {
    const pkg = buildCertumPackage(ready);
    expect(pkg.modules.map((m) => m.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pkg.readiness).toEqual({ designApproved: true, modulesReady: 6, modulesTotal: 6, complete: true });
    expect(pkg.studyLoad.producedMinutes).toBeGreaterThan(0);
    expect(pkg.provenance.designRevision).toBe(1);
    expect(buildCertumPackage(partial).readiness.complete).toBe(false);
  });

  it("Tom Package: geen Studio-interne gegevens of geheimen; niet-gereede modules zonder inhoud", () => {
    const tom = buildTomPackage(partial);
    const json = JSON.stringify(tom);
    for (const key of ["revisionId", "contentHash", "designHash", "trainingId", "trainingCode", "promptVersion", "modelVersion", "apiKey", "inputText", "relevantContent", "provenance", "reviewStatus"]) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(json).not.toMatch(/sk-ant/);
    expect(tom.modules[0]).toMatchObject({ sequence: 1, status: "ready" });
    expect(tom.modules[1]).toEqual({ sequence: 2, title: design.modules[1].title, status: "not_ready" });
    const first = tom.modules[0];
    if (first.status !== "ready") throw new Error("verwacht gereed");
    expect(first.blocks.length).toBe(content.blocks.length);
    expect(first.blocks.every((b) => typeof b.blockType === "string" && "content" in b)).toBe(true);
  });

  it("SKJ Package: wat een mens moet aanleveren is HUMAN_REQUIRED, nooit verzonnen", () => {
    const skj = buildSkjPackage(ready);
    expect(skj.readiness.humanRequired).toEqual(
      expect.arrayContaining(["studyLoad.contactHours", "expertiseDomain", "provider", "developers", "trainersAndAssessors", "points"]),
    );
    expect(skj.points).toEqual({ status: "HUMAN_REQUIRED", reason: expect.any(String) });
    expect(skj.submission).toBe("manual_after_human_review");
    // Zonder productie ook werkvormen en toetsrollen per module.
    const early = buildSkjPackage(partial);
    expect(early.readiness.humanRequired).toEqual(expect.arrayContaining(["workforms", "programme[1].workforms"]));
    expect(humanRequiredPaths(early)).toEqual(early.readiness.humanRequired);
  });
});

describe("accreditatielaag los van de kern", () => {
  it("het leerlijncontract kent geen register- of SKJ-velden", () => {
    const keys = JSON.stringify(Object.keys(LearningLineDesignSchema.shape)) + JSON.stringify(Object.keys(LearningLineDesignSchema.shape.modules.element.shape));
    expect(keys).not.toMatch(/skj|accredit|punt|point|register/i);
  });

  it("SKJ is één profiel in een register van profielen, gebouwd uit de registeronafhankelijke stand", () => {
    const ready = state(MODULE_IDS.map(readyProduction));
    expect(Object.keys(ACCREDITATION_PROFILES)).toEqual(["skj"]);
    expect(ACCREDITATION_PROFILES.skj.build(ready)).toEqual(buildSkjPackage(ready));
  });
});
