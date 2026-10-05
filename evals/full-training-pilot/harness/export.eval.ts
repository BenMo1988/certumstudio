import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import { createPostgresDb } from "@/services/storage/postgres-db";
import { currentRevision, isApproved, lastRelevantEvent } from "@/services/storage/snapshot";
import { loadTrainingRecordSnapshot } from "@/services/storage/training-record";
import { loadTrainingWorkspace } from "@/services/storage/workspace";

/*
 * Bewijsregistratie Full Training Pilot (alleen lezen, geen productcode). Exporteert het Training Record van één
 * training uit de database naar evals/full-training-pilot/record/: alle revisions (met herkomst, based_on en
 * besluiten) en de afgeleide workspace (pakket, review, bronnen). Logt geen verbindingsgegevens.
 *
 *   PILOT_TRAINING_ID=<uuid> PILOT_EXPORT_NAME=<naam> npx vitest run --config evals/full-training-pilot/harness/vitest.config.mts
 */

it("export training record", async () => {
  const id = process.env.PILOT_TRAINING_ID ?? "";
  const name = process.env.PILOT_EXPORT_NAME ?? "snapshot";
  process.loadEnvFile(join(process.cwd(), ".env.local"));
  const db = createPostgresDb(process.env.DATABASE_URL!.trim());
  try {
    const snap = await loadTrainingRecordSnapshot(db, id);
    if (!snap) throw new Error("training niet gevonden");
    const workspace = await loadTrainingWorkspace(db, id);
    const revisions = snap.revisions.map((r) => ({
      id: r.id,
      type: r.artifactType,
      key: r.artifactKey,
      revisionNo: r.revisionNo,
      current: currentRevision(snap, r.artifactType, r.artifactKey)?.id === r.id,
      approved: isApproved(snap, r.id),
      lastDecision: lastRelevantEvent(snap, r)?.eventType ?? null,
      promptVersion: r.promptVersion,
      modelVersion: r.modelVersion,
      createdAt: r.createdAt.toISOString(),
      basedOn: r.basedOnRevisionIds,
      payload: r.payload,
    }));
    const events = snap.events.map((e) => ({ eventNo: e.eventNo, type: e.eventType, revisionId: e.artifactRevisionId, data: e.eventData, at: e.createdAt.toISOString() }));
    const dir = join(process.cwd(), "evals/full-training-pilot/record");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${name}.json`),
      JSON.stringify({ exportedAt: new Date().toISOString(), training: { code: snap.training.code, title: snap.training.title, status: snap.training.status }, revisions, events, workspace }, null, 2),
    );
  } finally {
    await db.close?.();
  }
});
