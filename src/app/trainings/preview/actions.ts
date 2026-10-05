"use server";

import { createPreviewRuntimeService } from "@/services/preview";
import { StorageError, getDb } from "@/services/storage";
import { previewChatTurn, previewFeedback, type PreviewChatResult, type PreviewDeps, type PreviewFeedbackResult } from "./preview-runtime";

/*
 * Server Actions van Participant Preview V1. Ze nemen alleen ids, de eigen deelnemerstekst en de synthetic-only-
 * bevestiging aan; alle trusted configuratie laadt de server uit de goedgekeurde training. Geen inhoud in logs
 * (`logging.serverFunctions: false` blijft staan).
 */

const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 100;

function deps(): PreviewDeps {
  return { db: getDb(), getRuntime: createPreviewRuntimeService };
}

export async function previewChatTurnAction(trainingId: unknown, plannedBlockId: unknown, history: unknown, message: unknown, syntheticAttested: unknown): Promise<PreviewChatResult> {
  if (!isId(trainingId) || !isId(plannedBlockId)) return { status: "rejected", reason: "invalid_input" };
  try {
    return await previewChatTurn(deps(), { trainingId, plannedBlockId, history, message, syntheticAttested });
  } catch (error) {
    if (error instanceof StorageError) return { status: "rejected", reason: "provider_error" };
    throw error;
  }
}

export async function previewFeedbackAction(trainingId: unknown, plannedBlockId: unknown, answers: unknown, syntheticAttested: unknown): Promise<PreviewFeedbackResult> {
  if (!isId(trainingId) || !isId(plannedBlockId)) return { status: "rejected", reason: "invalid_input" };
  try {
    return await previewFeedback(deps(), { trainingId, plannedBlockId, answers, syntheticAttested });
  } catch (error) {
    if (error instanceof StorageError) return { status: "rejected", reason: "provider_error" };
    throw error;
  }
}
