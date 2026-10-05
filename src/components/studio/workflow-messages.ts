import type { WorkflowRejection } from "@/app/trainings/workflow/persisted-workflow";

/** Gebruikersmeldingen per afwijzing van de persisted workflow. Nooit technische of providerdetails. */
const MESSAGES: Record<WorkflowRejection, string> = {
  not_found: "Deze training of dit onderdeel bestaat niet (meer).",
  invalid_input: "De wijziging past niet binnen de regels van dit onderdeel en is niet opgeslagen.",
  input_gate: "De privacycontrole of de bevestiging van synthetische testdata is niet geldig.",
  attestation_outdated: "De bevestiging van synthetische testdata hoort bij een oudere tekst. Start een nieuwe training.",
  invalid_state: "Deze stap kan nu niet: een eerdere stap is nog niet (geldig) goedgekeurd.",
  stale_revision: "Deze inhoud is inmiddels gewijzigd. Herlaad de nieuwste versie voordat je verdergaat.",
  direction_locked: "De richting ligt vast: er is al een Blueprint op gebaseerd.",
  provider_error: "Deze stap kon nu niet worden uitgevoerd. Probeer het later opnieuw.",
  invalid_output: "Het resultaat voldeed niet aan de regels en is niet opgeslagen. Probeer het opnieuw.",
  persistence_error: "Opslaan is niet gelukt; er is niets gewijzigd. Probeer het opnieuw.",
  scope_review_required: "Classificeer eerst alle kennisbehoeften en sla de keuzes op voordat je de Blueprint goedkeurt.",
};

export function workflowMessage(reason: WorkflowRejection): string {
  return MESSAGES[reason];
}
