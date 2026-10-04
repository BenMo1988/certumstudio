"use client";

import { useState, type ReactNode } from "react";
import { addSourceAction, editSourceAction, validateSourceAction } from "@/app/trainings/workflow/actions";
import type { WorkflowResult } from "@/app/trainings/workflow/persisted-workflow";
import { SOURCE_KINDS, SOURCE_KIND_LABEL, SOURCE_VALIDATION_STATEMENT, type CertumSource, type SourceKind } from "@/modules/sources/schema";
import type { SourcesView, TrainingWorkspaceView } from "@/services/storage/workspace";
import { Button } from "../Button";
import { Icon } from "../Icon";
import type { ActResult } from "./ReviewWorkspace";

/*
 * Source Workspace V1: per sourceNeed de dekking, de bronnen van de training en het toevoegen, corrigeren en valideren
 * van een bron. De server beslist over dekking en validatie; deze weergave toont alleen de server-snapshot. Er wordt
 * niets van internet gehaald en niets automatisch als betrouwbaar gemarkeerd.
 */

type Run = (a: () => Promise<WorkflowResult>, success: string) => Promise<ActResult>;

const inputClass =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petrol-600";

function Pill({ done, children }: { done: boolean; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${done ? "bg-petrol-50 text-petrol-800" : "bg-attention-50 text-attention-700"}`}>{children}</span>;
}

/** Compact overzicht in de trainingsweergave. */
export function SourcesPanel({ sources, onOpen }: { sources: SourcesView; onOpen: () => void }) {
  if (sources.needs.length === 0) return null;
  const open = sources.needs.filter((n) => !n.covered).length;
  return (
    <section className="mt-8 rounded-lg border border-line p-5" aria-labelledby="sources-heading" data-testid="sources-panel" data-all-covered={sources.allCovered}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id="sources-heading" className="font-medium text-ink">
          Bronnen
        </h3>
        <Pill done={open === 0}>{open === 0 ? "Alle benodigde bronnen aanwezig" : open === 1 ? "1 bron ontbreekt" : `${open} bronnen ontbreken`}</Pill>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {sources.needs.map((n) => (
          <li key={n.id} className="flex gap-2" data-testid={`need-${n.id}`} data-covered={n.covered}>
            <span className={n.covered ? "text-petrol-700" : "text-attention-700"}>{n.covered ? "✓ gedekt" : "Bron ontbreekt"}</span>
            <span className="text-muted">
              {n.id} · {n.question}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <Button variant="secondary" onClick={onOpen}>
          Bronnen beheren
        </Button>
      </div>
    </section>
  );
}

interface FormValue {
  title: string;
  sourceType: SourceKind;
  author: string;
  publisher: string;
  publicationDate: string;
  url: string;
  relevantContent: string;
  sourceNeedRefs: string[];
}

const emptyForm = (refs: string[]): FormValue => ({ title: "", sourceType: "guideline", author: "", publisher: "", publicationDate: "", url: "", relevantContent: "", sourceNeedRefs: refs });
const fromPayload = (p: CertumSource): FormValue => ({
  title: p.title,
  sourceType: p.sourceType,
  author: p.author ?? "",
  publisher: p.publisher ?? "",
  publicationDate: p.publicationDate ?? "",
  url: p.url ?? "",
  relevantContent: p.relevantContent,
  sourceNeedRefs: p.sourceNeedRefs,
});

/** Detailweergave: dekking, bronnen, toevoegen, corrigeren en valideren. */
export function SourcesDetail({ ws, preselect, pending, run }: { ws: TrainingWorkspaceView; preselect: string[]; pending: boolean; run: Run }) {
  const sources = ws.sources!;
  const id = ws.training.id;
  const [adding, setAdding] = useState(preselect.length > 0 || sources.items.length === 0);
  const [error, setError] = useState<{ message: string; issues?: string[] } | null>(null);

  async function add(value: FormValue) {
    setError(null);
    const result = await run(() => addSourceAction(id, value), "Bron toegevoegd. Controleer en valideer hem voordat hij wordt gebruikt.");
    if (result.ok) setAdding(false);
    else setError(result);
    return result.ok;
  }

  return (
    <article className="mt-6" data-testid="sources-detail">
      <h2 className="text-xl font-semibold tracking-tight text-ink">Bronnen</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Bron-inhoud wordt alleen gemaakt uit bronnen die je zelf hebt toegevoegd én gecontroleerd. Een kennisbehoefte is
        pas gedekt als er minstens één gevalideerde bron aan gekoppeld is.
      </p>

      <section className="mt-6" aria-labelledby="needs-heading">
        <h3 id="needs-heading" className="text-sm font-semibold text-ink">
          Kennisbehoeften uit de Blueprint
        </h3>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {sources.needs.map((n) => (
            <li key={n.id} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-6" data-testid={`need-${n.id}`} data-covered={n.covered}>
              <div>
                <Pill done={n.covered}>{n.covered ? "✓ gedekt" : "Bron ontbreekt"}</Pill>
              </div>
              <div className="text-[15px] text-ink">
                <p>
                  <span className="font-medium">{n.id}</span> · {n.question}
                </p>
                <p className="mt-0.5 text-sm text-muted">{n.whyNeeded}</p>
                {n.sourceIds.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted">
                    Gekoppeld: {n.sourceIds.map((s) => sources.items.find((i) => i.sourceId === s)?.payload.title ?? s).join(", ")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-4" aria-label="Bronnen van deze training">
        {sources.items.map((item) => (
          <SourceItem key={item.revisionId} ws={ws} item={item} pending={pending} run={run} />
        ))}
      </section>

      <section className="mt-8">
        {adding ? (
          <SourceForm
            title="Bron toevoegen"
            needs={sources.needs}
            initial={emptyForm(preselect)}
            pending={pending}
            error={error}
            submitLabel="Bron toevoegen"
            onCancel={() => {
              setAdding(false);
              setError(null);
            }}
            onSubmit={add}
          />
        ) : (
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" className="size-4" />
            Bron toevoegen
          </Button>
        )}
      </section>
    </article>
  );
}

function SourceItem({ ws, item, pending, run }: { ws: TrainingWorkspaceView; item: SourcesView["items"][number]; pending: boolean; run: Run }) {
  const id = ws.training.id;
  const p = item.payload;
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<{ message: string; issues?: string[] } | null>(null);
  const meta = [SOURCE_KIND_LABEL[p.sourceType], p.author, p.publisher, p.publicationDate].filter(Boolean).join(" · ");

  async function save(value: FormValue) {
    setError(null);
    const result = await run(() => editSourceAction(id, item.sourceId, item.revisionId, value), "Nieuwe versie van de bron opgeslagen. Valideer hem opnieuw.");
    if (result.ok) setEditing(false);
    else setError(result);
    return result.ok;
  }

  if (editing) {
    return (
      <SourceForm
        title={`Bron corrigeren: ${p.title}`}
        needs={ws.sources!.needs}
        initial={fromPayload(p)}
        pending={pending}
        error={error}
        submitLabel="Opslaan als nieuwe versie"
        note={item.validated ? "Een gecorrigeerde bron moet opnieuw gevalideerd worden. Bron-inhoud die op de huidige versie steunt, moet daarna opnieuw gemaakt en beoordeeld worden." : undefined}
        onCancel={() => {
          setEditing(false);
          setError(null);
        }}
        onSubmit={save}
      />
    );
  }

  return (
    <div className="rounded-lg border border-line p-5" data-testid={`source-${item.sourceId}`} data-validated={item.validated}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-medium text-ink">{p.title}</p>
        <Pill done={item.validated}>{item.validated ? "Gevalideerd" : "Nog controleren"}</Pill>
        <p className="text-xs text-muted">
          Versie {item.revisionNo} · {p.sourceNeedRefs.join(", ")}
        </p>
      </div>
      {meta && <p className="mt-1 text-sm text-muted">{meta}</p>}
      {p.url && (
        <p className="mt-1 text-sm break-all">
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-petrol-700 underline underline-offset-2">
            {p.url}
          </a>
        </p>
      )}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Relevante inhoud</summary>
        <p className="mt-2 whitespace-pre-wrap text-ink">{p.relevantContent}</p>
      </details>

      <ErrorView error={error} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={pending} onClick={() => setEditing(true)}>
          Corrigeren
        </Button>
        {!item.validated && (
          <>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              {SOURCE_VALIDATION_STATEMENT}
            </label>
            <Button
              disabled={pending || !confirmed}
              onClick={async () => {
                setError(null);
                const result = await run(() => validateSourceAction(id, item.revisionId, confirmed), "Bron gevalideerd");
                if (!result.ok) setError(result);
              }}
            >
              Valideren
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function SourceForm({
  title,
  needs,
  initial,
  pending,
  error,
  submitLabel,
  note,
  onCancel,
  onSubmit,
}: {
  title: string;
  needs: SourcesView["needs"];
  initial: FormValue;
  pending: boolean;
  error: { message: string; issues?: string[] } | null;
  submitLabel: string;
  note?: string;
  onCancel: () => void;
  onSubmit: (value: FormValue) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initial);
  const set = <K extends keyof FormValue>(key: K, v: FormValue[K]) => setValue((prev) => ({ ...prev, [key]: v }));
  const toggle = (ref: string, on: boolean) => set("sourceNeedRefs", on ? [...value.sourceNeedRefs, ref].sort() : value.sourceNeedRefs.filter((r) => r !== ref));

  return (
    <form
      className="rounded-lg border border-line p-5"
      data-testid="source-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(value);
      }}
    >
      <h3 className="font-medium text-ink">{title}</h3>
      {note && <p className="mt-2 rounded-md bg-attention-50 px-3 py-2 text-sm text-attention-700">{note}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Titel" wide>
          <input className={inputClass} name="title" value={value.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Soort bron">
          <select className={inputClass} name="sourceType" value={value.sourceType} onChange={(e) => set("sourceType", e.target.value as SourceKind)}>
            {SOURCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {SOURCE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Datum (JJJJ, JJJJ-MM of JJJJ-MM-DD, optioneel)">
          <input className={inputClass} name="publicationDate" value={value.publicationDate} onChange={(e) => set("publicationDate", e.target.value)} />
        </Field>
        <Field label="Auteur (optioneel)">
          <input className={inputClass} name="author" value={value.author} onChange={(e) => set("author", e.target.value)} />
        </Field>
        <Field label="Organisatie / uitgever (optioneel)">
          <input className={inputClass} name="publisher" value={value.publisher} onChange={(e) => set("publisher", e.target.value)} />
        </Field>
        <Field label="URL (optioneel)" wide>
          <input className={inputClass} name="url" value={value.url} onChange={(e) => set("url", e.target.value)} />
        </Field>
        <Field label="Relevante inhoud: de passage of gecontroleerde notitie waarop de Bron-inhoud mag steunen" wide>
          <textarea className={`${inputClass} min-h-36`} name="relevantContent" value={value.relevantContent} onChange={(e) => set("relevantContent", e.target.value)} />
        </Field>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-muted">Voor welke kennisbehoefte(n)?</legend>
        <div className="mt-2 space-y-1.5">
          {needs.map((n) => (
            <label key={n.id} className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" className="mt-1" name={`need-${n.id}`} checked={value.sourceNeedRefs.includes(n.id)} onChange={(e) => toggle(n.id, e.target.checked)} />
              <span>
                <span className="font-medium">{n.id}</span> · {n.question}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 text-xs text-muted">Een nieuwe of gecorrigeerde bron telt pas mee nadat je hem hebt gecontroleerd en gevalideerd.</p>
      <ErrorView error={error} />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          Annuleren
        </Button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-petrol-700 px-4 text-sm font-medium text-white transition-colors hover:bg-petrol-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Opslaan…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
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
