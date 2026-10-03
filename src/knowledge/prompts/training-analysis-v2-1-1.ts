import { TRAINING_ANALYSIS_V21_INSTRUCTIONS } from "./training-analysis-v2-1";

/*
 * Certum Analyse: instructies versie 2.1.1 (contract blijft analysis-contract/v2.1).
 *
 * Exact training-analysis/v2.1 plus één ingevoegde alinea aan het begin van de routebeleid-sectie: suitability gaat
 * vóór routebeleid, en prescribed_action maakt een eenvoudige procedurele input niet geschikt. Aanleiding: de
 * V2.1-baseline (CA-009: correcte classificatie, maar `ready` zonder betekenisvol dilemma). Bewust zonder casusvoorbeeld.
 * training-analysis/v2.1 zelf blijft ongewijzigd.
 */

export const TRAINING_ANALYSIS_V211_PROMPT_VERSION = "training-analysis/v2.1.1";

const SUITABILITY_FIRST = `Bepaal eerst suitability. "routePolicy" wordt pas toegekend binnen een inhoudelijk geschikte "ready"-trainingsrichting. "prescribed_action" betekent niet dat iedere expliciete werkinstructie geschikt is voor een Certum-training. Een input zonder betekenisvolle professionele spanning, beoordeling, keuze of uitvoeringsvraag blijft "unsuitable", ook als de beschreven procedure één vaste handelingslijn heeft. Een "prescribed_action"-richting is passend wanneer:
- de beroepssituatie betekenisvol professioneel handelen vraagt;
- er een relevante spanning, beoordeling of trigger aanwezig is;
- één handelingslijn uiteindelijk normatief of inhoudelijk leidend is.

`;

const ANCHOR = 'Geef bij "ready" iedere trainingsrichting een "routePolicy".';
if (!TRAINING_ANALYSIS_V21_INSTRUCTIONS.includes(ANCHOR)) {
  throw new Error("training-analysis/v2.1.1: invoegpunt in training-analysis/v2.1 ontbreekt.");
}

export const TRAINING_ANALYSIS_V211_INSTRUCTIONS = TRAINING_ANALYSIS_V21_INSTRUCTIONS.replace(
  ANCHOR,
  `${SUITABILITY_FIRST}${ANCHOR}`,
);
