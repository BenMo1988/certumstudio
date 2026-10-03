import { TRAINING_ANALYSIS_V2_INSTRUCTIONS, buildTrainingAnalysisV2Request } from "./training-analysis-v2";

/*
 * Certum Analyse: instructies versie 2.1 (hoort bij Analysis Contract V2.1).
 *
 * Geen herschrijving van training-analysis/v2: deze tekst is exact de v2-tekst plus één ingevoegde sectie over het
 * routebeleid van trainingsrichtingen en de samenhang focus ↔ routePolicy ↔ leerdoel. Alle andere v2-regels blijven
 * letterlijk gelijk; training-analysis/v2 zelf blijft ongewijzigd (tag analysis-v2-baseline).
 *
 * Het voorbeeld in de sectie is bewust domeinneutraal, zodat de prompt geen antwoord op een evalcase bevat.
 * Verhoog de promptversie bij elke inhoudelijke wijziging.
 */

export const TRAINING_ANALYSIS_V21_PROMPT_VERSION = "training-analysis/v2.1";

const ROUTE_POLICY_SECTION = `## Trainingsrichtingen: routebeleid en leerdoel
Geef bij "ready" iedere trainingsrichting een "routePolicy". Dit is een ontwerpclassificatie van de richting, geen nieuw bronfeit, en geen aanleiding om theorie, wetgeving of methodiek toe te voegen.
- "open_choice": de richting oefent een professioneel keuzemoment waarin verschillende handelingsroutes verdedigbaar kunnen zijn. De deelnemer wordt later beoordeeld op de kwaliteit van de afweging, de aansluiting op de situatie, de onderbouwing, proportionaliteit, consequenties en uitvoering, niet op het kiezen van één vooraf bepaalde route.
- "prescribed_action": de richting oefent professioneel handelen waarbij één handelingslijn normatief of inhoudelijk leidend is. Dat betekent niet dat iedere formulering of tussenstap vastligt.
Kies niet automatisch "open_choice". Kies "prescribed_action" alleen als de input zelf één handelingslijn als leidend draagt.

"focus", "routePolicy" en "proposedLearningGoal" beschrijven samen één leerarchitectuur:
- Bij "open_choice" beschrijft "focus" het keuzemoment zonder een uitkomst te kiezen. "proposedLearningGoal" beschrijft welke professionele prestatie geleverd moet worden, welke belangen of spanningen moeten worden afgewogen en wat de professional uiteindelijk moet kunnen verantwoorden. Het leerdoel schrijft geen specifieke route, volgorde of oplossing voor: geen "eerst X, daarna Y", geen "X erkennen en vervolgens Y doen", geen route die de deelnemer moet uitvoeren en geen route die impliciet als enige goede oplossing klinkt. Dus liever "De deelnemer kan bepalen hoe hij belang A respecteert en tegelijk verantwoordelijkheid houdt voor belang B, en deze keuze professioneel onderbouwen" dan "De deelnemer kan eerst handeling X uitvoeren en daarna handeling Y".
- Bij "prescribed_action" mag het leerdoel de concrete handelingslijn benoemen als dat werkelijk de professionele bedoeling van de richting is. "focus" beschrijft dan geen vrije keuze tussen meerdere gelijkwaardige routes.
Een "open_choice"-richting met een leerdoel dat een route voorschrijft, of een "prescribed_action"-richting met een focus op een vrije keuze tussen gelijkwaardige routes, is inconsistent.

`;

const ANCHOR = "## Bronsegmenten en grounding";
if (!TRAINING_ANALYSIS_V2_INSTRUCTIONS.includes(ANCHOR)) {
  throw new Error("training-analysis/v2.1: invoegpunt in training-analysis/v2 ontbreekt.");
}

export const TRAINING_ANALYSIS_V21_INSTRUCTIONS = TRAINING_ANALYSIS_V2_INSTRUCTIONS.replace(
  ANCHOR,
  `${ROUTE_POLICY_SECTION}${ANCHOR}`,
);

/** Het gebruikersbericht is ongewijzigd ten opzichte van v2. */
export const buildTrainingAnalysisV21Request = buildTrainingAnalysisV2Request;
