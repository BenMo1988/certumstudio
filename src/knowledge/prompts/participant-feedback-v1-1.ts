import { PARTICIPANT_FEEDBACK_SYSTEM } from "./participant-feedback-v1";

/*
 * Participant Feedback runtime, promptversie 1.1. Exact de v1-tekst plus één sectie: een expliciet compact didactisch
 * budget. Aanleiding: Step 17B, waar de feedback van één blok de volledige technische limiet van 1500 outputtokens
 * opgebruikte (`preview_feedback_max_tokens`). De technische limiet blijft als headroom; de lengte wordt hier
 * inhoudelijk begrensd. v1 blijft ongewijzigd.
 */

export const PARTICIPANT_FEEDBACK_V1_1_PROMPT_VERSION = "participant-feedback/v1.1";

export const PARTICIPANT_FEEDBACK_V1_1_SYSTEM = `${PARTICIPANT_FEEDBACK_SYSTEM}

Omvang:
- Houd de feedback compact: ongeveer 350 tot 500 woorden, nooit meer. Een feedbackblok duurt voor de deelnemer ongeveer vijf minuten.
- Kies de twee of drie punten die voor deze deelnemer het meest opleveren. Herhaal het antwoord van de deelnemer niet en herhaal jezelf niet.
- Sluit af met een volledige zin; laat de feedback niet halverwege eindigen.`;

export { buildParticipantFeedbackRequest } from "./participant-feedback-v1";
