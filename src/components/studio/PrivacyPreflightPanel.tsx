import type { ReactNode } from "react";
import { SYNTHETIC_DATA_ATTESTATION } from "@/modules/governance";
import { CATEGORY_INFO, type PreflightFinding, type PreflightResult } from "@/modules/privacy";
import { Icon } from "./Icon";

interface PrivacyPreflightPanelProps {
  /** De getrimde tekst waarop de preflight is uitgevoerd (voor het tonen van de gevonden fragmenten). */
  text: string;
  preflight: PreflightResult;
  acknowledgedIds: string[];
  /** Bevestiging onder de tijdelijke governance-policy synthetic_only (alle inputsoorten). */
  syntheticDataAttested: boolean;
  disabled: boolean;
  onToggleAcknowledgement: (id: string) => void;
  onAttestationChange: (attested: boolean) => void;
}

/**
 * Toont de uitkomst van de lokale Privacy Preflight. De controle draait in de browser alleen
 * voor directe feedback; de server voert dezelfde controle bindend opnieuw uit.
 */
export function PrivacyPreflightPanel({
  text,
  preflight,
  acknowledgedIds,
  syntheticDataAttested,
  disabled,
  onToggleAcknowledgement,
  onAttestationChange,
}: PrivacyPreflightPanelProps) {
  const blocked = preflight.findings.filter((f) => f.severity === "blocked");
  const review = preflight.findings.filter((f) => f.severity === "review_required");
  const fragment = (f: PreflightFinding) => text.slice(f.span.start, f.span.end);

  return (
    <section aria-label="Privacycontrole" className="mt-4 rounded-lg border border-line" data-preflight-status={preflight.status}>
      <div className="space-y-4 px-5 py-4">
        {preflight.status === "safe" && (
          <Status tone="neutral" title="Geen direct herkenbare identificatoren gevonden.">
            Dit is geen garantie dat de tekst anoniem is: namen en combinaties van kenmerken worden niet altijd herkend.
          </Status>
        )}

        {blocked.length > 0 && (
          <Status tone="danger" title="Deze tekst kan niet worden verstuurd">
            De tekst bevat direct herkenbare persoonsgegevens. Verwijder of vervang ze; dit kan niet worden bevestigd.
            <ul className="mt-2 space-y-1" data-testid="blocked-findings">
              {blocked.map((f) => (
                <li key={f.id} data-finding-id={f.id}>
                  <span className="font-medium">{CATEGORY_INFO[f.category].label}:</span> <Fragment>{fragment(f)}</Fragment>
                </li>
              ))}
            </ul>
          </Status>
        )}

        {review.length > 0 && (
          <Status tone="attention" title="Controleer mogelijke persoonsgegevens">
            Pas de tekst aan, of bevestig per item dat het geen echt of herleidbaar persoonsgegeven is.
            <ul className="mt-3 space-y-2" data-testid="review-findings">
              {review.map((f) => (
                <li key={f.id}>
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-petrol-700"
                      checked={acknowledgedIds.includes(f.id)}
                      disabled={disabled}
                      onChange={() => onToggleAcknowledgement(f.id)}
                      data-finding-id={f.id}
                    />
                    <span>
                      <span className="font-medium">{CATEGORY_INFO[f.category].label}:</span>{" "}
                      <Fragment>{fragment(f)}</Fragment>
                      <span className="block text-muted">Dit is geen echt of herleidbaar persoonsgegeven.</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Status>
        )}
      </div>

      {/* Tijdelijke governance-policy synthetic_only: verplicht voor iedere inputsoort. */}
      <label className="flex cursor-pointer items-start gap-2.5 border-t border-line bg-surface px-5 py-4 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-petrol-700"
          checked={syntheticDataAttested}
          disabled={disabled || blocked.length > 0}
          onChange={(event) => onAttestationChange(event.target.checked)}
          data-testid="attestation"
        />
        <span>
          {SYNTHETIC_DATA_ATTESTATION}
          <span className="mt-0.5 block text-xs text-muted">
            In de huidige ontwikkelfase verwerkt Certum Studio uitsluitend synthetische testdata.
          </span>
        </span>
      </label>

      <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-xs text-muted">
        <Icon name="info" className="mt-px size-3.5 shrink-0" />
        Deze controle gebeurt lokaal; er wordt niets verstuurd. Bevestigingen vervallen zodra je de tekst wijzigt.
      </p>
    </section>
  );
}

function Status({ tone, title, children }: { tone: "neutral" | "attention" | "danger"; title: string; children: ReactNode }) {
  const styles = {
    neutral: "text-ink",
    attention: "text-attention-700",
    danger: "text-danger",
  }[tone];
  return (
    <div className="flex gap-3 text-sm">
      <Icon name={tone === "neutral" ? "info" : "alert"} className={`mt-0.5 size-[18px] shrink-0 ${styles}`} />
      <div>
        <p className={`font-semibold ${styles}`}>{title}</p>
        <div className="mt-0.5 leading-relaxed text-ink">{children}</div>
      </div>
    </div>
  );
}

function Fragment({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-surface px-1 font-mono text-[13px] text-ink">{children}</mark>;
}
