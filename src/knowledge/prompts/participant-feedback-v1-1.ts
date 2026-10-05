import { PARTICIPANT_FEEDBACK_SYSTEM } from "./participant-feedback-v1";

/*
 * Participant Feedback runtime, promptversie 1.1. Exact de v1-tekst plus één sectie: een expliciet compact didactisch
 * budget. Aanleiding: Step 17B, waar de feedback van één blok de volledige technische limiet van 1500 outputtokens
 * opgebruikte (`preview_feedback_max_tokens`). De technische limiet blijft als headroom; de lengte wordt hier
 * inhoudelijk begrensd. v1 blijft ongewijzigd.
 */

export const PARTICIPANT_FEEDBACK_V1_1_PROMPT_VERSION = "participant-feedback/v1.1";

export const PARTICIPANT_FEEDBACK_V1_1_SYSTEM = `${PARTICIPANT_FEEDBACK_SYSTEM}

Omvang en opbouw:
- Houd de feedback compact: ongeveer 350 tot 500 woorden, nooit meer. Een feedbackblok duurt voor de deelnemer ongeveer vijf minuten.
- Gebruik hooguit drie korte inhoudelijke onderdelen.
- Benoem één concrete sterkte in het antwoord van de deelnemer.
- Benoem één concrete aanscherping of een vraag waarmee de deelnemer verder kan.
- Verbind je feedback met de criteria uit de goedgekeurde instructies voor dit feedbackblok.
- Herhaal het antwoord van de deelnemer niet volledig en vat de casus niet uitgebreid samen. Herhaal jezelf niet.
- Je kent het gesprek of de simulatie zelf niet, alleen de antwoorden hieronder. Wees daar eerlijk over als het ertoe doet.
- Introduceer geen theorie, methodiek of kader die niet in de instructies of de antwoorden staat.
- Sluit af met een volledige zin.`;

export { buildParticipantFeedbackRequest } from "./participant-feedback-v1";
