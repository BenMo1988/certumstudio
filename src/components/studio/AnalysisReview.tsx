"use client";

import { useState, type ReactNode } from "react";
import {
  INPUT_KINDS,
  getProceedBlocker,
  isAnalysisBlocked,
  type AgentInput,
  type InputAnalysis,
  type ProceedBlocker,
  type SuitabilityVerdict,
} from "@/modules/training-agent";
import { Button } from "./Button";
import { Icon } from "./Icon";

const SUITABILITY_ANSWER: Record<SuitabilityVerdict, string> = {
  geschikt: "Ja",
  aanpassen: "Ja, na aanpassing",
  ongeschikt: "Nee",
};

const BLOCKER_MESSAGE: Record<ProceedBlocker, string> = {
  privacy: "Geblokkeerd vanwege privacy.",
  ongeschikt: "Deze input is niet geschikt als praktijksimulatie.",
  "geen-richting": "Kies eerst een trainingsrichting.",
  "onbekende-richting": "Kies een van de voorgestelde richtingen.",
};

interface AnalysisReviewProps {
  input: AgentInput;
  analysis: InputAnalysis;
  onBack: () => void;
}

/** Stap 2: de gebruiker beoordeelt de analyse en kiest een trainingsrichting. */
export function AnalysisReview({ input, analysis, onBack }: AnalysisReviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const blocked = isAnalysisBlocked(analysis);
  const blocker = getProceedBlocker(analysis, selectedId);
  const { privacyAssessment: privacy, suitability } = analysis;
  const kindLabel = INPUT_KINDS.find((option) => option.kind === input.kind)?.label;
  const confirmed = analysis.trainingDirections.find((direction) => direction.id === confirmedId);

  function confirmDirection() {
    // Zelfde domeinregel als de knopstatus: nooit door bij een blokkade.
    if (getProceedBlocker(analysis, selectedId) !== null) return;
    setConfirmedId(selectedId);
  }

  return (
    <div className="mt-10">
      <section className="rounded-lg bg-surface px-6 py-5">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">Jouw invoer · {kindLabel}</p>
        <p className="mt-2 line-clamp-4 text-[15px] leading-relaxed whitespace-pre-line text-ink">{input.text}</p>
      </section>

      <div className="mt-6 space-y-3">
        {privacy.level === "blokkeren" && (
          <Callout tone="danger" title="Privacy: deze input kan niet verder">
            {privacy.description} Pas de invoer aan via ‘Terug naar invoer’.
          </Callout>
        )}
        {suitability.verdict === "ongeschikt" && (
          <Callout tone="danger" title="Niet geschikt als praktijksimulatie">
            {suitability.explanation}
          </Callout>
        )}
        {privacy.level === "aandachtspunt" && (
          <Callout tone="attention" title="Privacy: aandachtspunt">
            {privacy.description}
          </Callout>
        )}
      </div>

      <p className="mt-10 max-w-3xl text-lg leading-relaxed text-ink">{analysis.summary}</p>

      <dl className="mt-8 divide-y divide-line border-y border-line">
        <Fact label="Professioneel dilemma">{analysis.professionalDilemma}</Fact>
        <Fact label="Voorgesteld leerdoel">{analysis.proposedLearningGoal}</Fact>
        <Fact label="Doelgroep">
          {analysis.targetAudience ?? <span className="text-muted italic">Niet af te leiden uit de invoer</span>}
        </Fact>
        <Fact label="Geschikt als praktijksimulatie?">
          <span className="font-medium">{SUITABILITY_ANSWER[suitability.verdict]}</span>
          {suitability.verdict !== "ongeschikt" && (
            <span className="text-muted"> · {suitability.explanation}</span>
          )}
        </Fact>
        {privacy.level === "geen" && (
          <Fact label="Privacy">
            <span className="text-muted">Geen privacyprobleem gedetecteerd.</span>
          </Fact>
        )}
        {analysis.missingInformation.length > 0 && (
          <Fact label="Ontbrekende informatie">
            <ul className="list-disc space-y-1 pl-5 marker:text-petrol-600">
              {analysis.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Fact>
        )}
      </dl>

      <p className="mt-5 flex max-w-3xl items-start gap-2.5 text-sm leading-relaxed text-muted">
        <Icon name="info" className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-medium text-ink">Waarom deze analyse: </span>
          {analysis.rationale}
        </span>
      </p>

      <section className="mt-14" aria-labelledby="directions-heading">
        <h2 id="directions-heading" className="text-lg font-semibold tracking-tight text-ink">
          Mogelijke trainingsrichtingen
        </h2>
        <p className="mt-1 text-sm text-muted">Kies de richting waarmee je verder wilt.</p>

        <fieldset disabled={blocked} className="mt-5 space-y-3 disabled:opacity-60">
          <legend className="sr-only">Trainingsrichting</legend>
          {analysis.trainingDirections.map((direction) => {
            const checked = selectedId === direction.id;
            return (
              <label
                key={direction.id}
                className={`flex gap-4 rounded-lg border p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petrol-600 ${
                  blocked ? "cursor-not-allowed border-line" : "cursor-pointer"
                } ${checked ? "border-petrol-600 ring-1 ring-petrol-600" : blocked ? "" : "border-line hover:border-petrol-600/40"}`}
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
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{direction.description}</span>
                  <span className="mt-3 block text-sm leading-relaxed text-ink">
                    <span className="font-medium text-petrol-700">Leerdoel: </span>
                    {direction.proposedLearningGoal}
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
            Gekozen richting: <span className="font-medium">{confirmed.title}</span>. Het opbouwen van de training
            volgt in een volgende stap.
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
