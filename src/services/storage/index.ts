import "server-only";
import type { Db } from "./db";
import { createPostgresDb, type PostgresDb } from "./postgres-db";
import { StorageError } from "./training-record";

export type { Db } from "./db";
export {
  ARTIFACT_TYPES,
  DATA_POLICY_VERSION,
  SINGLETON_KEY,
  StorageError,
  WORKFLOW_EVENT_TYPES,
  appendWorkflowEvent,
  composeStoredContentPackage,
  createArtifactRevision,
  createTraining,
  getApprovalState,
  getArtifactRevision,
  getCurrentArtifactRevision,
  getLatestTrainingInput,
  getSelectedDirectionId,
  getTraining,
  isRevisionApproved,
  listArtifactRevisions,
  listTrainings,
  listWorkflowEvents,
  saveTrainingInput,
  type ApprovalState,
  type ArtifactRevision,
  type ArtifactType,
  type NewArtifactRevision,
  type StoredContentPackage,
  type StoredTrainingInput,
  type TrainingRecord,
  type WorkflowEvent,
  type WorkflowEventType,
} from "./training-record";

let db: PostgresDb | null = null;

/**
 * De database van Certum Studio (Supabase Postgres, Frankfurt), alleen server-side. `DATABASE_URL` staat uitsluitend
 * in `.env.local`; hij wordt nooit gelogd of naar de client gestuurd. Wordt pas bij het eerste gebruik aangemaakt.
 */
export function getDb(): Db {
  if (db) return db;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new StorageError("not_configured", "DATABASE_URL ontbreekt; zet hem in .env.local.");
  db = createPostgresDb(url);
  return db;
}
