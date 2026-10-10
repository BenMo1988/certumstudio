"use server";

import { MODULE_IDS, type ModuleId } from "@/modules/learning-lines";
import { SOURCE_KINDS } from "@/modules/sources/schema";
import { SOURCE_NEED_SCOPES, type SourceNeedScope } from "@/modules/training-blueprint/v2/schema";
import { createLearningLineArchitect, learningLineProvenance } from "@/services/learning-line/factory";
import { StorageError, getDb } from "@/services/storage";
import { workflowDeps } from "../../trainings/workflow/deps";
import {
  approveGate1,
  approveGate2,
  generateDesign,
  prepareModules,
  produceContent,
  requestDesignRevision,
  startLearningLine,
  type Gate1Input,
  type Gate1ModuleDecision,
  type Gate1SourceFields,
  type LearningLineDeps,
  type LearningLineResult,
  type StartLearningLineResult,
} from "./learning-lines";

/*
 * Server Actions van de Leerlijn Engine. Alleen ids, keuzes en eigen tekst; de server laadt de rest uit Postgres.
 * Server Actions zijn via een directe POST bereikbaar: alle invoer wordt hier opnieuw gevalideerd. Geen inhoud in logs
 * (`logging.serverFunctions: false` blijft staan).
 */

function deps(): LearningLineDeps {
  return { db: getDb(), getArchitect: createLearningLineArchitect, provenance: learningLineProvenance(), training: workflowDeps() };
}

const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 100;
const isText = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = { status: "rejected" as const, reason: "invalid_input" as const };

async function guarded<T>(run: () => Promise<T>): Promise<T | { status: "rejected"; reason: "persistence_error" }> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof StorageError) return { status: "rejected", reason: "persistence_error" };
    throw error;
  }
}

function parseAcks(value: unknown): Partial<Record<ModuleId, string[]>> | null {
  if (!isObject(value)) return null;
  const acks: Partial<Record<ModuleId, string[]>> = {};
  for (const [key, v] of Object.entries(value)) {
    if (!MODULE_IDS.includes(key as ModuleId) || !Array.isArray(v) || v.length > 50 || !v.every(isId)) return null;
    acks[key as ModuleId] = v as string[];
  }
  return acks;
}

const optionalText = (v: unknown, max: number): string | null | undefined => (v === null || v === undefined || v === "" ? null : isText(v, max) ? v : undefined);

function parseSource(value: unknown): Gate1SourceFields | null {
  if (!isObject(value)) return null;
  const { title, sourceType, author, publisher, publicationDate, url, relevantContent } = value;
  if (!isText(title, 300) || !isText(relevantContent, 20_000) || !SOURCE_KINDS.includes(sourceType as (typeof SOURCE_KINDS)[number])) return null;
  const fields = { author: optionalText(author, 300), publisher: optionalText(publisher, 300), publicationDate: optionalText(publicationDate, 10), url: optionalText(url, 2000) };
  if (Object.values(fields).some((f) => f === undefined)) return null;
  return { title, sourceType: sourceType as Gate1SourceFields["sourceType"], relevantContent, ...(fields as { author: string | null; publisher: string | null; publicationDate: string | null; url: string | null }) };
}

function parseGate1(value: unknown): Gate1Input | null {
  if (!isObject(value) || !isId(value.revisionId) || !isObject(value.modules)) return null;
  const modules: Partial<Record<ModuleId, Gate1ModuleDecision>> = {};
  for (const [key, raw] of Object.entries(value.modules)) {
    if (!MODULE_IDS.includes(key as ModuleId) || !isObject(raw) || !isId(raw.blueprintRevisionId) || typeof raw.planHash !== "string" || !/^[0-9a-f]{64}$/.test(raw.planHash)) return null;
    if (!isObject(raw.scopes) || !Array.isArray(raw.librarySourceIds) || !Array.isArray(raw.extraSources) || raw.extraSources.length > 3) return null;
    const scopes: Record<string, SourceNeedScope> = {};
    for (const [sn, scope] of Object.entries(raw.scopes)) {
      if (!/^SN[1-9]$/.test(sn) || !SOURCE_NEED_SCOPES.includes(scope as SourceNeedScope)) return null;
      scopes[sn] = scope as SourceNeedScope;
    }
    if (!raw.librarySourceIds.every(isId) || raw.librarySourceIds.length > 20) return null;
    const extraSources = raw.extraSources.map(parseSource);
    if (extraSources.some((s) => s === null)) return null;
    modules[key as ModuleId] = { blueprintRevisionId: raw.blueprintRevisionId, planHash: raw.planHash, scopes, librarySourceIds: raw.librarySourceIds as string[], extraSources: extraSources as Gate1SourceFields[] };
  }
  return { revisionId: value.revisionId, syntheticDataAttested: value.syntheticDataAttested === true, sourcesValidated: value.sourcesValidated === true, modules };
}

/** Eén prompt → ontwerp → automatische voorbereiding van de zes modules (AI-aanroepen als de providers op Claude staan). */
export async function startLearningLineAction(prompt: unknown, syntheticDataAttested: unknown): Promise<StartLearningLineResult> {
  if (!isText(prompt, 4000)) return invalid;
  return guarded(() => startLearningLine(deps(), { prompt, syntheticDataAttested: syntheticDataAttested === true }));
}

export async function generateDesignAction(learningLineId: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId)) return invalid;
  return guarded(async () => {
    const d = deps();
    const designed = await generateDesign(d, learningLineId);
    return designed.status === "ok" ? prepareModules(d, learningLineId) : designed;
  });
}

export async function requestDesignRevisionAction(learningLineId: unknown, revisionId: unknown, feedback: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId) || !isId(revisionId) || !isText(feedback, 3000)) return invalid;
  return guarded(() => requestDesignRevision(deps(), learningLineId, revisionId, feedback));
}

/** Voorbereiding hervatten; optioneel met bevestigde bevindingen in een module-invoer (uitzonderingspad). */
export async function prepareModulesAction(learningLineId: unknown, acknowledgedFindings: unknown): Promise<LearningLineResult> {
  const acks = acknowledgedFindings === undefined ? {} : parseAcks(acknowledgedFindings);
  if (!isId(learningLineId) || !acks) return invalid;
  return guarded(() => prepareModules(deps(), learningLineId, acks));
}

/** Gate 1 = één GO; daarna start direct de automatische productie. */
export async function approveGate1Action(learningLineId: unknown, input: unknown): Promise<LearningLineResult> {
  const parsed = parseGate1(input);
  if (!isId(learningLineId) || !parsed) return invalid;
  return guarded(async () => {
    const d = deps();
    const approved = await approveGate1(d, learningLineId, parsed);
    return approved.status === "ok" ? produceContent(d, learningLineId) : approved;
  });
}

/** Productie hervatten (uitzonderingspad na een mislukt blok). Start nieuwe AI-aanroepen voor wat nog ontbreekt. */
export async function produceContentAction(learningLineId: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId)) return invalid;
  return guarded(() => produceContent(deps(), learningLineId));
}

/** Gate 2 = één GO over de inhoud die de opleider zag. */
export async function approveGate2Action(learningLineId: unknown, fingerprint: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId) || typeof fingerprint !== "string" || !/^[0-9a-f]{64}$/.test(fingerprint)) return invalid;
  return guarded(() => approveGate2(deps(), learningLineId, fingerprint));
}
