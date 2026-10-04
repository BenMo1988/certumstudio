import { createHash } from "node:crypto";
import {
  BLOCK_CONTENT_VERSION,
  BlockContentResultSchema,
  checkBlockContentInvariants,
  composeContentPackage,
  getBlockApprovalBlocker,
  type BlockContentResult,
  type TrainingContentPackage,
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
import { canonicalJson, contentHash } from "./canonical-json";
import type { Db } from "./db";

/*
 * Certum Training Record V1 (docs/persistence/training-record-v1.md). De enige plek met SQL voor trainingen;
 * applicatielogica praat via deze functies, nooit rechtstreeks met de database.
 *
 * - Revisions zijn immutable snapshots (er is geen update-functie; de database weigert UPDATE/DELETE).
 * - Approvals en andere besluiten zijn append-only workflow events, gebonden aan één revision en zijn content_hash.
 * - Logt niets: geen invoer, payloads, hashes of connection strings.
 */

export const ARTIFACT_TYPES = ["analysis", "blueprint", "block_plan", "start_content", "end_content", "block_content"] as const;
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
  | "duplicate_revision";

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

async function lockTraining(tx: Db, trainingId: string): Promise<void> {
  if (!UUID.test(trainingId)) throw new StorageError("not_found", "Training bestaat niet.");
  const [row] = await tx.query("select id from training where id = $1 for update", [trainingId]);
  if (!row) throw new StorageError("not_found", "Training bestaat niet.");
}

const touchTraining = (tx: Db, trainingId: string) => tx.query("update training set updated_at = now() where id = $1", [trainingId]);

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
    await lockTraining(tx, input.trainingId);
    const [row] = await tx.query(
      `insert into training_input
         (training_id, input_type, input_text, text_hash, privacy_preflight, acknowledgements, attestation, data_policy_version)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
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
    await touchTraining(tx, input.trainingId);
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
  if ((input.artifactType === "block_content") === (artifactKey === SINGLETON_KEY)) {
    throw new StorageError("invalid_payload", "Ongeldige artifact key voor dit type.");
  }
  if (input.basedOnRevisionIds.some((id) => !UUID.test(id))) throw new StorageError("invalid_based_on", "Ongeldige revision-id.");
  const hash = contentHash(input.payload);

  try {
    return await db.transaction(async (tx) => {
      await lockTraining(tx, input.trainingId);
      const upstream = await loadBasedOn(tx, input.trainingId, input.artifactType, input.basedOnRevisionIds);
      await validatePayload(tx, input, artifactKey, upstream);

      const [{ next }] = await tx.query<{ next: number }>(
        `select coalesce(max(revision_no), 0) + 1 as next from artifact_revision
         where training_id = $1 and artifact_type = $2 and artifact_key = $3`,
        [input.trainingId, input.artifactType, artifactKey],
      );
      const [row] = await tx.query(
        `insert into artifact_revision
           (training_id, artifact_type, artifact_key, revision_no, contract_version, prompt_version, model_version,
            payload, content_hash, based_on_revision_ids)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::uuid[])
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
      await touchTraining(tx, input.trainingId);
      return toRevision(row);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new StorageError("duplicate_revision", "Dit revisienummer bestaat al.");
    throw error;
  }
}

type Upstream = Partial<Record<ArtifactType, ArtifactRevision>>;

async function loadBasedOn(tx: Db, trainingId: string, type: ArtifactType, ids: string[]): Promise<Upstream> {
  const required = REQUIRED_BASED_ON[type];
  if (ids.length !== required.length || new Set(ids).size !== ids.length) {
    throw new StorageError("invalid_based_on", "based_on bevat niet precies de vereiste upstream revisions.");
  }
  const upstream: Upstream = {};
  for (const id of ids) {
    const revision = await getArtifactRevision(tx, id);
    if (!revision || revision.trainingId !== trainingId) throw new StorageError("invalid_based_on", "Upstream revision hoort niet bij deze training.");
    if (!required.includes(revision.artifactType) || upstream[revision.artifactType]) {
      throw new StorageError("invalid_based_on", "based_on bevat niet precies de vereiste upstream types.");
    }
    const state = await getApprovalState(tx, revision.id);
    if (!state.approved) throw new StorageError("stale_based_on", `Upstream ${revision.artifactType} is niet current of niet geaccepteerd.`);
    upstream[revision.artifactType] = revision;
  }
  return upstream;
}

async function validatePayload(tx: Db, input: NewArtifactRevision, artifactKey: string, upstream: Upstream): Promise<void> {
  const invalid = (what: string) => new StorageError("invalid_payload", `Payload ongeldig: ${what}.`);
  const blueprint = upstream.blueprint?.payload as TrainingBlueprintV2 | undefined;
  const blockPlan = upstream.block_plan?.payload as BcOnlineBlockPlan | undefined;

  switch (input.artifactType) {
    case "analysis": {
      if (input.contractVersion !== ANALYSIS_CONTRACT_V21_VERSION) throw invalid("contractversie");
      if (!AnalysisOutcomeV21Schema.safeParse(input.payload).success) throw invalid("schema");
      // Grounding tegen de opgeslagen invoer: de analyse moet bij deze training horen.
      const stored = await getLatestTrainingInput(tx, input.trainingId);
      if (!stored) throw invalid("geen opgeslagen invoer");
      if (checkOutcomeInvariantsV21(input.payload, segmentInput(stored.inputText)).length > 0) throw invalid("invarianten");
      return;
    }
    case "blueprint": {
      const parsed = TrainingBlueprintV2Schema.safeParse(input.payload);
      if (!parsed.success || parsed.data.version !== input.contractVersion) throw invalid("schema of contractversie");
      const policy = routePolicyFor(parsed.data.ambiguity);
      if (parsed.data.decisionPoint.routePolicy !== policy || parsed.data.learningArc.actie.routePolicy !== policy) throw invalid("routebeleid");
      const selected = await getSelectedDirectionId(tx, upstream.analysis!.id);
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
      if (checkBlockContentInvariants(parsed.data, { blueprint: blueprint!, blockPlan: blockPlan! }).length > 0) throw invalid("invarianten");
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
  input: { trainingId: string; artifactRevisionId: string; eventType: WorkflowEventType; trainingDirectionId?: string },
): Promise<WorkflowEvent> {
  if (!WORKFLOW_EVENT_TYPES.includes(input.eventType)) throw new StorageError("invalid_event", "Onbekend eventtype.");
  return db.transaction(async (tx) => {
    await lockTraining(tx, input.trainingId);
    const revision = await getArtifactRevision(tx, input.artifactRevisionId);
    if (!revision || revision.trainingId !== input.trainingId) throw new StorageError("not_found", "Revision bestaat niet in deze training.");
    if (contentHash(revision.payload) !== revision.contentHash) throw new StorageError("hash_mismatch", "Opgeslagen inhoud komt niet overeen met de hash.");
    const current = await getCurrentArtifactRevision(tx, revision.trainingId, revision.artifactType, revision.artifactKey);
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
          if (!(await getApprovalState(tx, upstreamId)).approved) throw new StorageError("stale_based_on", "Upstream is niet meer current of goedgekeurd.");
        }
        if (revision.artifactType === "block_content" && getBlockApprovalBlocker(revision.payload as BlockContentResult) !== null) {
          throw new StorageError("not_generated", "Alleen gegenereerde blokinhoud kan worden goedgekeurd.");
        }
      }
    }

    const [row] = await tx.query(
      `insert into workflow_event (training_id, artifact_revision_id, event_type, event_data, content_hash, actor_id)
       values ($1, $2, $3, $4::jsonb, $5, null) returning *`,
      [input.trainingId, revision.id, input.eventType, JSON.stringify(eventData), revision.contentHash],
    );
    await touchTraining(tx, input.trainingId);
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

export type ApprovalState =
  | { approved: true }
  | { approved: false; reason: "not_found" | "not_current" | "hash_mismatch" | "no_decision" | "not_approved" | "upstream_not_approved" };

/**
 * De approvalregel. Een revision is alleen approved als:
 * 1. hij current is voor zijn (training, type, key);
 * 2. het laatste relevante event voor exact die revision `approved` is (voor een analyse: een `direction_selected`);
 * 3. de content_hash van dat event gelijk is aan die van de revision én aan de herberekende payload-hash;
 * 4. alle based_on-revisions nog current en approved zijn (recursief).
 * Een nieuwe revision erft dus geen approval, en een nieuwe upstream revision maakt downstream stale.
 */
export async function getApprovalState(db: Db, revisionId: string): Promise<ApprovalState> {
  const revision = await getArtifactRevision(db, revisionId);
  if (!revision) return { approved: false, reason: "not_found" };
  const current = await getCurrentArtifactRevision(db, revision.trainingId, revision.artifactType, revision.artifactKey);
  if (current?.id !== revision.id) return { approved: false, reason: "not_current" };
  if (contentHash(revision.payload) !== revision.contentHash) return { approved: false, reason: "hash_mismatch" };

  const relevant: WorkflowEventType[] = revision.artifactType === "analysis" ? ["direction_selected"] : ["approved", "needs_revision", "revoked"];
  const last = (await listWorkflowEvents(db, revision.id)).filter((e) => relevant.includes(e.eventType)).at(-1);
  if (!last) return { approved: false, reason: "no_decision" };
  if (last.contentHash !== revision.contentHash) return { approved: false, reason: "hash_mismatch" };
  if (revision.artifactType !== "analysis" && last.eventType !== "approved") return { approved: false, reason: "not_approved" };

  for (const upstreamId of revision.basedOnRevisionIds) {
    if (!(await getApprovalState(db, upstreamId)).approved) return { approved: false, reason: "upstream_not_approved" };
  }
  return { approved: true };
}

export async function isRevisionApproved(db: Db, revisionId: string): Promise<boolean> {
  return (await getApprovalState(db, revisionId)).approved;
}

// ---------------------------------------------------------------------------------------------------------------
// Training Content Package (samengesteld, niet opgeslagen)
// ---------------------------------------------------------------------------------------------------------------

export type StoredContentPackage =
  | { status: "ok"; package: TrainingContentPackage; revisionIds: string[] }
  | { status: "not_ready"; reason: "blueprint_not_approved" | "block_plan_not_approved" | "frame_missing" };

/**
 * Stelt het Training Content Package server-side samen uit de current revisions, met dezelfde compose-functie als de
 * flow. Er wordt geen kopie van het pakket opgeslagen: één waarheid.
 * - Blueprint en Block Plan moeten current en goedgekeurd zijn;
 * - Start, Einde en blokinhoud tellen alleen als ze gebouwd zijn op deze Blueprint- en Block Plan-revision;
 * - de reviewstatus van een blok komt uit de workflow events: `approved` (geldige approval), `needs_revision` (laatste
 *   besluit) of anders `draft`.
 */
export async function composeStoredContentPackage(db: Db, trainingId: string): Promise<StoredContentPackage> {
  const blueprintRev = await getCurrentArtifactRevision(db, trainingId, "blueprint");
  if (!blueprintRev || !(await isRevisionApproved(db, blueprintRev.id))) return { status: "not_ready", reason: "blueprint_not_approved" };
  const planRev = await getCurrentArtifactRevision(db, trainingId, "block_plan");
  if (!planRev || !(await isRevisionApproved(db, planRev.id))) return { status: "not_ready", reason: "block_plan_not_approved" };
  const blueprint = blueprintRev.payload as TrainingBlueprintV2;
  const blockPlan = planRev.payload as BcOnlineBlockPlan;
  const onCurrentUpstream = (r: ArtifactRevision | null): r is ArtifactRevision =>
    r !== null && r.basedOnRevisionIds.includes(blueprintRev.id) && r.basedOnRevisionIds.includes(planRev.id);

  const startRev = await getCurrentArtifactRevision(db, trainingId, "start_content");
  const endRev = await getCurrentArtifactRevision(db, trainingId, "end_content");
  if (!onCurrentUpstream(startRev) || !onCurrentUpstream(endRev)) return { status: "not_ready", reason: "frame_missing" };

  const blocks: BlockContentResult[] = [];
  const revisionIds = [blueprintRev.id, planRev.id, startRev.id, endRev.id];
  for (const planned of blockPlan.plannedBlocks) {
    const rev = await getCurrentArtifactRevision(db, trainingId, "block_content", planned.id);
    if (!onCurrentUpstream(rev)) continue;
    const last = (await listWorkflowEvents(db, rev.id)).filter((e) => e.eventType !== "direction_selected").at(-1);
    const reviewStatus = (await isRevisionApproved(db, rev.id)) ? "approved" : last?.eventType === "needs_revision" ? "needs_revision" : "draft";
    blocks.push({ ...(rev.payload as BlockContentResult), reviewStatus });
    revisionIds.push(rev.id);
  }

  return {
    status: "ok",
    package: composeContentPackage({
      blueprint,
      blockPlan,
      frame: {
        start: startRev.payload as TrainingContentPackage["start"],
        end: endRev.payload as TrainingContentPackage["end"],
      },
      blocks,
    }),
    revisionIds,
  };
}
