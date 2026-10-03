"use server";

import { parsePreflightAcknowledgement, type PreflightResult } from "@/modules/privacy";
import {
  MAX_INPUT_LENGTH,
  parseInputKind,
  type InputAnalysis,
} from "@/modules/training-agent";
import { AnalysisError, getTrainingAnalysisService, type AnalysisErrorKind } from "@/services/analysis";
import { runGatedAnalysis, type InputGateRejection } from "./gated-analysis";

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
  | { status: "analysis"; analysis: InputAnalysis }
  | { status: "preflight"; reason: InputGateRejection; preflight: PreflightResult }
  | { status: "error"; error: string };

/**
 * Voert Certum Analyse uit, maar alleen na de lokale Privacy Preflight en de actieve
 * data-policy (synthetic_only). Slaat niets op.
 *
 * Server Functions zijn via een directe POST bereikbaar, dus alle invoer, inclusief de
 * bevestigingen, wordt hier opnieuw gevalideerd en de preflight opnieuw uitgevoerd.
 */
export async function analyzeInput(
  kind: unknown,
  text: unknown,
  acknowledgement: unknown,
): Promise<AnalyzeInputResult> {
  const inputKind = parseInputKind(kind);
  if (!inputKind || typeof text !== "string") {
    return { status: "error", error: "Ongeldige invoer." };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { status: "error", error: "Voer eerst een tekst in." };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return {
      status: "error",
      error: `De tekst is te lang (maximaal ${MAX_INPUT_LENGTH.toLocaleString("nl-NL")} tekens).`,
    };
  }

  try {
    return await runGatedAnalysis(
      { kind: inputKind, text: trimmed },
      parsePreflightAcknowledgement(acknowledgement),
      { getService: getTrainingAnalysisService },
    );
  } catch (error) {
    // Details staan al in de metadata-log van de service; hier alleen een veilige melding.
    const errorKind = error instanceof AnalysisError ? error.kind : null;
    if (errorKind === "config") console.error(`[certum.analysis] ${(error as AnalysisError).message}`);
    return { status: "error", error: (errorKind && USER_MESSAGES[errorKind]) ?? GENERIC_ERROR };
  }
}
