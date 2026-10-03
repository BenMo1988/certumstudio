/**
 * Provider-onafhankelijke fout van de analyse-engine.
 *
 * `kind` is bedoeld voor logging en voor een passende gebruikersmelding.
 * `message` is technisch en nooit voor de eindgebruiker; bevat nooit
 * casusinhoud of ruwe providerresponses.
 */
export type AnalysisErrorKind =
  /** Configuratie ontbreekt of is ongeldig (bijv. geen API-key). */
  | "config"
  /** De provider weigert de sleutel of de toegang. */
  | "auth"
  | "rate-limit"
  | "timeout"
  /** Netwerkfout of provider onbereikbaar. */
  | "connection"
  /** Provider gaf een (5xx of andere) API-fout. */
  | "provider"
  /** De provider weigerde de input te analyseren. */
  | "refusal"
  /** Antwoord afgekapt (bijv. tokenlimiet). */
  | "incomplete"
  /** Lege of ontbrekende output. */
  | "empty"
  /** Output voldoet niet aan schema of businessregels. */
  | "invalid-output";

export class AnalysisError extends Error {
  constructor(
    readonly kind: AnalysisErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}
