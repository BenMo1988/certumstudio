/**
 * TIJDELIJKE GOVERNANCE-POLICY voor de verwerking van invoer door externe AI-providers.
 *
 * Dit is geen permanente functionele eis van Certum Studio, maar de huidige ontwikkelpolicy.
 * Totdat Bureau Certum expliciet een governance- en privacybesluit heeft genomen over echte
 * casuïstiek en externe AI-verwerking, geldt `synthetic_only`: alle invoer, van elke soort,
 * moet uitsluitend fictieve/synthetische testdata zijn.
 *
 * Deze policy wijzig je alleen bewust, na dat besluit. Een nieuwe policy-waarde dwingt via de
 * exhaustieve switch hieronder af dat de serverregel expliciet wordt doordacht.
 *
 * De Privacy Preflight staat hier los van: die beperkt technisch risico, maar geeft geen
 * toestemming om echte casuïstiek te verwerken.
 */
export type DataProcessingPolicy = "synthetic_only";

/** De actieve policy. De enige plek waar die wordt bepaald. */
export const ACTIVE_DATA_POLICY: DataProcessingPolicy = "synthetic_only";

/** Letterlijke tekst van de bevestiging die de gebruiker onder `synthetic_only` moet geven. */
export const SYNTHETIC_DATA_ATTESTATION =
  "Ik bevestig dat deze invoer uitsluitend fictieve/synthetische testdata bevat en geen gegevens uit een echte casus bevat.";

export type DataPolicyRejection = "synthetic_data_attestation_required";

export type DataPolicyDecision = { allowed: true } | { allowed: false; reason: DataPolicyRejection };

/**
 * Serverregel voor de actieve policy. Krijgt bewust géén inputsoort mee: de policy geldt voor
 * onderwerp, praktijkvraag en casus gelijk en kan dus niet worden omzeild door een andere soort
 * te kiezen.
 *
 * @param attestedForThisText true alleen als de bevestiging bij exact deze tekst hoort (hash-match).
 */
export function evaluateDataPolicy(
  policy: DataProcessingPolicy,
  attestedForThisText: boolean,
): DataPolicyDecision {
  switch (policy) {
    case "synthetic_only":
      return attestedForThisText
        ? { allowed: true }
        : { allowed: false, reason: "synthetic_data_attestation_required" };
  }
}
