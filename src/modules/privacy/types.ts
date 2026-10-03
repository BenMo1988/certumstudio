/**
 * Privacy Preflight V1: lokale, deterministische controle vóór iedere externe AI-aanroep.
 *
 * Belangrijk: "safe" betekent alleen dat er geen direct herkenbare identificatoren zijn gevonden.
 * Het is geen garantie dat een tekst anoniem is (namen en combinaties van kenmerken zijn niet
 * betrouwbaar automatisch te herkennen).
 */
export const PRIVACY_PREFLIGHT_VERSION = "privacy-preflight/v1";

export const PREFLIGHT_CATEGORIES = [
  "email",
  "phone",
  "postcode",
  "street_address",
  "bsn",
  "iban",
  "labeled_id",
  "birth_date",
  "full_date",
  "social_profile",
  "url",
  "possible_person_name",
  "institution_name",
] as const;

export type PreflightCategory = (typeof PREFLIGHT_CATEGORIES)[number];

/** blocked: kan alleen worden opgelost door de tekst aan te passen. review_required: bevestigen of aanpassen. */
export type PreflightSeverity = "blocked" | "review_required";

export type PreflightStatus = "safe" | "review_required" | "blocked";

export interface PreflightFinding {
  /** Stabiel voor dezelfde tekst, bijv. "phone-1". Bevat nooit de gevonden waarde. */
  id: string;
  category: PreflightCategory;
  severity: PreflightSeverity;
  /**
   * Positie in de (getrimde) tekst. Alleen voor weergave in de eigen browser van de gebruiker;
   * nooit loggen of extern versturen.
   */
  span: { start: number; end: number };
}

export interface PreflightResult {
  version: typeof PRIVACY_PREFLIGHT_VERSION;
  status: PreflightStatus;
  findings: PreflightFinding[];
}

/** Menselijke bevestigingen, gebonden aan exact dezelfde tekst via een hash. */
export interface PreflightAcknowledgement {
  /** SHA-256 van de getrimde tekst. Nooit loggen. */
  textHash: string;
  /** Alleen review-bevindingen kunnen worden bevestigd. */
  acknowledgedFindingIds: string[];
  /**
   * Bevestiging onder de tijdelijke governance-policy `synthetic_only` (zie modules/governance).
   * Beoordeeld door die policy, niet door de preflight.
   */
  syntheticDataAttested: boolean;
}

export type GateRejection = "blocked" | "review_required" | "stale_acknowledgement";

export type GateDecision = { allowed: true } | { allowed: false; reason: GateRejection };
