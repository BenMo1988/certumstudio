import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import type { BlueprintGenerationInputV21 } from "@/modules/training-blueprint/v2/trusted-route-policy";
import { TRAINING_BLUEPRINT_V21_INSTRUCTIONS, buildTrainingBlueprintV21Request } from "./training-blueprint-v2-1";

/*
 * Certum Learning Architect: instructies versie 2.2 (contract blijft blueprint-contract/v2).
 *
 * Exact training-blueprint/v2.1 plus één sectie: een gerichte revisie van een eerdere Blueprint op basis van een
 * menselijke revisietoelichting ("laten aanpassen"). Wordt uitsluitend gebruikt als er zo'n toelichting is; zonder
 * toelichting gaat ongewijzigd v2.1 naar de provider. training-blueprint/v2.1 zelf blijft ongewijzigd.
 *
 * De toelichting is menselijke ontwerpaanwijzing, geen casusbron: richting, leerdoel, dilemma, doelgroep, routebeleid
 * en bronsegmenten blijven vaste context.
 */

export const TRAINING_BLUEPRINT_V22_PROMPT_VERSION = "training-blueprint/v2.2";

const REVISION_SECTION = `Gerichte revisie van een eerdere Blueprint

Soms krijg je naast de vaste context ook een eerdere versie van deze Blueprint (<vorige_blueprint>) en een revisie-instructie van de menselijke reviewer (<menselijke_revisie_instructie>). Ontwerp dan een nieuwe versie:
- Behoud wat in de vorige versie goed was. Wijzig alleen wat nodig is om de revisie-instructie te verwerken.
- De revisie-instructie is ontwerpaanwijzing van de reviewer, geen casusbron. Neem er geen nieuwe feiten over de situatie of de betrokkenen uit over als die niet in de bronsegmenten staan. Een toetssituatie (nieuw keuzemoment) blijft een ontwerpkeuze; die mag je volgens de instructie anders inrichten.
- De vaste context blijft vast: richting, leerdoel, dilemma, doelgroep, routebeleid en bronsegmenten. Vraagt de instructie daar iets aan te veranderen, verander die dan niet; verwerk de bedoeling waar het ontwerp dat toelaat, bijvoorbeeld in successCriteria, Actie, Feedback of Toets.
- Bij meerdere verdedigbare routes voer je geen één juiste route of formulering in, ook niet als de instructie dat zou suggereren.
- Kan een deel van de instructie niet binnen het ontwerp of de regels hierboven, laat dat deel dan achterwege. Doe niet alsof het verwerkt is.`;

export const TRAINING_BLUEPRINT_V22_INSTRUCTIONS = `${TRAINING_BLUEPRINT_V21_INSTRUCTIONS}\n\n${REVISION_SECTION}`;

/** Server-side context voor een gerichte revisie: de afgekeurde revision en de menselijke toelichting erop. */
export interface BlueprintRevisionContext {
  feedback: string;
  previous: TrainingBlueprintV2;
}

/** De vorige versie zonder interne ids en contractgegevens; alleen het ontwerp is relevant voor de revisie. */
function previousDesign(previous: TrainingBlueprintV2) {
  const { version: _v, selectedDirectionId: _d, sourceRefs: _r, ...design } = previous;
  void _v;
  void _d;
  void _r;
  return design;
}

/** Het gebruikersbericht: exact v2.1, met daarna de vorige versie en de menselijke revisie-instructie. */
export function buildTrainingBlueprintV22Request(input: BlueprintGenerationInputV21, revision: BlueprintRevisionContext): string {
  return [
    buildTrainingBlueprintV21Request(input),
    `<vorige_blueprint>\n${JSON.stringify(previousDesign(revision.previous), null, 2)}\n</vorige_blueprint>`,
    `<menselijke_revisie_instructie>\n${revision.feedback}\n</menselijke_revisie_instructie>`,
  ].join("\n\n");
}
