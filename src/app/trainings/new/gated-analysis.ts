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
import type { AgentInput, InputAnalysis } from "@/modules/training-agent";
import type { TrainingAnalysisService } from "@/services/analysis/training-analysis-service";

/** Waarom een invoer niet naar de externe analyse mag: privacypoort of data-policy. */
export type InputGateRejection = GateRejection | DataPolicyRejection;

export type GatedAnalysisResult =
  | { status: "analysis"; analysis: InputAnalysis }
  | { status: "preflight"; reason: InputGateRejection; preflight: PreflightResult };

/** Privacyveilige metadata: aantallen per categorie, nooit tekst, waarden, posities of hashes. */
export type PreflightLogEntry =
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
      event: "certum.preflight_miss";
      preflightMiss: true;
      preflightVersion: string;
      preflightStatus: PreflightResult["status"];
      inputKind: AgentInput["kind"];
    };

const defaultLog = (entry: PreflightLogEntry) => console.info(JSON.stringify(entry));

/**
 * De bindende poorten vóór iedere externe AI-aanroep, in vaste volgorde:
 * 1. lokale Privacy Preflight (blocked / review / binding aan de tekst);
 * 2. de actieve data-policy (nu: synthetic_only, voor iedere inputsoort).
 *
 * Beide worden hier altijd opnieuw beoordeeld, ongeacht wat de browser al controleerde.
 * Alleen als beide toestemming geven, wordt de analyse-service aangemaakt en aangeroepen.
 */
export async function runGatedAnalysis(
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  deps: {
    getService: () => TrainingAnalysisService;
    log?: (entry: PreflightLogEntry) => void;
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

  const analysis = await deps.getService().analyze(input);

  // De provider vond alsnog direct herleidbare gegevens die de lokale preflight miste.
  if (analysis.privacyAssessment.level === "blokkeren") {
    log({
      event: "certum.preflight_miss",
      preflightMiss: true,
      preflightVersion: PRIVACY_PREFLIGHT_VERSION,
      preflightStatus: preflight.status,
      inputKind: input.kind,
    });
  }
  return { status: "analysis", analysis };
}
