"use server";

import { TRAINING_ANALYSIS_V211_PROMPT_VERSION } from "@/knowledge/prompts/training-analysis-v2-1-1";
import { TRAINING_BLOCK_CONTENT_V1_3_PROMPT_VERSION } from "@/knowledge/prompts/training-block-content-v1-3";
import { TRAINING_BLOCK_PLAN_PROMPT_VERSION } from "@/knowledge/prompts/training-block-plan-v1";
import { TRAINING_BLUEPRINT_V21_PROMPT_VERSION } from "@/knowledge/prompts/training-blueprint-v2-1";
import { TRAINING_BLUEPRINT_V22_PROMPT_VERSION } from "@/knowledge/prompts/training-blueprint-v2-2";
import { parsePreflightAcknowledgement } from "@/modules/privacy";
import { parseInputKind } from "@/modules/training-agent";
import { getTrainingAnalysisService } from "@/services/analysis";
import { readAnalysisConfig } from "@/services/analysis/config";
import { getBlockContentService } from "@/services/block-content";
import { readBlockContentConfig } from "@/services/block-content/config";
import { readBlockPlanConfig } from "@/services/block-plan/config";
import { getBlockPlanService, getTrainingBlueprintService } from "@/services/blueprint";
import { readBlueprintConfig } from "@/services/blueprint/config";
import { StorageError, getDb } from "@/services/storage";
import {
  decideRevision,
  generateBlockPlan,
  generateBlueprint,
  generateContent,
  regenerateBlock,
  requestBlueprintRevision,
  runAnalysis,
  selectDirection,
  startTraining,
  type Provenance,
  type StartTrainingResult,
  type WorkflowDeps,
  type WorkflowResult,
} from "./persisted-workflow";
import { addBlockPlanBlock, revisionHistory, saveBlockEdit, saveBlockPlanBlockEdit, saveFrameEdit, saveSourceNeedScopes, type RevisionHistoryEntry } from "./editing";
import { addSource, editSource, validateSource } from "./sources";

/*
 * Server Actions van de persisted workflow. Ze nemen uitsluitend ids en eenvoudige keuzes aan; Blueprint, Block Plan,
 * analyse en eerdere inhoud laadt de server zelf uit de database. Server Actions zijn via een directe POST bereikbaar,
 * dus alle invoer wordt hier opnieuw gevalideerd. Geen secrets of inhoud in logs.
 */

type ProviderConfig = { provider: string; claude?: { model: string; effort: string } };

function provenance(read: () => unknown, promptVersion: string): Provenance {
  try {
    const config = read() as ProviderConfig;
    if (config.provider === "claude" && config.claude) return { promptVersion, modelVersion: `${config.claude.model} · ${config.claude.effort}` };
    return { promptVersion: "mock", modelVersion: "mock" };
  } catch {
    // Onvolledige configuratie: de service-getter faalt dan zelf met een config-fout.
    return { promptVersion: null, modelVersion: null };
  }
}

function deps(): WorkflowDeps {
  return {
    db: getDb(),
    getAnalysisService: getTrainingAnalysisService,
    getBlueprintService: getTrainingBlueprintService,
    getBlockPlanService: getBlockPlanService,
    getBlockContentService: getBlockContentService,
    provenance: {
      analysis: provenance(readAnalysisConfig, TRAINING_ANALYSIS_V211_PROMPT_VERSION),
      blueprint: provenance(readBlueprintConfig, TRAINING_BLUEPRINT_V21_PROMPT_VERSION),
      blueprintRevision: provenance(readBlueprintConfig, TRAINING_BLUEPRINT_V22_PROMPT_VERSION),
      blockPlan: provenance(readBlockPlanConfig, TRAINING_BLOCK_PLAN_PROMPT_VERSION),
      blockContent: provenance(readBlockContentConfig, TRAINING_BLOCK_CONTENT_V1_3_PROMPT_VERSION),
    },
  };
}

const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 100;
const invalid: WorkflowResult = { status: "rejected", reason: "invalid_input" };

/** Ontbrekende database-instelling als nette afwijzing in plaats van een crash. */
async function guarded<T extends WorkflowResult | StartTrainingResult>(run: () => Promise<T>): Promise<T | WorkflowResult> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof StorageError) return { status: "rejected", reason: "persistence_error" };
    throw error;
  }
}

export async function startTrainingAction(kind: unknown, text: unknown, acknowledgement: unknown) {
  const inputKind = parseInputKind(kind);
  if (!inputKind || typeof text !== "string") return invalid;
  return guarded(() => startTraining(deps(), { kind: inputKind, text, acknowledgement: parsePreflightAcknowledgement(acknowledgement) }));
}

export async function runAnalysisAction(trainingId: unknown) {
  if (!isId(trainingId)) return invalid;
  return guarded(() => runAnalysis(deps(), trainingId));
}

export async function selectDirectionAction(trainingId: unknown, analysisRevisionId: unknown, trainingDirectionId: unknown) {
  if (!isId(trainingId) || !isId(analysisRevisionId) || !isId(trainingDirectionId)) return invalid;
  return guarded(() => selectDirection(deps(), trainingId, analysisRevisionId, trainingDirectionId));
}

export async function generateBlueprintAction(trainingId: unknown) {
  if (!isId(trainingId)) return invalid;
  return guarded(() => generateBlueprint(deps(), trainingId));
}

export async function decideRevisionAction(trainingId: unknown, revisionId: unknown, decision: unknown) {
  if (!isId(trainingId) || !isId(revisionId) || (decision !== "approved" && decision !== "needs_revision")) return invalid;
  return guarded(() => decideRevision(deps(), trainingId, revisionId, decision));
}

/** "Laten aanpassen" van de current Blueprint met een gerichte toelichting; genereert zelf niets. */
export async function requestBlueprintRevisionAction(trainingId: unknown, revisionId: unknown, feedback: unknown) {
  if (!isId(trainingId) || !isId(revisionId) || typeof feedback !== "string") return invalid;
  return guarded(() => requestBlueprintRevision(deps(), trainingId, revisionId, feedback));
}

export async function generateBlockPlanAction(trainingId: unknown) {
  if (!isId(trainingId)) return invalid;
  return guarded(() => generateBlockPlan(deps(), trainingId));
}

export async function generateContentAction(trainingId: unknown) {
  if (!isId(trainingId)) return invalid;
  return guarded(() => generateContent(deps(), trainingId));
}

export async function regenerateBlockAction(trainingId: unknown, plannedBlockId: unknown, expectedRevisionId: unknown) {
  if (!isId(trainingId) || !isId(plannedBlockId) || (expectedRevisionId !== null && !isId(expectedRevisionId))) return invalid;
  return guarded(() => regenerateBlock(deps(), trainingId, plannedBlockId, expectedRevisionId));
}

// ---------------------------------------------------------------------------------------------------------------
// Training Review & Editor V1: handmatig bewerken (0 AI-aanroepen)
// ---------------------------------------------------------------------------------------------------------------

/** Handmatige bewerking van één blok: alleen de bewerkbare velden en eventueel de geschatte minuten. */
export async function saveBlockEditAction(trainingId: unknown, plannedBlockId: unknown, expectedRevisionId: unknown, edit: unknown) {
  if (!isId(trainingId) || !isId(plannedBlockId) || !isId(expectedRevisionId) || typeof edit !== "object" || edit === null) return invalid;
  const { content, estimatedMinutes, assessmentRole } = edit as { content?: unknown; estimatedMinutes?: unknown; assessmentRole?: unknown };
  return guarded(() => saveBlockEdit(deps(), trainingId, plannedBlockId, expectedRevisionId, { content, estimatedMinutes, assessmentRole }));
}

/** Handmatige bewerking van Vaste Start (`introduction`) of Vast Einde (`closingText`, `summary`). */
export async function saveFrameEditAction(trainingId: unknown, part: unknown, expectedRevisionId: unknown, fields: unknown) {
  if (!isId(trainingId) || (part !== "start" && part !== "end") || !isId(expectedRevisionId)) return invalid;
  return guarded(() => saveFrameEdit(deps(), trainingId, part, expectedRevisionId, fields));
}

/** SourceNeed Scope Review: de opleider classificeert iedere kennisbehoefte (nieuwe Blueprint-revision, opnieuw goedkeuren). */
export async function saveSourceNeedScopesAction(trainingId: unknown, expectedRevisionId: unknown, scopes: unknown) {
  if (!isId(trainingId) || !isId(expectedRevisionId)) return invalid;
  return guarded(() => saveSourceNeedScopes(deps(), trainingId, expectedRevisionId, scopes));
}

/** Human Block Plan Override: één gepland blok handmatig corrigeren (nieuwe Block Plan-revision, opnieuw goedkeuren). */
export async function saveBlockPlanBlockEditAction(trainingId: unknown, plannedBlockId: unknown, expectedRevisionId: unknown, edit: unknown) {
  if (!isId(trainingId) || !isId(plannedBlockId) || !isId(expectedRevisionId)) return invalid;
  return guarded(() => saveBlockPlanBlockEdit(deps(), trainingId, plannedBlockId, expectedRevisionId, edit));
}

/** Human Block Plan Override, toevoegen: een ontbrekend gepland blok invoegen; de server zet id en volgorde. */
export async function addBlockPlanBlockAction(trainingId: unknown, expectedRevisionId: unknown, addition: unknown) {
  if (!isId(trainingId) || !isId(expectedRevisionId)) return invalid;
  return guarded(() => addBlockPlanBlock(deps(), trainingId, expectedRevisionId, addition));
}

/** Read-only historie van één blok of van Start/Einde. */
export async function revisionHistoryAction(trainingId: unknown, target: unknown): Promise<RevisionHistoryEntry[] | null> {
  if (!isId(trainingId) || typeof target !== "object" || target === null) return null;
  const t = target as { part?: unknown; plannedBlockId?: unknown };
  const which: { part: "start" | "end" } | { plannedBlockId: string } | null =
    t.part === "start" || t.part === "end" ? { part: t.part } : isId(t.plannedBlockId) ? { plannedBlockId: t.plannedBlockId } : null;
  if (!which) return null;
  try {
    return await revisionHistory(deps(), trainingId, which);
  } catch (error) {
    if (error instanceof StorageError) return null;
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Source Workspace V1: bronnen toevoegen, corrigeren en valideren (0 AI-aanroepen)
// ---------------------------------------------------------------------------------------------------------------

/** Nieuwe bron (candidate) bij bestaande sourceNeeds van de goedgekeurde Blueprint. */
export async function addSourceAction(trainingId: unknown, fields: unknown) {
  if (!isId(trainingId)) return invalid;
  return guarded(() => addSource(deps(), trainingId, fields));
}

/** Bron corrigeren: nieuwe versie die opnieuw gevalideerd moet worden. */
export async function editSourceAction(trainingId: unknown, sourceId: unknown, expectedRevisionId: unknown, fields: unknown) {
  if (!isId(trainingId) || !isId(sourceId) || !isId(expectedRevisionId)) return invalid;
  return guarded(() => editSource(deps(), trainingId, sourceId, expectedRevisionId, fields));
}

/** Validatie door de opleider; alleen met expliciete bevestiging van de vaste verklaring. */
export async function validateSourceAction(trainingId: unknown, revisionId: unknown, confirmed: unknown) {
  if (!isId(trainingId) || !isId(revisionId)) return invalid;
  return guarded(() => validateSource(deps(), trainingId, revisionId, confirmed === true));
}
