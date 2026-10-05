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
