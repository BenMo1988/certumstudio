import type { BlockContentGenerationInput } from "@/modules/block-content/generation-input";
import { BRON_GUIDANCE, TRAINING_FRAME_V1_INSTRUCTIONS, TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS, buildBlockContentRequest } from "./training-block-content-v1";
import { BLOCK_GUIDANCE_V1_1, TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS } from "./training-block-content-v1-1";

/*
 * Certum Content Writer, promptversie 1.2 (Source Workspace V1). Contract blijft `block-content/v1`.
 *
 * Exact v1.1 (die ongewijzigd blijft), plus één regel voor Bron-inhoud met door de opleider gevalideerde bronnen:
 * schrijf uitsluitend wat de aangeleverde broninhoud ondersteunt; is die onvoldoende, dan `needs_source`. Voor alle
 * andere blokken is het gebruikersbericht identiek aan v1.1.
 */

export const TRAINING_BLOCK_CONTENT_V1_2_PROMPT_VERSION = "training-block-content/v1.2";

const SOURCE_RULE = `## Bron-inhoud alleen uit gevalideerde bronnen
Bij een Bron-blok krijg je soms <gevalideerde_bronnen>: bronnen die de opleider zelf heeft gecontroleerd. Schrijf dan uitsluitend wat de aangeleverde broninhoud ("relevantContent") aantoonbaar ondersteunt. Vul niets aan uit eigen kennis, ook niet als het voor de hand ligt; geen wetten, richtlijnen, cijfers of onderzoek die niet in de bron staan. Noem een bron alleen met de titel zoals aangeleverd; verzin geen bronvermelding, auteur, jaartal of URL. Is de broninhoud onvoldoende om de kennisvraag van de sourceNeed te beantwoorden, geef dan "needs_source" en beschrijf wat in de bron ontbreekt.

## Taal en toon`;

function replaceOnce(text: string, from: string, to: string): string {
  if (!text.includes(from)) throw new Error(`training-block-content/v1.2: passage niet gevonden: ${from.slice(0, 40)}`);
  return text.replace(from, to);
}

export const TRAINING_BLOCK_CONTENT_V1_2_INSTRUCTIONS = replaceOnce(TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS, "## Taal en toon", SOURCE_RULE);

const BRON_WITH_SOURCES_GUIDANCE =
  "Dit blok staat in de Bron-fase en er zijn gevalideerde bronnen die de vereiste sourceNeeds dekken (zie <gevalideerde_bronnen>). Schrijf de inhoud uitsluitend op basis van die broninhoud, gekoppeld aan de kennisvragen van de sourceNeeds, zonder eigen kennis toe te voegen. Zet de gedekte sourceNeed-ids in \"sourceNeedRefs\". Is de broninhoud onvoldoende, geef dan 'needs_source'.";

export function buildTrainingBlockContentV1_2Request(input: BlockContentGenerationInput & { contractVersion: string }): string {
  const base = buildBlockContentRequest(input, BLOCK_GUIDANCE_V1_1);
  if (input.targetBlock.certumPhase !== "bron" || input.validatedSources.length === 0) return base;
  const withGuidance = replaceOnce(base, BRON_GUIDANCE, BRON_WITH_SOURCES_GUIDANCE);
  return `${withGuidance}

<gevalideerde_bronnen>
${JSON.stringify(input.validatedSources, null, 2)}
</gevalideerde_bronnen>`;
}

export const TRAINING_FRAME_V1_2_INSTRUCTIONS = replaceOnce(TRAINING_FRAME_V1_INSTRUCTIONS, TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS, TRAINING_BLOCK_CONTENT_V1_2_INSTRUCTIONS);
