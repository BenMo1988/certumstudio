import type { AgentInput, InputAnalysis } from "@/modules/training-agent";

/**
 * Contract voor de Certum Analyse-engine.
 *
 * Provider-onafhankelijk: de rest van Certum Studio weet niet of de analyse
 * door een mock, Claude of een andere implementatie wordt gemaakt.
 *
 * Eisen aan iedere implementatie:
 * - geeft een volledig, geldig `InputAnalysis` terug (1–3 trainingsrichtingen);
 * - beoordeelt privacy altijd zelf en zet `blokkeren` bij direct herleidbare gegevens;
 * - slaat de input niet op.
 */
export interface TrainingAnalysisService {
  analyze(input: AgentInput): Promise<InputAnalysis>;
}
