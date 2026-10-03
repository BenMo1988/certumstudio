import { CATEGORY_INFO } from "./categories";
import { DETECTORS, type RawFinding } from "./detectors";
import {
  PRIVACY_PREFLIGHT_VERSION,
  type GateDecision,
  type PreflightAcknowledgement,
  type PreflightFinding,
  type PreflightResult,
} from "./types";

/**
 * Lokale, deterministische privacycontrole. Puur: geen netwerk, geen AI, wijzigt de tekst niet.
 * Werkt op de getrimde tekst, zodat browser en server dezelfde posities en id's krijgen.
 */
export function runPrivacyPreflight(text: string): PreflightResult {
  const input = text.trim();
  const kept: RawFinding[] = [];
  for (const detect of DETECTORS) {
    for (const finding of detect(input)) {
      const overlaps = kept.some((k) => finding.start < k.end && k.start < finding.end);
      if (!overlaps && finding.end > finding.start) kept.push(finding);
    }
  }
  kept.sort((a, b) => a.start - b.start || a.end - b.end);

  const perCategory = new Map<string, number>();
  const findings: PreflightFinding[] = kept.map((f) => {
    const n = (perCategory.get(f.category) ?? 0) + 1;
    perCategory.set(f.category, n);
    return {
      id: `${f.category}-${n}`,
      category: f.category,
      severity: CATEGORY_INFO[f.category].severity,
      span: { start: f.start, end: f.end },
    };
  });

  const status = findings.some((f) => f.severity === "blocked")
    ? "blocked"
    : findings.length > 0
      ? "review_required"
      : "safe";
  return { version: PRIVACY_PREFLIGHT_VERSION, status, findings };
}

/** SHA-256 (hex) van de getrimde tekst, via Web Crypto (browser en Node). Nooit loggen. */
export async function hashPreflightText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text.trim());
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * De poort vóór iedere externe AI-aanroep. De server roept dit altijd opnieuw aan;
 * de browser alleen voor directe feedback.
 *
 * Volgorde: blocked kan nooit worden bevestigd; daarna moet een bevestiging bij exact
 * deze tekst horen; daarna moeten alle review-bevindingen bevestigd zijn; bij een casus
 * is de anonimiseringsattestatie altijd verplicht, ook als de preflight "safe" is.
 */
export function evaluatePreflightGate(params: {
  inputKind: string;
  preflight: PreflightResult;
  currentTextHash: string;
  acknowledgement: PreflightAcknowledgement | null;
}): GateDecision {
  const { inputKind, preflight, currentTextHash, acknowledgement } = params;

  if (preflight.findings.some((f) => f.severity === "blocked")) {
    return { allowed: false, reason: "blocked" };
  }
  if (acknowledgement && acknowledgement.textHash !== currentTextHash) {
    return { allowed: false, reason: "stale_acknowledgement" };
  }

  const acknowledged = new Set(acknowledgement?.acknowledgedFindingIds ?? []);
  const unacknowledged = preflight.findings.filter(
    (f) => f.severity === "review_required" && !acknowledged.has(f.id),
  );
  if (unacknowledged.length > 0) return { allowed: false, reason: "review_required" };

  if (inputKind === "casus" && acknowledgement?.anonymizationAttested !== true) {
    return { allowed: false, reason: "attestation_required" };
  }
  return { allowed: true };
}

/** Leest een bevestiging uit onbetrouwbare invoer (Server Action). Ongeldig → null. */
export function parsePreflightAcknowledgement(raw: unknown): PreflightAcknowledgement | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { textHash, acknowledgedFindingIds, anonymizationAttested } = raw as Record<string, unknown>;
  if (typeof textHash !== "string" || !/^[0-9a-f]{64}$/.test(textHash)) return null;
  if (!Array.isArray(acknowledgedFindingIds) || acknowledgedFindingIds.length > 200) return null;
  if (!acknowledgedFindingIds.every((id) => typeof id === "string" && /^[a-z_]+-\d{1,3}$/.test(id))) return null;
  if (typeof anonymizationAttested !== "boolean") return null;
  return { textHash, acknowledgedFindingIds, anonymizationAttested };
}
