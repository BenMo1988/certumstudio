"use client";

import { useMemo, useState, useTransition } from "react";
import { analyzeInput } from "@/app/trainings/new/actions";
import type { InputGateRejection } from "@/app/trainings/new/gated-analysis";
import { ACTIVE_DATA_POLICY, evaluateDataPolicy } from "@/modules/governance";
import { evaluatePreflightGate, hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import type { AgentInput, AgentInputKind } from "@/modules/training-agent";
import type { GatedAnalysisResult } from "@/app/trainings/new/gated-analysis";
import { AnalysisReview } from "./AnalysisReview";
import { FlowSteps } from "./FlowSteps";
import { PageHeader } from "./PageHeader";
import { TrainingInputStep } from "./TrainingInputStep";

const PREFLIGHT_MESSAGES: Record<InputGateRejection, string> = {
  blocked: "De tekst bevat direct herkenbare persoonsgegevens. Pas de tekst aan.",
  review_required: "Bevestig eerst alle gemarkeerde mogelijke persoonsgegevens, of pas de tekst aan.",
  synthetic_data_attestation_required: "Bevestig eerst dat de invoer uitsluitend fictieve/synthetische testdata bevat.",
  stale_acknowledgement: "De tekst is gewijzigd na je bevestiging. Controleer en bevestig opnieuw.",
};

/**
 * Nieuwe training: Invoer → lokale Privacy Preflight → Certum Analyse → keuze van een richting.
 *
 * De analyse leeft alleen in deze component-state: er wordt niets opgeslagen.
 * De preflight in de browser is alleen voor directe feedback; de server controleert opnieuw.
 */
export function NewTrainingFlow({ initialKind }: { initialKind?: AgentInputKind }) {
  const [kind, setKind] = useState<AgentInputKind | null>(initialKind ?? null);
  const [text, setText] = useState("");
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [syntheticDataAttested, setSyntheticDataAttested] = useState(false);
  const [result, setResult] = useState<{
    input: AgentInput;
    response: Extract<GatedAnalysisResult, { status: "analysis" }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = text.trim();
  const preflight = useMemo(() => runPrivacyPreflight(trimmed), [trimmed]);
  // Alleen voor directe feedback; de server beoordeelt beide poorten opnieuw en bindend.
  const canSubmit =
    evaluatePreflightGate({
      preflight,
      currentTextHash: "lokaal",
      acknowledgement: { textHash: "lokaal", acknowledgedFindingIds: acknowledgedIds, syntheticDataAttested },
    }).allowed && evaluateDataPolicy(ACTIVE_DATA_POLICY, syntheticDataAttested).allowed;

  /** Iedere tekstwijziging maakt eerdere bevestigingen en de attestatie ongeldig. */
  function changeText(next: string) {
    setText(next);
    setAcknowledgedIds([]);
    setSyntheticDataAttested(false);
    setError(null);
  }

  function submit() {
    if (!kind || !canSubmit) return;
    const input = { kind, text: trimmed } as AgentInput;
    setError(null);
    startTransition(async () => {
      const textHash = await hashPreflightText(trimmed);
      const response = await analyzeInput(kind, trimmed, {
        textHash,
        acknowledgedFindingIds: acknowledgedIds,
        syntheticDataAttested,
      });
      if (response.status === "error") {
        setError(response.error);
        return;
      }
      if (response.status === "preflight") {
        setError(PREFLIGHT_MESSAGES[response.reason]);
        return;
      }
      setResult({ input, response });
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
          description="Controleer de analyse. Alleen een analyse die gereed is levert trainingsrichtingen op; pas na jouw keuze wordt de training opgebouwd."
        />
        <AnalysisReview
          input={result.input}
          analysis={result.response.analysis}
          segments={result.response.segments}
          epistemicFlags={result.response.epistemicFlags}
          gate={{ preflightPassed: true, syntheticDataAttested: result.response.gate.syntheticDataAttested }}
          onBack={backToInput}
        />
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
        canSubmit={canSubmit && trimmed.length > 0}
        preflight={preflight}
        acknowledgedIds={acknowledgedIds}
        syntheticDataAttested={syntheticDataAttested}
        onKindChange={(next) => {
          setKind(next);
          setAcknowledgedIds([]);
          setSyntheticDataAttested(false);
          setError(null);
        }}
        onTextChange={changeText}
        onToggleAcknowledgement={(id) =>
          setAcknowledgedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
        }
        onAttestationChange={setSyntheticDataAttested}
        onSubmit={submit}
      />
    </>
  );
}
