import { ACTIVE_DATA_POLICY, SYNTHETIC_DATA_ATTESTATION, evaluateDataPolicy } from "@/modules/governance";
import { LEARNING_LINE_VERSION, LearningLineDesignSchema, MODULE_IDS, checkLearningLineInvariants, type LearningLineDesign, type ModuleId } from "@/modules/learning-lines";
import { PREFLIGHT_CATEGORIES, evaluatePreflightGate, hashPreflightText, runPrivacyPreflight, type PreflightAcknowledgement } from "@/modules/privacy";
import { contentHash } from "./canonical-json";
import type { Db } from "./db";
import { DATA_POLICY_VERSION, StorageError } from "./training-record";

/*
 * Certum Learning Line Record V1 (migratie 003). De enige plek met SQL voor leerlijnen.
 *
 * - Revisions zijn immutable (de database weigert UPDATE/DELETE); current = hoogste revision_no.
 * - Besluiten (Gate 1, revisie-instructie, Gate 2) zijn append-only events op exact één revision en haar hash.
 * - Een modulekoppeling (M1..M6 → training) is append-only en uniek per module en per training.
 * - De prompt doorloopt hier opnieuw Privacy Preflight en synthetic_only-attestatie (zoals `saveTrainingInput`).
 * - Logt niets: geen prompt, payloads of hashes.
 */

export const LEARNING_LINE_EVENT_TYPES = ["design_approved", "needs_revision", "package_approved"] as const;
export type LearningLineEventType = (typeof LEARNING_LINE_EVENT_TYPES)[number];
export const MAX_LEARNING_LINE_PROMPT = 4000;

type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LearningLineRecord {
  id: string;
  code: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningLineRevision {
  id: string;
  learningLineId: string;
  revisionNo: number;
  contractVersion: string;
  promptVersion: string | null;
  modelVersion: string | null;
  payload: LearningLineDesign;
  contentHash: string;
  createdAt: Date;
}

export interface LearningLineEvent {
  eventNo: number;
  revisionId: string;
  eventType: LearningLineEventType;
  eventData: Record<string, unknown>;
  contentHash: string;
  createdAt: Date;
}

export interface LearningLineModuleLink {
  moduleId: ModuleId;
  trainingId: string;
  revisionId: string;
}

/** Voorlopig Block Plan van een module (vóór Gate 1), gebonden aan één Blueprint-revision. */
export interface ModulePlanProposal {
  moduleId: ModuleId;
  trainingId: string;
  blueprintRevisionId: string;
  promptVersion: string | null;
  modelVersion: string | null;
  payload: unknown;
  contentHash: string;
  /** sourceNeed-id → voorgestelde bibliotheek-ids (alleen ids, geen tekst). */
  sourceSelection: Record<string, string[]>;
}

export interface LearningLineSnapshot {
  line: LearningLineRecord;
  prompt: string | null;
  revisions: LearningLineRevision[];
  events: LearningLineEvent[];
  /** Alle koppelingen, over alle ontwerprevisions heen; de current horen bij de current revision. */
  modules: LearningLineModuleLink[];
  plans: ModulePlanProposal[];
}

const toLine = (r: Row): LearningLineRecord => ({
  id: r.id as string,
  code: r.code as string,
  title: r.title as string,
  createdAt: new Date(r.created_at as string),
  updatedAt: new Date(r.updated_at as string),
});

const toRevision = (r: Row): LearningLineRevision => ({
  id: r.id as string,
  learningLineId: r.learning_line_id as string,
  revisionNo: Number(r.revision_no),
  contractVersion: r.contract_version as string,
  promptVersion: (r.prompt_version as string | null) ?? null,
  modelVersion: (r.model_version as string | null) ?? null,
  payload: r.payload as LearningLineDesign,
  contentHash: r.content_hash as string,
  createdAt: new Date(r.created_at as string),
});

const toEvent = (r: Row): LearningLineEvent => ({
  eventNo: Number(r.event_no),
  revisionId: r.revision_id as string,
  eventType: r.event_type as LearningLineEventType,
  eventData: r.event_data as Record<string, unknown>,
  contentHash: r.content_hash as string,
  createdAt: new Date(r.created_at as string),
});

/** Leerlijn + prompt in één transactie, na Privacy Preflight en synthetic_only-attestatie. */
export async function createLearningLine(db: Db, input: { prompt: string; acknowledgement: PreflightAcknowledgement | null }): Promise<LearningLineRecord> {
  const prompt = input.prompt.trim();
  if (prompt.length === 0 || prompt.length > MAX_LEARNING_LINE_PROMPT) throw new StorageError("input_gate", "Prompt ontbreekt of is te lang.");
  const preflight = runPrivacyPreflight(prompt);
  const textHash = await hashPreflightText(prompt);
  const ack = input.acknowledgement?.textHash === textHash ? input.acknowledgement : null;
  const gate = evaluatePreflightGate({ preflight, currentTextHash: textHash, acknowledgement: input.acknowledgement });
  const policy = evaluateDataPolicy(ACTIVE_DATA_POLICY, ack?.syntheticDataAttested === true);
  if (!gate.allowed || !policy.allowed) throw new StorageError("input_gate", "Privacy Preflight of synthetic_only-attestatie niet geldig.");

  const counts = Object.fromEntries(
    PREFLIGHT_CATEGORIES.map((c) => [c, preflight.findings.filter((f) => f.category === c).length] as const).filter(([, n]) => n > 0),
  );
  return db.transaction(async (tx) => {
    const [row] = await tx.query("insert into learning_line (title, data_policy) values ($1, $2) returning *", ["Nieuwe leerlijn", ACTIVE_DATA_POLICY]);
    await tx.query(
      `insert into learning_line_input (learning_line_id, prompt_text, text_hash, privacy_preflight, attestation, data_policy_version)
       values ($1, $2, $3, $4::text::jsonb, $5::text::jsonb, $6)`,
      [
        row.id,
        prompt,
        textHash,
        JSON.stringify({ version: preflight.version, status: preflight.status, counts }),
        JSON.stringify({ syntheticDataAttested: true, statement: SYNTHETIC_DATA_ATTESTATION }),
        DATA_POLICY_VERSION,
      ],
    );
    return toLine(row);
  });
}

/** Vergrendelt de leerlijnrij en zet `updated_at` (en eventueel de titel) in één query. */
async function lockLine(tx: Db, lineId: string, title?: string): Promise<LearningLineRecord> {
  if (!UUID.test(lineId)) throw new StorageError("not_found", "Leerlijn bestaat niet.");
  const [row] = title
    ? await tx.query("update learning_line set updated_at = now(), title = $2 where id = $1 returning *", [lineId, title.slice(0, 200)])
    : await tx.query("update learning_line set updated_at = now() where id = $1 returning *", [lineId]);
  if (!row) throw new StorageError("not_found", "Leerlijn bestaat niet.");
  return toLine(row);
}

async function currentRevisionRow(tx: Db, lineId: string): Promise<LearningLineRevision | null> {
  const [row] = await tx.query("select * from learning_line_revision where learning_line_id = $1 order by revision_no desc limit 1", [lineId]);
  return row ? toRevision(row) : null;
}

/** Nieuwe immutable ontwerprevision; `expectedCurrentRevisionId` voorkomt dubbele of verouderde acties. */
export async function createLearningLineRevision(
  db: Db,
  input: { learningLineId: string; payload: unknown; promptVersion: string | null; modelVersion: string | null; expectedCurrentRevisionId: string | null },
): Promise<LearningLineRevision> {
  const parsed = LearningLineDesignSchema.safeParse(input.payload);
  if (!parsed.success || checkLearningLineInvariants(parsed.data).length > 0) throw new StorageError("invalid_payload", "Ongeldig leerlijnontwerp.");
  return db.transaction(async (tx) => {
    await lockLine(tx, input.learningLineId, parsed.data.title);
    const current = await currentRevisionRow(tx, input.learningLineId);
    if ((current?.id ?? null) !== input.expectedCurrentRevisionId) throw new StorageError("stale_revision", "Er is intussen een nieuwere versie.");
    const [row] = await tx.query(
      `insert into learning_line_revision (learning_line_id, revision_no, contract_version, prompt_version, model_version, payload, content_hash)
       values ($1, $2, $3, $4, $5, $6::text::jsonb, $7) returning *`,
      [input.learningLineId, (current?.revisionNo ?? 0) + 1, LEARNING_LINE_VERSION, input.promptVersion, input.modelVersion, JSON.stringify(parsed.data), contentHash(parsed.data)],
    );
    return toRevision(row);
  });
}

/** Besluit op exact de current revision en haar hash. Hetzelfde laatste besluit nogmaals voegt niets toe. */
export async function appendLearningLineEvent(
  db: Db,
  input: { learningLineId: string; revisionId: string; eventType: LearningLineEventType; eventData?: Record<string, unknown> },
): Promise<LearningLineEvent> {
  if (!LEARNING_LINE_EVENT_TYPES.includes(input.eventType)) throw new StorageError("invalid_event", "Onbekend besluit.");
  return db.transaction(async (tx) => {
    await lockLine(tx, input.learningLineId);
    const current = await currentRevisionRow(tx, input.learningLineId);
    if (!current || current.id !== input.revisionId) throw new StorageError("not_current", "Besluit alleen op de huidige versie.");
    const data = input.eventData ?? {};
    const [last] = await tx.query("select * from learning_line_event where revision_id = $1 and event_type = $2 order by event_no desc limit 1", [current.id, input.eventType]);
    if (last && input.eventType === "design_approved") return toEvent(last);
    if (last && input.eventType === "package_approved" && (last.event_data as Row).packageHash === data.packageHash) return toEvent(last);
    const [row] = await tx.query(
      `insert into learning_line_event (learning_line_id, revision_id, event_type, event_data, content_hash)
       values ($1, $2, $3, $4::text::jsonb, $5) returning *`,
      [input.learningLineId, current.id, input.eventType, JSON.stringify(data), current.contentHash],
    );
    return toEvent(row);
  });
}

/** Koppelt een module aan een (net aangemaakte) training. Eén training per module; nooit overschrijven. */
export async function linkModuleTraining(db: Db, input: { learningLineId: string; moduleId: ModuleId; trainingId: string; revisionId: string }): Promise<void> {
  if (!MODULE_IDS.includes(input.moduleId)) throw new StorageError("invalid_payload", "Onbekende module.");
  await db.transaction(async (tx) => {
    await lockLine(tx, input.learningLineId);
    const [existing] = await tx.query("select 1 from learning_line_module where learning_line_id = $1 and revision_id = $2 and module_id = $3", [
      input.learningLineId,
      input.revisionId,
      input.moduleId,
    ]);
    if (existing) throw new StorageError("duplicate_revision", "Deze module heeft al een training.");
    await tx.query("insert into learning_line_module (learning_line_id, module_id, training_id, revision_id) values ($1, $2, $3, $4)", [
      input.learningLineId,
      input.moduleId,
      input.trainingId,
      input.revisionId,
    ]);
  });
}

/** Voorlopig plan opslaan (append-only). Hetzelfde plan op dezelfde Blueprint-revision nogmaals: niets. */
export async function saveModulePlanProposal(
  db: Db,
  input: {
    learningLineId: string;
    moduleId: ModuleId;
    trainingId: string;
    blueprintRevisionId: string;
    promptVersion: string | null;
    modelVersion: string | null;
    payload: unknown;
    sourceSelection: Record<string, string[]>;
  },
): Promise<void> {
  await db.query(
    `insert into learning_line_module_plan (learning_line_id, module_id, training_id, blueprint_revision_id, prompt_version, model_version, payload, content_hash, source_selection)
     values ($1, $2, $3, $4, $5, $6, $7::text::jsonb, $8, $9::text::jsonb)
     on conflict (training_id, blueprint_revision_id) do nothing`,
    [input.learningLineId, input.moduleId, input.trainingId, input.blueprintRevisionId, input.promptVersion, input.modelVersion, JSON.stringify(input.payload), contentHash(input.payload), JSON.stringify(input.sourceSelection)],
  );
}

/** De volledige stand van één leerlijn in zes queries (gelijktijdig). */
export async function loadLearningLineSnapshot(db: Db, lineId: string): Promise<LearningLineSnapshot | null> {
  if (!UUID.test(lineId)) return null;
  const [lines, inputs, revisions, events, modules, plans] = await Promise.all([
    db.query("select * from learning_line where id = $1", [lineId]),
    db.query("select prompt_text from learning_line_input where learning_line_id = $1 order by created_at desc limit 1", [lineId]),
    db.query("select * from learning_line_revision where learning_line_id = $1 order by revision_no", [lineId]),
    db.query("select * from learning_line_event where learning_line_id = $1 order by event_no", [lineId]),
    db.query("select * from learning_line_module where learning_line_id = $1 order by created_at, module_id", [lineId]),
    db.query("select * from learning_line_module_plan where learning_line_id = $1 order by created_at, id", [lineId]),
  ]);
  if (!lines[0]) return null;
  return {
    line: toLine(lines[0]),
    prompt: (inputs[0]?.prompt_text as string | undefined) ?? null,
    revisions: revisions.map(toRevision),
    events: events.map(toEvent),
    modules: modules.map((r) => ({ moduleId: r.module_id as ModuleId, trainingId: r.training_id as string, revisionId: r.revision_id as string })),
    plans: plans.map((r) => ({
      moduleId: r.module_id as ModuleId,
      trainingId: r.training_id as string,
      blueprintRevisionId: r.blueprint_revision_id as string,
      promptVersion: (r.prompt_version as string | null) ?? null,
      modelVersion: (r.model_version as string | null) ?? null,
      payload: r.payload,
      contentHash: r.content_hash as string,
      sourceSelection: (r.source_selection as Record<string, string[]> | null) ?? {},
    })),
  };
}

export async function listLearningLines(db: Db, options: { limit?: number } = {}): Promise<LearningLineRecord[]> {
  const rows = await db.query("select * from learning_line order by updated_at desc, code desc limit $1", [options.limit ?? 50]);
  return rows.map(toLine);
}
