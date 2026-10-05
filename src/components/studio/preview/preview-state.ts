/*
 * Kleine, pure UI-logica van Participant Preview (Step 17E), los te testen zonder browser.
 */

/** Feedback van één AI Feedback-blok in de previewsessie. */
export type FeedbackEntry = { status: "done"; text: string; usedContext: string[] } | { status: "truncated" };

/**
 * Wat het feedbackblok toont:
 * - `request`: nog niet opgehaald ("Feedback ophalen");
 * - `done`: complete feedback;
 * - `truncated`: de vorige poging was afgekapt. Opnieuw genereren is een aparte, expliciete actie die een nieuwe
 *   AI-aanroep start, nooit de gewone "Feedback ophalen"-stand en nooit automatisch.
 */
export function feedbackView(entry: FeedbackEntry | undefined): "request" | "done" | "truncated" {
  if (!entry) return "request";
  return entry.status;
}

/** Alleen complete feedback rondt het blok af; afgekapte feedback niet. */
export const isFeedbackComplete = (entry: FeedbackEntry | undefined) => entry?.status === "done";

/**
 * Hooguit één runtime-call tegelijk vanuit één UI-actie: een tweede aanroep terwijl de eerste nog loopt, doet niets
 * (ook bij een dubbele klik binnen dezelfde render, vóór `pending` zichtbaar is).
 */
export function createSingleFlight() {
  let busy = false;
  return async function run(task: () => Promise<void>): Promise<boolean> {
    if (busy) return false;
    busy = true;
    try {
      await task();
      return true;
    } finally {
      busy = false;
    }
  };
}

/** Eén Chat simulatie in de previewsessie. */
export interface ChatState {
  /** Afgeronde beurten ná het eerste bericht van de persona: steeds deelnemer → persona. */
  turns: { role: "participant" | "persona"; text: string }[];
  closed: boolean;
  goalMessage: string | null;
  /**
   * Step 17E: een verstuurd deelnemersbericht waarvan het AI-antwoord was afgekapt. Het telt nog niet als afgeronde
   * beurt en wordt bij "Antwoord opnieuw genereren" exact zo opnieuw aangeboden, met dezelfde geschiedenis ervoor.
   */
  pendingRetry: string | null;
}

export const emptyChat = (): ChatState => ({ turns: [], closed: false, goalMessage: null, pendingRetry: null });

/**
 * De runtime-aanvraag voor een chatactie, of `null` als die actie nu niet mag:
 * - `send`: een nieuw bericht; niet zolang er een afgekapte beurt openstaat (die moet eerst opnieuw gegenereerd);
 * - `retry`: exact dezelfde geschiedenis en hetzelfde bericht als de afgekapte poging; geen nieuwe deelnemersbeurt.
 */
export function chatRequestFor(
  chat: ChatState,
  action: { kind: "send"; message: string } | { kind: "retry" },
): { history: ChatState["turns"]; message: string } | null {
  if (chat.closed) return null;
  if (action.kind === "retry") return chat.pendingRetry ? { history: chat.turns, message: chat.pendingRetry } : null;
  if (chat.pendingRetry) return null;
  const message = action.message.trim();
  return message ? { history: chat.turns, message } : null;
}

/** De nieuwe chatstand na een runtime-resultaat voor `message`. */
export function applyChatResult(
  chat: ChatState,
  message: string,
  result: { status: "ok"; reply: string; goalMessage: string | null } | { status: "rejected"; reason: string },
): ChatState {
  if (result.status === "ok") {
    return {
      ...chat,
      turns: [...chat.turns, { role: "participant", text: message }, { role: "persona", text: result.reply }],
      goalMessage: result.goalMessage ?? chat.goalMessage,
      pendingRetry: null,
    };
  }
  if (result.reason === "output_truncated") return { ...chat, pendingRetry: message };
  return chat;
}
