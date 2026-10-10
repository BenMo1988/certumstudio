import { z } from "zod";
import { ROUTE_POLICIES } from "@/modules/training-blueprint/v2/schema";

/*
 * Certum Learning Line V1 (`certum-learning-line/v1`): een leerlijn van exact zes modules, ontworpen uit één prompt.
 *
 * - De leerlijn is de laag boven de bestaande Training Engine. Een ModuleSpec is de didactische opdracht voor één
 *   training; de modulecontent zelf ontstaat in de bestaande keten (analyse → richting → Blueprint → Block Plan →
 *   bronnen → Block Content) en wordt hier niet gedupliceerd.
 * - Accreditatie (SKJ en later andere registers) is bewust geen onderdeel van dit contract: zie `modules/accreditation`.
 *   De kern bevat alleen registeronafhankelijke gegevens (beroepsrelevantie, studielast, toetsopbouw).
 */

export const LEARNING_LINE_VERSION = "certum-learning-line/v1";
export const MODULE_COUNT = 6;
export const MODULE_IDS = ["M1", "M2", "M3", "M4", "M5", "M6"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

const text = (max: number, description: string) => z.string().trim().min(1).max(max).describe(description);

export const ModuleSourceNeedSchema = z.strictObject({
  id: z.string().regex(/^SN[1-9]$/).describe("SN1, SN2, … uniek binnen de module."),
  question: text(400, "Kennisvraag voor de latere Bron-fase. Geen bron, wet of richtlijn als feit."),
});

export const ModuleSpecSchema = z.strictObject({
  id: z.enum(MODULE_IDS),
  sequence: z.number().int().min(1).max(MODULE_COUNT),
  title: text(120, "Moduletitel voor de deelnemer."),
  uniqueProfessionalTension: text(600, "De professionele spanning die alleen deze module oefent."),
  learningFunction: text(400, "Wat deze module in de opbouw van de leerlijn doet."),
  learningGoals: z.array(text(300, "Leerdoel, gedragsmatig geformuleerd.")).min(1).max(3),
  successCriteria: z.array(text(300, "Waaraan een sterke afweging herkenbaar is.")).min(2).max(5),
  routePolicy: z.enum(ROUTE_POLICIES).describe("open_choice als meerdere handelingsroutes verdedigbaar zijn."),
  primaryScenarioDirection: text(800, "Richting van de hoofdsimulatie: situatie, druk, keuzemoment. Fictief."),
  transferDirection: text(600, "Richting van de transfersituatie: andere context, zelfde professionele kern."),
  assessmentDirection: text(600, "Hoe de module toetst (formatief/summatief), zonder één juiste route."),
  sourceNeeds: z.array(ModuleSourceNeedSchema).max(3),
  estimatedMinutes: z.number().int().min(20).max(180),
});

export const LearningLineDesignSchema = z.strictObject({
  version: z.literal(LEARNING_LINE_VERSION),
  title: text(150, "Titel van de leerlijn."),
  targetAudience: text(400, "Doelgroep."),
  professionalProblem: text(800, "Het beroepsprobleem waarvoor de leerlijn bestaat."),
  overarchingCompetency: text(500, "De overkoepelende competentie die over zes modules groeit."),
  promise: text(500, "Wat de professional na de leerlijn aantoonbaar beter kan."),
  professionalRelevance: text(800, "Beroepsrelevantie, registeronafhankelijk."),
  modules: z.array(ModuleSpecSchema).length(MODULE_COUNT),
  progression: z.strictObject({
    rationale: text(1200, "Waarom deze volgorde: opbouw M1→M6."),
    difficultyArc: text(600, "Hoe moeilijkheid en complexiteit oplopen."),
  }),
  overlapPrevention: z.array(text(300, "Hoe overlap tussen modules wordt voorkomen.")).min(1).max(6),
  assessmentArc: text(1000, "Toetsopbouw over de gehele leerlijn."),
});

export type ModuleSpec = z.infer<typeof ModuleSpecSchema>;
export type LearningLineDesign = z.infer<typeof LearningLineDesignSchema>;

/** Wat de Leerlijn Architect genereert; de contractversie zet de server. */
export const LearningLineArchitectDesignSchema = LearningLineDesignSchema.omit({ version: true });
export type LearningLineArchitectDesign = z.infer<typeof LearningLineArchitectDesignSchema>;

export function composeLearningLineDesign(design: LearningLineArchitectDesign): LearningLineDesign {
  return { version: LEARNING_LINE_VERSION, ...design };
}

/** Studielastvoorstel: de som van de geschatte modulestudielast. Afgeleid, niet opgeslagen. */
export const plannedStudyMinutes = (design: Pick<LearningLineDesign, "modules">) =>
  design.modules.reduce((sum, m) => sum + m.estimatedMinutes, 0);
