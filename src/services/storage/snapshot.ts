import { composeContentPackage, type BlockContentResult, type TrainingContentPackage } from "@/modules/block-content";
import type { BcOnlineBlockPlan } from "@/modules/block-plan";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import type { CertumSource, ValidatedSource } from "@/modules/sources/schema";
import { contentHash } from "./canonical-json";
import type {
  ArtifactRevision,
  ArtifactType,
  StoredTrainingInput,
  TrainingRecord,
  WorkflowEvent,
  WorkflowEventType,
} from "./training-record";

/*
 * Training Record Snapshot: alle gegevens van één training (training, laatste invoer, alle revisions, alle events),
 * geladen met een klein, vast aantal bulkqueries (zie `loadTrainingRecordSnapshots` in training-record.ts).
 *
 * De functies hieronder zijn puur: dezelfde approval-, staleness- en pakketregels als voorheen, maar in het geheugen
 * over één momentopname in plaats van met een query per revision. Een snapshot is alleen een gelezen momentopname;
 * iedere write laadt zijn eigen snapshot binnen de vergrendelde transactie (DB-authoritative).
 */

export interface TrainingRecordSnapshot {
  training: TrainingRecord;
  input: StoredTrainingInput | null;
  /** Alle revisions van de training, gesorteerd op type, key en revision_no. */
  revisions: ArtifactRevision[];
  /** Alle workflow events van de training, gesorteerd op event_no. */
  events: WorkflowEvent[];
}

export const SINGLETON_KEY = "main";

interface Index {
  byId: Map<string, ArtifactRevision>;
  current: Map<string, ArtifactRevision>;
  events: Map<string, WorkflowEvent[]>;
}

const indexes = new WeakMap<TrainingRecordSnapshot, Index>();
/** Herberekende hash per (immutable) revision-object; een nieuw geladen object wordt opnieuw gecontroleerd. */
const hashValid = new WeakMap<ArtifactRevision, boolean>();

const slot = (type: ArtifactType, key: string) => `${type}\u0000${key}`;

function index(snap: TrainingRecordSnapshot): Index {
  let idx = indexes.get(snap);
  if (idx) return idx;
  idx = { byId: new Map(), current: new Map(), events: new Map() };
  for (const r of snap.revisions) {
    idx.byId.set(r.id, r);
    const k = slot(r.artifactType, r.artifactKey);
    const existing = idx.current.get(k);
    if (!existing || r.revisionNo > existing.revisionNo) idx.current.set(k, r);
  }
  for (const e of [...snap.events].sort((a, b) => a.eventNo - b.eventNo)) {
    const list = idx.events.get(e.artifactRevisionId) ?? [];
    list.push(e);
    idx.events.set(e.artifactRevisionId, list);
  }
  indexes.set(snap, idx);
  return idx;
}

/** Een nieuwe snapshot met een extra (zojuist opgeslagen) revision; de oorspronkelijke blijft ongewijzigd. */
export function withRevision(snap: TrainingRecordSnapshot, revision: ArtifactRevision): TrainingRecordSnapshot {
  return { ...snap, revisions: [...snap.revisions, revision] };
}

export function revisionById(snap: TrainingRecordSnapshot, id: string): ArtifactRevision | null {
  return index(snap).byId.get(id) ?? null;
}

/** Current = de hoogste revision_no voor (type, key). */
export function currentRevision(snap: TrainingRecordSnapshot, type: ArtifactType, key: string = SINGLETON_KEY): ArtifactRevision | null {
  return index(snap).current.get(slot(type, key)) ?? null;
}

export function eventsFor(snap: TrainingRecordSnapshot, revisionId: string): WorkflowEvent[] {
  return index(snap).events.get(revisionId) ?? [];
}

export function payloadHashValid(revision: ArtifactRevision): boolean {
  let valid = hashValid.get(revision);
  if (valid === undefined) {
    valid = contentHash(revision.payload) === revision.contentHash;
    hashValid.set(revision, valid);
  }
  return valid;
}

const DECISIONS: WorkflowEventType[] = ["approved", "needs_revision", "revoked"];
const relevantFor = (type: ArtifactType): WorkflowEventType[] => (type === "analysis" ? ["direction_selected"] : DECISIONS);

/** Het laatste relevante event (richtingkeuze voor een analyse, besluit voor de rest), of `null`. */
export function lastRelevantEvent(snap: TrainingRecordSnapshot, revision: ArtifactRevision): WorkflowEvent | null {
  const relevant = relevantFor(revision.artifactType);
  return eventsFor(snap, revision.id).filter((e) => relevant.includes(e.eventType)).at(-1) ?? null;
}

/** De gekozen richting van een analyse-revision (laatste `direction_selected`), of `null`. */
export function selectedDirection(snap: TrainingRecordSnapshot, analysisRevisionId: string): string | null {
  const last = eventsFor(snap, analysisRevisionId).filter((e) => e.eventType === "direction_selected").at(-1);
  return last ? ((last.eventData.trainingDirectionId as string | undefined) ?? null) : null;
}

export type ApprovalState =
  | { approved: true }
  | { approved: false; reason: "not_found" | "not_current" | "hash_mismatch" | "no_decision" | "not_approved" | "upstream_not_approved" };

/**
 * De approvalregel, ongewijzigd. Een revision is alleen approved als:
 * 1. hij current is voor zijn (training, type, key);
 * 2. het laatste relevante event voor exact die revision `approved` is (voor een analyse: een `direction_selected`);
 * 3. de content_hash van dat event gelijk is aan die van de revision én aan de herberekende payload-hash;
 * 4. alle based_on-revisions nog current en approved zijn (recursief).
 */
export function approvalState(snap: TrainingRecordSnapshot, revisionId: string, seen: Set<string> = new Set()): ApprovalState {
  const revision = revisionById(snap, revisionId);
  if (!revision) return { approved: false, reason: "not_found" };
  if (currentRevision(snap, revision.artifactType, revision.artifactKey)?.id !== revision.id) return { approved: false, reason: "not_current" };
  if (!payloadHashValid(revision)) return { approved: false, reason: "hash_mismatch" };
  const last = lastRelevantEvent(snap, revision);
  if (!last) return { approved: false, reason: "no_decision" };
  if (last.contentHash !== revision.contentHash) return { approved: false, reason: "hash_mismatch" };
  if (revision.artifactType !== "analysis" && last.eventType !== "approved") return { approved: false, reason: "not_approved" };
  if (seen.has(revision.id)) return { approved: false, reason: "upstream_not_approved" };
  for (const upstreamId of revision.basedOnRevisionIds) {
    if (!approvalState(snap, upstreamId, new Set([...seen, revision.id])).approved) return { approved: false, reason: "upstream_not_approved" };
  }
  return { approved: true };
}

export const isApproved = (snap: TrainingRecordSnapshot, revisionId: string) => approvalState(snap, revisionId).approved;

/** Of een revision op exact deze upstream revisions is gebouwd. */
export const builtOn = (revision: ArtifactRevision | null, upstreamIds: string[]): revision is ArtifactRevision =>
  revision !== null && upstreamIds.every((id) => revision.basedOnRevisionIds.includes(id));

/** Reviewstatus van een blokrevision uit de events: geldige approval, anders laatste besluit `needs_revision`, anders draft. */
export function blockReviewStatus(snap: TrainingRecordSnapshot, revision: ArtifactRevision): BlockContentResult["reviewStatus"] {
  if (isApproved(snap, revision.id)) return "approved";
  return lastRelevantEvent(snap, revision)?.eventType === "needs_revision" ? "needs_revision" : "draft";
}

export type StoredContentPackage =
  | { status: "ok"; package: TrainingContentPackage; revisionIds: string[] }
  | { status: "not_ready"; reason: "blueprint_not_approved" | "block_plan_not_approved" | "frame_missing" };

/**
 * Het Training Content Package uit de current revisions van de snapshot (niet opgeslagen; één waarheid):
 * Blueprint en Block Plan current en goedgekeurd; Start, Einde en blokinhoud alleen als ze op deze Blueprint- en Block
 * Plan-revision zijn gebouwd; reviewstatus uit de events.
 */
export function composeContentFromSnapshot(snap: TrainingRecordSnapshot): StoredContentPackage {
  const blueprintRev = currentRevision(snap, "blueprint");
  if (!blueprintRev || !isApproved(snap, blueprintRev.id)) return { status: "not_ready", reason: "blueprint_not_approved" };
  const planRev = currentRevision(snap, "block_plan");
  if (!planRev || !isApproved(snap, planRev.id)) return { status: "not_ready", reason: "block_plan_not_approved" };
  const upstream = [blueprintRev.id, planRev.id];

  const startRev = currentRevision(snap, "start_content");
  const endRev = currentRevision(snap, "end_content");
  if (!builtOn(startRev, upstream) || !builtOn(endRev, upstream)) return { status: "not_ready", reason: "frame_missing" };

  const blockPlan = planRev.payload as BcOnlineBlockPlan;
  const blocks: BlockContentResult[] = [];
  const revisionIds = [blueprintRev.id, planRev.id, startRev.id, endRev.id];
  for (const planned of blockPlan.plannedBlocks) {
    const rev = currentRevision(snap, "block_content", planned.id);
    if (!builtOn(rev, upstream)) continue;
    blocks.push({ ...(rev.payload as BlockContentResult), reviewStatus: blockReviewStatus(snap, rev) });
    revisionIds.push(rev.id);
  }

  return {
    status: "ok",
    package: composeContentPackage({
      blueprint: blueprintRev.payload as TrainingBlueprintV2,
      blockPlan,
      frame: { start: startRev.payload as TrainingContentPackage["start"], end: endRev.payload as TrainingContentPackage["end"] },
      blocks,
    }),
    revisionIds,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Bronnen (certum-source/v1)
// ---------------------------------------------------------------------------------------------------------------

/** Een bronrevision als input voor de Block Content Engine, met herkomst (source key en revision-id). */
export function toValidatedSource(revision: ArtifactRevision): ValidatedSource {
  const p = revision.payload as CertumSource;
  return {
    sourceId: revision.artifactKey,
    revisionId: revision.id,
    title: p.title,
    sourceType: p.sourceType,
    author: p.author,
    publisher: p.publisher,
    publicationDate: p.publicationDate,
    url: p.url,
    sourceNeedRefs: p.sourceNeedRefs,
    relevantContent: p.relevantContent,
  };
}

/** De current bronrevisions van de training (één per bron), in volgorde van aanmaak. */
export function currentSources(snap: TrainingRecordSnapshot): ArtifactRevision[] {
  const keys = [...new Set(snap.revisions.filter((r) => r.artifactType === "source").map((r) => r.artifactKey))];
  return keys
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
    .map((k) => currentRevision(snap, "source", k)!)
    .filter(Boolean);
}

/**
 * De bronnen die de Block Content Engine mag gebruiken: current, gevalideerd (besluit op exact deze versie) en gebouwd
 * op de current goedgekeurde Blueprint. Candidate-bronnen en verouderde versies vallen hier altijd buiten.
 */
export function validatedSources(snap: TrainingRecordSnapshot): ValidatedSource[] {
  return currentSources(snap)
    .filter((r) => isApproved(snap, r.id))
    .map(toValidatedSource);
}

/** De versies van bronnen waarop een (Bron-)blokrevision is gebaseerd. */
export function sourcesUsedBy(snap: TrainingRecordSnapshot, revision: ArtifactRevision): ArtifactRevision[] {
  return revision.basedOnRevisionIds.map((id) => revisionById(snap, id)).filter((r): r is ArtifactRevision => r?.artifactType === "source");
}
