import { createHash } from "node:crypto";
import {
  BLOCK_CONTENT_VERSION,
  BlockContentResultSchema,
  checkBlockContentInvariants,
  getBlockApprovalBlocker,
  type BlockContentResult,
} from "@/modules/block-content";
import { EndContentSchema, StartContentSchema } from "@/modules/block-content/schema";
import { BcOnlineBlockPlanSchema, checkBlockPlanInvariants, type BcOnlineBlockPlan } from "@/modules/block-plan";
import { ACTIVE_DATA_POLICY, SYNTHETIC_DATA_ATTESTATION, evaluateDataPolicy } from "@/modules/governance";
import {
  PREFLIGHT_CATEGORIES,
  evaluatePreflightGate,
  hashPreflightText,
  runPrivacyPreflight,
  type PreflightAcknowledgement,
} from "@/modules/privacy";
import { MAX_INPUT_LENGTH, type AgentInputKind } from "@/modules/training-agent";
import { segmentInput } from "@/modules/training-agent/v2";
import { ANALYSIS_CONTRACT_V21_VERSION, AnalysisOutcomeV21Schema, checkOutcomeInvariantsV21 } from "@/modules/training-agent/v2-1";
import { TrainingBlueprintV2Schema, routePolicyFor, type TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { CERTUM_SOURCE_VERSION, CertumSourceSchema, relevantContentIssue, type CertumSource } from "@/modules/sources/schema";
import { canonicalJson, contentHash } from "./canonical-json";
import type { Db } from "./db";
import {
  approvalState,
  composeContentFromSnapshot,
  currentRevision,
  eventsFor,
  lastRelevantEvent,
  payloadHashValid,
  revisionById,
  selectedDirection,
  toValidatedSource,
  type ApprovalState,
  type StoredContentPackage,
  type TrainingRecordSnapshot,
} from "./snapshot";

export type { ApprovalState, StoredContentPackage, TrainingRecordSnapshot } from "./snapshot";

/*
 * Certum Training Record V1 (docs/persistence/training-record-v1.md). De enige plek met SQL voor trainingen;
 * applicatielogica praat via deze functies, nooit rechtstreeks met de database.
 *
 * - Revisions zijn immutable snapshots (er is geen update-functie; de database weigert UPDATE/DELETE).
 * - Approvals en andere besluiten zijn append-only workflow events, gebonden aan één revision en zijn content_hash.
 * - Logt niets: geen invoer, payloads, hashes of connection strings.
 */

export const ARTIFACT_TYPES = ["analysis", "blueprint", "block_plan", "start_content", "end_content", "block_content", "source"] as const;

/** Artifacttypes met een eigen key per exemplaar (blok-n, src-n); de rest heeft de vaste key `main`. */
export const KEYED_ARTIFACT_TYPES: readonly ArtifactType[] = ["block_content", "source"];
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const WORKFLOW_EVENT_TYPES = ["direction_selected", "approved", "needs_revision", "revoked"] as const;
export type WorkflowEventType = (typeof WORKFLOW_EVENT_TYPES)[number];

/** De vaste key voor artifacts waarvan per training maar één exemplaar bestaat. */
export const SINGLETON_KEY = "main";

/** Welke upstream revisions een artifact nodig heeft (`based_on`), precies één per type. */
const REQUIRED_BASED_ON: Record<ArtifactType, ArtifactType[]> = {
  analysis: [],
  blueprint: ["analysis"],
  block_plan: ["blueprint"],
  start_content: ["blueprint", "block_plan"],
  end_content: ["blueprint", "block_plan"],
  block_content: ["blueprint", "block_plan"],
  // Een bron hoort bij de goedgekeurde Blueprint waarvan hij sourceNeeds dekt.
  source: ["blueprint"],
};

/**
 * Optionele, herhaalbare upstream types: een Bron-blok verwijst naar de gevalideerde bronversies waarop het is gebaseerd
 * (provenance). Iedere genoemde bron moet current en gevalideerd zijn; een nieuwe bronversie maakt het blok stale.
 */
const OPTIONAL_BASED_ON: Partial<Record<ArtifactType, ArtifactType[]>> = {
  block_content: ["source"],
};

/** Koppelt de bevestiging aan exact de huidige attestatietekst. */
export const DATA_POLICY_VERSION = `${ACTIVE_DATA_POLICY}@attestation-${createHash("sha256").update(SYNTHETIC_DATA_ATTESTATION).digest("hex").slice(0, 12)}`;

export type StorageErrorCode =
  | "not_configured"
  | "not_found"
  | "input_gate"
  | "invalid_payload"
  | "invalid_based_on"
  | "stale_based_on"
  | "not_current"
  | "invalid_event"
  | "not_generated"
  | "hash_mismatch"
  | "duplicate_revision"
  | "stale_revision"
  | "source_content_invalid";

/** Fout van de storage-laag. De melding bevat nooit inhoud, invoer of hashes. */
export class StorageError extends Error {
  constructor(
    readonly code: StorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export interface TrainingRecord {
  id: string;
  code: string;
  title: string;
  status: "concept" | "review" | "gereed";
  dataPolicy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredTrainingInput {
  id: string;
  trainingId: string;
  inputType: AgentInputKind;
  inputText: string;
  textHash: string;
  privacyPreflight: { version: string; status: string; counts: Record<string, number> };
  acknowledgements: string[];
  attestation: { syntheticDataAttested: true; statement: string };
  dataPolicyVersion: string;
  createdAt: Date;
}

export interface ArtifactRevision {
  id: string;
  trainingId: string;
  artifactType: ArtifactType;
  artifactKey: string;
  revisionNo: number;
  contractVersion: string;
  promptVersion: string | null;
  modelVersion: string | null;
  payload: unknown;
  contentHash: string;
  basedOnRevisionIds: string[];
  createdAt: Date;
}

export interface WorkflowEvent {
  id: string;
  eventNo: number;
  trainingId: string;
  artifactRevisionId: string;
  eventType: WorkflowEventType;
  eventData: Record<string, unknown>;
  contentHash: string;
  actorId: string | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------------------------------------------
// Rijen → domeinobjecten
// ---------------------------------------------------------------------------------------------------------------

type Row = Record<string, unknown>;

const toTraining = (r: Row): TrainingRecord => ({
  id: r.id as string,
  code: r.code as string,
  title: r.title as string,
  status: r.status as TrainingRecord["status"],
  dataPolicy: r.data_policy as string,
  createdAt: new Date(r.created_at as string),
  updatedAt: new Date(r.updated_at as string),
});

const toRevision = (r: Row): ArtifactRevision => ({
  id: r.id as string,
  trainingId: r.training_id as string,
  artifactType: r.artifact_type as ArtifactType,
  artifactKey: r.artifact_key as string,
  revisionNo: Number(r.revision_no),
  contractVersion: r.contract_version as string,
  promptVersion: (r.prompt_version as string | null) ?? null,
  modelVersion: (r.model_version as string | null) ?? null,
  payload: r.payload,
  contentHash: r.content_hash as string,
  basedOnRevisionIds: (r.based_on_revision_ids as string[] | null) ?? [],
  createdAt: new Date(r.created_at as string),
});

const toEvent = (r: Row): WorkflowEvent => ({
  id: r.id as string,
  eventNo: Number(r.event_no),
  trainingId: r.training_id as string,
  artifactRevisionId: r.artifact_revision_id as string,
  eventType: r.event_type as WorkflowEventType,
  eventData: r.event_data as Record<string, unknown>,
  contentHash: r.content_hash as string,
  actorId: (r.actor_id as string | null) ?? null,
  createdAt: new Date(r.created_at as string),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidArray = (ids: string[]) => `{${ids.join(",")}}`;

/*
 * Parameterconventie: JSON en arrays gaan als tekst mee en worden in SQL omgezet (`$n::text::jsonb`,
 * `$n::text::uuid[]`). postgres.js serialiseert een parameter van type jsonb zelf met JSON.stringify; een direct als
 * `$n::jsonb` getypeerde JSON-string zou dan dubbel gecodeerd worden opgeslagen (als JSON-string). Via `::text` gedragen
 * postgres.js (Supabase) en PGlite (tests) zich gelijk.
 */

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}

// ---------------------------------------------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------------------------------------------

export async function createTraining(db: Db, input: { title: string }): Promise<TrainingRecord> {
  const title = input.title.trim();
  if (title.length === 0 || title.length > 200) throw new StorageError("invalid_payload", "Titel ontbreekt of is te lang.");
  const [row] = await db.query("insert into training (title, data_policy) values ($1, $2) returning *", [title, ACTIVE_DATA_POLICY]);
  return toTraining(row);
}

export async function getTraining(db: Db, id: string): Promise<TrainingRecord | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db.query("select * from training where id = $1", [id]);
  return row ? toTraining(row) : null;
}

export async function listTrainings(db: Db, options: { limit?: number } = {}): Promise<TrainingRecord[]> {
  const rows = await db.query("select * from training order by updated_at desc, code desc limit $1", [options.limit ?? 50]);
  return rows.map(toTraining);
}

/**
 * Vergrendelt de trainingsrij voor de rest van de transactie en zet `updated_at`, in één query. Wordt de transactie
 * teruggedraaid, dan ook deze update.
 */
async function lockAndTouchTraining(tx: Db, trainingId: string): Promise<TrainingRecord> {
  if (!UUID.test(trainingId)) throw new StorageError("not_found", "Training bestaat niet.");
  const [row] = await tx.query("update training set updated_at = now() where id = $1 returning *", [trainingId]);
  if (!row) throw new StorageError("not_found", "Training bestaat niet.");
  return toTraining(row);
}

// ---------------------------------------------------------------------------------------------------------------
// Training Record Snapshot (bulk; zie snapshot.ts)
// ---------------------------------------------------------------------------------------------------------------

const SNAPSHOT_SQL = {
  trainings: "select * from training where id = any($1::text::uuid[])",
  inputs:
    "select distinct on (training_id) * from training_input where training_id = any($1::text::uuid[]) order by training_id, created_at desc, id desc",
  revisions:
    "select * from artifact_revision where training_id = any($1::text::uuid[]) order by training_id, artifact_type, artifact_key, revision_no",
  events: "select * from workflow_event where training_id = any($1::text::uuid[]) order by event_no",
};

/**
 * Snapshots voor één of meer trainingen met vier bulkqueries, ongeacht het aantal revisions, blokken of events. De
 * queries lopen gelijktijdig (postgres.js gebruikt meerdere verbindingen; PGlite zet ze in de rij).
 */
export async function loadTrainingRecordSnapshots(db: Db, trainingIds: string[]): Promise<Map<string, TrainingRecordSnapshot>> {
  const ids = [...new Set(trainingIds.filter((id) => UUID.test(id)))];
  const result = new Map<string, TrainingRecordSnapshot>();
  if (ids.length === 0) return result;
  const param = [uuidArray(ids)];
  const [trainings, inputs, revisions, events] = await Promise.all([
    db.query(SNAPSHOT_SQL.trainings, param),
    db.query(SNAPSHOT_SQL.inputs, param),
    db.query(SNAPSHOT_SQL.revisions, param),
    db.query(SNAPSHOT_SQL.events, param),
  ]);
  for (const row of trainings) result.set(row.id as string, { training: toTraining(row), input: null, revisions: [], events: [] });
  for (const row of inputs) {
    const snap = result.get(row.training_id as string);
    if (snap) snap.input = toInput(row);
  }
  for (const row of revisions) result.get(row.training_id as string)?.revisions.push(toRevision(row));
  for (const row of events) result.get(row.training_id as string)?.events.push(toEvent(row));
  return result;
}

export async function loadTrainingRecordSnapshot(db: Db, trainingId: string): Promise<TrainingRecordSnapshot | null> {
  return (await loadTrainingRecordSnapshots(db, [trainingId])).get(trainingId) ?? null;
}

/**
 * De snapshot voor een write: binnen de transactie, ná het vergrendelen van de training, zodat de controles op exact
 * de gecommitte stand gebeuren. De invoer alleen als de write hem nodig heeft.
 */
async function loadWriteSnapshot(tx: Db, trainingId: string, withInput: boolean): Promise<TrainingRecordSnapshot> {
  const training = await lockAndTouchTraining(tx, trainingId);
  const param = [uuidArray([trainingId])];
  const [revisions, events, inputs] = await Promise.all([
    tx.query(SNAPSHOT_SQL.revisions, param),
    tx.query(SNAPSHOT_SQL.events, param),
    withInput ? tx.query(SNAPSHOT_SQL.inputs, param) : Promise.resolve([]),
  ]);
  return { training, input: inputs[0] ? toInput(inputs[0]) : null, revisions: revisions.map(toRevision), events: events.map(toEvent) };
}

// ---------------------------------------------------------------------------------------------------------------
// Invoer
// ---------------------------------------------------------------------------------------------------------------

/**
 * Bewaart de oorspronkelijke invoer, alleen als dezelfde poorten als bij de analyse toestemming geven: de lokale
 * Privacy Preflight (opnieuw, server-side) en de synthetic_only-attestatie voor exact deze tekst. Persistence geeft
 * geen toestemming om echte casuïstiek te verwerken. Van de preflight worden alleen versie, status en aantallen per
 * categorie bewaard; nooit posities of gevonden waarden.
 */
export async function saveTrainingInput(
  db: Db,
  input: { trainingId: string; inputType: AgentInputKind; text: string; acknowledgement: PreflightAcknowledgement | null },
): Promise<StoredTrainingInput> {
  const text = input.text.trim();
  if (!["onderwerp", "praktijkvraag", "casus"].includes(input.inputType)) throw new StorageError("invalid_payload", "Onbekende inputsoort.");
  if (text.length === 0 || text.length > MAX_INPUT_LENGTH) throw new StorageError("input_gate", "Invoer ontbreekt of is te lang.");

  const preflight = runPrivacyPreflight(text);
  const textHash = await hashPreflightText(text);
  const ack = input.acknowledgement?.textHash === textHash ? input.acknowledgement : null;
  const gate = evaluatePreflightGate({ preflight, currentTextHash: textHash, acknowledgement: input.acknowledgement });
  const policy = evaluateDataPolicy(ACTIVE_DATA_POLICY, ack?.syntheticDataAttested === true);
  if (!gate.allowed || !policy.allowed) throw new StorageError("input_gate", "Privacy Preflight of synthetic_only-attestatie niet geldig.");

  const counts = Object.fromEntries(
    PREFLIGHT_CATEGORIES.map((c) => [c, preflight.findings.filter((f) => f.category === c).length] as const).filter(([, n]) => n > 0),
  );
  const findingIds = new Set(preflight.findings.map((f) => f.id));
  const acknowledgements = (ack?.acknowledgedFindingIds ?? []).filter((id) => findingIds.has(id));
  const attestation = { syntheticDataAttested: true as const, statement: SYNTHETIC_DATA_ATTESTATION };

  return db.transaction(async (tx) => {
    await lockAndTouchTraining(tx, input.trainingId);
    const [row] = await tx.query(
      `insert into training_input
         (training_id, input_type, input_text, text_hash, privacy_preflight, acknowledgements, attestation, data_policy_version)
       values ($1, $2, $3, $4, $5::text::jsonb, $6::text::jsonb, $7::text::jsonb, $8)
       returning *`,
      [
        input.trainingId,
        input.inputType,
        text,
        textHash,
        JSON.stringify({ version: preflight.version, status: preflight.status, counts }),
        JSON.stringify(acknowledgements),
        JSON.stringify(attestation),
        DATA_POLICY_VERSION,
      ],
    );
    return toInput(row);
  });
}

const toInput = (r: Row): StoredTrainingInput => ({
  id: r.id as string,
  trainingId: r.training_id as string,
  inputType: r.input_type as AgentInputKind,
  inputText: r.input_text as string,
  textHash: r.text_hash as string,
  privacyPreflight: r.privacy_preflight as StoredTrainingInput["privacyPreflight"],
  acknowledgements: r.acknowledgements as string[],
  attestation: r.attestation as StoredTrainingInput["attestation"],
  dataPolicyVersion: r.data_policy_version as string,
  createdAt: new Date(r.created_at as string),
});

export async function getLatestTrainingInput(db: Db, trainingId: string): Promise<StoredTrainingInput | null> {
  if (!UUID.test(trainingId)) return null;
  const [row] = await db.query("select * from training_input where training_id = $1 order by created_at desc, id desc limit 1", [trainingId]);
  return row ? toInput(row) : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Artifact revisions
// ---------------------------------------------------------------------------------------------------------------

export interface NewArtifactRevision {
  trainingId: string;
  artifactType: ArtifactType;
  /** Alleen bij `block_content`: het plannedBlockId. Anders altijd `main`. */
  artifactKey?: string;
  contractVersion: string;
  promptVersion?: string | null;
  modelVersion?: string | null;
  payload: unknown;
  basedOnRevisionIds: string[];
  /**
   * Optimistische concurrency: de revision die de aanroeper als current kent (`null` = er is er nog geen). Wijkt de
   * werkelijke current af, dan `stale_revision`: een dubbele of verouderde actie maakt geen extra revision.
   */
  expectedCurrentRevisionId?: string | null;
}

/**
 * Slaat een nieuwe, immutable revision op. In één transactie (training vergrendeld):
 * 1. payload valideren tegen het domeinschema van het artifacttype (en contractversie);
 * 2. `based_on` valideren: precies de vereiste upstream types, zelfde training, current en geaccepteerd (analysis met
 *    gekozen richting; overige goedgekeurd), plus de domeinregels tussen upstream en dit artifact;
 * 3. revisienummer = hoogste + 1 voor (training, type, key); de unieke constraint is het vangnet.
 * Bestaande revisions worden nooit gewijzigd.
 */
export async function createArtifactRevision(db: Db, input: NewArtifactRevision): Promise<ArtifactRevision> {
  const artifactKey = input.artifactKey ?? SINGLETON_KEY;
  if (!ARTIFACT_TYPES.includes(input.artifactType)) throw new StorageError("invalid_payload", "Onbekend artifacttype.");
  if (KEYED_ARTIFACT_TYPES.includes(input.artifactType) === (artifactKey === SINGLETON_KEY)) {
    throw new StorageError("invalid_payload", "Ongeldige artifact key voor dit type.");
  }
  if (input.basedOnRevisionIds.some((id) => !UUID.test(id))) throw new StorageError("invalid_based_on", "Ongeldige revision-id.");
  const hash = contentHash(input.payload);

  try {
    return await db.transaction(async (tx) => {
      const snap = await loadWriteSnapshot(tx, input.trainingId, input.artifactType === "analysis");
      const upstream = resolveBasedOn(snap, input.artifactType, input.basedOnRevisionIds);
      validatePayload(snap, input, artifactKey, upstream);
      const current = currentRevision(snap, input.artifactType, artifactKey);
      if (input.expectedCurrentRevisionId !== undefined && (current?.id ?? null) !== input.expectedCurrentRevisionId) {
        throw new StorageError("stale_revision", "De revision is intussen gewijzigd; laad de training opnieuw.");
      }
      const next = (current?.revisionNo ?? 0) + 1;

      const [row] = await tx.query(
        `insert into artifact_revision
           (training_id, artifact_type, artifact_key, revision_no, contract_version, prompt_version, model_version,
            payload, content_hash, based_on_revision_ids)
         values ($1, $2, $3, $4, $5, $6, $7, $8::text::jsonb, $9, $10::text::uuid[])
         returning *`,
        [
          input.trainingId,
          input.artifactType,
          artifactKey,
          Number(next),
          input.contractVersion,
          input.promptVersion ?? null,
          input.modelVersion ?? null,
          canonicalJson(input.payload),
          hash,
          uuidArray(input.basedOnRevisionIds),
        ],
      );
      return toRevision(row);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new StorageError("duplicate_revision", "Dit revisienummer bestaat al.");
    throw error;
  }
}

type Upstream = Partial<Record<ArtifactType, ArtifactRevision>> & { sources: ArtifactRevision[] };

/** Controleert `based_on` in het geheugen tegen de write-snapshot: exacte types, zelfde training, geaccepteerd. */
function resolveBasedOn(snap: TrainingRecordSnapshot, type: ArtifactType, ids: string[]): Upstream {
  const required = REQUIRED_BASED_ON[type];
  const optional = OPTIONAL_BASED_ON[type] ?? [];
  if (new Set(ids).size !== ids.length) throw new StorageError("invalid_based_on", "based_on bevat dubbele revisions.");
  const upstream: Upstream = { sources: [] };
  for (const id of ids) {
    // De snapshot bevat alleen revisions van deze training: een onbekende id hoort er niet bij.
    const revision = revisionById(snap, id);
    if (!revision) throw new StorageError("invalid_based_on", "Upstream revision hoort niet bij deze training.");
    if (optional.includes(revision.artifactType)) {
      upstream.sources.push(revision);
    } else if (!required.includes(revision.artifactType) || upstream[revision.artifactType]) {
      throw new StorageError("invalid_based_on", "based_on bevat niet precies de vereiste upstream types.");
    } else {
      upstream[revision.artifactType] = revision;
    }
    if (!approvalState(snap, revision.id).approved) {
      throw new StorageError("stale_based_on", `Upstream ${revision.artifactType} is niet current of niet geaccepteerd.`);
    }
  }
  if (required.some((r) => !upstream[r])) throw new StorageError("invalid_based_on", "based_on mist een vereist upstream type.");
  return upstream;
}

function validatePayload(snap: TrainingRecordSnapshot, input: NewArtifactRevision, artifactKey: string, upstream: Upstream): void {
  const invalid = (what: string) => new StorageError("invalid_payload", `Payload ongeldig: ${what}.`);
  const blueprint = upstream.blueprint?.payload as TrainingBlueprintV2 | undefined;
  const blockPlan = upstream.block_plan?.payload as BcOnlineBlockPlan | undefined;

  switch (input.artifactType) {
    case "analysis": {
      if (input.contractVersion !== ANALYSIS_CONTRACT_V21_VERSION) throw invalid("contractversie");
      if (!AnalysisOutcomeV21Schema.safeParse(input.payload).success) throw invalid("schema");
      // Grounding tegen de opgeslagen invoer: de analyse moet bij deze training horen.
      const stored = snap.input;
      if (!stored) throw invalid("geen opgeslagen invoer");
      if (checkOutcomeInvariantsV21(input.payload, segmentInput(stored.inputText)).length > 0) throw invalid("invarianten");
      return;
    }
    case "blueprint": {
      const parsed = TrainingBlueprintV2Schema.safeParse(input.payload);
      if (!parsed.success || parsed.data.version !== input.contractVersion) throw invalid("schema of contractversie");
      const policy = routePolicyFor(parsed.data.ambiguity);
      if (parsed.data.decisionPoint.routePolicy !== policy || parsed.data.learningArc.actie.routePolicy !== policy) throw invalid("routebeleid");
      const selected = selectedDirection(snap, upstream.analysis!.id);
      if (parsed.data.selectedDirectionId !== selected) throw invalid("richting wijkt af van de gekozen richting");
      return;
    }
    case "block_plan": {
      const parsed = BcOnlineBlockPlanSchema.safeParse(input.payload);
      if (!parsed.success || parsed.data.version !== input.contractVersion) throw invalid("schema of contractversie");
      if (parsed.data.blueprintVersion !== blueprint!.version || checkBlockPlanInvariants(parsed.data, blueprint!).length > 0) {
        throw invalid("past niet bij de goedgekeurde Blueprint");
      }
      return;
    }
    case "start_content": {
      const parsed = StartContentSchema.omit({ estimatedDurationMinutes: true }).strict().safeParse(input.payload);
      if (!parsed.success || input.contractVersion !== BLOCK_CONTENT_VERSION) throw invalid("schema of contractversie");
      if (parsed.data.title !== blueprint!.title || canonicalJson(parsed.data.learningGoals) !== canonicalJson([blueprint!.learningGoal])) {
        throw invalid("titel of leerdoel wijkt af van de Blueprint");
      }
      return;
    }
    case "end_content": {
      if (!EndContentSchema.safeParse(input.payload).success || input.contractVersion !== BLOCK_CONTENT_VERSION) throw invalid("schema of contractversie");
      return;
    }
    case "block_content": {
      const parsed = BlockContentResultSchema.safeParse(input.payload);
      if (!parsed.success || parsed.data.version !== input.contractVersion) throw invalid("schema of contractversie");
      if (parsed.data.plannedBlockId !== artifactKey) throw invalid("artifact key wijkt af van plannedBlockId");
      // Een Bron-blok mag alleen steunen op de gevalideerde bronnen in zijn based_on (provenance).
      const validatedSources = upstream.sources.map(toValidatedSource);
      if (checkBlockContentInvariants(parsed.data, { blueprint: blueprint!, blockPlan: blockPlan!, validatedSources }).length > 0) throw invalid("invarianten");
      return;
    }
    case "source": {
      const parsed = CertumSourceSchema.safeParse(input.payload);
      if (!parsed.success || input.contractVersion !== CERTUM_SOURCE_VERSION) throw invalid("schema of contractversie");
      // Alleen bestaande sourceNeeds van de goedgekeurde Blueprint; geen nieuwe.
      const ids = blueprint!.sourceNeeds.map((s) => s.id);
      if (parsed.data.sourceNeedRefs.some((r) => !ids.includes(r)) || new Set(parsed.data.sourceNeedRefs).size !== parsed.data.sourceNeedRefs.length) {
        throw invalid("onbekende of dubbele sourceNeed");
      }
      return;
    }
  }
}

export async function getArtifactRevision(db: Db, id: string): Promise<ArtifactRevision | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db.query("select * from artifact_revision where id = $1", [id]);
  return row ? toRevision(row) : null;
}

/** Current = de hoogste revision_no voor (training, type, key). */
export async function getCurrentArtifactRevision(
  db: Db,
  trainingId: string,
  artifactType: ArtifactType,
  artifactKey: string = SINGLETON_KEY,
): Promise<ArtifactRevision | null> {
  if (!UUID.test(trainingId)) return null;
  const [row] = await db.query(
    `select * from artifact_revision where training_id = $1 and artifact_type = $2 and artifact_key = $3
     order by revision_no desc limit 1`,
    [trainingId, artifactType, artifactKey],
  );
  return row ? toRevision(row) : null;
}

export async function listArtifactRevisions(
  db: Db,
  trainingId: string,
  filter: { artifactType?: ArtifactType; artifactKey?: string } = {},
): Promise<ArtifactRevision[]> {
  if (!UUID.test(trainingId)) return [];
  const rows = await db.query(
    `select * from artifact_revision
     where training_id = $1 and ($2::text is null or artifact_type = $2) and ($3::text is null or artifact_key = $3)
     order by artifact_type, artifact_key, revision_no`,
    [trainingId, filter.artifactType ?? null, filter.artifactKey ?? null],
  );
  return rows.map(toRevision);
}

// ---------------------------------------------------------------------------------------------------------------
// Workflow events
// ---------------------------------------------------------------------------------------------------------------

/**
 * Voegt een workflowbesluit toe (append-only), gebonden aan de huidige content_hash van exact die revision. Alleen
 * op de current revision.
 * - `direction_selected`: alleen op een `ready`-analyse, met een bestaand `trainingDirectionId`;
 * - `approved`: alleen als alle based_on-revisions current en geaccepteerd zijn; blokinhoud alleen als `generated`;
 * - `needs_revision`, `revoked`: op ieder niet-analyse-artifact.
 */
export async function appendWorkflowEvent(
  db: Db,
  input: {
    trainingId: string;
    artifactRevisionId: string;
    eventType: WorkflowEventType;
    trainingDirectionId?: string;
    /** Alleen de bronvalidatie (met de expliciete verklaring) mag een bron goedkeuren; een generiek besluit niet. */
    sourceValidation?: boolean;
  },
): Promise<WorkflowEvent> {
  if (!WORKFLOW_EVENT_TYPES.includes(input.eventType)) throw new StorageError("invalid_event", "Onbekend eventtype.");
  return db.transaction(async (tx) => {
    const snap = await loadWriteSnapshot(tx, input.trainingId, false);
    const revision = revisionById(snap, input.artifactRevisionId);
    if (!revision) throw new StorageError("not_found", "Revision bestaat niet in deze training.");
    if (!payloadHashValid(revision)) throw new StorageError("hash_mismatch", "Opgeslagen inhoud komt niet overeen met de hash.");
    const current = currentRevision(snap, revision.artifactType, revision.artifactKey);
    if (current?.id !== revision.id) throw new StorageError("not_current", "Alleen de current revision kan een besluit krijgen.");

    let eventData: Record<string, unknown> = {};
    if (input.eventType === "direction_selected") {
      if (revision.artifactType !== "analysis") throw new StorageError("invalid_event", "Een richting kies je alleen op een analyse.");
      const analysis = revision.payload as { outcome: string; trainingDirections?: { id: string }[] };
      const id = input.trainingDirectionId;
      if (analysis.outcome !== "ready" || !id || !analysis.trainingDirections?.some((d) => d.id === id)) {
        throw new StorageError("invalid_event", "Onbekende trainingsrichting of analyse niet gereed.");
      }
      eventData = { trainingDirectionId: id };
    } else {
      if (revision.artifactType === "analysis") throw new StorageError("invalid_event", "Een analyse wordt niet goedgekeurd; kies een richting.");
      if (input.eventType === "approved") {
        for (const upstreamId of revision.basedOnRevisionIds) {
          if (!approvalState(snap, upstreamId).approved) throw new StorageError("stale_based_on", "Upstream is niet meer current of goedgekeurd.");
        }
        if (revision.artifactType === "block_content" && getBlockApprovalBlocker(revision.payload as BlockContentResult) !== null) {
          throw new StorageError("not_generated", "Alleen gegenereerde blokinhoud kan worden goedgekeurd.");
        }
        if (revision.artifactType === "source" && input.sourceValidation !== true) {
          throw new StorageError("invalid_event", "Een bron wordt alleen via de bronvalidatie goedgekeurd.");
        }
        // Een bron valideer je op zijn relevante inhoud; alleen een titel of URL is geen inhoud (TR-0014).
        if (revision.artifactType === "source" && relevantContentIssue(revision.payload as CertumSource) !== null) {
          throw new StorageError("source_content_invalid", "De relevante inhoud van de bron is alleen een titel of URL.");
        }
      }
    }

    // Idempotent: hetzelfde besluit nog eens (bijv. een dubbelklik) voegt geen nieuw event toe.
    const last = input.eventType === "direction_selected"
      ? (eventsFor(snap, revision.id).filter((e) => e.eventType === "direction_selected").at(-1) ?? null)
      : revision.artifactType === "analysis" ? null : lastRelevantEvent(snap, revision);
    if (last && last.eventType === input.eventType && canonicalJson(last.eventData) === canonicalJson(eventData)) return last;

    const [row] = await tx.query(
      `insert into workflow_event (training_id, artifact_revision_id, event_type, event_data, content_hash, actor_id)
       values ($1, $2, $3, $4::text::jsonb, $5, null) returning *`,
      [input.trainingId, revision.id, input.eventType, JSON.stringify(eventData), revision.contentHash],
    );
    // Canonieke trainingstitel: die van de goedgekeurde Blueprint. Alleen een Blueprint-goedkeuring zet hem; downstream
    // generatie (Block Plan, inhoud) wijzigt de titel nooit.
    if (input.eventType === "approved" && revision.artifactType === "blueprint") {
      await tx.query("update training set title = $2 where id = $1", [input.trainingId, (revision.payload as { title: string }).title]);
    }
    return toEvent(row);
  });
}

export async function listWorkflowEvents(db: Db, artifactRevisionId: string): Promise<WorkflowEvent[]> {
  if (!UUID.test(artifactRevisionId)) return [];
  const rows = await db.query("select * from workflow_event where artifact_revision_id = $1 order by event_no", [artifactRevisionId]);
  return rows.map(toEvent);
}

/** De gekozen richting van een analyse-revision (het laatste `direction_selected`-event), of `null`. */
export async function getSelectedDirectionId(db: Db, analysisRevisionId: string): Promise<string | null> {
  const events = (await listWorkflowEvents(db, analysisRevisionId)).filter((e) => e.eventType === "direction_selected");
  const last = events.at(-1);
  return last ? ((last.eventData.trainingDirectionId as string | undefined) ?? null) : null;
}

/**
 * De approvalregel (zie `approvalState` in snapshot.ts): current, laatste besluit `approved` op exact deze hash,
 * herberekende payload-hash gelijk, alle upstream revisions current en geaccepteerd. Eén revision-lookup plus één
 * snapshot, in plaats van een query per stap.
 */
export async function getApprovalState(db: Db, revisionId: string): Promise<ApprovalState> {
  const revision = await getArtifactRevision(db, revisionId);
  if (!revision) return { approved: false, reason: "not_found" };
  const snap = await loadTrainingRecordSnapshot(db, revision.trainingId);
  return snap ? approvalState(snap, revisionId) : { approved: false, reason: "not_found" };
}

export async function isRevisionApproved(db: Db, revisionId: string): Promise<boolean> {
  return (await getApprovalState(db, revisionId)).approved;
}

// ---------------------------------------------------------------------------------------------------------------
// Training Content Package (samengesteld, niet opgeslagen)
// ---------------------------------------------------------------------------------------------------------------


/**
 * Stelt het Training Content Package server-side samen uit de current revisions (één snapshot; zie
 * `composeContentFromSnapshot`). Er wordt geen kopie van het pakket opgeslagen: één waarheid.
 */
export async function composeStoredContentPackage(db: Db, trainingId: string): Promise<StoredContentPackage> {
  const snap = await loadTrainingRecordSnapshot(db, trainingId);
  if (!snap) return { status: "not_ready", reason: "blueprint_not_approved" };
  return composeContentFromSnapshot(snap);
}
