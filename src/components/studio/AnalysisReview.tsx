"use client";

import { useState, type ReactNode } from "react";
import { INPUT_KINDS, type AgentInput } from "@/modules/training-agent";
import type { EpistemicFlag } from "@/modules/training-agent/v2/epistemic";
import { getProceedBlockerV2, type InputGateState, type ProceedBlockerV2 } from "@/modules/training-agent/v2/rules";
import type {
  AnalysisOutcome,
  BlockedOutcome,
  DecisionRelevantGap,
  NeedsAdjustmentOutcome,
  ReadyOutcome,
  SourceSegment,
  UnsuitableOutcome,
} from "@/modules/training-agent/v2/types";
import { Button } from "./Button";
import { Icon } from "./Icon";

const AFFECTS_LABEL: Record<DecisionRelevantGap["affects"], string> = {
  geschiktheid: "Geschiktheid",
  dilemma: "Dilemma",
  leerdoel: "Leerdoel",
  doelgroep: "Doelgroep",
  richtingkeuze: "Richtingkeuze",
};

const BLOCKER_MESSAGE: Record<ProceedBlockerV2, string> = {
  preflight: "De privacycontrole is niet afgerond.",
  data_policy: "De bevestiging van synthetische testdata ontbreekt.",
  not_ready: "Deze analyse is niet gereed voor trainingsontwikkeling.",
  "geen-richting": "Kies eerst een trainingsrichting.",
  "onbekende-richting": "Kies een van de voorgestelde richtingen.",
};

interface AnalysisReviewProps {
  input: AgentInput;
  analysis: AnalysisOutcome;
  segments: SourceSegment[];
  epistemicFlags: EpistemicFlag[];
  gate: InputGateState;
  onBack: () => void;
}

/** Stap 2: de gebruiker beoordeelt de V2-analyse. Alleen `ready` levert selecteerbare trainingsrichtingen. */
export function AnalysisReview({ input, analysis, segments, epistemicFlags, gate, onBack }: AnalysisReviewProps) {
  const kindLabel = INPUT_KINDS.find((option) => option.kind === input.kind)?.label;

  return (
    <div className="mt-10" data-analysis-outcome={analysis.outcome}>
      <section className="rounded-lg bg-surface px-6 py-5">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">Jouw invoer · {kindLabel}</p>
        <p className="mt-2 line-clamp-4 text-[15px] leading-relaxed whitespace-pre-line text-ink">{input.text}</p>
      </section>

      {epistemicFlags.length > 0 && <EpistemicNotice flags={epistemicFlags} />}

      {analysis.outcome === "blocked" && <BlockedView analysis={analysis} onBack={onBack} />}
      {analysis.outcome === "unsuitable" && <UnsuitableView analysis={analysis} onBack={onBack} />}
      {analysis.outcome === "needs_adjustment" && <NeedsAdjustmentView analysis={analysis} onBack={onBack} />}
      {analysis.outcome === "ready" && (
        <ReadyView analysis={analysis} segments={segments} gate={gate} onBack={onBack} />
      )}
    </div>
  );
}

function BlockedView({ analysis, onBack }: { analysis: BlockedOutcome; onBack: () => void }) {
  return (
    <>
      <div className="mt-6">
        <Callout tone="danger" title="Verwerking gestopt">
          {analysis.reason}
        </Callout>
      </div>
      <dl className="mt-8 divide-y divide-line border-y border-line">
        <Fact label="Gevonden soorten gegevens">
          <ul className="list-disc space-y-1 pl-5 marker:text-danger" data-testid="privacy-findings">
            {analysis.privacyFindings.map((finding, i) => (
              <li key={i}>
                <span className="font-medium">{finding.category}:</span> {finding.description}
              </li>
            ))}
          </ul>
        </Fact>
        <Fact label="Wat je nu moet doen">{analysis.nextStep}</Fact>
      </dl>
      <Footer onBack={onBack} />
    </>
  );
}

function UnsuitableView({ analysis, onBack }: { analysis: UnsuitableOutcome; onBack: () => void }) {
  return (
    <>
      <div className="mt-6">
        <Callout tone="attention" title="Geen goede basis voor een praktijksimulatie">
          {analysis.explanation}
        </Callout>
      </div>
      <p className="mt-10 max-w-3xl text-lg leading-relaxed text-ink">{analysis.summary}</p>
      <dl className="mt-8 divide-y divide-line border-y border-line">
        <Fact label="Wat zou de input leerwaardig maken">
          <BulletList items={analysis.whatWouldMakeItSuitable} />
        </Fact>
      </dl>
      <Footer onBack={onBack} note="Pas je invoer aan en analyseer opnieuw." />
    </>
  );
}

function NeedsAdjustmentView({ analysis, onBack }: { analysis: NeedsAdjustmentOutcome; onBack: () => void }) {
  return (
    <>
      <div className="mt-6">
        <Callout tone="attention" title="De input moet eerst worden afgebakend">
          Kies een afbakening en vul je invoer aan. Daarna doorloopt de nieuwe invoer opnieuw de privacycontrole en de
          analyse.
        </Callout>
      </div>
      <p className="mt-10 max-w-3xl text-lg leading-relaxed text-ink">{analysis.summary}</p>
      <dl className="mt-8 divide-y divide-line border-y border-line">
        {analysis.provisionalProfessionalCore && (
          <Fact label="Voorlopige professionele kern">{analysis.provisionalProfessionalCore}</Fact>
        )}
        <Fact label="Beslisrelevante ontbrekende informatie">
          <GapList gaps={analysis.decisionRelevantGaps} />
        </Fact>
        {analysis.abstractionNotes.length > 0 && (
          <Fact label="Later algemener maken">
            <BulletList items={analysis.abstractionNotes.map((a) => `${a.feature} ${a.advice}`)} />
          </Fact>
        )}
      </dl>
      <Rationale text={analysis.rationale} />

      <section className="mt-14" aria-labelledby="scopings-heading">
        <h2 id="scopings-heading" className="text-lg font-semibold tracking-tight text-ink">
          Mogelijke afbakeningen
        </h2>
        <p className="mt-1 text-sm text-muted">Voorstellen om je invoer concreter te maken. Dit zijn nog geen trainingsrichtingen.</p>
        <ul className="mt-5 space-y-3" data-testid="scopings">
          {analysis.possibleScopings.map((scoping) => (
            <li key={scoping.id} className="rounded-lg border border-line p-5">
              <p className="font-semibold text-ink">{scoping.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{scoping.description}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                <span className="font-medium text-petrol-700">Voeg toe: </span>
                {scoping.whatTheUserShouldAdd}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <Footer onBack={onBack} />
    </>
  );
}

function ReadyView({
  analysis,
  segments,
  gate,
  onBack,
}: {
  analysis: ReadyOutcome;
  segments: SourceSegment[];
  gate: InputGateState;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const blocker = getProceedBlockerV2(analysis, selectedId, gate);
  const confirmed = analysis.trainingDirections.find((d) => d.id === confirmedId);
  const segmentText = (id: string) => segments.find((s) => s.id === id)?.text;

  function confirmDirection() {
    // Zelfde domeinregel als de knopstatus: alleen ready + bestaande richting + geldige poorten.
    if (getProceedBlockerV2(analysis, selectedId, gate) !== null) return;
    setConfirmedId(selectedId);
  }

  return (
    <>
      <p className="mt-10 max-w-3xl text-lg leading-relaxed text-ink">{analysis.summary}</p>
      <dl className="mt-8 divide-y divide-line border-y border-line">
        <Fact label="Professioneel dilemma">{analysis.professionalDilemma}</Fact>
        <Fact label="Voorgesteld leerdoel">{analysis.proposedLearningGoal}</Fact>
        <Fact label="Doelgroep">
          {analysis.targetAudience ?? <span className="text-muted italic">Niet af te leiden uit de invoer</span>}
        </Fact>
        {analysis.decisionRelevantGaps.length > 0 && (
          <Fact label="Beslisrelevante ontbrekende informatie">
            <GapList gaps={analysis.decisionRelevantGaps} />
          </Fact>
        )}
        {analysis.abstractionNotes.length > 0 && (
          <Fact label="Later algemener maken">
            <BulletList items={analysis.abstractionNotes.map((a) => `${a.feature} ${a.advice}`)} />
          </Fact>
        )}
      </dl>
      <Rationale text={analysis.rationale} />

      <section className="mt-14" aria-labelledby="directions-heading">
        <h2 id="directions-heading" className="text-lg font-semibold tracking-tight text-ink">
          Mogelijke trainingsrichtingen
        </h2>
        <p className="mt-1 text-sm text-muted">Kies de richting waarmee je verder wilt.</p>
        <fieldset className="mt-5 space-y-3">
          <legend className="sr-only">Trainingsrichting</legend>
          {analysis.trainingDirections.map((direction) => {
            const checked = selectedId === direction.id;
            return (
              <label
                key={direction.id}
                className={`flex cursor-pointer gap-4 rounded-lg border p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petrol-600 ${
                  checked ? "border-petrol-600 ring-1 ring-petrol-600" : "border-line hover:border-petrol-600/40"
                }`}
              >
                <input
                  type="radio"
                  name="training-direction"
                  value={direction.id}
                  checked={checked}
                  onChange={() => {
                    setSelectedId(direction.id);
                    setConfirmedId(null);
                  }}
                  className="mt-1 size-4 shrink-0 accent-petrol-700"
                />
                <span>
                  <span className="block font-semibold text-ink">{direction.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{direction.focus}</span>
                  <span className="mt-3 block text-sm leading-relaxed text-ink">
                    <span className="font-medium text-petrol-700">Leerdoel: </span>
                    {direction.proposedLearningGoal}
                  </span>
                  <span className="mt-3 block border-l-2 border-line pl-3 text-xs leading-relaxed text-muted" data-testid="grounding">
                    Gebaseerd op:{" "}
                    {direction.sourceRefs.map((ref) => (
                      <span key={ref} className="block italic">
                        “{segmentText(ref)}”
                      </span>
                    ))}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </section>

      {confirmed && (
        <p role="status" className="mt-6 flex items-start gap-2.5 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-3 text-sm text-petrol-800">
          <Icon name="check" className="mt-px size-4 shrink-0" />
          <span>
            Gekozen richting: <span className="font-medium">{confirmed.title}</span>. Het opbouwen van de training volgt in
            een volgende stap.
          </span>
        </p>
      )}

      <div className="mt-10 flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={onBack}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar invoer
        </Button>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
          {blocker && <p className="text-sm text-muted sm:text-right">{BLOCKER_MESSAGE[blocker]}</p>}
          <Button onClick={confirmDirection} disabled={blocker !== null}>
            Gebruik deze trainingsrichting
          </Button>
        </div>
      </div>
    </>
  );
}

/** Zichtbare markering: een gecontroleerd begrip in de analyse dat niet uit de invoer komt. Blokkeert niets. */
function EpistemicNotice({ flags }: { flags: EpistemicFlag[] }) {
  const terms = [...new Set(flags.map((f) => f.term))];
  return (
    <div className="mt-6" data-testid="epistemic-flags">
      <Callout tone="attention" title="Niet uit je invoer">
        De analyse noemt {terms.map((t) => `“${t}”`).join(", ")}. Dit staat niet in je invoer en is niet gevalideerd;
        welke kaders van toepassing zijn, wordt later in de Bron-fase bepaald.
      </Callout>
    </div>
  );
}

function GapList({ gaps }: { gaps: DecisionRelevantGap[] }) {
  return (
    <ul className="space-y-3" data-testid="gaps">
      {gaps.map((gap, i) => (
        <li key={i}>
          <span className="block">{gap.question}</span>
          <span className="mt-0.5 block text-sm text-muted">
            <span className="font-medium">{AFFECTS_LABEL[gap.affects]}:</span> {gap.howItChangesTheDecision}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 marker:text-petrol-600">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Rationale({ text }: { text: string }) {
  return (
    <p className="mt-5 flex max-w-3xl items-start gap-2.5 text-sm leading-relaxed text-muted">
      <Icon name="info" className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="font-medium text-ink">Waarom deze analyse: </span>
        {text}
      </span>
    </p>
  );
}

function Footer({ onBack, note }: { onBack: () => void; note?: string }) {
  return (
    <div className="mt-10 flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="secondary" onClick={onBack}>
        <Icon name="arrowLeft" className="size-4" />
        Terug naar invoer
      </Button>
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="text-[15px] leading-relaxed text-ink">{children}</dd>
    </div>
  );
}

function Callout({ tone, title, children }: { tone: "danger" | "attention"; title: string; children: ReactNode }) {
  const styles =
    tone === "danger"
      ? "border-danger/30 bg-danger-50 text-danger"
      : "border-attention/30 bg-attention-50 text-attention-700";
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={`flex gap-3 rounded-md border px-4 py-3.5 ${styles}`}>
      <Icon name="alert" className="mt-0.5 size-[18px] shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink">{children}</p>
      </div>
    </div>
  );
}
