"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { startTrainingAction } from "@/app/trainings/workflow/actions";
import type { InputGateRejection } from "@/app/trainings/new/gated-analysis";
import { ACTIVE_DATA_POLICY, evaluateDataPolicy } from "@/modules/governance";
import { evaluatePreflightGate, hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import type { AgentInputKind } from "@/modules/training-agent";
import { FlowSteps } from "./FlowSteps";
import { PageHeader } from "./PageHeader";
import { TrainingInputStep } from "./TrainingInputStep";
import { workflowMessage } from "./workflow-messages";

const PREFLIGHT_MESSAGES: Record<InputGateRejection, string> = {
  blocked: "De tekst bevat direct herkenbare persoonsgegevens. Pas de tekst aan.",
  review_required: "Bevestig eerst alle gemarkeerde mogelijke persoonsgegevens, of pas de tekst aan.",
  synthetic_data_attestation_required: "Bevestig eerst dat de invoer uitsluitend fictieve/synthetische testdata bevat.",
  stale_acknowledgement: "De tekst is gewijzigd na je bevestiging. Controleer en bevestig opnieuw.",
};

/**
 * Nieuwe training, stap Invoer. Bij indienen maakt de server de training en de invoer aan (na dezelfde privacy- en
 * synthetic_only-poorten) en voert de analyse uit. Daarna gaat de gebruiker naar de eigen, hervatbare trainingspagina.
 * De preflight in de browser is alleen voor directe feedback; de server beslist.
 */
export function NewTrainingIntake({ initialKind }: { initialKind?: AgentInputKind }) {
  const router = useRouter();
  const [kind, setKind] = useState<AgentInputKind | null>(initialKind ?? null);
  const [text, setText] = useState("");
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [syntheticDataAttested, setSyntheticDataAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = text.trim();
  const preflight = useMemo(() => runPrivacyPreflight(trimmed), [trimmed]);
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
    setError(null);
    startTransition(async () => {
      const textHash = await hashPreflightText(trimmed);
      const result = await startTrainingAction(kind, trimmed, { textHash, acknowledgedFindingIds: acknowledgedIds, syntheticDataAttested });
      if (result.status === "created") {
        router.push(`/trainings/${result.trainingId}`);
        return;
      }
      if (result.status === "rejected") {
        setError(result.gateReason ? PREFLIGHT_MESSAGES[result.gateReason] : workflowMessage(result.reason));
      }
    });
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
        onToggleAcknowledgement={(id) => setAcknowledgedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
        onAttestationChange={setSyntheticDataAttested}
        onSubmit={submit}
      />
    </>
  );
}
