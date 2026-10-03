import {
  ACTIVE_DATA_POLICY,
  evaluateDataPolicy,
  type DataPolicyRejection,
  type DataProcessingPolicy,
} from "@/modules/governance";
import {
  PRIVACY_PREFLIGHT_VERSION,
  evaluatePreflightGate,
  hashPreflightText,
  runPrivacyPreflight,
  type GateRejection,
  type PreflightAcknowledgement,
  type PreflightCategory,
  type PreflightResult,
} from "@/modules/privacy";
import type { AgentInput } from "@/modules/training-agent";
import {
  ANALYSIS_CONTRACT_VERSION,
  findEpistemicFlags,
  segmentInput,
  type AnalysisOutcome,
  type AnalysisOutcomeKind,
  type EpistemicFlag,
  type SourceSegment,
} from "@/modules/training-agent/v2";
import type { TrainingAnalysisServiceV2 } from "@/services/analysis/training-analysis-service-v2";

/** Waarom een invoer niet naar de externe analyse mag: privacypoort of data-policy. */
export type InputGateRejection = GateRejection | DataPolicyRejection;

export type GatedAnalysisResult =
  | {
      status: "analysis";
      analysis: AnalysisOutcome;
      /** Voor weergave van de grounding in de eigen UI van de gebruiker; nooit loggen. */
      segments: SourceSegment[];
      epistemicFlags: EpistemicFlag[];
      gate: { preflightStatus: PreflightResult["status"]; syntheticDataAttested: true };
    }
  | { status: "preflight"; reason: InputGateRejection; preflight: PreflightResult };

/** Privacyveilige metadata: aantallen en versies, nooit tekst, waarden, posities, hashes, segmenten of refs. */
export type GateLogEntry =
  | {
      event: "certum.preflight";
      preflightVersion: string;
      dataPolicy: DataProcessingPolicy;
      inputKind: AgentInput["kind"];
      inputLength: number;
      status: PreflightResult["status"];
      blockedCount: number;
      reviewCount: number;
      categories: Partial<Record<PreflightCategory, number>>;
      acknowledgedCount: number;
      syntheticDataAttested: boolean;
      decision: "allowed" | InputGateRejection;
    }
  | {
      event: "certum.analysis_result";
      contractVersion: string;
      analysisOutcome: AnalysisOutcomeKind;
      preflightVersion: string;
      preflightStatus: PreflightResult["status"];
      /** true als de provider blokkeert nadat de lokale preflight doorgang gaf. */
      preflightMiss: boolean;
      epistemicFlags: number;
      inputKind: AgentInput["kind"];
      segmentCount: number;
    };

const defaultLog = (entry: GateLogEntry) => console.info(JSON.stringify(entry));

/**
 * De bindende poorten vóór iedere externe AI-aanroep, in vaste volgorde:
 * 1. lokale Privacy Preflight (blocked / review / binding aan de tekst);
 * 2. de actieve data-policy (nu: synthetic_only, voor iedere inputsoort).
 *
 * Beide worden hier altijd opnieuw beoordeeld, ongeacht wat de browser al controleerde.
 * Alleen als beide toestemming geven, wordt de input gesegmenteerd en de analyse-service aangemaakt.
 */
export async function runGatedAnalysis(
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  deps: {
    getService: () => TrainingAnalysisServiceV2;
    log?: (entry: GateLogEntry) => void;
    policy?: DataProcessingPolicy;
  },
): Promise<GatedAnalysisResult> {
  const log = deps.log ?? defaultLog;
  const policy = deps.policy ?? ACTIVE_DATA_POLICY;
  const preflight = runPrivacyPreflight(input.text);
  const currentTextHash = await hashPreflightText(input.text);
  const ackForThisText = acknowledgement?.textHash === currentTextHash ? acknowledgement : null;

  const privacyDecision = evaluatePreflightGate({ preflight, currentTextHash, acknowledgement });
  const policyDecision = evaluateDataPolicy(policy, ackForThisText?.syntheticDataAttested === true);
  const rejection: InputGateRejection | null = !privacyDecision.allowed
    ? privacyDecision.reason
    : !policyDecision.allowed
      ? policyDecision.reason
      : null;

  const categories: Partial<Record<PreflightCategory, number>> = {};
  for (const f of preflight.findings) categories[f.category] = (categories[f.category] ?? 0) + 1;
  log({
    event: "certum.preflight",
    preflightVersion: PRIVACY_PREFLIGHT_VERSION,
    dataPolicy: policy,
    inputKind: input.kind,
    inputLength: input.text.length,
    status: preflight.status,
    blockedCount: preflight.findings.filter((f) => f.severity === "blocked").length,
    reviewCount: preflight.findings.filter((f) => f.severity === "review_required").length,
    categories,
    acknowledgedCount: ackForThisText?.acknowledgedFindingIds.length ?? 0,
    syntheticDataAttested: ackForThisText?.syntheticDataAttested === true,
    decision: rejection ?? "allowed",
  });

  if (rejection) {
    return { status: "preflight", reason: rejection, preflight };
  }

  const segments = segmentInput(input.text);
  const analysis = await deps.getService().analyze({ input, segments });
  const epistemicFlags = findEpistemicFlags(analysis, input.text);

  log({
    event: "certum.analysis_result",
    contractVersion: ANALYSIS_CONTRACT_VERSION,
    analysisOutcome: analysis.outcome,
    preflightVersion: PRIVACY_PREFLIGHT_VERSION,
    preflightStatus: preflight.status,
    preflightMiss: analysis.outcome === "blocked",
    epistemicFlags: epistemicFlags.length,
    inputKind: input.kind,
    segmentCount: segments.length,
  });

  return {
    status: "analysis",
    analysis,
    segments,
    epistemicFlags,
    gate: { preflightStatus: preflight.status, syntheticDataAttested: true },
  };
}
