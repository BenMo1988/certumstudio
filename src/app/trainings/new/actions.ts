"use server";

import {
  MAX_INPUT_LENGTH,
  parseInputKind,
  type InputAnalysis,
} from "@/modules/training-agent";
import { AnalysisError, getTrainingAnalysisService, type AnalysisErrorKind } from "@/services/analysis";

const GENERIC_ERROR = "De analyse kon niet worden uitgevoerd. Probeer het opnieuw.";

/** Gebruikersmeldingen per fouttype. Nooit technische of providerdetails. */
const USER_MESSAGES: Partial<Record<AnalysisErrorKind, string>> = {
  "rate-limit": "Het is op dit moment te druk voor de analyse. Probeer het over een minuut opnieuw.",
  timeout: "De analyse duurde te lang. Probeer het opnieuw.",
  refusal: "Deze invoer kon niet worden geanalyseerd. Pas de tekst aan en probeer het opnieuw.",
  config: "De analyse is niet goed ingesteld. Neem contact op met de beheerder.",
  auth: "De analyse is niet goed ingesteld. Neem contact op met de beheerder.",
};

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
  } catch (error) {
    // Details staan al in de metadata-log van de service; hier alleen een veilige melding.
    const kind = error instanceof AnalysisError ? error.kind : null;
    if (kind === "config") console.error(`[certum.analysis] ${(error as AnalysisError).message}`);
    return { ok: false, error: (kind && USER_MESSAGES[kind]) ?? GENERIC_ERROR };
  }
}
