import { z } from "zod";
import { CERTUM_SOURCE_VERSION, CertumSourceSchema } from "@/modules/sources/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { zodIssueCodes } from "@/services/block-content/diagnostics";
import { contentHash } from "@/services/storage/canonical-json";
import { currentRevision } from "@/services/storage/snapshot";
import { appendWorkflowEvent, createArtifactRevision, loadTrainingRecordSnapshot } from "@/services/storage/training-record";
import { MANUAL_EDIT } from "@/services/storage/workspace";
import { approvedUpstream, ok, reject, rejectError, type WorkflowDeps, type WorkflowResult } from "./persisted-workflow";

/*
 * Source Workspace V1: sourceNeed → menselijke bron → menselijke validatie → (later) grounded Bron-inhoud.
 *
 * - Een bron is een immutable revision (`artifact_type = 'source'`, key `src-n`), gekoppeld aan bestaande sourceNeeds
 *   van de current goedgekeurde Blueprint (`based_on` = die Blueprint). Geen nieuwe sourceNeeds vanuit hier.
 * - Validatie is een bewust besluit van de opleider op exact één bronversie (workflow event `approved`, gebonden aan de
 *   content_hash). Wijzigen maakt een nieuwe versie die opnieuw gevalideerd moet worden; de oude validatie geldt niet
 *   voor de nieuwe versie en Bron-inhoud die op de oude versie steunt, wordt stale.
 * - Geen AI, geen webscraping, geen automatisch "betrouwbaar"-label. 0 AI-aanroepen.
 */

/** Wat de opleider invult; versie, herkomst en hash zet de server. */
const SourceFieldsSchema = CertumSourceSchema.omit({ version: true });
export type SourceFields = z.infer<typeof SourceFieldsSchema>;

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** Normaliseert lege optionele velden naar `null` en valideert strikt (onbekende velden worden geweigerd). */
function parseFields(raw: unknown) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { success: false as const, issues: ["invalid_type@fields"] };
  const r = raw as Record<string, unknown>;
  const candidate = { ...r, author: emptyToNull(r.author), publisher: emptyToNull(r.publisher), publicationDate: emptyToNull(r.publicationDate), url: emptyToNull(r.url) };
  const parsed = SourceFieldsSchema.safeParse(candidate);
  return parsed.success ? { success: true as const, data: parsed.data } : { success: false as const, issues: zodIssueCodes(parsed.error) };
}

const invalidInput = (deps: WorkflowDeps, action: string, issues: string[]): WorkflowResult => ({ ...reject(deps, action, "invalid_input", "validation"), issues });

/** Alleen bestaande, unieke sourceNeeds van de goedgekeurde Blueprint (de opslag controleert dit opnieuw). */
function unknownNeeds(fields: SourceFields, blueprint: TrainingBlueprintV2): string[] {
  const ids = blueprint.sourceNeeds.map((s) => s.id);
  const refs = fields.sourceNeedRefs;
  return refs.some((r) => !ids.includes(r)) || new Set(refs).size !== refs.length ? ["unknown_source_need@sourceNeedRefs"] : [];
}

/** Nieuwe bron (candidate) bij één of meer bestaande sourceNeeds van de current goedgekeurde Blueprint. */
export async function addSource(deps: WorkflowDeps, trainingId: string, raw: unknown): Promise<WorkflowResult> {
  const action = "add_source";
  const snap = await loadTrainingRecordSnapshot(deps.db, trainingId);
  if (!snap) return reject(deps, action, "not_found");
  const up = approvedUpstream(snap);
  if (!up) return reject(deps, action, "invalid_state");
  const fields = parseFields(raw);
  if (!fields.success) return invalidInput(deps, action, fields.issues);
  const unknown = unknownNeeds(fields.data, up.blueprint.payload as TrainingBlueprintV2);
  if (unknown.length > 0) return invalidInput(deps, action, unknown);
  const used = snap.revisions.filter((r) => r.artifactType === "source").map((r) => Number(r.artifactKey.slice(4)));
  const key = `src-${(used.length ? Math.max(...used) : 0) + 1}`;
  try {
    await createArtifactRevision(deps.db, {
      trainingId,
      artifactType: "source",
      artifactKey: key,
      contractVersion: CERTUM_SOURCE_VERSION,
      promptVersion: null,
      modelVersion: MANUAL_EDIT,
      payload: { version: CERTUM_SOURCE_VERSION, ...fields.data },
      basedOnRevisionIds: [up.blueprint.id],
      expectedCurrentRevisionId: null,
    });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

/** Bron corrigeren: nieuwe versie (weer te controleren). Ongewijzigd opslaan maakt niets aan. */
export async function editSource(deps: WorkflowDeps, trainingId: string, sourceId: string, expectedRevisionId: string, raw: unknown): Promise<WorkflowResult> {
  const action = "edit_source";
  const snap = await loadTrainingRecordSnapshot(deps.db, trainingId);
  if (!snap) return reject(deps, action, "not_found");
  const up = approvedUpstream(snap);
  if (!up) return reject(deps, action, "invalid_state");
  const current = currentRevision(snap, "source", sourceId);
  if (!current) return reject(deps, action, "not_found");
  if (current.id !== expectedRevisionId) return reject(deps, action, "stale_revision");
  const fields = parseFields(raw);
  if (!fields.success) return invalidInput(deps, action, fields.issues);
  const unknown = unknownNeeds(fields.data, up.blueprint.payload as TrainingBlueprintV2);
  if (unknown.length > 0) return invalidInput(deps, action, unknown);
  const payload = { version: CERTUM_SOURCE_VERSION, ...fields.data };
  if (contentHash(payload) === current.contentHash && current.basedOnRevisionIds.includes(up.blueprint.id)) return ok(deps, trainingId, action);
  try {
    await createArtifactRevision(deps.db, {
      trainingId,
      artifactType: "source",
      artifactKey: sourceId,
      contractVersion: CERTUM_SOURCE_VERSION,
      promptVersion: null,
      modelVersion: MANUAL_EDIT,
      payload,
      basedOnRevisionIds: [up.blueprint.id],
      expectedCurrentRevisionId: expectedRevisionId,
    });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

/**
 * De opleider bevestigt: "Ik heb deze bron gecontroleerd en wil deze gebruiken voor deze training." Alleen op de
 * current versie; gebonden aan haar content_hash. Zonder bevestiging geen validatie.
 */
export async function validateSource(deps: WorkflowDeps, trainingId: string, revisionId: string, confirmed: boolean): Promise<WorkflowResult> {
  const action = "validate_source";
  if (confirmed !== true) return invalidInput(deps, action, ["confirmation_required"]);
  const snap = await loadTrainingRecordSnapshot(deps.db, trainingId);
  const revision = snap?.revisions.find((r) => r.id === revisionId);
  if (!snap || !revision || revision.artifactType !== "source") return reject(deps, action, "not_found");
  try {
    await appendWorkflowEvent(deps.db, { trainingId, artifactRevisionId: revisionId, eventType: "approved" });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}
