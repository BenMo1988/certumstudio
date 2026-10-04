import { expect, it } from "vitest";
import { hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import { ANALYSIS_CONTRACT_V21_VERSION } from "@/modules/training-agent/v2-1";
import { fixtureCase } from "../../../test/block-content-fixtures";
import analyses from "../../../test/fixtures/v21-ready-analyses.json";
import { canonicalJson, contentHash } from "./canonical-json";
import { createPostgresDb } from "./postgres-db";
import {
  appendWorkflowEvent,
  createArtifactRevision,
  createTraining,
  getApprovalState,
  getArtifactRevision,
  getCurrentArtifactRevision,
  getLatestTrainingInput,
  getSelectedDirectionId,
  getTraining,
  isRevisionApproved,
  saveTrainingInput,
} from "./training-record";

/*
 * Opt-in Supabase-proof (`npm run test:db`): één gecontroleerde synthetische keten tegen de echte database in
 * DATABASE_URL, plus de append-only-, revisie- en approvalcontroles. Revisions en events zijn append-only, dus iedere
 * run laat één development-prooftraining achter (titel "[development proof] …"); daarom bewust één keten en niet de
 * volledige suite (die draait op PGlite). Print alleen aantallen en uitkomsten, nooit inhoud of connection details.
 */

// Onder Vitest is NODE_ENV=test en slaat @next/env .env.local bewust over; laad hem hier expliciet (alleen server-side).
if (!process.env.DATABASE_URL) process.loadEnvFile(".env.local");
const URL_ = process.env.DATABASE_URL?.trim();
const CA006 = (analyses.cases as unknown as Record<string, { input: string; analysis: unknown }>)["CA-006"];
const { blueprint: BLUEPRINT } = fixtureCase("BLP-001");

it("Supabase persistence proof: keten → sluiten → nieuwe verbinding → herladen; append-only; revisies; approval", async () => {
  if (!URL_) throw new Error("DATABASE_URL ontbreekt in .env.local.");

  // 1. Keten schrijven met client A.
  const a = createPostgresDb(URL_);
  let ids: { training: string; code: string; textHash: string; analysis: string; blueprint: string; hash: string };
  try {
    const training = await createTraining(a, { title: "[development proof] persistence smoke" });
    const preflight = runPrivacyPreflight(CA006.input.trim());
    const input = await saveTrainingInput(a, {
      trainingId: training.id,
      inputType: "casus",
      text: CA006.input,
      acknowledgement: {
        textHash: await hashPreflightText(CA006.input),
        acknowledgedFindingIds: preflight.findings.filter((f) => f.severity === "review_required").map((f) => f.id),
        syntheticDataAttested: true,
      },
    });
    const analysis = await createArtifactRevision(a, {
      trainingId: training.id,
      artifactType: "analysis",
      contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
      payload: CA006.analysis,
      basedOnRevisionIds: [],
    });
    await appendWorkflowEvent(a, { trainingId: training.id, artifactRevisionId: analysis.id, eventType: "direction_selected", trainingDirectionId: BLUEPRINT.selectedDirectionId });
    const blueprint = await createArtifactRevision(a, {
      trainingId: training.id,
      artifactType: "blueprint",
      contractVersion: BLUEPRINT.version,
      payload: BLUEPRINT,
      basedOnRevisionIds: [analysis.id],
    });
    await appendWorkflowEvent(a, { trainingId: training.id, artifactRevisionId: blueprint.id, eventType: "approved" });
    ids = { training: training.id, code: training.code, textHash: input.textHash, analysis: analysis.id, blueprint: blueprint.id, hash: blueprint.contentHash };
  } finally {
    // 2. Client A sluiten.
    await a.close();
  }

  // 3. Nieuwe client B: de waarheid komt uitsluitend uit de database.
  const b = createPostgresDb(URL_);
  try {
    expect((await getTraining(b, ids.training))?.code).toBe(ids.code);
    expect((await getLatestTrainingInput(b, ids.training))?.textHash).toBe(ids.textHash);
    expect(await getSelectedDirectionId(b, ids.analysis)).toBe(BLUEPRINT.selectedDirectionId);
    const current = await getCurrentArtifactRevision(b, ids.training, "blueprint");
    expect(current?.id).toBe(ids.blueprint);
    expect(current?.payload).toEqual(BLUEPRINT);
    expect(canonicalJson(current?.payload)).toBe(canonicalJson(BLUEPRINT));
    expect(current?.contentHash).toBe(ids.hash);
    expect(contentHash(current?.payload)).toBe(ids.hash);
    expect(await isRevisionApproved(b, ids.blueprint)).toBe(true);

    // 4. Append-only: de database weigert wijzigingen aan revision en event.
    const refused = async (sql: string, params: unknown[]) =>
      b.query(sql, params).then(
        () => "toegestaan",
        (e: { code?: string }) => e.code ?? "fout",
      );
    expect(await refused("update artifact_revision set contract_version = 'x' where id = $1", [ids.blueprint])).toBe("P0001");
    expect(await refused("update workflow_event set event_type = 'revoked' where artifact_revision_id = $1", [ids.blueprint])).toBe("P0001");

    // 5. Revisienummering en approval-overerving: revision 2 is current, revision 1 blijft intact, 2 is niet approved.
    const v2 = await createArtifactRevision(b, {
      trainingId: ids.training,
      artifactType: "blueprint",
      contractVersion: BLUEPRINT.version,
      payload: { ...BLUEPRINT, title: `${BLUEPRINT.title} (revisie 2)` },
      basedOnRevisionIds: [ids.analysis],
    });
    expect(v2.revisionNo).toBe(2);
    expect((await getCurrentArtifactRevision(b, ids.training, "blueprint"))?.id).toBe(v2.id);
    const v1 = await getArtifactRevision(b, ids.blueprint);
    expect(v1?.revisionNo).toBe(1);
    expect(v1?.payload).toEqual(BLUEPRINT);
    expect(v1?.contentHash).toBe(ids.hash);
    expect(await getApprovalState(b, v2.id)).toEqual({ approved: false, reason: "no_decision" });
    expect(await getApprovalState(b, ids.blueprint)).toEqual({ approved: false, reason: "not_current" });

    // 6. Achtergebleven development-records van deze run (alleen aantallen).
    const [counts] = await b.query<Record<string, number>>(
      `select
         (select count(*) from training where id = $1)::int as training,
         (select count(*) from training_input where training_id = $1)::int as training_input,
         (select count(*) from artifact_revision where training_id = $1)::int as artifact_revision,
         (select count(*) from workflow_event where training_id = $1)::int as workflow_event`,
      [ids.training],
    );
    console.info(`certum.db_proof ${JSON.stringify({ trainingCode: ids.code, ...counts })}`);
    expect(counts).toEqual({ training: 1, training_input: 1, artifact_revision: 3, workflow_event: 2 });
  } finally {
    await b.close();
  }
});
