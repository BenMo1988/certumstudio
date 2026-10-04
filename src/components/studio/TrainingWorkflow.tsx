"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  decideRevisionAction,
  generateBlockPlanAction,
  generateBlueprintAction,
  generateContentAction,
  regenerateBlockAction,
  runAnalysisAction,
  selectDirectionAction,
} from "@/app/trainings/workflow/actions";
import type { WorkflowResult } from "@/app/trainings/workflow/persisted-workflow";
import type { AgentInput } from "@/modules/training-agent";
import type { TrainingWorkspaceView, WorkflowStage } from "@/services/storage/workspace";
import { AnalysisReview } from "./AnalysisReview";
import { BlockPlanReview } from "./BlockPlanReview";
import { BlueprintReview } from "./BlueprintReview";
import { Button } from "./Button";
import { FlowSteps } from "./FlowSteps";
import { Icon } from "./Icon";
import { PageHeader } from "./PageHeader";
import { TrainingContentWorkspace } from "./TrainingContentWorkspace";
import { workflowMessage } from "./workflow-messages";

type Step = "Analyse" | "Blueprint" | "Block Plan" | "Content";

function stepFor(stage: WorkflowStage): Step {
  switch (stage) {
    case "intake_complete":
    case "analysis_not_ready":
    case "analysis_ready":
    case "direction_selected":
      return "Analyse";
    case "blueprint_ready":
    case "blueprint_approved":
      return "Blueprint";
    case "block_plan_ready":
    case "block_plan_approved":
      return "Block Plan";
    default:
      return "Content";
  }
}

/**
 * De hervatbare workflow van één opgeslagen training. De weergave is steeds de laatste server-snapshot
 * (`TrainingWorkspaceView` uit Postgres); acties sturen alleen ids en krijgen een nieuwe snapshot terug. Er bestaat
 * geen client-only voortgang: verversen of later heropenen toont exact dezelfde stand.
 */
export function TrainingWorkflow({ initial }: { initial: TrainingWorkspaceView }) {
  const router = useRouter();
  const [ws, setWs] = useState(initial);
  const [step, setStep] = useState<Step>(stepFor(initial.progress.stage));
  const [error, setError] = useState<string | null>(null);
  const [failedBlockId, setFailedBlockId] = useState<string | null>(null);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = ws.training.id;

  /** Voert één of meer acties na elkaar uit; stopt bij de eerste afwijzing. De UI volgt de opgeslagen stand. */
  function run(actions: (() => Promise<WorkflowResult>)[], options: { keepStep?: boolean } = {}) {
    setError(null);
    startTransition(async () => {
      for (const action of actions) {
        const result = await action();
        if (result.status === "rejected") {
          setError(workflowMessage(result.reason));
          if (result.workspace) setWs(result.workspace);
          return;
        }
        setWs(result.workspace);
        if (result.failedBlockId !== undefined) setFailedBlockId(result.failedBlockId);
        if (!options.keepStep) setStep(stepFor(result.workspace.progress.stage));
      }
      window.scrollTo({ top: 0 });
    });
  }

  const errorNotice = error && (
    <p role="alert" className="mt-6 text-sm text-danger">
      {error}
    </p>
  );

  return (
    <>
      <Link href="/trainings" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-petrol-700">
        <Icon name="arrowLeft" className="size-4" />
        Mijn trainingen
      </Link>
      <div className="mt-6">
        <FlowSteps current={step} />
      </div>
      <ProgressSummary ws={ws} />
      {errorNotice}

      {step === "Analyse" && (
        <>
          <PageHeader eyebrow={`${ws.training.code} · Certum Analyse`} title="Beoordeel de analyse" />
          {!ws.analysis || !ws.input ? (
            <div className="mt-8 rounded-lg border border-line p-5 text-sm" data-testid="analysis-missing">
              <p className="text-ink">De invoer is opgeslagen, maar er is nog geen analyse.</p>
              <div className="mt-4">
                <Button onClick={() => run([() => runAnalysisAction(id)])} disabled={pending}>
                  {pending ? "Analyse loopt…" : "Analyse uitvoeren"}
                </Button>
              </div>
            </div>
          ) : (
            <AnalysisReview
              key={ws.analysis.revisionId}
              input={ws.input as AgentInput}
              analysis={ws.analysis.outcome}
              segments={ws.analysis.segments}
              epistemicFlags={ws.analysis.epistemicFlags}
              gate={{ preflightPassed: true, syntheticDataAttested: true }}
              selectedDirectionId={ws.analysis.selectedDirectionId}
              onBack={() => router.push("/trainings/new")}
              onDirectionChosen={(directionId) => {
                const analysisId = ws.analysis!.revisionId;
                run([() => selectDirectionAction(id, analysisId, directionId), () => generateBlueprintAction(id)]);
              }}
              pendingNext={pending}
            />
          )}
        </>
      )}

      {step === "Blueprint" && ws.blueprint && (
        <>
          <PageHeader eyebrow={`${ws.training.code} · Training Blueprint`} title="Beoordeel het didactisch ontwerp" />
          <BlueprintReview
            blueprint={ws.blueprint.payload}
            approved={ws.blueprint.approved}
            pending={pending}
            onApprove={() => {
              const revisionId = ws.blueprint!.revisionId;
              run(
                ws.blueprint!.approved
                  ? [() => generateBlockPlanAction(id)]
                  : [() => decideRevisionAction(id, revisionId, "approved"), () => generateBlockPlanAction(id)],
              );
            }}
            onBack={() => setStep("Analyse")}
          />
        </>
      )}

      {step === "Block Plan" && ws.blockPlan && (
        <>
          <PageHeader eyebrow={`${ws.training.code} · BC Online Block Plan`} title="Beoordeel het Block Plan" />
          <BlockPlanReview
            blockPlan={ws.blockPlan.payload}
            approved={ws.blockPlan.approved}
            pending={pending}
            onApprove={() => run([() => decideRevisionAction(id, ws.blockPlan!.revisionId, "approved")], { keepStep: true })}
            onCreateContent={() => run([() => generateContentAction(id)])}
            onBack={() => setStep("Blueprint")}
          />
        </>
      )}

      {step === "Content" && (
        <>
          <PageHeader eyebrow={`${ws.training.code} · Training Content`} title="Beoordeel de inhoud per blok" />
          {ws.progress.stage === "content_in_progress" && (
            <div className="mt-8 rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-sm" data-testid="content-incomplete">
              <p className="text-ink">
                {ws.progress.storedBlocks} van {ws.progress.totalBlocks} blokken hebben inhoud. Ga verder waar het stopte.
              </p>
              <div className="mt-3">
                <Button onClick={() => run([() => generateContentAction(id)])} disabled={pending}>
                  {pending ? "Bezig…" : "Ontbrekende blokken genereren"}
                </Button>
              </div>
            </div>
          )}
          {ws.content && ws.blockPlan ? (
            <TrainingContentWorkspace
              pkg={ws.content.package}
              blockPlan={ws.blockPlan.payload}
              failedBlockId={failedBlockId}
              openBlockId={openBlockId}
              pending={pending}
              onOpen={(blockId) => {
                setOpenBlockId(blockId);
                setError(null);
                window.scrollTo({ top: 0 });
              }}
              onReview={(blockId, status) => {
                const revision = ws.content?.blockRevisions[blockId];
                if (!revision || status === "draft") return;
                run([() => decideRevisionAction(id, revision.revisionId, status)], { keepStep: true });
              }}
              onRegenerate={(blockId) =>
                run([() => regenerateBlockAction(id, blockId, ws.content?.blockRevisions[blockId]?.revisionId ?? null)], { keepStep: true })
              }
              onBack={() => {
                setOpenBlockId(null);
                setStep("Block Plan");
              }}
            />
          ) : (
            <p className="mt-8 text-sm text-muted">Er is nog geen inhoud.</p>
          )}
        </>
      )}
    </>
  );
}

/** Waar de training staat, afgeleid op de server uit de opgeslagen revisions en besluiten. */
function ProgressSummary({ ws }: { ws: TrainingWorkspaceView }) {
  const p = ws.progress;
  const done = (stages: WorkflowStage[]) => !stages.includes(p.stage);
  const items: [string, boolean][] = [
    ["Invoer", true],
    ["Analyse", done(["intake_complete"])],
    ["Richting gekozen", done(["intake_complete", "analysis_not_ready", "analysis_ready"])],
    ["Blueprint goedgekeurd", done(["intake_complete", "analysis_not_ready", "analysis_ready", "direction_selected", "blueprint_ready"])],
    [
      "Block Plan goedgekeurd",
      done(["intake_complete", "analysis_not_ready", "analysis_ready", "direction_selected", "blueprint_ready", "blueprint_approved", "block_plan_ready"]),
    ],
  ];
  return (
    <section className="mb-2 rounded-lg bg-surface px-6 py-5" data-testid="progress-summary" data-stage={p.stage}>
      <p className="text-sm font-semibold text-ink">
        <span data-testid="training-code">{ws.training.code}</span> · {ws.training.title}
      </p>
      <p className="mt-0.5 text-xs text-muted">Status: {p.label}</p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {items.map(([label, ok]) => (
          <li key={label} className={ok ? "text-petrol-700" : "text-muted"}>
            {ok ? "✓" : "○"} {label}
          </li>
        ))}
      </ul>
      {p.totalBlocks > 0 && (p.storedBlocks > 0 || p.stage.startsWith("content") || p.stage === "training_ready") && (
        <p className="mt-2 text-sm text-ink" data-testid="content-counts">
          {p.generatedBlocks}/{p.totalBlocks} contentblokken gereed · {p.approvedBlocks}/{p.totalBlocks} goedgekeurd
          {p.unresolved.source > 0 && ` · ${p.unresolved.source} bron vereist`}
          {p.unresolved.asset > 0 && ` · ${p.unresolved.asset} asset vereist`}
          {p.unresolved.capability > 0 && ` · ${p.unresolved.capability} capability-blokkade`}
        </p>
      )}
    </section>
  );
}
