import type { z } from "zod";
import type {
  AbstractionNoteSchema,
  AnalysisOutcomeSchema,
  BlockedOutcomeSchema,
  DecisionRelevantGapSchema,
  NeedsAdjustmentOutcomeSchema,
  PossibleScopingSchema,
  ReadyOutcomeSchema,
  SourceCandidateSchema,
  TrainingDirectionV2Schema,
  UnsuitableOutcomeSchema,
} from "./schema";

/* Types volgen uit het runtime-schema; definieer de vorm nergens anders. */
export type AnalysisOutcome = z.infer<typeof AnalysisOutcomeSchema>;
export type AnalysisOutcomeKind = AnalysisOutcome["outcome"];
export type BlockedOutcome = z.infer<typeof BlockedOutcomeSchema>;
export type UnsuitableOutcome = z.infer<typeof UnsuitableOutcomeSchema>;
export type NeedsAdjustmentOutcome = z.infer<typeof NeedsAdjustmentOutcomeSchema>;
export type ReadyOutcome = z.infer<typeof ReadyOutcomeSchema>;
export type TrainingDirectionV2 = z.infer<typeof TrainingDirectionV2Schema>;
export type DecisionRelevantGap = z.infer<typeof DecisionRelevantGapSchema>;
export type PossibleScoping = z.infer<typeof PossibleScopingSchema>;
export type AbstractionNote = z.infer<typeof AbstractionNoteSchema>;
export type SourceCandidate = z.infer<typeof SourceCandidateSchema>;

/** Kort, betekenisvol stuk van de input met een stabiele id (S1, S2, …). */
export interface SourceSegment {
  id: string;
  text: string;
}
