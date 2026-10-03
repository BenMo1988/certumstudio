import type { AgentInput } from "@/modules/training-agent";
import { ANALYSIS_CONTRACT_VERSION } from "@/modules/training-agent/v2/schema";
import type { DecisionRelevantGap, ReadyOutcome, SourceSegment, TrainingDirectionV2 } from "@/modules/training-agent/v2/types";
import { TRAINING_BLUEPRINT_VERSION } from "./schema";

/**
 * Het provider-inputcontract voor Blueprint Generation: precies wat een generator te zien krijgt, niet meer.
 *
 * Wel:
 * - de gekozen richting (bindend), het dilemma, de samenvatting en de doelgroep uit de `ready`-analyse;
 * - alleen de bronsegmenten waarnaar de gekozen richting verwijst (grounding);
 * - de beslisrelevante open vragen, zodat ontbrekende informatie als aanname wordt benoemd in plaats van ingevuld.
 *
 * Bewust niet:
 * - de volledige oorspronkelijke input en segmenten buiten de richting: de samenvatting dekt de situatie al, en
 *   andere segmenten trekken het ontwerp naar richtingen die de mens niet koos;
 * - de niet gekozen richtingen;
 * - sourceCandidates: niet gevalideerde kaders, intern en niet zichtbaar in de UI; de Bron-fase formuleert eigen
 *   kennisvragen;
 * - abstractionNotes, rationale en privacy-informatie.
 */
export interface BlueprintGenerationInput {
  contractVersion: typeof TRAINING_BLUEPRINT_VERSION;
  analysisContractVersion: typeof ANALYSIS_CONTRACT_VERSION;
  inputKind: AgentInput["kind"];
  selectedDirection: Pick<TrainingDirectionV2, "id" | "title" | "focus" | "proposedLearningGoal" | "sourceRefs">;
  professionalCore: Pick<ReadyOutcome, "summary" | "professionalDilemma" | "targetAudience">;
  sourceSegments: SourceSegment[];
  decisionRelevantGaps: DecisionRelevantGap[];
}

/** Bouwt de provider-input. Gooit als de richting niet bestaat; de flow heeft dat vooraf al uitgesloten. */
export function buildBlueprintGenerationInput(args: {
  inputKind: AgentInput["kind"];
  analysis: ReadyOutcome;
  segments: SourceSegment[];
  selectedDirectionId: string;
}): BlueprintGenerationInput {
  const direction = args.analysis.trainingDirections.find((d) => d.id === args.selectedDirectionId);
  if (!direction) throw new Error("Onbekende richting.");
  const refs = new Set(direction.sourceRefs);
  return {
    contractVersion: TRAINING_BLUEPRINT_VERSION,
    analysisContractVersion: ANALYSIS_CONTRACT_VERSION,
    inputKind: args.inputKind,
    selectedDirection: {
      id: direction.id,
      title: direction.title,
      focus: direction.focus,
      proposedLearningGoal: direction.proposedLearningGoal,
      sourceRefs: [...direction.sourceRefs],
    },
    professionalCore: {
      summary: args.analysis.summary,
      professionalDilemma: args.analysis.professionalDilemma,
      targetAudience: args.analysis.targetAudience,
    },
    sourceSegments: args.segments.filter((s) => refs.has(s.id)),
    decisionRelevantGaps: args.analysis.decisionRelevantGaps.map((g) => ({ ...g })),
  };
}
