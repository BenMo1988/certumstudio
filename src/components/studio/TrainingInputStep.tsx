import type { PreflightResult } from "@/modules/privacy";
import { INPUT_KINDS, MAX_INPUT_LENGTH, type AgentInputKind } from "@/modules/training-agent";
import { Button } from "./Button";
import { ChoiceCard } from "./ChoiceCard";
import { Icon, type IconName } from "./Icon";
import { PrivacyPreflightPanel } from "./PrivacyPreflightPanel";

const ICONS: Record<AgentInputKind, IconName> = {
  onderwerp: "topic",
  praktijkvraag: "question",
  casus: "case",
};

interface TrainingInputStepProps {
  kind: AgentInputKind | null;
  text: string;
  pending: boolean;
  error: string | null;
  canSubmit: boolean;
  preflight: PreflightResult;
  acknowledgedIds: string[];
  attested: boolean;
  onKindChange: (kind: AgentInputKind) => void;
  onTextChange: (text: string) => void;
  onToggleAcknowledgement: (id: string) => void;
  onAttestationChange: (attested: boolean) => void;
  onSubmit: () => void;
}

/** Stap 1: soort input kiezen, de tekst invoeren en de privacycontrole afronden. */
export function TrainingInputStep({
  kind,
  text,
  pending,
  error,
  canSubmit,
  preflight,
  acknowledgedIds,
  attested,
  onKindChange,
  onTextChange,
  onToggleAcknowledgement,
  onAttestationChange,
  onSubmit,
}: TrainingInputStepProps) {
  const selected = INPUT_KINDS.find((option) => option.kind === kind);

  return (
    <div className="mt-12">
      <fieldset disabled={pending}>
        <legend className="sr-only">Startpunt kiezen</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {INPUT_KINDS.map((option) => (
            <ChoiceCard
              key={option.kind}
              name="input-kind"
              value={option.kind}
              icon={ICONS[option.kind]}
              title={option.label}
              description={option.description}
              checked={kind === option.kind}
              onSelect={(value) => onKindChange(value as AgentInputKind)}
            />
          ))}
        </div>
      </fieldset>

      {selected && (
        <section className="mt-12">
          <label htmlFor="training-input" className="block text-lg font-semibold tracking-tight text-ink">
            {selected.prompt}
          </label>

          {selected.notice && (
            <p className="mt-3 flex items-start gap-2.5 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-3 text-sm text-petrol-800">
              <Icon name="info" className="mt-px size-4 shrink-0" />
              {selected.notice}
            </p>
          )}

          <textarea
            id="training-input"
            rows={selected.kind === "onderwerp" ? 4 : 10}
            maxLength={MAX_INPUT_LENGTH}
            value={text}
            readOnly={pending}
            onChange={(event) => onTextChange(event.target.value)}
            className="mt-4 block w-full resize-y rounded-lg border border-line bg-canvas px-5 py-4 text-[15px] leading-relaxed text-ink focus:border-petrol-600/50 focus:outline-none read-only:bg-surface"
          />

          {text.trim().length > 0 && (
            <PrivacyPreflightPanel
              text={text.trim()}
              preflight={preflight}
              isCasus={selected.kind === "casus"}
              acknowledgedIds={acknowledgedIds}
              attested={attested}
              disabled={pending}
              onToggleAcknowledgement={onToggleAcknowledgement}
              onAttestationChange={onAttestationChange}
            />
          )}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button onClick={onSubmit} disabled={pending || !canSubmit}>
              {pending ? "Analyse wordt uitgevoerd…" : "Verder naar analyse"}
              {!pending && <Icon name="arrowRight" className="size-4" />}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
