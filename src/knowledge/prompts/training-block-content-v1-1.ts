import type { BlockContentGenerationInput } from "@/modules/block-content/generation-input";
import {
  BLOCK_GUIDANCE,
  TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS,
  TRAINING_FRAME_V1_INSTRUCTIONS,
  buildBlockContentRequest,
} from "./training-block-content-v1";

/*
 * Certum Content Writer, promptversie 1.1. Contract blijft `block-content/v1`.
 *
 * Exact de v1-tekst (die ongewijzigd blijft voor de reproduceerbare V1-baseline), plus drie gerichte aanvullingen uit
 * de baseline-review:
 * 1. deelnemergerichte inhoud claimt geen onbewezen downstream-gebruik van output (BC-002);
 * 2. geen verzonnen kwantitatieve eisen; het minimum aantal woorden van een Productie zet het systeem (BC-002);
 * 3. het Scenario/context-veld van een Chat simulatie is ontvanger-neutraal (BC-001).
 * Dit zijn semantische regels: ze worden bewaakt via prompt, eval en human review, niet via een tekstvalidator.
 */

export const TRAINING_BLOCK_CONTENT_V1_1_PROMPT_VERSION = "training-block-content/v1.1";

/** Vervangt precies één bestaande passage; faalt hard als de v1-tekst onverwacht anders is. */
function replaceOnce(text: string, from: string, to: string): string {
  if (!text.includes(from)) throw new Error(`training-block-content/v1.1: passage niet gevonden: ${from.slice(0, 40)}`);
  return text.replace(from, to);
}

const V1_TRUSTED = "Ids, volgorde, fase, bloktype, werkvorm, routebeleid, reviewstatus, het assettype en de AI Feedback-context voegt het systeem toe.";
const V1_1_TRUSTED =
  "Ids, volgorde, fase, bloktype, werkvorm, routebeleid, reviewstatus, het assettype, de AI Feedback-context en het minimum aantal woorden van een Productie voegt het systeem toe.";

const V1_1_RULES = `## Geen onbewezen gebruik van output
Deelnemergerichte tekst beweert niet dat een antwoord, productie, chatverloop, pollkeuze, document of andere output later automatisch wordt gebruikt, beschikbaar komt voor AI Feedback, wordt doorgestuurd naar een ander blok of door een volgend blok wordt beoordeeld. Dat mag alleen als de catalogus het aantoonbaar ondersteunt; AI Feedback ontvangt aantoonbaar alleen antwoorden op eerdere vraagblokken (Meerkeuze, Open vraag, Poll). Vraag de deelnemer gewoon om de opdracht uit te voeren.

## Geen verzonnen kwantitatieve eisen
Voeg geen numerieke eis aan de deelnemer toe die niet in de Blueprint of het Block Plan staat: geen minimum of maximum aantal woorden, aantal zinnen, tijdslimiet, verplicht aantal argumenten of verplicht aantal voorbeelden.

## Taal en toon`;

export const TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS = replaceOnce(
  replaceOnce(TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS, V1_TRUSTED, V1_1_TRUSTED),
  "## Taal en toon",
  V1_1_RULES,
);

/** Blokaanwijzingen v1.1: alleen Chat simulatie en Productie wijzigen. */
export const BLOCK_GUIDANCE_V1_1: Record<string, string> = {
  ...BLOCK_GUIDANCE,
  "certum.bco.chat-simulatie":
    "Chat simulatie: naam van de fictieve persoon, instructies voor die persoon (rol, houding, wat hij of zij weet en niet zegt), optioneel scenario/context en het eerste bericht. Uit de catalogus blijkt niet of BC Online het veld scenario/context aan de deelnemer, aan de fictieve persoon of aan beide geeft: schrijf het daarom ontvanger-neutraal, als situatieschets in de derde persoon (bijvoorbeeld \"De deelnemer is teamleider en voert een gesprek met …\"), begrijpelijk als uitleg voor de deelnemer én als context voor de AI. Niet \"Je bent …\". Een gespreksdoel met sleutelwoorden is geen beoordeling van professioneel redeneren: gebruik het alleen als het schema het toestaat en het de voorgeschreven handeling ondersteunt. Tijdslimiet alleen als het Block Plan erom vraagt.",
  "certum.bco.productie":
    "Productie: het type product (rapportage, e-mail, veiligheidsplan of anders), de opdracht en optioneel een sjabloon of starttekst. Een sjabloon zegt de inhoud niet voor. Het minimum aantal woorden zet het systeem; noem in de opdracht ook geen eigen lengte-eis. Vraag de deelnemer het product te schrijven, zonder te beweren dat het later door een ander blok wordt gebruikt of beoordeeld.",
};

export function buildTrainingBlockContentV1_1Request(input: BlockContentGenerationInput & { contractVersion: string }): string {
  return buildBlockContentRequest(input, BLOCK_GUIDANCE_V1_1);
}

export const TRAINING_FRAME_V1_1_INSTRUCTIONS = replaceOnce(
  TRAINING_FRAME_V1_INSTRUCTIONS,
  TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS,
  TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS,
);
