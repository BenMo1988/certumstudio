import type { LearningLineRejection, PrivacyFlag } from "@/app/learning-lines/workflow/learning-lines";

export const LEARNING_LINE_MESSAGES: Record<LearningLineRejection, string> = {
  invalid_input: "Dit kon niet worden verwerkt. Controleer je tekst.",
  input_gate: "Bevestig eerst dat je uitsluitend fictieve/synthetische testdata gebruikt.",
  privacy_blocked: "Je tekst bevat mogelijk persoonsgegevens. Er is niets verstuurd; pas je tekst aan.",
  not_found: "Deze leerlijn bestaat niet (meer).",
  invalid_state: "Deze stap past niet bij de huidige stand. Ververs de pagina.",
  stale_revision: "Er is intussen een nieuwere versie. Ververs de pagina.",
  acknowledgement_required: "Bevestig eerst de gemarkeerde fragmenten in de module-invoer.",
  not_ready: "Nog niet alle zes modules zijn Training gereed.",
  provider_error: "Er kwam nu geen ontwerp. Probeer het opnieuw.",
  invalid_output: "Het ontwerp voldeed niet aan het leerlijncontract (exact zes modules). Probeer het opnieuw.",
  production_failed: "Een module kon niet als training worden aangemaakt. Bekijk de modules en probeer het opnieuw.",
  persistence_error: "Opslaan lukte niet. Probeer het opnieuw.",
};

/** Melding bij een afwijzing; bij een privacyblokkade met de gemarkeerde fragmenten uit de eigen tekst. */
export function learningLineError(result: { reason: LearningLineRejection; categories?: string[]; flagged?: PrivacyFlag[] }): string {
  const lines = [LEARNING_LINE_MESSAGES[result.reason]];
  if (result.flagged?.length) lines.push(`Mogelijk persoonsgegeven: ${result.flagged.map((f) => `‘${f.text}’`).join(", ")}`);
  if (result.categories?.length) lines.push(`(${result.categories.join(", ")})`);
  return lines.join("\n");
}
