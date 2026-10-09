import type { BlockContentGenerationInput } from "@/modules/block-content/generation-input";
import { TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS, TRAINING_FRAME_V1_INSTRUCTIONS } from "./training-block-content-v1";
import { TRAINING_BLOCK_CONTENT_V1_2_INSTRUCTIONS, buildTrainingBlockContentV1_2Request } from "./training-block-content-v1-2";

/*
 * Certum Content Writer, promptversie 1.3. Contract blijft `block-content/v1`.
 *
 * Exact v1.2 (die ongewijzigd blijft), plus expliciete lengtebudgetten. De schemagrenzen (Tekst `text` 4000, Open vraag
 * `question` 600) gaan via structured output alleen als beschrijving mee en worden pas na ontvangst door Zod
 * gecontroleerd; TR-0019 bewees `too_big@result.content.question:max=600`. Het budget ligt bewust onder de schemagrens.
 *
 * - System: een sectie "Lengtebudget" (altijd mee, ook voor Bron-blokken, die de blokaanwijzing niet krijgen).
 * - Gebruikersbericht: het v1.2-verzoek plus één budgetregel voor het doelblok, als dat bloktype een budget heeft.
 * Geen schemawijziging en geen retry.
 */

export const TRAINING_BLOCK_CONTENT_V1_3_PROMPT_VERSION = "training-block-content/v1.3";

/** Schrijfbudget per bloktype: ruim onder de schemagrens (Tekst 4000, Open vraag 600). */
export const BLOCK_CONTENT_LENGTH_BUDGETS: Record<string, { field: string; maxChars: number }> = {
  "certum.bco.tekst": { field: "text", maxChars: 3600 },
  "certum.bco.open-vraag": { field: "question", maxChars: 500 },
};

const LENGTH_RULE = `## Lengtebudget
De technische grenzen per veld staan in het schema; blijf er ruim onder. Deze budgetten zijn harde schrijfgrenzen voor jou, geen eis aan de deelnemer: noem ze niet in de inhoud.
- Tekst: "text" maximaal 3600 tekens. Schrijf compact en herhaal geen theorie of context die al in een ander blok staat.
- Open vraag: "question" maximaal 500 tekens. Formuleer de opdracht compact; deelopdrachten mogen genummerd zijn. Zet geen uitleg in de vraag die in een voorafgaand blok thuishoort.
Compact is niet inhoudelijk smaller: laat geen onderdeel van "purpose" weg, houd bij "open_choice" meerdere routes open en blijf bij een Bron-blok even brongetrouw. Vraagt "purpose" meerdere handelingen, formuleer die dan als korte genummerde deelopdrachten binnen het budget.

## Taal en toon`;

function replaceOnce(text: string, from: string, to: string): string {
  if (!text.includes(from)) throw new Error(`training-block-content/v1.3: passage niet gevonden: ${from.slice(0, 40)}`);
  return text.replace(from, to);
}

export const TRAINING_BLOCK_CONTENT_V1_3_INSTRUCTIONS = replaceOnce(TRAINING_BLOCK_CONTENT_V1_2_INSTRUCTIONS, "## Taal en toon", LENGTH_RULE);

export function buildTrainingBlockContentV1_3Request(input: BlockContentGenerationInput & { contractVersion: string }): string {
  const base = buildTrainingBlockContentV1_2Request(input);
  const budget = BLOCK_CONTENT_LENGTH_BUDGETS[input.targetBlock.catalogBlockId];
  return budget ? `${base}\n\nLengtebudget voor dit blok: "${budget.field}" maximaal ${budget.maxChars} tekens.` : base;
}

export const TRAINING_FRAME_V1_3_INSTRUCTIONS = replaceOnce(TRAINING_FRAME_V1_INSTRUCTIONS, TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS, TRAINING_BLOCK_CONTENT_V1_3_INSTRUCTIONS);
