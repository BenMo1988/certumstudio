"use client";

import { useMemo, useState, useTransition } from "react";
import { analyzeInput } from "@/app/trainings/new/actions";
import {
  evaluatePreflightGate,
  hashPreflightText,
  runPrivacyPreflight,
  type GateRejection,
} from "@/modules/privacy";
import type { AgentInput, AgentInputKind, InputAnalysis } from "@/modules/training-agent";
import { AnalysisReview } from "./AnalysisReview";
import { FlowSteps } from "./FlowSteps";
import { PageHeader } from "./PageHeader";
import { TrainingInputStep } from "./TrainingInputStep";

const PREFLIGHT_MESSAGES: Record<GateRejection, string> = {
  blocked: "De tekst bevat direct herkenbare persoonsgegevens. Pas de tekst aan.",
  review_required: "Bevestig eerst alle gemarkeerde mogelijke persoonsgegevens, of pas de tekst aan.",
  attestation_required: "Bevestig eerst dat de casus fictief of geanonimiseerd is.",
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
  const [attested, setAttested] = useState(false);
  const [result, setResult] = useState<{ input: AgentInput; analysis: InputAnalysis } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = text.trim();
  const preflight = useMemo(() => runPrivacyPreflight(trimmed), [trimmed]);
  const localGate = evaluatePreflightGate({
    inputKind: kind ?? "",
    preflight,
    currentTextHash: "lokaal",
    acknowledgement: { textHash: "lokaal", acknowledgedFindingIds: acknowledgedIds, anonymizationAttested: attested },
  });

  /** Iedere tekstwijziging maakt eerdere bevestigingen en de attestatie ongeldig. */
  function changeText(next: string) {
    setText(next);
    setAcknowledgedIds([]);
    setAttested(false);
    setError(null);
  }

  function submit() {
    if (!kind || !localGate.allowed) return;
    const input = { kind, text: trimmed } as AgentInput;
    setError(null);
    startTransition(async () => {
      const textHash = await hashPreflightText(trimmed);
      const response = await analyzeInput(kind, trimmed, {
        textHash,
        acknowledgedFindingIds: acknowledgedIds,
        anonymizationAttested: attested,
      });
      if (response.status === "error") {
        setError(response.error);
        return;
      }
      if (response.status === "preflight") {
        setError(PREFLIGHT_MESSAGES[response.reason]);
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
        canSubmit={localGate.allowed && trimmed.length > 0}
        preflight={preflight}
        acknowledgedIds={acknowledgedIds}
        attested={attested}
        onKindChange={(next) => {
          setKind(next);
          setAcknowledgedIds([]);
          setAttested(false);
          setError(null);
        }}
        onTextChange={changeText}
        onToggleAcknowledgement={(id) =>
          setAcknowledgedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
        }
        onAttestationChange={setAttested}
        onSubmit={submit}
      />
    </>
  );
}
