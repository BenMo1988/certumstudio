"use client";

import { useState, type ReactNode } from "react";
import {
  decideRevisionAction,
  regenerateBlockAction,
  revisionHistoryAction,
  saveBlockEditAction,
  saveFrameEditAction,
} from "@/app/trainings/workflow/actions";
import type { RevisionHistoryEntry } from "@/app/trainings/workflow/editing";
import type { WorkflowResult } from "@/app/trainings/workflow/persisted-workflow";
import { METHODOLOGY_STEPS } from "@/knowledge";
import { getCatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import { requiredSourceNeedsFor, type BlockContentResult } from "@/modules/block-content";
import type { RevisionMeta, TrainingWorkspaceView } from "@/services/storage/workspace";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { ASSESSMENT_LABEL, FIELD_SPECS, REVIEW_LABEL, UNRESOLVED_LABEL, editableFields, previewOf, type FieldSpec } from "./block-fields";
import { BlockForm, BlockView, type FieldContext } from "./BlockFields";
import { SourcesDetail, SourcesPanel } from "./SourceWorkspace";

/*
 * Training Review & Editor V1: de opleiderswerkplek. Overzicht van de hele training in volgorde (Vaste Start, blokken
 * per Certum-fase, Vast Einde) en per onderdeel bekijken, bewerken, goedkeuren, laten aanpassen of opnieuw genereren.
 * Iedere opslag is een nieuwe versie op de server; er is geen autosave en geen client-only waarheid.
 */

export type ActResult = { ok: true } | { ok: false; message: string; issues?: string[] };

interface Props {
  ws: TrainingWorkspaceView;
  pending: boolean;
  failedBlockId: string | null;
  /** Voert een server action uit en neemt bij succes de nieuwe server-snapshot over. */
  act: (run: () => Promise<WorkflowResult>) => Promise<ActResult>;
  onBack: () => void;
}

type Selection = { kind: "block"; id: string } | { kind: "start" } | { kind: "end" } | { kind: "sources"; preselect: string[] } | null;

const phaseLabel = (id: string) => METHODOLOGY_STEPS.find((s) => s.id === id)?.label ?? id;
const blockName = (id: string) => getCatalogBlock(id)?.visibleName ?? id;

export function ReviewWorkspace({ ws, pending, failedBlockId, act, onBack }: Props) {
  const [selection, setSelection] = useState<Selection>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const content = ws.content!;
  const plan = ws.blockPlan!.payload;
  const planned = [...plan.plannedBlocks].sort((a, b) => a.sequence - b.sequence);
  const blockLabel = (id: string) => {
    const b = planned.find((p) => p.id === id);
    return b ? `${b.sequence}. ${phaseLabel(b.certumPhase)} · ${blockName(b.catalogBlockId)}` : id;
  };

  /** Actie met een korte bevestiging bij succes. */
  async function run(action: () => Promise<WorkflowResult>, success: string): Promise<ActResult> {
    setNotice(null);
    const result = await act(action);
    if (result.ok) setNotice(success);
    return result;
  }
  const open = (s: Selection) => {
    setSelection(s);
    setNotice(null);
    window.scrollTo({ top: 0 });
  };

  const noticeView = notice && (
    <p role="status" className="mt-6 flex items-center gap-2 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-2.5 text-sm text-petrol-800" data-testid="review-notice">
      <Icon name="check" className="size-4" />
      {notice}
    </p>
  );

  if (selection) {
    return (
      <div className="mt-8" data-testid="review-detail">
        <button type="button" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-petrol-700" onClick={() => open(null)}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar de training
        </button>
        {noticeView}
        {selection.kind === "sources" ? (
          <SourcesDetail ws={ws} preselect={selection.preselect} pending={pending} run={run} />
        ) : selection.kind === "block" ? (
          <BlockDetail
            key={content.blockRevisions[selection.id]?.revisionId ?? selection.id}
            ws={ws}
            plannedBlockId={selection.id}
            blockLabel={blockLabel}
            pending={pending}
            run={run}
            onAddSource={(refs) => open({ kind: "sources", preselect: refs })}
          />
        ) : (
          <FrameDetail key={content.frame[selection.kind].revisionId} ws={ws} part={selection.kind} pending={pending} run={run} />
        )}
      </div>
    );
  }

  const r = content.review;
  return (
    <div className="mt-8" data-testid="review-workspace" data-readiness={r.readiness}>
      <ReviewSummary ws={ws} />
      {noticeView}
      {ws.sources && <SourcesPanel sources={ws.sources} onOpen={() => open({ kind: "sources", preselect: [] })} />}
      {failedBlockId && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Het genereren stopte bij {blockLabel(failedBlockId)}. Je kunt het opnieuw starten; wat er al is, blijft bewaard.
        </p>
      )}

      <ol className="mt-8 space-y-8">
        <li>
          <FrameCard ws={ws} part="start" onOpen={() => open({ kind: "start" })} />
        </li>
        {METHODOLOGY_STEPS.map((step) => {
          const blocks = planned.filter((b) => b.certumPhase === step.id);
          if (blocks.length === 0) return null;
          return (
            <li key={step.id} data-testid={`phase-${step.id}`}>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">{step.label}</h3>
              <ul className="space-y-3">
                {blocks.map((b) => (
                  <BlockCard
                    key={b.id}
                    ws={ws}
                    plannedBlockId={b.id}
                    label={`${b.sequence}. ${blockName(b.catalogBlockId)}`}
                    pending={pending}
                    onOpen={() => open({ kind: "block", id: b.id })}
                    onAddSource={(refs) => open({ kind: "sources", preselect: refs })}
                    run={run}
                  />
                ))}
              </ul>
            </li>
          );
        })}
        <li>
          <FrameCard ws={ws} part="end" onOpen={() => open({ kind: "end" })} />
        </li>
      </ol>

      <div className="mt-10 border-t border-line pt-6">
        <Button variant="secondary" onClick={onBack}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar Block Plan
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Overzicht
// ---------------------------------------------------------------------------------------------------------------

function ReviewSummary({ ws }: { ws: TrainingWorkspaceView }) {
  const r = ws.content!.review;
  const counts = [
    `${r.totalBlocks} blokken`,
    `${r.approved} goedgekeurd`,
    r.draft > 0 && `${r.draft} concept`,
    r.needsRevision > 0 && `${r.needsRevision} moet aangepast`,
    r.source > 0 && `${r.source} bron nodig`,
    r.asset > 0 && `${r.asset} asset nodig`,
    r.capability > 0 && `${r.capability} technische beperking`,
    r.notGenerated > 0 && `${r.notGenerated} nog niet gemaakt`,
  ].filter(Boolean);
  const open = [
    r.sourceNeedsOpen > 0 && (r.sourceNeedsOpen === 1 ? "1 bron ontbreekt" : `${r.sourceNeedsOpen} bronnen ontbreken`),
    r.sourceNeedsOpen === 0 && r.source > 0 && "Alle benodigde bronnen aanwezig · Bron-blok nog genereren",
    r.staleBlocks > 0 && (r.staleBlocks === 1 ? "1 blok steunt op een gewijzigde bron" : `${r.staleBlocks} blokken steunen op een gewijzigde bron`),
    r.asset > 0 && (r.asset === 1 ? "1 asset ontbreekt" : `${r.asset} assets ontbreken`),
    r.capability > 0 && `${r.capability} technische beperking`,
    r.toReview > 0 && (r.toReview === 1 ? "Nog 1 onderdeel beoordelen" : `Nog ${r.toReview} onderdelen beoordelen`),
  ].filter(Boolean) as string[];

  return (
    <section aria-labelledby="review-heading">
      <h2 id="review-heading" className="text-lg font-semibold tracking-tight text-ink">
        Training beoordelen
      </h2>
      <p className="mt-1 text-sm text-muted" data-testid="review-counts">
        {counts.join(" · ")}
      </p>
      {r.readiness === "approved" ? (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-3 text-[15px] font-medium text-petrol-800" data-testid="review-cta">
          <Icon name="check" className="size-4" />
          Training gereed
        </p>
      ) : (
        <p className="mt-4 rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-[15px] font-medium text-attention-700" data-testid="review-cta">
          {open.join(" · ")}
        </p>
      )}
    </section>
  );
}

function StatusPill({ tone, children }: { tone: "done" | "draft" | "attention"; children: ReactNode }) {
  const cls = tone === "done" ? "bg-petrol-50 text-petrol-800" : tone === "attention" ? "bg-attention-50 text-attention-700" : "bg-surface text-ink";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

function statusOf(block: BlockContentResult | undefined): { label: string; tone: "done" | "draft" | "attention" } {
  if (!block) return { label: "Nog niet gemaakt", tone: "attention" };
  if (block.body.status !== "generated") return { label: UNRESOLVED_LABEL[block.body.status], tone: "attention" };
  return { label: REVIEW_LABEL[block.reviewStatus], tone: block.reviewStatus === "approved" ? "done" : block.reviewStatus === "needs_revision" ? "attention" : "draft" };
}

const versionText = (meta: RevisionMeta | undefined) =>
  meta ? `Versie ${meta.revisionNo}${meta.source === "manual" ? " · handmatig aangepast" : ""}` : "";

function BlockCard({
  ws,
  plannedBlockId,
  label,
  pending,
  onOpen,
  onAddSource,
  run,
}: {
  ws: TrainingWorkspaceView;
  plannedBlockId: string;
  label: string;
  pending: boolean;
  onOpen: () => void;
  onAddSource: (refs: string[]) => void;
  run: (a: () => Promise<WorkflowResult>, success: string) => Promise<ActResult>;
}) {
  const content = ws.content!;
  const block = content.package.blocks.find((b) => b.plannedBlockId === plannedBlockId);
  const meta = content.blockRevisions[plannedBlockId];
  const status = statusOf(block);
  const generated = block?.body.status === "generated";
  const id = ws.training.id;
  const sourceState = block?.body.status === "needs_source" ? bronSourceState(ws) : null;
  return (
    <li className="rounded-lg border border-line p-5" data-testid={`card-${plannedBlockId}`} data-status={block?.body.status ?? "not_generated"} data-review={block?.reviewStatus ?? "-"}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-medium text-ink">{label}</p>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {meta?.staleSources && <StatusPill tone="attention">Bron gewijzigd</StatusPill>}
        <p className="text-xs text-muted" data-testid="card-version">
          {versionText(meta)}
          {block?.accreditation.estimatedMinutes ? ` · ${block.accreditation.estimatedMinutes} min` : ""}
        </p>
      </div>
      {block && <p className="mt-2 text-sm text-muted">{previewOf(block)}</p>}
      {meta && meta.basedOnSources.length > 0 && <p className="mt-1 text-xs text-muted" data-testid="card-provenance">{provenanceText(meta.basedOnSources)}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {block && (
          <Button variant="secondary" onClick={onOpen}>
            {generated ? "Bekijken / bewerken" : "Bekijken"}
          </Button>
        )}
        {generated && meta && block.reviewStatus !== "approved" && (
          <Button disabled={pending} onClick={() => run(() => decideRevisionAction(id, meta.revisionId, "approved"), `${label} goedgekeurd`)}>
            Goedkeuren
          </Button>
        )}
        {generated && meta && block.reviewStatus !== "needs_revision" && (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => decideRevisionAction(id, meta.revisionId, "needs_revision"), `${label}: moet aangepast`)}>
            Moet aangepast
          </Button>
        )}
        {generated && meta && (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => regenerateBlockAction(id, plannedBlockId, meta.revisionId), "Nieuwe versie gegenereerd (concept)")}>
            Opnieuw genereren
          </Button>
        )}
        {sourceState && <SourceActions state={sourceState} ws={ws} plannedBlockId={plannedBlockId} revisionId={meta?.revisionId ?? null} pending={pending} run={run} onAddSource={onAddSource} />}
      </div>
    </li>
  );
}

function FrameCard({ ws, part, onOpen }: { ws: TrainingWorkspaceView; part: "start" | "end"; onOpen: () => void }) {
  const content = ws.content!;
  const meta = content.frame[part];
  const text = part === "start" ? content.package.start.introduction : content.package.end.closingText;
  return (
    <div className="rounded-lg border border-line bg-surface p-5" data-testid={`card-${part}`} data-approved={meta.approved}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-medium text-ink">{part === "start" ? "Vaste Start" : "Vast Einde"}</p>
        <StatusPill tone={meta.approved ? "done" : "draft"}>{meta.approved ? "Goedgekeurd" : "Concept"}</StatusPill>
        <p className="text-xs text-muted">{versionText(meta)}</p>
      </div>
      <p className="mt-2 text-sm text-muted">{text.length > 150 ? `${text.slice(0, 149)}…` : text}</p>
      <div className="mt-4">
        <Button variant="secondary" onClick={onOpen}>
          Bekijken / bewerken
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Detail: blok
// ---------------------------------------------------------------------------------------------------------------

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-6">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="text-[15px] leading-relaxed text-ink">{children}</dd>
    </div>
  );
}

function ErrorView({ error }: { error: { message: string; issues?: string[] } | null }) {
  if (!error) return null;
  return (
    <div role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger">
      <p>{error.message}</p>
      {error.issues && error.issues.length > 0 && <p className="mt-1 text-xs">Controleer: {error.issues.join(", ")}</p>}
    </div>
  );
}

function BlockDetail({
  ws,
  plannedBlockId,
  blockLabel,
  pending,
  run,
  onAddSource,
}: {
  ws: TrainingWorkspaceView;
  plannedBlockId: string;
  blockLabel: (id: string) => string;
  pending: boolean;
  run: (a: () => Promise<WorkflowResult>, success: string) => Promise<ActResult>;
  onAddSource: (refs: string[]) => void;
}) {
  const content = ws.content!;
  const block = content.package.blocks.find((b) => b.plannedBlockId === plannedBlockId)!;
  const meta = content.blockRevisions[plannedBlockId];
  const id = ws.training.id;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [minutes, setMinutes] = useState<number | null>(block.accreditation.estimatedMinutes);
  const [error, setError] = useState<{ message: string; issues?: string[] } | null>(null);
  const status = statusOf(block);
  const ctx: FieldContext = { routePolicy: block.routePolicy, blockLabel };
  const specs = FIELD_SPECS[block.catalogBlockId] ?? [];

  async function save() {
    if (!draft) return;
    setError(null);
    const result = await run(() => saveBlockEditAction(id, plannedBlockId, meta.revisionId, { content: draft, estimatedMinutes: minutes }), "Nieuwe versie opgeslagen");
    if (result.ok) setEditing(false);
    else setError(result);
  }

  return (
    <article className="mt-6" data-testid="block-detail" data-block={plannedBlockId}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{blockLabel(plannedBlockId)}</h2>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </header>
      <History ws={ws} target={{ plannedBlockId }} meta={meta} ctx={ctx} specs={specs} />
      {meta?.staleSources && (
        <p role="alert" className="mt-4 rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-sm text-attention-700" data-testid="stale-sources">
          Bron gewijzigd: een bron waarop dit blok steunt, is gecorrigeerd of niet meer gevalideerd. Valideer de bron en genereer
          dit blok opnieuw; de huidige versie kan niet meer worden goedgekeurd.
        </p>
      )}
      {meta && meta.basedOnSources.length > 0 && (
        <p className="mt-4 text-sm text-ink" data-testid="provenance">
          {provenanceText(meta.basedOnSources)}
        </p>
      )}

      {block.body.status === "generated" ? (
        <>
          <ContextNotes block={block} blockLabel={blockLabel} />
          <section className="mt-6">
            {editing && draft ? (
              <BlockForm specs={specs} value={draft} onChange={setDraft} ctx={ctx} />
            ) : (
              <BlockView specs={specs} value={editableFields(block.body.content)} ctx={ctx} />
            )}
          </section>
        </>
      ) : (
        <UnresolvedCard block={block}>
          {block.body.status === "needs_source" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <SourceActions state={bronSourceState(ws)} ws={ws} plannedBlockId={plannedBlockId} revisionId={meta?.revisionId ?? null} pending={pending} run={run} onAddSource={onAddSource} />
            </div>
          )}
        </UnresolvedCard>
      )}

      <section className="mt-8" aria-labelledby="meta-heading" data-testid="learning-metadata">
        <h3 id="meta-heading" className="text-sm font-semibold text-ink">
          Leer- en accreditatiegegevens
        </h3>
        <dl className="mt-2 divide-y divide-line border-y border-line">
          <Fact label="Werkvorm">{block.accreditation.workform}</Fact>
          <Fact label="Bijdrage aan leerdoel">{block.accreditation.learningGoalContribution}</Fact>
          <Fact label="Toetsfunctie">{ASSESSMENT_LABEL[block.accreditation.assessmentRole]}</Fact>
          <Fact label="Geschatte minuten">
            {editing ? (
              <input
                type="number"
                min={1}
                max={120}
                aria-label="Geschatte minuten"
                className="w-28 rounded-md border border-line px-3 py-1.5"
                value={minutes ?? ""}
                onChange={(e) => setMinutes(e.target.value === "" ? null : Number(e.target.value))}
              />
            ) : (
              (block.accreditation.estimatedMinutes ?? <span className="text-muted italic">Onbekend</span>)
            )}
          </Fact>
          {block.accreditation.sourceNeedRefs.length > 0 && <Fact label="Bronbehoeften">{block.accreditation.sourceNeedRefs.join(", ")}</Fact>}
        </dl>
      </section>

      <ErrorView error={error} />

      {block.body.status === "generated" && (
        <div className="mt-8 border-t border-line pt-6">
          {editing ? (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  setMinutes(block.accreditation.estimatedMinutes);
                }}
              >
                Annuleren
              </Button>
              <Button disabled={pending} onClick={save}>
                {pending ? "Opslaan…" : "Opslaan als nieuwe versie"}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    if (block.body.status !== "generated") return;
                    setDraft(structuredClone(editableFields(block.body.content)));
                    setMinutes(block.accreditation.estimatedMinutes);
                    setEditing(true);
                  }}
                >
                  Bewerken
                </Button>
                {block.reviewStatus !== "approved" && (
                  <Button variant="secondary" disabled={pending} onClick={() => run(() => decideRevisionAction(id, meta.revisionId, "approved"), "Goedgekeurd")}>
                    Goedkeuren
                  </Button>
                )}
                {block.reviewStatus !== "needs_revision" && (
                  <Button variant="secondary" disabled={pending} onClick={() => run(() => decideRevisionAction(id, meta.revisionId, "needs_revision"), "Gemarkeerd: moet aangepast")}>
                    Moet aangepast
                  </Button>
                )}
                <Button variant="secondary" disabled={pending} onClick={() => run(() => regenerateBlockAction(id, plannedBlockId, meta.revisionId), "Nieuwe versie gegenereerd (concept)")}>
                  Opnieuw genereren
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted">
                Opnieuw genereren of opslaan maakt een nieuwe versie (concept). De huidige versie blijft in de geschiedenis;
                een eerdere goedkeuring geldt niet voor de nieuwe versie.
              </p>
            </>
          )}
        </div>
      )}
    </article>
  );
}

/** Uitleg bij trusted context die de opleider niet kan wijzigen. */
function ContextNotes({ block, blockLabel }: { block: BlockContentResult; blockLabel: (id: string) => string }) {
  if (block.body.status !== "generated") return null;
  const c = block.body.content;
  if (c.catalogBlockId === "certum.bco.ai-feedback") {
    return (
      <p className="mt-6 rounded-md bg-surface px-4 py-3 text-sm text-ink" data-testid="ai-context">
        Deze feedback krijgt de antwoorden uit {c.availableContext.map(blockLabel).join(", ")}.
        {c.unavailableContext.length > 0 && <> Niet uit {c.unavailableContext.map(blockLabel).join(", ")}: dat is in BC Online niet aantoonbaar beschikbaar.</>}
      </p>
    );
  }
  if (c.catalogBlockId === "certum.bco.conditionele-logica") {
    return <p className="mt-6 rounded-md bg-surface px-4 py-3 text-sm text-ink">Dit blok toont een tekst die afhangt van een eerder antwoord. Het routeert de training niet: iedere deelnemer doorloopt dezelfde blokken.</p>;
  }
  if (c.catalogBlockId === "certum.bco.productie") {
    return <p className="mt-6 rounded-md bg-surface px-4 py-3 text-sm text-muted">Minimum aantal woorden: niet ingesteld (V1).</p>;
  }
  return null;
}

/** Of de sourceNeeds van het Bron-blok gedekt zijn door gevalideerde bronnen (server-snapshot). */
function bronSourceState(ws: TrainingWorkspaceView): { required: string[]; covered: boolean } {
  const required = ws.blueprint ? requiredSourceNeedsFor(ws.blueprint.payload) : [];
  const needs = ws.sources?.needs ?? [];
  return { required, covered: required.length > 0 && required.every((r) => needs.find((n) => n.id === r)?.covered) };
}

const provenanceText = (titles: string[]) =>
  `Gebaseerd op ${titles.length} gevalideerde ${titles.length === 1 ? "bron" : "bronnen"}: ${titles.join(", ")}`;

function SourceActions({
  state,
  ws,
  plannedBlockId,
  revisionId,
  pending,
  run,
  onAddSource,
}: {
  state: { required: string[]; covered: boolean };
  ws: TrainingWorkspaceView;
  plannedBlockId: string;
  revisionId: string | null;
  pending: boolean;
  run: (a: () => Promise<WorkflowResult>, success: string) => Promise<ActResult>;
  onAddSource: (refs: string[]) => void;
}) {
  const open = state.required.filter((r) => !ws.sources?.needs.find((n) => n.id === r)?.covered);
  return state.covered ? (
    <Button disabled={pending} onClick={() => run(() => regenerateBlockAction(ws.training.id, plannedBlockId, revisionId), "Bron-blok gegenereerd uit de gevalideerde bronnen (concept)")}>
      Bron-blok genereren
    </Button>
  ) : (
    <Button onClick={() => onAddSource(open)}>Bron toevoegen</Button>
  );
}

function UnresolvedCard({ block, children }: { block: BlockContentResult; children?: ReactNode }) {
  const body = block.body;
  if (body.status === "generated") return null;
  return (
    <section className="mt-6 rounded-lg border border-attention/30 bg-attention-50 p-5 text-sm text-ink" data-testid="unresolved-card">
      <p className="font-semibold text-attention-700">{UNRESOLVED_LABEL[body.status]}</p>
      {body.status === "needs_source" && (
        <>
          <p className="mt-2">
            <span className="font-medium">Wat nodig is: </span>
            {body.whatToValidate}
          </p>
          <p className="mt-1">
            <span className="font-medium">Daarna mogelijk: </span>
            {body.generatableAfterValidation}
          </p>
        </>
      )}
      {body.status === "needs_asset" && (
        <>
          <p className="mt-2">
            <span className="font-medium">Waarom: </span>
            {body.assetRequirement.why}
          </p>
          <p className="mt-1">
            <span className="font-medium">Gewenste inhoud ({body.assetRequirement.assetType}): </span>
            {body.assetRequirement.desiredContent}
          </p>
        </>
      )}
      {body.status === "blocked_by_capability" && (
        <>
          <p className="mt-2">
            <span className="font-medium">Wat ontbreekt: </span>
            {body.missingCapability}
          </p>
          <p className="mt-1">{body.why}</p>
        </>
      )}
      <p className="mt-3 text-xs text-muted">
        {body.status === "needs_source"
          ? "Voeg een bron toe en valideer hem. Daarna kan het Bron-blok uit de gevalideerde bronnen worden gemaakt."
          : "Nog op te lossen. Assets toevoegen komt in een volgende stap."}
      </p>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Detail: Vaste Start en Vast Einde
// ---------------------------------------------------------------------------------------------------------------

function FrameDetail({ ws, part, pending, run }: { ws: TrainingWorkspaceView; part: "start" | "end"; pending: boolean; run: (a: () => Promise<WorkflowResult>, success: string) => Promise<ActResult> }) {
  const content = ws.content!;
  const meta = content.frame[part];
  const start = content.package.start;
  const end = content.package.end;
  const id = ws.training.id;
  const [editing, setEditing] = useState(false);
  const [intro, setIntro] = useState(start.introduction);
  const [closing, setClosing] = useState(end.closingText);
  const [summary, setSummary] = useState(end.summary ?? "");
  const [error, setError] = useState<{ message: string; issues?: string[] } | null>(null);
  const area = "w-full min-h-28 rounded-md border border-line bg-canvas px-3 py-2 text-[15px] text-ink";

  async function save() {
    setError(null);
    const fields = part === "start" ? { introduction: intro } : { closingText: closing, summary: summary.trim() === "" ? null : summary };
    const result = await run(() => saveFrameEditAction(id, part, meta.revisionId, fields), "Nieuwe versie opgeslagen");
    if (result.ok) setEditing(false);
    else setError(result);
  }

  return (
    <article className="mt-6" data-testid="frame-detail" data-part={part}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{part === "start" ? "Vaste Start" : "Vast Einde"}</h2>
        <StatusPill tone={meta.approved ? "done" : "draft"}>{meta.approved ? "Goedgekeurd" : "Concept"}</StatusPill>
      </header>
      <History ws={ws} target={{ part }} meta={meta} />
      <dl className="mt-6 divide-y divide-line border-y border-line">
        {part === "start" ? (
          <>
            <Fact label="Titel">{start.title}</Fact>
            <Fact label="Leerdoel">{start.learningGoals.join(" · ")}</Fact>
            <Fact label="Uitleg over de training">{editing ? <textarea className={area} value={intro} onChange={(e) => setIntro(e.target.value)} /> : <span className="whitespace-pre-line">{start.introduction}</span>}</Fact>
            <Fact label="Geschatte tijdsduur">{start.estimatedDurationMinutes ? `${start.estimatedDurationMinutes} minuten` : <span className="text-muted italic">Nog niet te bepalen</span>}</Fact>
          </>
        ) : (
          <>
            <Fact label="Afsluitende tekst">{editing ? <textarea className={area} value={closing} onChange={(e) => setClosing(e.target.value)} /> : <span className="whitespace-pre-line">{end.closingText}</span>}</Fact>
            <Fact label="Samenvatting">{editing ? <textarea className={area} value={summary} onChange={(e) => setSummary(e.target.value)} /> : (end.summary ?? <span className="text-muted italic">Geen</span>)}</Fact>
            <Fact label="Vervolgaanbeveling">
              <span className="text-muted italic">Geen (de Blueprint bevat geen vervolgactiviteit)</span>
            </Fact>
          </>
        )}
      </dl>
      <ErrorView error={error} />
      <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
        {editing ? (
          <>
            <Button variant="secondary" disabled={pending} onClick={() => setEditing(false)}>
              Annuleren
            </Button>
            <Button disabled={pending} onClick={save}>
              {pending ? "Opslaan…" : "Opslaan als nieuwe versie"}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setEditing(true)}>Bewerken</Button>
            {!meta.approved && (
              <Button variant="secondary" disabled={pending} onClick={() => run(() => decideRevisionAction(id, meta.revisionId, "approved"), "Goedgekeurd")}>
                Goedkeuren
              </Button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Historie (klein, alleen lezen)
// ---------------------------------------------------------------------------------------------------------------

function History({
  ws,
  target,
  meta,
  ctx,
  specs,
}: {
  ws: TrainingWorkspaceView;
  target: { plannedBlockId: string } | { part: "start" | "end" };
  meta: RevisionMeta;
  ctx?: FieldContext;
  specs?: FieldSpec[];
}) {
  const [entries, setEntries] = useState<RevisionHistoryEntry[] | null>(null);
  return (
    <div className="mt-2 text-sm text-muted" data-testid="history">
      <span data-testid="detail-version">{versionText(meta)}</span>
      {meta.previousRevisions > 0 && (
        <>
          {" · "}Vorige versies: {meta.previousRevisions}
          {entries === null && (
            <button type="button" className="ml-2 font-medium text-petrol-700 hover:text-petrol-800" onClick={async () => setEntries((await revisionHistoryAction(ws.training.id, target)) ?? [])}>
              Bekijken
            </button>
          )}
        </>
      )}
      {entries && (
        <ol className="mt-3 space-y-2">
          {entries
            .filter((e) => !e.current)
            .map((e) => (
              <li key={e.revisionId}>
                <details className="rounded-md border border-line px-4 py-2">
                  <summary className="cursor-pointer text-ink">
                    Versie {e.revisionNo} · {e.source === "manual" ? "handmatig" : "gegenereerd"} · {new Date(e.createdAt).toLocaleString("nl-NL")}
                  </summary>
                  <div className="mt-3">
                    {"plannedBlockId" in target && ctx && specs ? (
                      (() => {
                        const b = e.payload as BlockContentResult;
                        return b.body.status === "generated" ? <BlockView specs={specs} value={editableFields(b.body.content)} ctx={ctx} /> : <p>{UNRESOLVED_LABEL[b.body.status]}</p>;
                      })()
                    ) : (
                      <p className="whitespace-pre-line text-ink">{frameText(e.payload)}</p>
                    )}
                  </div>
                </details>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}

function frameText(payload: unknown): string {
  const p = payload as { introduction?: string; closingText?: string; summary?: string | null };
  return p.introduction ?? [p.closingText, p.summary].filter(Boolean).join("\n\n");
}
