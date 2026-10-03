"use client";

import { useMemo, useState, useTransition } from "react";
import { analyzeInput } from "@/app/trainings/new/actions";
import { generateBlockPlan, generateBlueprint } from "@/app/trainings/new/blueprint-actions";
import type { BlueprintFlowRejection } from "@/app/trainings/new/blueprint-flow";
import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { TrainingBlueprintV2 as TrainingBlueprint } from "@/modules/training-blueprint/v2";
import type { InputGateRejection } from "@/app/trainings/new/gated-analysis";
import { ACTIVE_DATA_POLICY, evaluateDataPolicy } from "@/modules/governance";
import { evaluatePreflightGate, hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import type { AgentInput, AgentInputKind } from "@/modules/training-agent";
import type { GatedAnalysisResult } from "@/app/trainings/new/gated-analysis";
import { AnalysisReview } from "./AnalysisReview";
import { BlockPlanReview } from "./BlockPlanReview";
import { BlueprintReview } from "./BlueprintReview";
import { FlowSteps } from "./FlowSteps";
import { PageHeader } from "./PageHeader";
import { TrainingInputStep } from "./TrainingInputStep";

const PREFLIGHT_MESSAGES: Record<InputGateRejection, string> = {
  blocked: "De tekst bevat direct herkenbare persoonsgegevens. Pas de tekst aan.",
  review_required: "Bevestig eerst alle gemarkeerde mogelijke persoonsgegevens, of pas de tekst aan.",
  synthetic_data_attestation_required: "Bevestig eerst dat de invoer uitsluitend fictieve/synthetische testdata bevat.",
  stale_acknowledgement: "De tekst is gewijzigd na je bevestiging. Controleer en bevestig opnieuw.",
};

const BLUEPRINT_MESSAGES: Record<BlueprintFlowRejection, string> = {
  input_gate: "De privacycontrole of de bevestiging van synthetische testdata is niet (meer) geldig.",
  invalid_analysis: "De analyse kon niet worden gecontroleerd. Analyseer opnieuw.",
  not_ready: "Alleen een analyse die gereed is kan een Blueprint opleveren.",
  unknown_direction: "Kies een van de voorgestelde trainingsrichtingen.",
  incompatible_analysis: "Deze analyse is gemaakt met een oudere versie zonder routebeleid. Analyseer de invoer opnieuw.",
  invalid_blueprint: "De Blueprint voldeed niet aan de regels en is niet getoond.",
  provider_error: "De Blueprint kon nu niet worden gemaakt. Probeer het later opnieuw.",
  blueprint_not_approved: "Keur eerst de Blueprint goed.",
  invalid_block_plan: "Het Block Plan voldeed niet aan de regels en is niet getoond.",
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
  const [blueprint, setBlueprint] = useState<TrainingBlueprint | null>(null);
  const [blockPlan, setBlockPlan] = useState<{ plan: BcOnlineBlockPlan; approved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
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
    setBlueprint(null);
    setBlockPlan(null);
    setStepError(null);
    window.scrollTo({ top: 0 });
  }

  /** Richting gekozen → Training Blueprint (server controleert opnieuw preflight, policy en ready-analyse). */
  function createBlueprint(directionId: string) {
    if (!result || !kind) return;
    setStepError(null);
    startTransition(async () => {
      const textHash = await hashPreflightText(trimmed);
      const response = await generateBlueprint(
        kind,
        trimmed,
        { textHash, acknowledgedFindingIds: acknowledgedIds, syntheticDataAttested },
        result.response.analysis,
        directionId,
      );
      if (response.status === "rejected") {
        setStepError(BLUEPRINT_MESSAGES[response.reason]);
        return;
      }
      setBlueprint(response.blueprint);
      window.scrollTo({ top: 0 });
    });
  }

  /** Menselijke goedkeuring van de Blueprint → BC Online Block Plan. */
  function approveBlueprint() {
    if (!blueprint) return;
    setStepError(null);
    startTransition(async () => {
      const response = await generateBlockPlan(blueprint, true);
      if (response.status === "rejected") {
        setStepError(BLUEPRINT_MESSAGES[response.reason]);
        return;
      }
      setBlockPlan({ plan: response.blockPlan, approved: false });
      window.scrollTo({ top: 0 });
    });
  }

  const stepErrorNotice = stepError && (
    <p role="alert" className="mt-6 text-sm text-danger">
      {stepError}
    </p>
  );

  if (blueprint && blockPlan) {
    return (
      <>
        <FlowSteps current="Block Plan" />
        <PageHeader
          eyebrow="BC Online Block Plan"
          title="Beoordeel het Block Plan"
          description="Uitvoeringsvoorstel met bestaande BC Online-blokken op basis van de goedgekeurde Blueprint."
        />
        <BlockPlanReview
          blockPlan={blockPlan.plan}
          approved={blockPlan.approved}
          onApprove={() => setBlockPlan({ ...blockPlan, approved: true })}
          onBack={() => {
            // Terug naar de Blueprint: de goedkeuring vervalt en een nieuw plan vraagt een nieuwe goedkeuring.
            setBlockPlan(null);
            window.scrollTo({ top: 0 });
          }}
        />
      </>
    );
  }

  if (blueprint) {
    return (
      <>
        <FlowSteps current="Blueprint" />
        <PageHeader
          eyebrow="Training Blueprint"
          title="Beoordeel het didactisch ontwerp"
          description="Het ontwerp van de praktijksimulatie volgens de Certum-methodiek. Pas na jouw goedkeuring volgt het BC Online Block Plan."
        />
        {stepErrorNotice}
        <BlueprintReview
          blueprint={blueprint}
          pending={pending}
          onApprove={approveBlueprint}
          onBack={() => {
            setBlueprint(null);
            setStepError(null);
            window.scrollTo({ top: 0 });
          }}
        />
      </>
    );
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
          onDirectionChosen={createBlueprint}
          pendingNext={pending}
        />
        {stepErrorNotice}
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
