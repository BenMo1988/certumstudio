"use server";

import {
  MAX_INPUT_LENGTH,
  parseInputKind,
  type InputAnalysis,
} from "@/modules/training-agent";
import { getTrainingAnalysisService } from "@/services/analysis";

export type AnalyzeInputResult =
  | { ok: true; analysis: InputAnalysis }
  | { ok: false; error: string };

/**
 * Voert Certum Analyse uit op de ingevoerde tekst. Slaat niets op: het
 * resultaat gaat alleen terug naar de pagina.
 *
 * Server Functions zijn via een directe POST bereikbaar, dus de invoer wordt
 * hier opnieuw gevalideerd en niet blind vertrouwd.
 */
export async function analyzeInput(kind: unknown, text: unknown): Promise<AnalyzeInputResult> {
  const inputKind = parseInputKind(kind);
  if (!inputKind || typeof text !== "string") {
    return { ok: false, error: "Ongeldige invoer." };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Voer eerst een tekst in." };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { ok: false, error: `De tekst is te lang (maximaal ${MAX_INPUT_LENGTH.toLocaleString("nl-NL")} tekens).` };
  }

  try {
    const analysis = await getTrainingAnalysisService().analyze({ kind: inputKind, text: trimmed });
    return { ok: true, analysis };
  } catch {
    return { ok: false, error: "De analyse kon niet worden uitgevoerd. Probeer het opnieuw." };
  }
}
