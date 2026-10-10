import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPreflightText } from "@/modules/privacy";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { AnalysisError } from "@/services/analysis/errors";
import { createBlockContentService } from "@/services/block-content/factory";
import type { BlockContentService } from "@/services/block-content/services";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { MockLearningLineArchitect } from "@/services/learning-line/mock-learning-line-architect";
import type { LearningLineArchitectService } from "@/services/learning-line/services";
import { MockSourceSelector } from "@/services/learning-line/source-selector";
import { loadLearningLineSnapshot } from "@/services/storage/learning-line-record";
import { loadTrainingRecordSnapshot } from "@/services/storage/training-record";
import { loadTrainingWorkspace } from "@/services/storage/workspace";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { startTraining, type WorkflowDeps } from "../../trainings/workflow/persisted-workflow";
import {
  approveGate1,
  approveGate2,
  loadLearningLinePackages,
  loadLearningLineView,
  prepareModules,
  produceContent,
  requestDesignRevision,
  startLearningLine,
  type Gate1Input,
  type LearningLineDeps,
  type LearningLineView,
  type LearningLineWorkflowLogEntry,
} from "./learning-lines";

/*
 * Leerlijn Engine V1 + Gate Compression V1 tegen PGlite met mock-providers: één prompt → zes voorbereide modules →
 * Gate 1 (één GO) → begrensd parallelle productie → Gate 2 (één GO) → pakketten. 0 AI-aanroepen.
 */

const PROMPT = "Ontwikkel een leerlijn voor jeugd- en gezinsprofessionals over professioneel begrenzen onder druk.";
const mock = { promptVersion: "mock", modelVersion: "mock" };
const PASSAGE = "Synthetische passage BX-77: een professional maakt duidelijk wat anderen van hem mogen verwachten.";

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

function trainingDeps(content?: () => BlockContentService): WorkflowDeps {
  return {
    db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: content ?? (() => createBlockContentService({})),
    provenance: { analysis: mock, blueprint: mock, blockPlan: mock, blockContent: mock },
    log: () => {},
  };
}

function deps(opts: { logs?: LearningLineWorkflowLogEntry[]; architect?: LearningLineArchitectService; content?: () => BlockContentService } = {}): LearningLineDeps {
  return { db, getArchitect: () => opts.architect ?? new MockLearningLineArchitect(), getSourceSelector: () => new MockSourceSelector(), provenance: mock, training: trainingDeps(opts.content), concurrency: 3, log: (e) => opts.logs?.push(e) };
}

async function prepared(d = deps()) {
  const result = await startLearningLine(d, { prompt: PROMPT, syntheticDataAttested: true });
  if (result.status !== "created" || result.result.status !== "ok") throw new Error(JSON.stringify(result));
  return { id: result.learningLineId, view: result.result.view, d };
}

/** Wat de opleider in het Gate 1-scherm kiest: alle scopes professioneel, bronnen uit de bibliotheek of één extra bron. */
function gate1(view: LearningLineView, opts: { extra?: boolean; scopes?: boolean } = {}): Gate1Input {
  return {
    revisionId: view.design!.revisionId,
    syntheticDataAttested: true,
    sourcesValidated: true,
    modules: Object.fromEntries(
      view.modules.map((m) => [
        m.moduleId,
        {
          blueprintRevisionId: m.blueprint!.revisionId,
          planHash: m.plan!.hash,
          scopes: opts.scopes === false ? {} : Object.fromEntries(m.blueprint!.sourceNeeds.map((n) => [n.id, "professional" as const])),
          librarySourceIds: m.proposedSourceIds,
          extraSources: opts.extra
            ? [{ title: "Testrichtlijn de-escalatie", sourceType: "guideline" as const, author: null, publisher: "Fictief Kenniscentrum", publicationDate: "2025", url: null, relevantContent: PASSAGE }]
            : [],
        },
      ]),
    ),
  };
}

describe("één prompt → ontwerp → automatische voorbereiding", () => {
  it("zes modules, elk een training met analyse, systeemrichting, Blueprint en voorlopig Block Plan; status Gate 1", async () => {
    const { view } = await prepared();
    expect(view.status).toBe("gate1");
    expect(view.modules).toHaveLength(6);
    for (const m of view.modules) {
      expect(m.blocker).toBeNull();
      expect(m.direction).not.toBeNull();
      expect(m.blueprint).toMatchObject({ approved: false });
      expect(m.plan).toMatchObject({ approved: false, hash: expect.stringMatching(/^[0-9a-f]{64}$/) });
      // Het voorlopige plan staat niet in het Training Record; de richting is een systeemvoorstel (event).
      const snap = (await loadTrainingRecordSnapshot(db, m.training!.id))!;
      expect(snap.revisions.some((r) => r.artifactType === "block_plan")).toBe(false);
      expect(snap.events.filter((e) => e.eventType === "direction_selected")).toHaveLength(1);
      expect(snap.events.some((e) => e.eventType === "approved")).toBe(false);
    }
  }, 120_000);

  it("Privacy Preflight en synthetic_only gelden voor de prompt; bij een blokkade wordt niets opgeslagen", async () => {
    const before = await db.query<{ n: number }>("select count(*)::int as n from learning_line");
    expect(await startLearningLine(deps(), { prompt: `${PROMPT} Mail naar test@example.nl.`, syntheticDataAttested: true })).toMatchObject({ status: "rejected", reason: "privacy_blocked", categories: ["email"] });
    expect(await startLearningLine(deps(), { prompt: PROMPT, syntheticDataAttested: false })).toMatchObject({ status: "rejected", reason: "input_gate" });
    expect((await db.query<{ n: number }>("select count(*)::int as n from learning_line"))[0].n).toBe(before[0].n);
  });

  it("een module-invoer met een gemarkeerd fragment stopt alleen die module tot de opleider bevestigt", async () => {
    const named: LearningLineArchitectService = {
      async generate(request) {
        const design = await new MockLearningLineArchitect().generate(request);
        design.modules[2] = { ...design.modules[2], primaryScenarioDirection: "Een gesprek met de vader van Noor over de planning." };
        return design;
      },
    };
    const d = deps({ architect: named });
    const { id, view } = await prepared(d);
    const m3 = view.modules.find((m) => m.moduleId === "M3")!;
    expect(view.status).toBe("gate1");
    expect(m3).toMatchObject({ blocker: "input_review", training: null });
    expect(view.modules.filter((m) => m.blocker === null)).toHaveLength(5);
    const resumed = await prepareModules(d, id, { M3: m3.inputCheck!.findings.map((f) => f.id) });
    expect(resumed.status === "ok" && resumed.view.modules.find((m) => m.moduleId === "M3")).toMatchObject({ blocker: null, plan: expect.anything() });
  }, 120_000);

  it("één revisie-instructie: nieuwe ontwerpversie met eigen voorbereide modules; de vorige blijven historie", async () => {
    const { id, view, d } = await prepared();
    const r = await requestDesignRevision(d, id, view.design!.revisionId, "Maak module 6 complexer.");
    if (r.status !== "ok") throw new Error(r.reason);
    expect(r.view.design!.revisionNo).toBe(2);
    expect(r.view.status).toBe("gate1");
    const snap = (await loadLearningLineSnapshot(db, id))!;
    expect(snap.modules).toHaveLength(12);
    expect(new Set(r.view.modules.map((m) => m.training!.id)).size).toBe(6);
    expect(await requestDesignRevision(d, id, view.design!.revisionId, "Nog een keer.")).toMatchObject({ reason: "stale_revision" });
  }, 120_000);
});

describe("Gate 1 (één GO)", () => {
  it("controleert alles vóór het schrijven: attestatie, scopes, bronnen en de planhash die de opleider zag", async () => {
    const { id, view, d } = await prepared();
    const ok = gate1(view, { extra: true });
    expect(await approveGate1(d, id, { ...ok, syntheticDataAttested: false })).toMatchObject({ reason: "input_gate" });
    expect(await approveGate1(d, id, { ...ok, sourcesValidated: false })).toMatchObject({ reason: "input_gate" });
    expect(await approveGate1(d, id, gate1(view, { extra: true, scopes: false }))).toMatchObject({ reason: "scope_required" });
    const noSources = gate1(view);
    for (const m of Object.values(noSources.modules)) m!.librarySourceIds = [];
    expect(await approveGate1(d, id, noSources)).toMatchObject({ reason: "sources_missing" });
    expect(await approveGate1(d, id, { ...ok, modules: { ...ok.modules, M1: { ...ok.modules.M1!, planHash: "f".repeat(64) } } })).toMatchObject({ reason: "stale_revision", moduleId: "M1" });
    // Niets geschreven: alle Blueprints nog niet goedgekeurd.
    const after = (await loadLearningLineView(db, id))!;
    expect(after.status).toBe("gate1");
    expect(after.modules.every((m) => m.blueprint && !m.blueprint.approved)).toBe(true);
  }, 120_000);

  it("GO legt per module de afzonderlijke besluiten vast; het plan is exact het voorlopige plan", async () => {
    const { id, view, d } = await prepared();
    const r = await approveGate1(d, id, gate1(view, { extra: true }));
    if (r.status !== "ok") throw new Error(`${r.reason} ${r.moduleId ?? ""}`);
    expect(r.view.status).toBe("producing");
    for (const m of r.view.modules) {
      const ws = (await loadTrainingWorkspace(db, m.training!.id))!;
      expect(ws.blueprint).toMatchObject({ approved: true });
      expect(ws.blueprint!.payload.sourceNeeds.every((n) => n.scope === "professional")).toBe(true);
      expect(ws.blockPlan).toMatchObject({ approved: true });
      expect(r.view.modules.find((x) => x.moduleId === m.moduleId)!.plan!.hash).toBe(view.modules.find((x) => x.moduleId === m.moduleId)!.plan!.hash);
      expect(ws.sources!.items).toEqual([expect.objectContaining({ validated: true, payload: expect.objectContaining({ relevantContent: PASSAGE }) })]);
      expect(ws.sources!.allCovered).toBe(true);
    }
    // Herhalen voegt niets toe.
    expect((await approveGate1(d, id, gate1(view, { extra: true }))).status).toBe("ok");
    expect((await loadLearningLineSnapshot(db, id))!.events.filter((e) => e.eventType === "design_approved")).toHaveLength(1);
  }, 120_000);

  it("bronnen komen vooraf ingevuld uit de bibliotheek van eerder gevalideerde passages; nooit gegenereerd", async () => {
    const { view } = await prepared();
    expect(view.library!.some((l) => l.fields.relevantContent === PASSAGE)).toBe(true);
    // De bronselectie stelt per module bestaande bibliotheek-ids voor; testbronnen ("synthetisch") staan er niet in.
    expect(view.modules.every((m) => m.proposedSourceIds.length > 0 && m.proposedSourceIds.every((id) => view.library!.some((l) => l.libraryId === id)))).toBe(true);
    expect(view.library!.some((l) => /synthetisch/i.test(l.fields.title))).toBe(false);
    const { id, d } = await prepared();
    const fresh = (await loadLearningLineView(db, id))!;
    const r = await approveGate1(d, id, gate1(fresh));
    expect(r.status).toBe("ok");
  }, 180_000);
});

describe("productie na Gate 1 en Gate 2", () => {
  it("begrensd parallel, zonder automatische retry; een mislukt blok blijft een uitzondering met herstel", async () => {
    let calls = 0;
    let failOnce = true;
    const content = () => {
      const service = createBlockContentService({});
      const generate = service.generate.bind(service);
      service.generate = async (request) => {
        calls++;
        if (failOnce && request.plannedBlockId === "blok-2") {
          failOnce = false;
          throw new AnalysisError("invalid-output", "test");
        }
        return generate(request);
      };
      return service;
    };
    const d = deps({ content });
    const { id, view } = await prepared(d);
    const approved = await approveGate1(d, id, gate1(view, { extra: true }));
    expect(approved.status).toBe("ok");
    const first = await produceContent(d, id);
    if (first.status !== "ok") throw new Error(first.reason);
    expect(first.issues).toEqual([expect.objectContaining({ step: "block", plannedBlockId: "blok-2", reason: "invalid_output" })]);
    expect(first.view.status).toBe("producing");
    const callsAfterFirst = calls;
    const resumed = await produceContent(d, id);
    if (resumed.status !== "ok") throw new Error(resumed.reason);
    expect(resumed.issues ?? []).toEqual([]);
    expect(calls).toBe(callsAfterFirst + 1);
    expect(resumed.view.status).toBe("gate2");
  }, 180_000);

  it("Gate 2: één GO over exact de getoonde inhoud; daarna Training gereed en een compleet pakket", async () => {
    const { id, view, d } = await prepared();
    await approveGate1(d, id, gate1(view, { extra: true }));
    const produced = await produceContent(d, id);
    if (produced.status !== "ok") throw new Error(produced.reason);
    expect(produced.view.status).toBe("gate2");
    expect(await approveGate2(d, id, "0".repeat(64))).toMatchObject({ reason: "stale_revision" });
    const done = await approveGate2(d, id, produced.view.gate2!.fingerprint);
    if (done.status !== "ok") throw new Error(done.reason);
    expect(done.view.status).toBe("package_approved");
    for (const m of done.view.modules) {
      const ws = (await loadTrainingWorkspace(db, m.training!.id))!;
      expect(ws.progress.stage).toBe("training_ready");
      const snap = (await loadTrainingRecordSnapshot(db, m.training!.id))!;
      // Onderliggend afzonderlijke besluiten: per blok, Start en Einde.
      const approvedBlocks = snap.events.filter((e) => e.eventType === "approved" && snap.revisions.find((r) => r.id === e.artifactRevisionId)?.artifactType === "block_content");
      expect(approvedBlocks).toHaveLength(ws.content!.package.blocks.length);
    }
    const packages = (await loadLearningLinePackages(db, id))!;
    expect(packages.certum.readiness).toMatchObject({ designApproved: true, modulesReady: 6, complete: true });
    expect(packages.tom.modules.every((m) => m.status === "ready")).toBe(true);
    expect(packages.skj.readiness.humanRequired).toContain("expertiseDomain");
    expect(JSON.stringify(packages.tom)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    // Idempotent.
    expect((await approveGate2(d, id, produced.view.gate2!.fingerprint)).status).toBe("ok");
  }, 240_000);

  it("Gate 2 kan niet vóór de productie; productie niet vóór Gate 1", async () => {
    const { id, view, d } = await prepared();
    expect(await produceContent(d, id)).toMatchObject({ reason: "invalid_state" });
    expect(await approveGate2(d, id, "0".repeat(64))).toMatchObject({ reason: "not_ready" });
    await approveGate1(d, id, gate1(view, { extra: true }));
    expect(await approveGate2(d, id, "0".repeat(64))).toMatchObject({ reason: "not_ready" });
  }, 120_000);
});

describe("garanties", () => {
  it("een bestaande, losse training blijft ongewijzigd", async () => {
    const text = "Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt?";
    const other = await startTraining(trainingDeps(), { kind: "praktijkvraag", text, acknowledgement: { textHash: await hashPreflightText(text), acknowledgedFindingIds: [], syntheticDataAttested: true } });
    if (other.status !== "created") throw new Error(other.reason);
    const before = await loadTrainingRecordSnapshot(db, other.trainingId);
    const { id, view, d } = await prepared();
    await approveGate1(d, id, gate1(view, { extra: true }));
    await produceContent(d, id);
    expect(await loadTrainingRecordSnapshot(db, other.trainingId)).toEqual(before);
  }, 180_000);

  it("het ontwerp en de voorlopige plannen zijn immutable", async () => {
    const { id } = await prepared();
    await expect(db.query("update learning_line_revision set revision_no = 9 where learning_line_id = $1", [id])).rejects.toThrow(/append-only/);
    await expect(db.query("delete from learning_line_module_plan where learning_line_id = $1", [id])).rejects.toThrow(/append-only/);
  }, 120_000);

  it("logs bevatten geen prompt, aanwijzing, ontwerp- of brontekst", async () => {
    const logs: LearningLineWorkflowLogEntry[] = [];
    const d = deps({ logs });
    const { id, view } = await prepared(d);
    await requestDesignRevision(d, id, view.design!.revisionId, "Aanwijzing ZQ-42.");
    const json = JSON.stringify([logs, consoleCalls]);
    for (const value of ["begrenzen", "ZQ-42", "BX-77", view.design!.payload.modules[0].title]) expect(json).not.toContain(value);
  }, 180_000);

  it("migraties 003 t/m 005 raken het Training Record niet", () => {
    for (const file of ["003_certum_learning_lines.sql", "004_learning_line_gate_compression.sql", "005_learning_line_source_selection.sql"]) {
      const sql = readFileSync(join(process.cwd(), "migrations", file), "utf8").toLowerCase();
      expect(sql).not.toMatch(/alter\s+table\s+(training|training_input|artifact_revision|workflow_event)\b/);
      expect(sql).not.toMatch(/drop\s+table|truncate|delete\s+from|update\s+\w+\s+set/);
    }
  });
});
