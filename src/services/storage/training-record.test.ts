import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BLOCK_CONTENT_VERSION, composeContentPackage, type BlockContentResult } from "@/modules/block-content";
import { BC_ONLINE_BLOCK_PLAN_VERSION, type BcOnlineBlockPlan } from "@/modules/block-plan";
import { hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import { ANALYSIS_CONTRACT_V21_VERSION } from "@/modules/training-agent/v2-1";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { MockBlockContentService } from "@/services/block-content/mock/mock-block-content-service";
import { generateBlockContent } from "@/services/block-content/orchestrator";
import { fixtureCase } from "../../../test/block-content-fixtures";
import analyses from "../../../test/fixtures/v21-ready-analyses.json";
import { createTestDb, migrationFiles, type TestDb } from "../../../test/pglite-db";
import { canonicalJson, contentHash } from "./canonical-json";
import { applyMigrations } from "./migrations";
import * as repo from "./training-record";
import {
  appendWorkflowEvent,
  composeStoredContentPackage,
  createArtifactRevision,
  createTraining,
  getApprovalState,
  getCurrentArtifactRevision,
  getLatestTrainingInput,
  getSelectedDirectionId,
  getTraining,
  isRevisionApproved,
  listArtifactRevisions,
  listTrainings,
  saveTrainingInput,
  type ArtifactRevision,
} from "./training-record";

/*
 * Integratietests tegen een echte PostgreSQL (PGlite) met exact de migratie uit `migrations/`. Synthetische data uit de
 * fixtures: CA-006 (analyse, richting `grens-en-verantwoordelijkheid`) → Blueprint BLP-001 → Block Plan BLP-001.
 * 0 Claude-aanroepen: blokinhoud en Start/Einde komen van de mock.
 */

const CA006 = (analyses.cases as unknown as Record<string, { kind: "casus"; input: string; analysis: unknown }>)["CA-006"];
const DIRECTION = "grens-en-verantwoordelijkheid";
const { blueprint: BLUEPRINT, blockPlan: PLAN } = fixtureCase("BLP-001");
const mock = new MockBlockContentService();

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => "geen fout",
    (e: unknown) => e,
  );
}

/** Een geldige bevestiging voor exact deze tekst: alle review-bevindingen bevestigd en synthetic_only geattesteerd. */
async function acknowledgementFor(text: string, attested = true) {
  const preflight = runPrivacyPreflight(text.trim());
  return {
    textHash: await hashPreflightText(text),
    acknowledgedFindingIds: preflight.findings.filter((f) => f.severity === "review_required").map((f) => f.id),
    syntheticDataAttested: attested,
  };
}

/** Training met opgeslagen synthetische invoer en een analyse met gekozen richting. */
async function trainingWithAnalysis(target: TestDb = db) {
  const training = await createTraining(target, { title: "Privégrens en werkverantwoordelijkheid" });
  await saveTrainingInput(target, { trainingId: training.id, inputType: "casus", text: CA006.input, acknowledgement: await acknowledgementFor(CA006.input) });
  const analysis = await createArtifactRevision(target, {
    trainingId: training.id,
    artifactType: "analysis",
    contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
    promptVersion: "training-analysis/v2.1.1",
    modelVersion: "claude-opus-5-5 · medium",
    payload: CA006.analysis,
    basedOnRevisionIds: [],
  });
  await appendWorkflowEvent(target, { trainingId: training.id, artifactRevisionId: analysis.id, eventType: "direction_selected", trainingDirectionId: DIRECTION });
  return { training, analysis };
}

const saveBlueprint = (trainingId: string, analysisId: string, payload: TrainingBlueprintV2 = BLUEPRINT, target: TestDb = db) =>
  createArtifactRevision(target, {
    trainingId,
    artifactType: "blueprint",
    contractVersion: payload.version,
    promptVersion: "training-blueprint/v2.1",
    modelVersion: "claude-opus-5-5 · medium",
    payload,
    basedOnRevisionIds: [analysisId],
  });

const savePlan = (trainingId: string, blueprintId: string, payload: BcOnlineBlockPlan = PLAN) =>
  createArtifactRevision(db, {
    trainingId,
    artifactType: "block_plan",
    contractVersion: BC_ONLINE_BLOCK_PLAN_VERSION,
    payload,
    basedOnRevisionIds: [blueprintId],
  });

const approve = (rev: ArtifactRevision, target: TestDb = db) =>
  appendWorkflowEvent(target, { trainingId: rev.trainingId, artifactRevisionId: rev.id, eventType: "approved" });

async function approvedChain() {
  const { training, analysis } = await trainingWithAnalysis();
  const blueprint = await saveBlueprint(training.id, analysis.id);
  await approve(blueprint);
  const plan = await savePlan(training.id, blueprint.id);
  await approve(plan);
  return { training, analysis, blueprint, plan };
}

async function saveBlock(trainingId: string, plannedBlockId: string, basedOn: string[]) {
  const { block } = await generateBlockContent(() => mock, { blueprint: BLUEPRINT, blockPlan: PLAN, plannedBlockId, approvedEarlierContent: [] });
  return createArtifactRevision(db, {
    trainingId,
    artifactType: "block_content",
    artifactKey: plannedBlockId,
    contractVersion: BLOCK_CONTENT_VERSION,
    promptVersion: "mock",
    modelVersion: "mock",
    payload: block,
    basedOnRevisionIds: basedOn,
  });
}

describe("training en invoer", () => {
  it("training maken: unieke leesbare code TR-nnnn, synthetic_only", async () => {
    const a = await createTraining(db, { title: "Training A" });
    const b = await createTraining(db, { title: "Training B" });
    expect(a.code).toMatch(/^TR-\d{4,}$/);
    expect(b.code).not.toBe(a.code);
    expect(a).toMatchObject({ status: "concept", dataPolicy: "synthetic_only", title: "Training A" });
    expect(await getTraining(db, a.id)).toMatchObject({ id: a.id, code: a.code });
    expect((await listTrainings(db)).map((t) => t.id)).toEqual(expect.arrayContaining([a.id, b.id]));
    expect(await getTraining(db, "geen-uuid")).toBeNull();
  });

  it("invoer bewaren: alleen preflight-metadata, gebonden aan de attestatie", async () => {
    const training = await createTraining(db, { title: "Invoer" });
    const stored = await saveTrainingInput(db, { trainingId: training.id, inputType: "casus", text: CA006.input, acknowledgement: await acknowledgementFor(CA006.input) });
    expect(stored).toMatchObject({ inputType: "casus", inputText: CA006.input.trim(), textHash: await hashPreflightText(CA006.input) });
    expect(stored.attestation).toMatchObject({ syntheticDataAttested: true });
    expect(stored.dataPolicyVersion).toMatch(/^synthetic_only@attestation-[0-9a-f]{12}$/);
    expect(JSON.stringify(stored.privacyPreflight)).not.toMatch(/span|start|end/);
    expect((await getLatestTrainingInput(db, training.id))?.id).toBe(stored.id);
  });

  it("invoer zonder attestatie of met een geblokkeerde identificator wordt niet bewaard", async () => {
    const training = await createTraining(db, { title: "Geweigerd" });
    const noAttestation = saveTrainingInput(db, { trainingId: training.id, inputType: "casus", text: CA006.input, acknowledgement: await acknowledgementFor(CA006.input, false) });
    expect(await errorOf(noAttestation)).toMatchObject({ code: "input_gate" });
    const blockedText = `${CA006.input} Mail naar test@voorbeeld.nl.`;
    const blocked = saveTrainingInput(db, { trainingId: training.id, inputType: "casus", text: blockedText, acknowledgement: await acknowledgementFor(blockedText) });
    expect(await errorOf(blocked)).toMatchObject({ code: "input_gate" });
    expect(await getLatestTrainingInput(db, training.id)).toBeNull();
  });
});

describe("revisions", () => {
  it("eerste revision: revision_no 1, hash over canonieke JSON, payload exact terug", async () => {
    const { analysis } = await trainingWithAnalysis();
    expect(analysis).toMatchObject({ revisionNo: 1, artifactKey: "main", contractVersion: ANALYSIS_CONTRACT_V21_VERSION });
    expect(analysis.contentHash).toBe(contentHash(CA006.analysis));
    expect(analysis.payload).toEqual(CA006.analysis);
  });

  it("tweede revision laat de eerste intact; current is de hoogste", async () => {
    const { training, analysis } = await trainingWithAnalysis();
    const second = await createArtifactRevision(db, {
      trainingId: training.id,
      artifactType: "analysis",
      contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
      payload: CA006.analysis,
      basedOnRevisionIds: [],
    });
    expect(second.revisionNo).toBe(2);
    const all = await listArtifactRevisions(db, training.id, { artifactType: "analysis" });
    expect(all.map((r) => r.revisionNo)).toEqual([1, 2]);
    expect(all[0]).toEqual(analysis);
    expect((await getCurrentArtifactRevision(db, training.id, "analysis"))?.id).toBe(second.id);
  });

  it("een dubbel revisienummer faalt op de databaseconstraint", async () => {
    const { training, analysis } = await trainingWithAnalysis();
    const duplicate = db.query(
      `insert into artifact_revision (training_id, artifact_type, artifact_key, revision_no, contract_version, payload, content_hash)
       values ($1, 'analysis', 'main', 1, 'x', '{}'::jsonb, $2)`,
      [training.id, analysis.contentHash],
    );
    expect(await errorOf(duplicate)).toMatchObject({ code: "23505" });
  });

  it("de artifact key is consequent: block_content = plannedBlockId, de rest 'main'", async () => {
    const { training } = await trainingWithAnalysis();
    const wrongKey = createArtifactRevision(db, {
      trainingId: training.id,
      artifactType: "analysis",
      artifactKey: "blok-1",
      contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
      payload: CA006.analysis,
      basedOnRevisionIds: [],
    });
    expect(await errorOf(wrongKey)).toMatchObject({ code: "invalid_payload" });
    const viaSql = db.query(
      `insert into artifact_revision (training_id, artifact_type, artifact_key, revision_no, contract_version, payload, content_hash)
       values ($1, 'block_content', 'main', 1, 'x', '{}'::jsonb, $2)`,
      [training.id, "a".repeat(64)],
    );
    expect(await errorOf(viaSql)).toMatchObject({ code: "23514" });
  });

  it("content hash is reproduceerbaar en onafhankelijk van sleutelvolgorde", async () => {
    expect(contentHash({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: "é" } })).toBe(contentHash({ a: { c: "é", d: [2, { x: 2, y: 1 }] }, b: 1 }));
    expect(canonicalJson({ b: 1, a: [1, "x"] })).toBe('{"a":[1,"x"],"b":1}');
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
    expect(() => contentHash({ a: Number.NaN })).toThrow();
    const { training } = await trainingWithAnalysis();
    const reloaded = await getCurrentArtifactRevision(db, training.id, "analysis");
    expect(contentHash(reloaded!.payload)).toBe(reloaded!.contentHash);
  });

  it("revisions zijn immutable: geen update-functie, en de database weigert UPDATE en DELETE", async () => {
    expect(Object.keys(repo).filter((k) => /update|delete|edit|set/i.test(k))).toEqual([]);
    const { analysis } = await trainingWithAnalysis();
    expect(await errorOf(db.query("update artifact_revision set payload = '{}'::jsonb where id = $1", [analysis.id]))).toBeInstanceOf(Error);
    expect(await errorOf(db.query("delete from artifact_revision where id = $1", [analysis.id]))).toBeInstanceOf(Error);
    expect(await errorOf(db.query("update workflow_event set event_type = 'approved' where artifact_revision_id = $1", [analysis.id]))).toBeInstanceOf(Error);
    expect((await getCurrentArtifactRevision(db, analysis.trainingId, "analysis"))?.payload).toEqual(CA006.analysis);
  });

  it("based_on wordt server-side gevalideerd: types, training en geaccepteerde upstream", async () => {
    const { training, analysis } = await trainingWithAnalysis();
    expect(await errorOf(saveBlueprint(training.id, "00000000-0000-0000-0000-000000000000"))).toMatchObject({ code: "invalid_based_on" });
    expect(await errorOf(savePlan(training.id, analysis.id))).toMatchObject({ code: "invalid_based_on" });
    const other = await trainingWithAnalysis();
    expect(await errorOf(saveBlueprint(training.id, other.analysis.id))).toMatchObject({ code: "invalid_based_on" });
    // Een Blueprint die niet bij de gekozen richting hoort:
    expect(await errorOf(saveBlueprint(training.id, analysis.id, { ...BLUEPRINT, selectedDirectionId: "bespreken-werkprestaties" }))).toMatchObject({ code: "invalid_payload" });
    // Een Block Plan op een niet-goedgekeurde Blueprint:
    const blueprint = await saveBlueprint(training.id, analysis.id);
    expect(await errorOf(savePlan(training.id, blueprint.id))).toMatchObject({ code: "stale_based_on" });
  });
});

describe("workflow events en approvals", () => {
  it("direction_selected bewaart het juiste trainingDirectionId en dupliceert de analyse niet", async () => {
    const { training, analysis } = await trainingWithAnalysis();
    expect(await getSelectedDirectionId(db, analysis.id)).toBe(DIRECTION);
    const [event] = await db.query<{ event_data: Record<string, unknown>; actor_id: string | null; content_hash: string }>(
      "select event_data, actor_id, content_hash from workflow_event where artifact_revision_id = $1",
      [analysis.id],
    );
    expect(event).toEqual({ event_data: { trainingDirectionId: DIRECTION }, actor_id: null, content_hash: analysis.contentHash });
    const unknown = appendWorkflowEvent(db, { trainingId: training.id, artifactRevisionId: analysis.id, eventType: "direction_selected", trainingDirectionId: "bestaat-niet" });
    expect(await errorOf(unknown)).toMatchObject({ code: "invalid_event" });
    const viaSql = db.query(
      "insert into workflow_event (training_id, artifact_revision_id, event_type, event_data, content_hash) values ($1, $2, 'direction_selected', '{}'::jsonb, $3)",
      [training.id, analysis.id, analysis.contentHash],
    );
    expect(await errorOf(viaSql)).toMatchObject({ code: "23514" });
    expect(await errorOf(approve(analysis))).toMatchObject({ code: "invalid_event" });
  });

  it("approval geldt voor exact één revision; een nieuwe revision erft hem niet", async () => {
    const { training, analysis } = await trainingWithAnalysis();
    const v1 = await saveBlueprint(training.id, analysis.id);
    expect(await getApprovalState(db, v1.id)).toEqual({ approved: false, reason: "no_decision" });
    await approve(v1);
    expect(await isRevisionApproved(db, v1.id)).toBe(true);
    const v2 = await saveBlueprint(training.id, analysis.id, { ...BLUEPRINT, title: "Privégrens respecteren (herzien)" });
    expect(await getApprovalState(db, v1.id)).toEqual({ approved: false, reason: "not_current" });
    expect(await getApprovalState(db, v2.id)).toEqual({ approved: false, reason: "no_decision" });
    expect(await errorOf(approve(v1))).toMatchObject({ code: "not_current" });
  });

  it("een nieuwe Blueprint maakt het oude Block Plan stale (historie blijft)", async () => {
    const { training, analysis, blueprint, plan } = await approvedChain();
    expect(await isRevisionApproved(db, plan.id)).toBe(true);
    const blueprint2 = await saveBlueprint(training.id, analysis.id, { ...BLUEPRINT, title: "Herziene Blueprint" });
    await approve(blueprint2);
    expect(await getApprovalState(db, plan.id)).toEqual({ approved: false, reason: "upstream_not_approved" });
    expect(await errorOf(approve(plan))).toMatchObject({ code: "stale_based_on" });
    expect(await errorOf(saveBlock(training.id, "blok-2", [blueprint.id, plan.id]))).toMatchObject({ code: "stale_based_on" });
    expect((await listArtifactRevisions(db, training.id, { artifactType: "block_plan" })).map((r) => r.id)).toEqual([plan.id]);
  });

  it("een nieuw Block Plan maakt goedgekeurde blokinhoud stale", async () => {
    const { training, blueprint, plan } = await approvedChain();
    const block = await saveBlock(training.id, "blok-2", [blueprint.id, plan.id]);
    await approve(block);
    expect(await isRevisionApproved(db, block.id)).toBe(true);
    const plan2 = await savePlan(training.id, blueprint.id, { ...PLAN, courseShell: { ...PLAN.courseShell, description: "Herziene beschrijving." } });
    expect(await getApprovalState(db, block.id)).toEqual({ approved: false, reason: "upstream_not_approved" });
    await approve(plan2);
    expect(await isRevisionApproved(db, block.id)).toBe(false);
  });

  it("revoked trekt een approval in; opnieuw goedkeuren kan; needs_revision is geen approval", async () => {
    const { blueprint } = await approvedChain();
    await appendWorkflowEvent(db, { trainingId: blueprint.trainingId, artifactRevisionId: blueprint.id, eventType: "revoked" });
    expect(await getApprovalState(db, blueprint.id)).toEqual({ approved: false, reason: "not_approved" });
    await approve(blueprint);
    expect(await isRevisionApproved(db, blueprint.id)).toBe(true);
    await appendWorkflowEvent(db, { trainingId: blueprint.trainingId, artifactRevisionId: blueprint.id, eventType: "needs_revision" });
    expect(await isRevisionApproved(db, blueprint.id)).toBe(false);
  });

  it("alleen gegenereerde blokinhoud kan worden goedgekeurd (needs_source niet)", async () => {
    const { training, blueprint, plan } = await approvedChain();
    const bron = await saveBlock(training.id, "blok-5", [blueprint.id, plan.id]);
    expect((bron.payload as BlockContentResult).body.status).toBe("needs_source");
    expect(await errorOf(approve(bron))).toMatchObject({ code: "not_generated" });
  });

  it("een gewijzigde opgeslagen payload (buiten de API om) is nooit approved", async () => {
    const { blueprint } = await approvedChain();
    // Simuleer manipulatie: trigger tijdelijk uit, payload wijzigen, trigger weer aan.
    await db.exec("alter table artifact_revision disable trigger artifact_revision_immutable");
    await db.query(`update artifact_revision set payload = jsonb_set(payload, '{title}', '"Gemanipuleerd"') where id = $1`, [blueprint.id]);
    await db.exec("alter table artifact_revision enable trigger artifact_revision_immutable");
    expect(await getApprovalState(db, blueprint.id)).toEqual({ approved: false, reason: "hash_mismatch" });
  });
});

describe("Training Content Package uit opgeslagen revisions", () => {
  it("wordt gereconstrueerd uit current revisions, met reviewstatus uit de events", async () => {
    const { training, blueprint, plan } = await approvedChain();
    const basedOn = [blueprint.id, plan.id];
    expect(await composeStoredContentPackage(db, training.id)).toEqual({ status: "not_ready", reason: "frame_missing" });

    const frame = await mock.generateFrame({ blueprint: BLUEPRINT, blockPlan: PLAN });
    await createArtifactRevision(db, { trainingId: training.id, artifactType: "start_content", contractVersion: BLOCK_CONTENT_VERSION, payload: frame.start, basedOnRevisionIds: basedOn });
    await createArtifactRevision(db, { trainingId: training.id, artifactType: "end_content", contractVersion: BLOCK_CONTENT_VERSION, payload: frame.end, basedOnRevisionIds: basedOn });
    const blocks: ArtifactRevision[] = [];
    for (const b of PLAN.plannedBlocks) blocks.push(await saveBlock(training.id, b.id, basedOn));
    await approve(blocks[1]);
    await appendWorkflowEvent(db, { trainingId: training.id, artifactRevisionId: blocks[2].id, eventType: "needs_revision" });

    const stored = await composeStoredContentPackage(db, training.id);
    if (stored.status !== "ok") throw new Error(stored.reason);
    const expectedBlocks = blocks.map((r, i) => ({
      ...(r.payload as BlockContentResult),
      reviewStatus: i === 1 ? ("approved" as const) : i === 2 ? ("needs_revision" as const) : ("draft" as const),
    }));
    expect(stored.package).toEqual(composeContentPackage({ blueprint: BLUEPRINT, blockPlan: PLAN, frame, blocks: expectedBlocks }));
    expect(stored.package.unresolvedRequirements.some((u) => u.kind === "source")).toBe(true);

    // Nieuwe Blueprint: het pakket is niet meer samen te stellen op de oude basis.
    const { analysis } = { analysis: (await getCurrentArtifactRevision(db, training.id, "analysis"))! };
    await saveBlueprint(training.id, analysis.id, { ...BLUEPRINT, title: "Nieuwe versie" });
    expect(await composeStoredContentPackage(db, training.id)).toEqual({ status: "not_ready", reason: "blueprint_not_approved" });
  });
});

describe("migraties", () => {
  it("opnieuw toepassen is veilig; een gewijzigde toegepaste migratie is een fout", async () => {
    const outcomes = await applyMigrations(db, migrationFiles());
    expect(outcomes.every((o) => o.status === "already_applied")).toBe(true);
    const changed = migrationFiles().map((f) => ({ ...f, sql: `${f.sql}\n-- gewijzigd` }));
    expect(await errorOf(applyMigrations(db, changed))).toBeInstanceOf(Error);
  });
});

describe("gecontroleerde persistence flow", () => {
  it("training → invoer → analyse → richting → Blueprint → approve → herladen na heropenen: exact dezelfde approved Blueprint", async () => {
    const dir = mkdtempSync(join(tmpdir(), "certum-pglite-"));
    try {
      const first = await createTestDb(dir);
      const { training, analysis } = await trainingWithAnalysis(first);
      const blueprint = await saveBlueprint(training.id, analysis.id, BLUEPRINT, first);
      await approve(blueprint, first);
      await first.close();

      // Nieuwe verbinding, geen client state: de waarheid komt uitsluitend uit de database.
      const reopened = await createTestDb(dir);
      try {
        const current = await getCurrentArtifactRevision(reopened, training.id, "blueprint");
        expect(current?.id).toBe(blueprint.id);
        expect(current?.payload).toEqual(BLUEPRINT);
        expect(current?.contentHash).toBe(contentHash(BLUEPRINT));
        expect(await isRevisionApproved(reopened, blueprint.id)).toBe(true);
        expect(await getSelectedDirectionId(reopened, analysis.id)).toBe(DIRECTION);
        expect((await getTraining(reopened, training.id))?.code).toBe(training.code);
        expect((await getLatestTrainingInput(reopened, training.id))?.inputText).toBe(CA006.input.trim());
      } finally {
        await reopened.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("migratiechecksum", () => {
  it("is onafhankelijk van regeleinden (LF of CRLF na een Windows-checkout)", async () => {
    const crlf = migrationFiles().map((f) => ({ ...f, sql: f.sql.replace(/\r?\n/g, "\r\n") }));
    expect((await applyMigrations(db, crlf)).every((o) => o.status === "already_applied")).toBe(true);
  });
});

describe("opgeslagen JSON-typen", () => {
  it("payload, preflight, bevestigingen, attestatie en event_data staan als JSON-object/array, niet als JSON-string", async () => {
    const { training, analysis } = await trainingWithAnalysis();
    const [types] = await db.query<Record<string, string>>(
      `select
         (select jsonb_typeof(payload) from artifact_revision where id = $1) as payload,
         (select jsonb_typeof(privacy_preflight) from training_input where training_id = $2) as preflight,
         (select jsonb_typeof(acknowledgements) from training_input where training_id = $2) as acknowledgements,
         (select jsonb_typeof(attestation) from training_input where training_id = $2) as attestation,
         (select jsonb_typeof(event_data) from workflow_event where artifact_revision_id = $1) as event_data,
         (select pg_typeof(based_on_revision_ids)::text from artifact_revision where id = $1) as based_on`,
      [analysis.id, training.id],
    );
    expect(types).toEqual({ payload: "object", preflight: "object", acknowledgements: "array", attestation: "object", event_data: "object", based_on: "uuid[]" });
  });
});
