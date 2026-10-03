import type { PreflightCategory, PreflightSeverity } from "./types";

/**
 * Per categorie: ernst en gebruikerslabel.
 *
 * Alleen categorieën met een vast, controleerbaar formaat blokkeren. Namen, instellingen,
 * losse datums en gewone URL's zijn zwakke signalen en vragen daarom om menselijke review.
 */
export const CATEGORY_INFO: Record<PreflightCategory, { severity: PreflightSeverity; label: string }> = {
  email: { severity: "blocked", label: "E-mailadres" },
  phone: { severity: "blocked", label: "Telefoonnummer" },
  postcode: { severity: "blocked", label: "Postcode" },
  street_address: { severity: "blocked", label: "Straat en huisnummer" },
  bsn: { severity: "blocked", label: "BSN" },
  iban: { severity: "blocked", label: "IBAN (rekeningnummer)" },
  labeled_id: { severity: "blocked", label: "Dossier-, cliënt- of ander identificatienummer" },
  birth_date: { severity: "blocked", label: "Geboortedatum" },
  social_profile: { severity: "blocked", label: "Social-media-account of -profiel" },
  full_date: { severity: "review_required", label: "Volledige datum" },
  url: { severity: "review_required", label: "Webadres" },
  possible_person_name: { severity: "review_required", label: "Mogelijke persoonsnaam" },
  institution_name: { severity: "review_required", label: "Mogelijke naam van een school of instelling" },
};
