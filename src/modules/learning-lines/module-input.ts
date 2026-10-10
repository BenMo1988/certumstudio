import { MAX_INPUT_LENGTH } from "@/modules/training-agent";
import type { LearningLineDesign, ModuleSpec } from "./schema";

/*
 * ModuleSpec → invoer voor de bestaande Training Engine. Een module wordt een gewone training: dezelfde instroom
 * (`startTraining`), dezelfde Privacy Preflight en data-policy, dezelfde Certum Analyse en daarna de bestaande keten.
 * Geen tweede Training Engine.
 *
 * Deterministisch: dezelfde goedgekeurde leerlijnrevision levert altijd dezelfde tekst (de preflight-bevestigingen bij
 * Gate 1 zijn aan de hash van exact deze tekst gebonden).
 */

export const MODULE_INPUT_KIND = "praktijkvraag" as const;

/** Iedere regel eindigt als zin: een label op de volgende regel staat dan aan een zinsbegin (geen valse naamtreffer). */
const sentence = (value: string) => (/[.!?]$/.test(value.trim()) ? value.trim() : `${value.trim()}.`);

export function moduleTrainingInputText(design: LearningLineDesign, module: ModuleSpec): string {
  const routeLine =
    module.routePolicy === "open_choice"
      ? "Meerdere handelingsroutes zijn professioneel verdedigbaar; het gaat om de kwaliteit van de afweging."
      : "Eén handelingslijn is normatief leidend; de deelnemer moet die onder druk goed uitvoeren.";
  const text = [
    "Deze praktijkvraag is volledig fictief en bedoeld voor het ontwikkelen van een training.",
    "",
    `Leerlijn: ${design.title} (module ${module.sequence} van 6).`,
    `Doelgroep: ${sentence(design.targetAudience)}`,
    "",
    `Module: ${sentence(module.title)}`,
    `Professionele spanning: ${sentence(module.uniqueProfessionalTension)}`,
    `Functie in de leerlijn: ${sentence(module.learningFunction)}`,
    "",
    `Situatie en keuzemoment: ${sentence(module.primaryScenarioDirection)}`,
    `Transfer: ${sentence(module.transferDirection)}`,
    `Toetsing: ${sentence(module.assessmentDirection)}`,
    "",
    "Beoogde leerdoelen:",
    ...module.learningGoals.map((g) => `- ${sentence(g)}`),
    "",
    routeLine,
    "",
    "Hoe handel je hier professioneel, en hoe verantwoord je die keuze?",
  ].join("\n");
  return text.length <= MAX_INPUT_LENGTH ? text : text.slice(0, MAX_INPUT_LENGTH);
}
