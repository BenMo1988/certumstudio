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

export type GatedAnalysisResult =
  | { status: "analysis"; analysis: InputAnalysis }
  | { status: "preflight"; reason: GateRejection; preflight: PreflightResult };

/** Privacyveilige metadata: aantallen per categorie, nooit tekst, waarden, posities of hashes. */
export type PreflightLogEntry =
  | {
      event: "certum.preflight";
      preflightVersion: string;
      inputKind: AgentInput["kind"];
      inputLength: number;
      status: PreflightResult["status"];
      blockedCount: number;
      reviewCount: number;
      categories: Partial<Record<PreflightCategory, number>>;
      acknowledgedCount: number;
      attested: boolean;
      decision: "allowed" | GateRejection;
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
 * De bindende privacygate vóór iedere externe AI-aanroep.
 *
 * De preflight wordt hier altijd opnieuw uitgevoerd, ongeacht wat de browser al controleerde.
 * Alleen als de gate expliciet toestemming geeft, wordt de analyse-service aangemaakt en aangeroepen.
 */
export async function runGatedAnalysis(
  input: AgentInput,
  acknowledgement: PreflightAcknowledgement | null,
  deps: {
    getService: () => TrainingAnalysisService;
    log?: (entry: PreflightLogEntry) => void;
  },
): Promise<GatedAnalysisResult> {
  const log = deps.log ?? defaultLog;
  const preflight = runPrivacyPreflight(input.text);
  const currentTextHash = await hashPreflightText(input.text);
  const decision = evaluatePreflightGate({ inputKind: input.kind, preflight, currentTextHash, acknowledgement });

  const categories: Partial<Record<PreflightCategory, number>> = {};
  for (const f of preflight.findings) categories[f.category] = (categories[f.category] ?? 0) + 1;
  const hashMatches = acknowledgement?.textHash === currentTextHash;
  log({
    event: "certum.preflight",
    preflightVersion: PRIVACY_PREFLIGHT_VERSION,
    inputKind: input.kind,
    inputLength: input.text.length,
    status: preflight.status,
    blockedCount: preflight.findings.filter((f) => f.severity === "blocked").length,
    reviewCount: preflight.findings.filter((f) => f.severity === "review_required").length,
    categories,
    acknowledgedCount: hashMatches ? acknowledgement.acknowledgedFindingIds.length : 0,
    attested: hashMatches && acknowledgement.anonymizationAttested,
    decision: decision.allowed ? "allowed" : decision.reason,
  });

  if (!decision.allowed) {
    return { status: "preflight", reason: decision.reason, preflight };
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
