import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrainingContentPackage } from "@/modules/block-content";
import { MODULE_IDS } from "@/modules/learning-lines";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { MockLearningLineArchitect } from "@/services/learning-line/mock-learning-line-architect";
import type { LearningLineArchitectService } from "@/services/learning-line/services";
import { loadLearningLineSnapshot, type LearningLineSnapshot } from "@/services/storage/learning-line-record";
import { loadTrainingRecordSnapshot } from "@/services/storage/training-record";
import type { TrainingWorkspaceView } from "@/services/storage/workspace";
import fixture from "../../../../test/fixtures/tr-0018-package.json";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { startTraining, type WorkflowDeps } from "../../trainings/workflow/persisted-workflow";
import {
  approveDesign,
  approvePackage,
  deriveLearningLineView,
  loadLearningLinePackages,
  loadLearningLineView,
  requestDesignRevision,
  startLearningLine,
  startProduction,
  type LearningLineDeps,
  type LearningLineWorkflowLogEntry,
} from "./learning-lines";

/*
 * Leerlijn Engine V1 tegen PGlite met mock-providers: één prompt → ontwerp → Gate 1 → zes trainingen in de bestaande
 * keten → pakketten → Gate 2. 0 AI-aanroepen.
 */

const PROMPT = "Ontwikkel een leerlijn voor jeugd- en gezinsprofessionals over professioneel begrenzen onder druk.";
const mock = { promptVersion: "mock", modelVersion: "mock" };

let db: TestDb;
let consoleCalls: unknown[][];
beforeAll(async () => {
  db = await createTestDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(() => {
  consoleCalls = [];
  for (const m of ["info", "warn", "error", "log"] as const) vi.spyOn(console, m).mockImplementation((...args: unknown[]) => void consoleCalls.push(args));
});

function trainingDeps(): WorkflowDeps {
  return {
    db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: () => createBlockContentService({}),
    provenance: { analysis: mock, blueprint: mock, blockPlan: mock, blockContent: mock },
    log: () => {},
  };
}

function deps(logs: LearningLineWorkflowLogEntry[] = [], architect: LearningLineArchitectService = new MockLearningLineArchitect()): LearningLineDeps {
  return { db, getArchitect: () => architect, provenance: mock, training: trainingDeps(), log: (e) => logs.push(e) };
}

async function created(d = deps()) {
  const result = await startLearningLine(d, { prompt: PROMPT, syntheticDataAttested: true });
  if (result.status !== "created" || result.result.status !== "ok") throw new Error(JSON.stringify(result));
  return { id: result.learningLineId, view: result.result.view, d };
}

async function approved() {
  const c = await created();
  const r = await approveDesign(c.d, c.id, { revisionId: c.view.design!.revisionId, syntheticDataAttested: true, acknowledgedFindings: {} });
  if (r.status !== "ok") throw new Error(r.reason);
  return { ...c, view: r.view };
}

describe("één prompt → leerlijnontwerp", () => {
  it("maakt een leerlijn met exact zes modules en zet hem op Gate 1", async () => {
    const { id, view } = await created();
    expect(view.status).toBe("design_review");
    expect(view.design!.revisionNo).toBe(1);
    expect(view.design!.payload.modules.map((m) => m.id)).toEqual(["M1", "M2", "M3", "M4", "M5", "M6"]);
    expect(view.gate1!.moduleInputs.every((m) => m.status === "safe")).toBe(true);
    expect(view.line.code).toMatch(/^LL-\d{4}$/);
    expect((await loadLearningLineView(db, id))!.design!.revisionId).toBe(view.design!.revisionId);
  });

  it("Privacy Preflight en synthetic_only gelden ook voor de leerlijnprompt; niets wordt opgeslagen bij een blokkade", async () => {
    const before = await db.query<{ n: number }>("select count(*)::int as n from learning_line");
    expect(await startLearningLine(deps(), { prompt: `${PROMPT} Mail naar test@example.nl.`, syntheticDataAttested: true })).toMatchObject({ status: "rejected", reason: "privacy_blocked", categories: ["email"] });
    expect(await startLearningLine(deps(), { prompt: PROMPT, syntheticDataAttested: false })).toMatchObject({ status: "rejected", reason: "input_gate" });
    const flagged = await startLearningLine(deps(), { prompt: "Ontwikkel een leerlijn over de aanpak van mevrouw Jansen.", syntheticDataAttested: true });
    expect(flagged).toMatchObject({ status: "rejected", reason: "privacy_blocked", flagged: [{ category: "possible_person_name", text: "Jansen" }] });
    expect((await db.query<{ n: number }>("select count(*)::int as n from learning_line"))[0].n).toBe(before[0].n);
  });

  it("het ontwerp is een immutable revision", async () => {
    const { id } = await created();
    await expect(db.query("update learning_line_revision set revision_no = 9 where learning_line_id = $1", [id])).rejects.toThrow(/append-only/);
  });
});

describe("Gate 1", () => {
  it("één revisie-instructie maakt precies één nieuwe versie; de vorige blijft bewaard", async () => {
    const { id, view, d } = await created();
    const r = await requestDesignRevision(d, id, view.design!.revisionId, "Maak module 6 complexer.");
    if (r.status !== "ok") throw new Error(r.reason);
    expect(r.view.design!.revisionNo).toBe(2);
    expect(r.view.status).toBe("design_review");
    const snap = (await loadLearningLineSnapshot(db, id))!;
    expect(snap.revisions).toHaveLength(2);
    // Een verouderde versie of een aanwijzing met persoonsgegevens wordt geweigerd.
    expect(await requestDesignRevision(d, id, view.design!.revisionId, "Nog een keer.")).toMatchObject({ reason: "stale_revision" });
    expect(await requestDesignRevision(d, id, r.view.design!.revisionId, "Bel 0612345678.")).toMatchObject({ reason: "privacy_blocked" });
  });

  it("GO vereist de synthetic_only-attestatie; daarna is het ontwerp vastgelegd en niet meer te reviseren", async () => {
    const { id, view, d } = await created();
    expect(await approveDesign(d, id, { revisionId: view.design!.revisionId, syntheticDataAttested: false, acknowledgedFindings: {} })).toMatchObject({ reason: "input_gate" });
    const ok = await approveDesign(d, id, { revisionId: view.design!.revisionId, syntheticDataAttested: true, acknowledgedFindings: {} });
    expect(ok).toMatchObject({ status: "ok", view: { status: "design_approved", design: { approved: true }, gate1: null } });
    expect(await requestDesignRevision(d, id, view.design!.revisionId, "Toch iets anders.")).toMatchObject({ reason: "invalid_state" });
    // Nogmaals GO voegt niets toe (idempotent).
    await approveDesign(d, id, { revisionId: view.design!.revisionId, syntheticDataAttested: true, acknowledgedFindings: {} });
    expect((await loadLearningLineSnapshot(db, id))!.events.filter((e) => e.eventType === "design_approved")).toHaveLength(1);
  });

  it("review-bevindingen in de module-invoer moeten bij GO bevestigd worden", async () => {
    const named: LearningLineArchitectService = {
      async generate(request) {
        const design = await new MockLearningLineArchitect().generate(request);
        design.modules[2] = { ...design.modules[2], primaryScenarioDirection: "Een gesprek met de vader van Noor over de planning." };
        return design;
      },
    };
    const d = deps([], named);
    const { id, view } = await created(d);
    const m3 = view.gate1!.moduleInputs.find((m) => m.moduleId === "M3")!;
    expect(m3).toMatchObject({ status: "review_required", findings: [expect.objectContaining({ category: "possible_person_name", text: "Noor" })] });
    expect(await approveDesign(d, id, { revisionId: view.design!.revisionId, syntheticDataAttested: true, acknowledgedFindings: {} })).toMatchObject({ reason: "acknowledgement_required" });
    const ok = await approveDesign(d, id, { revisionId: view.design!.revisionId, syntheticDataAttested: true, acknowledgedFindings: { M3: m3.findings.map((f) => f.id) } });
    expect(ok.status).toBe("ok");
    // De bevestiging gaat mee naar de training van M3 (zelfde preflight-regels als een losse training).
    const prod = await startProduction(d, id);
    expect(prod.status).toBe("ok");
  }, 60_000);
});

describe("productie via de bestaande Training Engine", () => {
  it("zes trainingen in de bestaande keten, gekoppeld per module, idempotent; bestaande trainingen blijven ongewijzigd", async () => {
    // Een bestaande, losse training (staat voor TR-0019): mag niet veranderen.
    const text = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
    const other = await startTraining(trainingDeps(), { kind: "praktijkvraag", text, acknowledgement: { textHash: await hashPreflightText(text), acknowledgedFindingIds: [], syntheticDataAttested: true } });
    if (other.status !== "created") throw new Error(other.reason);
    const before = await loadTrainingRecordSnapshot(db, other.trainingId);

    const { id, d } = await approved();
    expect(await startProduction(deps(), "00000000-0000-0000-0000-000000000000")).toMatchObject({ reason: "not_found" });
    const r = await startProduction(d, id);
    if (r.status !== "ok") throw new Error(r.reason);
    expect(r.view.status).toBe("in_production");
    expect(r.view.production).toEqual({ started: 6, ready: 0, total: 6 });
    for (const m of r.view.modules) {
      const snap = (await loadTrainingRecordSnapshot(db, m.training!.id))!;
      expect(snap.input?.inputType).toBe("praktijkvraag");
      expect(snap.input?.inputText).toContain(`module ${m.sequence} van 6`);
      // De bestaande Certum Analyse is uitgevoerd; daarna volgen de bestaande menselijke stappen per training.
      expect(snap.revisions.some((rev) => rev.artifactType === "analysis")).toBe(true);
      expect(snap.events.some((e) => e.eventType === "direction_selected")).toBe(false);
    }
    const again = await startProduction(d, id);
    expect(again.status === "ok" && again.view.modules.map((m) => m.training!.id)).toEqual(r.view.modules.map((m) => m.training!.id));
    expect(await loadTrainingRecordSnapshot(db, other.trainingId)).toEqual(before);
  }, 60_000);

  it("productie kan niet vóór Gate 1", async () => {
    const { id, d } = await created();
    expect(await startProduction(d, id)).toMatchObject({ reason: "invalid_state" });
  });
});

describe("pakketten en Gate 2", () => {
  it("pakketten zijn deterministisch afgeleid uit de opgeslagen stand", async () => {
    const { id, d } = await approved();
    await startProduction(d, id);
    const a = await loadLearningLinePackages(db, id);
    const b = await loadLearningLinePackages(db, id);
    expect(a).toEqual(b);
    expect(a!.certum.readiness).toMatchObject({ designApproved: true, modulesReady: 0, complete: false });
    expect(a!.tom.modules.every((m) => m.status === "not_ready")).toBe(true);
    expect(JSON.stringify(a!.tom)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(a!.skj.readiness.humanRequired).toContain("expertiseDomain");
  }, 60_000);

  it("Gate 2 kan pas als alle zes modules Training gereed zijn", async () => {
    const { id, d } = await approved();
    await startProduction(d, id);
    const view = (await loadLearningLineView(db, id))!;
    expect(await approvePackage(d, id, view.packages!.certumHash)).toMatchObject({ reason: "not_ready" });
  }, 60_000);

  it("met zes gereede modules: package_ready, en Gate 2 bindt aan de hash van het Certum Package", async () => {
    const { id } = await approved();
    const snap = (await loadLearningLineSnapshot(db, id))!;
    // Zes gekoppelde, gereede trainingen (afgeleid; de echte keten is per training getest).
    const linked: LearningLineSnapshot = { ...snap, modules: MODULE_IDS.map((m) => ({ moduleId: m, trainingId: `t-${m}`, revisionId: snap.revisions[0].id })) };
    const pkg = { ...(fixture.package as unknown as TrainingContentPackage), readiness: "approved" as const };
    const ws = (code: string) =>
      ({ training: { code }, progress: { stage: "training_ready", label: "Training gereed" }, content: { package: pkg }, blueprint: { approved: true, payload: { learningGoal: pkg.learningGoal } }, sources: { items: [] } }) as unknown as TrainingWorkspaceView;
    const workspaces = new Map(linked.modules.map((m, i) => [m.trainingId, ws(`TR-99${i}`)]));
    const view = deriveLearningLineView(linked, workspaces);
    expect(view.status).toBe("package_ready");
    expect(view.packages).toMatchObject({ complete: true, approved: false });
    const approvedSnap: LearningLineSnapshot = {
      ...linked,
      events: [...linked.events, { eventNo: 999, revisionId: snap.revisions[0].id, eventType: "package_approved", eventData: { packageHash: view.packages!.certumHash }, contentHash: snap.revisions[0].contentHash, createdAt: new Date(0) }],
    };
    expect(deriveLearningLineView(approvedSnap, workspaces)).toMatchObject({ status: "package_approved", packages: { approved: true } });
    // Een andere pakkethash (bijv. na een latere wijziging in een module) telt niet als goedgekeurd.
    const otherHash: LearningLineSnapshot = { ...approvedSnap, events: approvedSnap.events.map((e) => (e.eventNo === 999 ? { ...e, eventData: { packageHash: "b".repeat(64) } } : e)) };
    expect(deriveLearningLineView(otherHash, workspaces).status).toBe("package_ready");
  });
});

describe("privacy en schema", () => {
  it("logs bevatten geen prompt, aanwijzing of ontwerptekst", async () => {
    const logs: LearningLineWorkflowLogEntry[] = [];
    const { id, view } = await created(deps(logs));
    await requestDesignRevision(deps(logs), id, view.design!.revisionId, "Aanwijzing ZQ-42.");
    const json = JSON.stringify([logs, consoleCalls]);
    for (const value of ["begrenzen", "ZQ-42", view.design!.payload.modules[0].title]) expect(json).not.toContain(value);
  });

  it("migratie 003 voegt alleen tabellen toe en wijzigt geen bestaande tabellen", () => {
    const sql = readFileSync(join(process.cwd(), "migrations", "003_certum_learning_lines.sql"), "utf8").toLowerCase();
    expect(sql).not.toMatch(/alter\s+table|drop\s+|truncate|delete\s+from|update\s+\w+\s+set/);
  });
});
