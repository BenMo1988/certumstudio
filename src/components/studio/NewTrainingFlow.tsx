"use client";

import { useState, useTransition } from "react";
import { analyzeInput } from "@/app/trainings/new/actions";
import type { AgentInput, AgentInputKind, InputAnalysis } from "@/modules/training-agent";
import { AnalysisReview } from "./AnalysisReview";
import { FlowSteps } from "./FlowSteps";
import { PageHeader } from "./PageHeader";
import { TrainingInputStep } from "./TrainingInputStep";

/**
 * Nieuwe training: Invoer → Certum Analyse → keuze van een richting.
 *
 * De analyse leeft alleen in deze component-state: er wordt niets opgeslagen.
 * De UI kent alleen `analyzeInput`; welke engine erachter zit, is onzichtbaar.
 */
export function NewTrainingFlow({ initialKind }: { initialKind?: AgentInputKind }) {
  const [kind, setKind] = useState<AgentInputKind | null>(initialKind ?? null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ input: AgentInput; analysis: InputAnalysis } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!kind) return;
    const input: AgentInput = { kind, text: text.trim() };
    setError(null);
    startTransition(async () => {
      const response = await analyzeInput(input.kind, input.text);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult({ input, analysis: response.analysis });
      window.scrollTo({ top: 0 });
    });
  }

  function backToInput() {
    setResult(null);
    window.scrollTo({ top: 0 });
  }

  if (result) {
    return (
      <>
        <FlowSteps current="Analyse" />
        <PageHeader
          eyebrow="Certum Analyse"
          title="Beoordeel de analyse"
          description="Controleer de analyse en kies een trainingsrichting. Pas daarna wordt de training opgebouwd."
        />
        <AnalysisReview input={result.input} analysis={result.analysis} onBack={backToInput} />
      </>
    );
  }

  return (
    <>
      <FlowSteps current="Invoer" />
      <PageHeader eyebrow="Nieuwe training" title="Waar wil je een training van maken?" />
      <TrainingInputStep
        kind={kind}
        text={text}
        pending={pending}
        error={error}
        onKindChange={(next) => {
          setKind(next);
          setError(null);
        }}
        onTextChange={setText}
        onSubmit={submit}
      />
    </>
  );
}
