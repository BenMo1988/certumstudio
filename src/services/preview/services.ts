/*
 * Participant Preview runtime (Step 17A): de trainer doorloopt een goedgekeurde training als deelnemer. Twee runtime-
 * taken, elk achter een interface (mock of Claude), alleen server-side:
 * - de fictieve persona van een Chat simulatie laten antwoorden;
 * - AI Feedback geven op uitsluitend de server-goedgekeurde context.
 * Alle trusted configuratie komt server-side uit de current goedgekeurde blokrevisions; de browser levert alleen de
 * deelnemerstekst en de eigen gespreksgeschiedenis van dat ene blok.
 */

export interface PreviewChatTurn {
  role: "participant" | "persona";
  text: string;
}

/** Trusted Chat simulatie-configuratie uit de goedgekeurde blokrevision (nooit uit de browser). */
export interface PreviewChatConfig {
  personaName: string;
  personaInstructions: string;
  scenarioContext: string | null;
  firstMessage: string;
  /** Sleutelwoorddoel zoals in BC Online; `null` bij open keuze. */
  goal: { keywords: string[]; messageOnGoal: string; instructionAfterGoal: string } | null;
}

export interface PreviewChatRequest {
  config: PreviewChatConfig;
  /** De volledige geschiedenis van dít blok, beginnend met het eerste bericht van de persona. */
  history: PreviewChatTurn[];
  /** Of het gespreksdoel (sleutelwoorden) al bereikt is; de persona volgt dan de instructie na doelbehaling. */
  goalReached: boolean;
}

/** Een antwoord van de deelnemer dat AI Feedback aantoonbaar krijgt (catalogus: antwoorden op eerdere vraagblokken). */
export interface PreviewFeedbackContextItem {
  plannedBlockId: string;
  blockTitle: string;
  question: string;
  answer: string;
}

export interface PreviewFeedbackRequest {
  /** Trusted instructies uit de goedgekeurde AI Feedback-blokrevision. */
  instructions: string;
  /** Uitsluitend server-gefilterde context (`availableContext`); nooit chatgeschiedenis. */
  context: PreviewFeedbackContextItem[];
}

/**
 * Een runtime-antwoord: de tekst voor de deelnemer, de stop reason en, bij een echte provider, tokenaantallen. De
 * runtimelaag beslist: `max_tokens` is nooit een compleet antwoord (Step 17C); de tekst wordt dan niet getoond.
 */
export interface PreviewRuntimeResult {
  text: string;
  stopReason: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
  /** Inhoudsvrije metadata over de providerrespons (Step 17E): alleen aantallen en bloktypes, nooit tekst. */
  response: PreviewResponseMeta;
}

export interface PreviewResponseMeta {
  /** Het `max_tokens` dat in de request stond (`null` bij de mock). */
  maxTokens: number | null;
  /** Lengte van de zichtbare tekst die de runtime zou tonen. */
  visibleChars: number;
  visibleWords: number;
  /** Typen van de contentblokken in de respons, in volgorde (bijv. ["thinking", "text"]); nooit de inhoud. */
  contentBlockTypes: string[];
  /** Of de respons een thinking-blok bevatte. Het aantal thinking-tokens geeft de API niet apart; wordt niet afgeleid. */
  thinkingBlockPresent: boolean;
}

/** Aantallen over een zichtbare tekst; nooit de tekst zelf. */
export function visibleTextMeta(text: string): { visibleChars: number; visibleWords: number } {
  const trimmed = text.trim();
  return { visibleChars: trimmed.length, visibleWords: trimmed ? trimmed.split(/\s+/).length : 0 };
}

export interface PreviewRuntimeService {
  readonly info: { provider: "mock" | "claude"; model: string | null; chatEffort: string | null; feedbackEffort: string | null };
  chatReply(request: PreviewChatRequest): Promise<PreviewRuntimeResult>;
  feedback(request: PreviewFeedbackRequest): Promise<PreviewRuntimeResult>;
}
