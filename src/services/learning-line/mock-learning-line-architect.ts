import { composeLearningLineDesign, type LearningLineArchitectDesign, type LearningLineDesign, type ModuleSpec } from "@/modules/learning-lines";
import type { LearningLineArchitectRequest, LearningLineArchitectService } from "./services";

/*
 * Deterministische mock van de Leerlijn Architect: dezelfde prompt geeft altijd hetzelfde ontwerp van zes modules. Geen
 * netwerk, geen AI. Bedoeld voor ontwikkelen en tests; de inhoud is generiek en volgt de Certum-opbouw.
 * Een revisie zet de aanwijzing niet letterlijk in het ontwerp (dat kan inhoud bevatten), maar markeert de versie.
 */

function parsePrompt(prompt: string): { audience: string; topic: string } {
  const clean = prompt.trim().replace(/[.!?]+$/, "");
  const audience = /\bvoor\s+(.+?)\s+over\s+/i.exec(clean)?.[1] ?? "professionals in het sociaal domein";
  const topic = /\bover\s+(.+)$/i.exec(clean)?.[1] ?? clean.slice(0, 120);
  return { audience: audience.slice(0, 200), topic: topic.slice(0, 200) };
}

const THEMES: { title: string; tension: string; func: string; policy: ModuleSpec["routePolicy"] }[] = [
  { title: "De grens herkennen en helder maken", tension: "een ouder vraagt om iets wat buiten de eigen beslisruimte ligt, terwijl het belang begrijpelijk is", func: "Legt de basis: handelingsruimte herkennen en een grens begrijpelijk maken.", policy: "open_choice" },
  { title: "Een eerdere onduidelijke uitspraak herstellen", tension: "een eigen eerdere formulering heeft een verwachting gewekt die niet waargemaakt kan worden", func: "Voegt de eigen bijdrage aan de druk toe: verantwoordelijkheid nemen zonder toe te geven.", policy: "open_choice" },
  { title: "Herhaalde druk of nieuwe informatie", tension: "aanhoudende druk moet worden onderscheiden van informatie die een herweging werkelijk rechtvaardigt", func: "Oefent het herwegen: wanneer verandert het vervolg wel en wanneer niet.", policy: "open_choice" },
  { title: "Relationele druk en nabijheid", tension: "een cliënt doet een beroep op de persoonlijke band om een grens te verschuiven", func: "Verplaatst de druk naar de relatie: nabij blijven zonder de professionele rol te verlaten.", policy: "open_choice" },
  { title: "Samenwerken binnen de afgesproken route", tension: "de verleiding om zelf iets te regelen buiten de afgesproken samenwerking en overlegroute om", func: "Brengt de organisatie in beeld: de eigen rol binnen een team en een afgesproken route.", policy: "prescribed_action" },
  { title: "Meerdere belangen tegelijk", tension: "belangen van ouder, kind en organisatie botsen in één gesprek met weinig tijd en weinig houvast", func: "Integreert alles in een complexe transfersituatie met meerdere belangen.", policy: "open_choice" },
];

export function mockLearningLineDesign(prompt: string, revised = false): LearningLineDesign {
  const { audience, topic } = parsePrompt(prompt);
  const modules: ModuleSpec[] = THEMES.map((t, i) => ({
    id: `M${i + 1}` as ModuleSpec["id"],
    sequence: i + 1,
    title: t.title,
    uniqueProfessionalTension: `Bij ${topic}: ${t.tension}.`,
    learningFunction: t.func,
    learningGoals: [`De deelnemer kan in een situatie waarin ${t.tension} een eigen professionele afweging maken en die verantwoorden.`],
    successCriteria: ["Het belang van de betrokkenen blijft herkenbaar.", "De deelnemer is duidelijk over wat wel en niet kan, met een uitvoerbaar vervolg."],
    routePolicy: t.policy,
    primaryScenarioDirection: `Een gesprek waarin ${t.tension}; de deelnemer moet ter plekke kiezen hoe te reageren.`,
    transferDirection: "Dezelfde professionele kern in een andere context, met een andere betrokkene en een nieuw detail.",
    assessmentDirection: t.policy === "open_choice" ? "Een ongeziene situatie; beoordeeld op afweging, onderbouwing en uitvoerbaarheid, niet op één route." : "Een ongeziene situatie; beoordeeld op het correct en zorgvuldig uitvoeren van de afgesproken route.",
    sourceNeeds: [{ id: "SN1", question: `Welke gevalideerde inzichten bestaan er over professioneel handelen wanneer ${t.tension}?` }],
    estimatedMinutes: 60 + i * 5,
  }));
  const design: LearningLineArchitectDesign = {
    title: `Leerlijn: ${topic}`.slice(0, 150),
    targetAudience: audience,
    professionalProblem: `Professionals ervaren in hun werk druk rond ${topic}, en kunnen die druk niet altijd professioneel hanteren.`,
    overarchingCompetency: "Onder druk professioneel blijven handelen: belang erkennen, grens helder maken en een uitvoerbaar vervolg afspreken.",
    promise: revised
      ? "Na deze leerlijn handelt de professional aantoonbaar zorgvuldiger onder druk (herziene versie na revisie-aanwijzing)."
      : "Na deze leerlijn handelt de professional aantoonbaar zorgvuldiger onder druk.",
    professionalRelevance: `Druk rond ${topic} komt dagelijks voor en vraagt een verantwoorde professionele afweging.`,
    modules,
    progression: {
      rationale: "Van het herkennen van de eigen grens, via de eigen bijdrage en het herwegen, naar relationele en organisatorische druk, en tot slot een complexe situatie met meerdere belangen.",
      difficultyArc: "Iedere module voegt een laag toe: meer belangen, meer druk of minder houvast.",
    },
    overlapPrevention: ["Iedere module oefent één eigen spanning; de transfer ligt telkens in een andere context."],
    assessmentArc: "Formatief per module met reflectie en feedback; summatief met ongeziene situaties, oplopend in complexiteit tot module 6.",
  };
  return composeLearningLineDesign(design);
}

export class MockLearningLineArchitect implements LearningLineArchitectService {
  async generate(request: LearningLineArchitectRequest): Promise<LearningLineDesign> {
    return mockLearningLineDesign(request.prompt, request.revision !== undefined);
  }
}
