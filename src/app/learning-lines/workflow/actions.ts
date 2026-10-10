"use server";

import { MODULE_IDS, type ModuleId } from "@/modules/learning-lines";
import { createLearningLineArchitect, learningLineProvenance } from "@/services/learning-line/factory";
import { StorageError, getDb } from "@/services/storage";
import { workflowDeps } from "../../trainings/workflow/deps";
import {
  approveDesign,
  approvePackage,
  generateDesign,
  requestDesignRevision,
  startLearningLine,
  startProduction,
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
const invalid = { status: "rejected" as const, reason: "invalid_input" as const };

async function guarded<T>(run: () => Promise<T>): Promise<T | { status: "rejected"; reason: "persistence_error" }> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof StorageError) return { status: "rejected", reason: "persistence_error" };
    throw error;
  }
}

export async function startLearningLineAction(prompt: unknown, syntheticDataAttested: unknown): Promise<StartLearningLineResult> {
  if (!isText(prompt, 4000)) return invalid;
  return guarded(() => startLearningLine(deps(), { prompt, syntheticDataAttested: syntheticDataAttested === true }));
}

export async function generateDesignAction(learningLineId: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId)) return invalid;
  return guarded(() => generateDesign(deps(), learningLineId));
}

export async function requestDesignRevisionAction(learningLineId: unknown, revisionId: unknown, feedback: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId) || !isId(revisionId) || !isText(feedback, 3000)) return invalid;
  return guarded(() => requestDesignRevision(deps(), learningLineId, revisionId, feedback));
}

export async function approveDesignAction(learningLineId: unknown, revisionId: unknown, syntheticDataAttested: unknown, acknowledgedFindings: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId) || !isId(revisionId) || typeof acknowledgedFindings !== "object" || acknowledgedFindings === null) return invalid;
  const acks: Partial<Record<ModuleId, string[]>> = {};
  for (const [key, value] of Object.entries(acknowledgedFindings)) {
    if (!MODULE_IDS.includes(key as ModuleId) || !Array.isArray(value) || value.length > 50 || !value.every((v) => isId(v))) return invalid;
    acks[key as ModuleId] = value as string[];
  }
  return guarded(() => approveDesign(deps(), learningLineId, { revisionId, syntheticDataAttested: syntheticDataAttested === true, acknowledgedFindings: acks }));
}

export async function startProductionAction(learningLineId: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId)) return invalid;
  return guarded(() => startProduction(deps(), learningLineId));
}

export async function approvePackageAction(learningLineId: unknown, packageHash: unknown): Promise<LearningLineResult> {
  if (!isId(learningLineId) || typeof packageHash !== "string" || !/^[0-9a-f]{64}$/.test(packageHash)) return invalid;
  return guarded(() => approvePackage(deps(), learningLineId, packageHash));
}
