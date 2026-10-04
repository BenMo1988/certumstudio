import { z } from "zod";
import {
  ACCREDITATION_FIELDS,
  BLOCK_CONTENT_VERSION,
  BlockContentResultSchema,
  EndContentSchema,
  StartContentSchema,
  type BlockContentResult,
} from "@/modules/block-content/schema";
import { checkBlockContentInvariants, composeBlockContent, resolveBlockTarget, type BlockPayloadDesign } from "@/modules/block-content";
import type { BcOnlineBlockPlan } from "@/modules/block-plan";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { editableContentSchema } from "@/services/block-content/design";
import { zodIssueCodes } from "@/services/block-content/diagnostics";
import { contentHash } from "@/services/storage/canonical-json";
import { builtOn, currentRevision, sourcesUsedBy, toValidatedSource } from "@/services/storage/snapshot";
import { createArtifactRevision, loadTrainingRecordSnapshot, type ArtifactRevision } from "@/services/storage/training-record";
import { MANUAL_EDIT, type RevisionSource } from "@/services/storage/workspace";
import { approvedEarlierContent, approvedUpstream, ok, reject, rejectError, type WorkflowDeps, type WorkflowResult } from "./persisted-workflow";

/*
 * Training Review & Editor V1: handmatig bewerken bovenop de server-authoritative persistence.
 *
 * - Een bewerking is altijd een nieuwe, immutable revision (current; concept). De vorige revision en haar besluiten
 *   blijven historie; een goedkeuring gaat niet mee.
 * - De browser levert alleen de bewerkbare velden. Bloktype, fase, routebeleid, plannedBlockId, AI Feedback-context,
 *   bron van Conditionele logica en `minimumWords` komen uit de opgeslagen revision en het plan.
 * - Mens en AI volgen dezelfde regels: hetzelfde strikte veldschema per doelblok (`editableContentSchema`), daarna
 *   compose, het volledige contractschema en de blokinvarianten. Geen tekstpolitie: de inhoud zelf is vrij.
 * - `expectedRevisionId` is verplicht: een verouderde of dubbele bewerking geeft `stale_revision` (geen
 *   last-write-wins). Een opslag zonder wijziging maakt geen nieuwe revision.
 * 0 AI-aanroepen.
 */

const MINUTES = ACCREDITATION_FIELDS.estimatedMinutes;

export interface BlockEdit {
  /** Alleen de bewerkbare velden van dit bloktype. */
  content: unknown;
  /** Geschatte minuten (geheel getal 1–120) of `null`; weglaten = ongewijzigd. */
  estimatedMinutes?: unknown;
}

const invalidInput = (deps: WorkflowDeps, action: string, issues: string[]): WorkflowResult => ({ ...reject(deps, action, "invalid_input", "validation"), issues });

function upstreamOf(snap: NonNullable<Awaited<ReturnType<typeof loadTrainingRecordSnapshot>>>) {
  const up = approvedUpstream(snap);
  if (!up || !up.plan || !up.planApproved) return null;
  return { blueprint: up.blueprint, plan: up.plan, ids: [up.blueprint.id, up.plan.id] };
}

/** Handmatige bewerking van één gegenereerd blok: revision +1, concept. */
export async function saveBlockEdit(
  deps: WorkflowDeps,
  trainingId: string,
  plannedBlockId: string,
  expectedRevisionId: string,
  edit: BlockEdit,
): Promise<WorkflowResult> {
  const action = "save_block_edit";
  const snap = await loadTrainingRecordSnapshot(deps.db, trainingId);
  if (!snap) return reject(deps, action, "not_found");
  const up = upstreamOf(snap);
  if (!up) return reject(deps, action, "invalid_state");
  const current = currentRevision(snap, "block_content", plannedBlockId);
  if (!current || !builtOn(current, up.ids)) return reject(deps, action, "not_found");
  if (current.id !== expectedRevisionId) return reject(deps, action, "stale_revision");
  const stored = current.payload as BlockContentResult;
  if (stored.body.status !== "generated") return reject(deps, action, "invalid_state");

  const blueprint = up.blueprint.payload as TrainingBlueprintV2;
  const plan = up.plan.payload as BcOnlineBlockPlan;
  // Een bewerkt Bron-blok blijft gebaseerd op dezelfde bronversies (provenance); die moeten nog current en gevalideerd zijn.
  const usedSources = sourcesUsedBy(snap, current).map(toValidatedSource);
  const target = resolveBlockTarget(blueprint, plan, plannedBlockId, usedSources);
  if (!target || typeof edit.content !== "object" || edit.content === null || Array.isArray(edit.content)) return invalidInput(deps, action, ["invalid_type@content"]);

  // Trusted: de bron van Conditionele logica blijft die van de opgeslagen revision.
  const candidate: Record<string, unknown> = { ...(edit.content as Record<string, unknown>) };
  if (stored.body.content.catalogBlockId === "certum.bco.conditionele-logica") candidate.sourceBlockId = stored.body.content.sourceBlockId;
  const content = editableContentSchema(target).safeParse(candidate);
  if (!content.success) return invalidInput(deps, action, zodIssueCodes(content.error));
  const minutes = edit.estimatedMinutes === undefined ? { success: true as const, data: stored.accreditation.estimatedMinutes } : MINUTES.safeParse(edit.estimatedMinutes);
  if (!minutes.success) return invalidInput(deps, action, ["invalid@estimatedMinutes"]);

  const block = composeBlockContent(
    {
      status: "generated",
      accreditation: {
        learningGoalContribution: stored.accreditation.learningGoalContribution,
        assessmentRole: stored.accreditation.assessmentRole,
        sourceNeedRefs: stored.accreditation.sourceNeedRefs,
        estimatedMinutes: minutes.data,
      },
      content: content.data as BlockPayloadDesign,
    },
    target,
  );
  const parsed = BlockContentResultSchema.safeParse(block);
  if (!parsed.success) return invalidInput(deps, action, zodIssueCodes(parsed.error));
  const violations = checkBlockContentInvariants(parsed.data, { blueprint, blockPlan: plan, approvedEarlierContent: approvedEarlierContent(snap, plan, plannedBlockId, up.ids), validatedSources: usedSources });
  if (violations.length > 0) return invalidInput(deps, action, violations);
  if (contentHash(parsed.data) === current.contentHash) return ok(deps, trainingId, action);

  try {
    await createArtifactRevision(deps.db, {
      trainingId,
      artifactType: "block_content",
      artifactKey: plannedBlockId,
      contractVersion: BLOCK_CONTENT_VERSION,
      promptVersion: null,
      modelVersion: MANUAL_EDIT,
      payload: parsed.data,
      basedOnRevisionIds: [...up.ids, ...usedSources.map((s) => s.revisionId)],
      expectedCurrentRevisionId: expectedRevisionId,
    });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

const START_EDIT = z.strictObject({ introduction: StartContentSchema.shape.introduction });
const END_EDIT = z.strictObject({ closingText: EndContentSchema.shape.closingText, summary: EndContentSchema.shape.summary });

/**
 * Handmatige bewerking van Vaste Start (uitleg) of Vast Einde (afsluitende tekst, samenvatting): revision +1, concept.
 * Titel en leerdoel komen uit de Blueprint, de vervolgaanbeveling blijft `null`.
 */
export async function saveFrameEdit(deps: WorkflowDeps, trainingId: string, part: "start" | "end", expectedRevisionId: string, fields: unknown): Promise<WorkflowResult> {
  const action = `save_${part}_edit`;
  const snap = await loadTrainingRecordSnapshot(deps.db, trainingId);
  if (!snap) return reject(deps, action, "not_found");
  const up = upstreamOf(snap);
  if (!up) return reject(deps, action, "invalid_state");
  const type = part === "start" ? "start_content" : "end_content";
  const current = currentRevision(snap, type);
  if (!current || !builtOn(current, up.ids)) return reject(deps, action, "not_found");
  if (current.id !== expectedRevisionId) return reject(deps, action, "stale_revision");

  const blueprint = up.blueprint.payload as TrainingBlueprintV2;
  let payload: unknown;
  if (part === "start") {
    const parsed = START_EDIT.safeParse(fields);
    if (!parsed.success) return invalidInput(deps, action, zodIssueCodes(parsed.error));
    payload = { title: blueprint.title, introduction: parsed.data.introduction, learningGoals: [blueprint.learningGoal] };
  } else {
    const parsed = END_EDIT.safeParse(fields);
    if (!parsed.success) return invalidInput(deps, action, zodIssueCodes(parsed.error));
    payload = { closingText: parsed.data.closingText, summary: parsed.data.summary, followUpRecommendation: null };
  }
  if (contentHash(payload) === current.contentHash) return ok(deps, trainingId, action);

  try {
    await createArtifactRevision(deps.db, {
      trainingId,
      artifactType: type,
      contractVersion: BLOCK_CONTENT_VERSION,
      promptVersion: null,
      modelVersion: MANUAL_EDIT,
      payload,
      basedOnRevisionIds: up.ids,
      expectedCurrentRevisionId: expectedRevisionId,
    });
  } catch (error) {
    return rejectError(deps, action, error);
  }
  return ok(deps, trainingId, action);
}

export interface RevisionHistoryEntry {
  revisionId: string;
  revisionNo: number;
  createdAt: string;
  source: RevisionSource;
  current: boolean;
  payload: unknown;
}

/** Eenvoudige, read-only historie van één blok of van Start/Einde (nieuwste eerst). Geen diff, geen herstel. */
export async function revisionHistory(deps: WorkflowDeps, trainingId: string, target: { part: "start" | "end" } | { plannedBlockId: string }): Promise<RevisionHistoryEntry[] | null> {
  const snap = await loadTrainingRecordSnapshot(deps.db, trainingId);
  if (!snap) return null;
  const [type, key] = "part" in target ? [target.part === "start" ? "start_content" : "end_content", "main"] : ["block_content", target.plannedBlockId];
  const current = currentRevision(snap, type as ArtifactRevision["artifactType"], key);
  return snap.revisions
    .filter((r) => r.artifactType === type && r.artifactKey === key)
    .sort((a, b) => b.revisionNo - a.revisionNo)
    .map((r) => ({
      revisionId: r.id,
      revisionNo: r.revisionNo,
      createdAt: r.createdAt.toISOString(),
      source: r.modelVersion === MANUAL_EDIT ? "manual" : "generated",
      current: r.id === current?.id,
      payload: r.payload,
    }));
}
