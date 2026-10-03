import type { BlueprintGenerationInputV21 } from "@/modules/training-blueprint/v2/trusted-route-policy";
import { TRAINING_BLUEPRINT_V2_INSTRUCTIONS, buildTrainingBlueprintV2Request } from "./training-blueprint-v2";

/*
 * Certum Learning Architect: instructies versie 2.1 (contract blijft blueprint-contract/v2).
 *
 * Exact training-blueprint/v2 met twee vervangingen: het routebeleid hoort bij de vaste context, en de opdracht om de
 * ambiguïteit te kiezen is vervangen door de uitleg dat zij vaststaat (afgeleid uit het routebeleid van de gekozen
 * Analysis-richting). Alle andere v2-regels blijven letterlijk gelijk; training-blueprint/v2 zelf blijft ongewijzigd.
 * De mapping zelf staat alleen in code (`ambiguityFor`); deze tekst legt de betekenis uit.
 */

export const TRAINING_BLUEPRINT_V21_PROMPT_VERSION = "training-blueprint/v2.1";

const FIXED_CONTEXT_V2 =
  "De gekozen richting, het leerdoel, het professionele dilemma, de doelgroep en de bronsegmenten van de richting staan vast.";
const FIXED_CONTEXT_V21 =
  "De gekozen richting, het leerdoel, het professionele dilemma, de doelgroep, het routebeleid en de bronsegmenten van de richting staan vast.";

const CHOOSE_AMBIGUITY_V2 = `Kies in "ambiguity":
- "single_best_action" alleen als de gekozen richting werkelijk één normatief gewenste professionele handelwijze veronderstelt;
- "multiple_defensible_actions" als verschillende handelingsroutes professioneel verdedigbaar blijven.
Los professionele ambiguïteit niet kunstmatig op. Je keuze bepaalt de rest van het ontwerp; het systeem leidt er het routebeleid van keuzemoment en Actie uit af ("open_choice" bij meerdere verdedigbare routes, "prescribed_action" bij één beste handelwijze).`;

const FIXED_AMBIGUITY_V21 = `De ambiguïteit staat vast. Ze volgt uit het routebeleid van de gekozen richting (zie "Routebeleid" in <gekozen_richting>), dat in de analyse is vastgesteld:
- "open_choice": verschillende handelingsroutes blijven professioneel verdedigbaar; dat is "multiple_defensible_actions";
- "prescribed_action": één handelingslijn is normatief of inhoudelijk leidend; dat is "single_best_action".
Jij kiest de ambiguïteit niet, geeft haar niet terug en probeert haar niet te veranderen. Je ontwerpt binnen dit routebeleid; het systeem voegt de ambiguïteit toe en leidt er het routebeleid van keuzemoment en Actie uit af.`;

for (const [needle, label] of [
  [FIXED_CONTEXT_V2, "vaste context"],
  [CHOOSE_AMBIGUITY_V2, "ambiguïteitskeuze"],
] as const) {
  if (!TRAINING_BLUEPRINT_V2_INSTRUCTIONS.includes(needle)) {
    throw new Error(`training-blueprint/v2.1: ${label} in training-blueprint/v2 niet gevonden.`);
  }
}

export const TRAINING_BLUEPRINT_V21_INSTRUCTIONS = TRAINING_BLUEPRINT_V2_INSTRUCTIONS.replace(
  FIXED_CONTEXT_V2,
  FIXED_CONTEXT_V21,
).replace(CHOOSE_AMBIGUITY_V2, FIXED_AMBIGUITY_V21);

/** Het gebruikersbericht: gelijk aan v2, met het routebeleid van de gekozen richting erbij. */
export function buildTrainingBlueprintV21Request(input: BlueprintGenerationInputV21): string {
  const { routePolicy, ...direction } = input.selectedDirection;
  const v2 = buildTrainingBlueprintV2Request({
    ...input,
    contractVersion: input.contractVersion,
    selectedDirection: direction,
  });
  const sourceRefsLine = `SourceRefs: ${direction.sourceRefs.join(", ")}\n`;
  if (!v2.includes(sourceRefsLine)) throw new Error("training-blueprint/v2.1: SourceRefs-regel niet gevonden.");
  return v2
    .replace(sourceRefsLine, `${sourceRefsLine}Routebeleid: ${routePolicy}\n`)
    .replace(
      "Richting, leerdoel, dilemma, doelgroep en bronsegmenten zijn vaste context",
      "Richting, leerdoel, dilemma, doelgroep, routebeleid en bronsegmenten zijn vaste context",
    );
}
