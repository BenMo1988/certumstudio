"use client";

import { useState, type ReactNode } from "react";
import { METHODOLOGY_STEPS } from "@/knowledge";
import { BC_ONLINE_BLOCK_CATALOG, PLANNABLE_BLOCK_IDS, getCatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import type { PlannedBlockAddition } from "@/modules/block-plan";
import type { BcOnlineBlockPlan, PlannedBlock } from "@/modules/block-plan/schema";
import { Button } from "./Button";
import { Icon } from "./Icon";
import type { ActResult } from "./review/ReviewWorkspace";

/** Wat de opleider per gepland blok mag corrigeren (zie `PlannedBlockEditSchema`). */
export interface PlannedBlockEditValue {
  catalogBlockId: PlannedBlock["catalogBlockId"];
  purpose: string;
  whyThisBlock: string;
  configurationIntent: { setting: string; intent: string }[];
}

interface BlockPlanReviewProps {
  blockPlan: BcOnlineBlockPlan;
  approved: boolean;
  revisionNo: number;
  manual: boolean;
  /** Human Block Plan Override: één blok corrigeren; de server maakt een nieuwe Block Plan-versie. */
  onSaveBlock: (plannedBlockId: string, edit: PlannedBlockEditValue) => Promise<ActResult>;
  onApprove: () => void;
  onBack: () => void;
  /** Na goedkeuring: Training Content maken (Block Content per blok). */
  onCreateContent: () => void;
  pending: boolean;
  /** Human Block Plan Override, toevoegen: een ontbrekend blok invoegen (nieuwe Block Plan-versie, geen AI). */
  onAddBlock?: (addition: PlannedBlockAddition) => Promise<ActResult>;
  /** Blokken die een opleider handmatig heeft toegevoegd (afgeleid). */
  humanAddedBlockIds?: string[];
}

/**
 * Review van het BC Online Block Plan: per Certum-fase de voorgestelde bestaande blokken. De opleider kan per blok het
 * uitvoeringsmiddel en de intenties corrigeren (Human Block Plan Override); fase, volgorde, leerdoel en routebeleid
 * blijven vast. Iedere opslag is een nieuwe versie die opnieuw goedgekeurd moet worden.
 */
export function BlockPlanReview({
  blockPlan,
  approved,
  revisionNo,
  manual,
  onSaveBlock,
  onApprove,
  onBack,
  onCreateContent,
  pending,
  onAddBlock,
  humanAddedBlockIds = [],
}: BlockPlanReviewProps) {
  const blocks = [...blockPlan.plannedBlocks].sort((a, b) => a.sequence - b.sequence);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="mt-10" data-testid="block-plan-review">
      <dl className="divide-y divide-line border-y border-line">
        <Fact label="Titel">{blockPlan.courseShell.title}</Fact>
        <Fact label="Versie">
          <span data-testid="block-plan-version">
            Versie {revisionNo}
            {manual ? " · handmatig aangepast" : ""}
          </span>
        </Fact>
        <Fact label="Status in BC Online">Concept</Fact>
        <Fact label="Geschatte tijdsduur">
          {blockPlan.courseShell.estimatedDurationMinutes ?? <span className="text-muted italic">Nog niet bepaald</span>}
        </Fact>
        <Fact label="SKJ-punten">
          <span className="text-muted italic" data-testid="skj">
            Niet ingevuld: alleen een daadwerkelijk geaccrediteerde waarde
          </span>
        </Fact>
        <Fact label="Vaste Start">{blockPlan.startIntent.explanationIntent}</Fact>
      </dl>

      <section className="mt-14" aria-labelledby="plan-heading">
        <h2 id="plan-heading" className="text-lg font-semibold tracking-tight text-ink">
          Voorgestelde BC Online-blokken per Certum-fase
        </h2>
        <p className="mt-1 text-sm text-muted">
          Uitvoeringsvoorstel met bestaande blokken. De Certum-fase is de didactische functie; het blok is het middel. Past
          een ander blok beter bij het kernmoment, corrigeer het dan zelf vóór je goedkeurt.
        </p>
        {notice && (
          <p role="status" className="mt-4 flex items-center gap-2 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-2.5 text-sm text-petrol-800" data-testid="block-plan-notice">
            <Icon name="check" className="size-4" />
            {notice}
          </p>
        )}
        <ol className="mt-5 space-y-3">
          {METHODOLOGY_STEPS.map((step) => {
            const phaseBlocks = blocks.filter((b) => b.certumPhase === step.id);
            return (
              <li key={step.id} className="rounded-lg border border-line p-5" data-testid={`phase-${step.id}`}>
                <p className="font-semibold text-ink">{step.label}</p>
                {phaseBlocks.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">Geen blok; zie capability gaps.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {phaseBlocks.map((block) =>
                      editing === block.id ? (
                        <li key={block.id} className="border-l-2 border-petrol-600 pl-3">
                          <PlannedBlockForm
                            block={block}
                            approved={approved}
                            pending={pending}
                            onCancel={() => setEditing(null)}
                            onSave={async (edit) => {
                              const result = await onSaveBlock(block.id, edit);
                              if (result.ok) {
                                setEditing(null);
                                setNotice(`Blok ${block.sequence} aangepast: nieuwe Block Plan-versie. Keur het plan opnieuw goed.`);
                              }
                              return result;
                            }}
                          />
                        </li>
                      ) : (
                      <li key={block.id} className="border-l-2 border-petrol-100 pl-3" data-block={block.catalogBlockId} data-testid={`plan-${block.id}`}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-petrol-700">
                            {block.sequence}. {getCatalogBlock(block.catalogBlockId)?.visibleName ?? block.catalogBlockId}
                            {humanAddedBlockIds.includes(block.id) && (
                              <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-xs font-normal text-muted" data-testid={`human-added-${block.id}`}>
                                Handmatig toegevoegd
                              </span>
                            )}
                          </p>
                          <button
                            type="button"
                            className="text-xs font-medium text-petrol-700 underline-offset-2 hover:underline disabled:opacity-40"
                            disabled={pending || editing !== null || adding}
                            onClick={() => {
                              setNotice(null);
                              setEditing(block.id);
                            }}
                          >
                            Bewerken
                          </button>
                        </div>
                        <p className="mt-0.5 text-sm text-ink">{block.purpose}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          <span className="font-medium">Waarom: </span>
                          {block.whyThisBlock}
                        </p>
                        {block.configurationIntent.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted">
                            <span className="font-medium">Configuratie-intentie: </span>
                            {block.configurationIntent.map((c) => `${c.setting}: ${c.intent}`).join(" · ")}
                          </p>
                        )}
                      </li>
                      ),
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        {onAddBlock &&
          (adding ? (
            <div className="mt-5 rounded-lg border border-petrol-100 p-5">
              <AddBlockForm
                blocks={blocks}
                approved={approved}
                pending={pending}
                onCancel={() => setAdding(false)}
                onAdd={async (addition) => {
                  const result = await onAddBlock(addition);
                  if (result.ok) {
                    setAdding(false);
                    setNotice("Blok toegevoegd: nieuwe Block Plan-versie. Keur het plan opnieuw goed.");
                  }
                  return result;
                }}
              />
            </div>
          ) : (
            <div className="mt-5">
              <Button
                variant="secondary"
                disabled={pending || editing !== null}
                onClick={() => {
                  setNotice(null);
                  setAdding(true);
                }}
              >
                Blok toevoegen
              </Button>
            </div>
          ))}
      </section>

      <section className="mt-10" aria-labelledby="gaps-heading" data-testid="capability-gaps">
        <h2 id="gaps-heading" className="text-lg font-semibold tracking-tight text-ink">
          Capability gaps
        </h2>
        {blockPlan.capabilityGaps.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Geen: alles kan met bestaande BC Online-blokken.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {blockPlan.capabilityGaps.map((gap, i) => (
              <li key={i} className="rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-sm">
                <p className="font-semibold text-attention-700">{gap.need}</p>
                <p className="mt-0.5 text-ink">{gap.whyNeeded}</p>
                {gap.workaround && (
                  <>
                    <p className="mt-0.5 text-ink" data-workaround={gap.workaround.type}>
                      <span className="font-medium">Beperkt alternatief (het gat blijft bestaan): </span>
                      {gap.workaround.description}
                    </p>
                    <p className="mt-0.5 text-ink">
                      <span className="font-medium">Beperking: </span>
                      {gap.workaround.limitation}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {approved && (
        <p role="status" className="mt-8 flex items-start gap-2.5 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-3 text-sm text-petrol-800">
          <Icon name="check" className="mt-px size-4 shrink-0" />
          <span>
            Block Plan goedgekeurd. Je kunt nu de inhoud per blok laten maken. Het aanmaken van een concepttraining in BC
            Online volgt later, zodra de koppeling (adapter) met BC Online bestaat.
          </span>
        </p>
      )}

      <div className="mt-10 flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={onBack}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar Blueprint
        </Button>
        {approved ? (
          <Button onClick={onCreateContent} disabled={pending}>
            {pending ? "Inhoud wordt gemaakt…" : "Training Content maken"}
            {!pending && <Icon name="arrowRight" className="size-4" />}
          </Button>
        ) : (
          <Button onClick={onApprove}>Block Plan goedkeuren</Button>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petrol-600";

/** Bewerken van één gepland blok: bloktype uit de catalogus, doel, motivering en configuratie-intenties. */
function PlannedBlockForm({
  block,
  approved,
  pending,
  onCancel,
  onSave,
}: {
  block: PlannedBlock;
  approved: boolean;
  pending: boolean;
  onCancel: () => void;
  onSave: (edit: PlannedBlockEditValue) => Promise<ActResult>;
}) {
  const [value, setValue] = useState<PlannedBlockEditValue>({
    catalogBlockId: block.catalogBlockId,
    purpose: block.purpose,
    whyThisBlock: block.whyThisBlock,
    configurationIntent: block.configurationIntent.map((c) => ({ ...c })),
  });
  const [error, setError] = useState<{ message: string; issues?: string[] } | null>(null);
  const changedType = value.catalogBlockId !== block.catalogBlockId;
  const options = BC_ONLINE_BLOCK_CATALOG.filter((c) => (PLANNABLE_BLOCK_IDS as readonly string[]).includes(c.certumCatalogId));

  return (
    <form
      className="space-y-4 py-2"
      data-testid="planned-block-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const result = await onSave(value);
        if (!result.ok) setError(result);
      }}
    >
      <p className="text-sm font-medium text-ink">
        Blok {block.sequence} corrigeren
        <span className="font-normal text-muted"> · fase en volgorde blijven gelijk</span>
      </p>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Bloktype (BC Online)</span>
        <select
          className={inputClass}
          name="catalogBlockId"
          value={value.catalogBlockId}
          onChange={(e) => setValue({ ...value, catalogBlockId: e.target.value as PlannedBlock["catalogBlockId"] })}
        >
          {options.map((c) => (
            <option key={c.certumCatalogId} value={c.certumCatalogId}>
              {c.visibleName}
            </option>
          ))}
        </select>
      </label>
      {changedType && (
        <p className="rounded-md bg-attention-50 px-3 py-2 text-sm text-attention-700" data-testid="type-changed-hint">
          Je wijzigt het bloktype. Pas het doel, de motivering en de configuratie-intenties aan het nieuwe blok aan.
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Doel van dit blok</span>
        <textarea className={`${inputClass} min-h-20`} name="purpose" value={value.purpose} onChange={(e) => setValue({ ...value, purpose: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Waarom dit blok</span>
        <textarea
          className={`${inputClass} min-h-20`}
          name="whyThisBlock"
          value={value.whyThisBlock}
          onChange={(e) => setValue({ ...value, whyThisBlock: e.target.value })}
        />
      </label>
      <IntentFields value={value.configurationIntent} onChange={(configurationIntent) => setValue((prev) => ({ ...prev, configurationIntent }))} />
      <p className="text-xs text-muted">
        Opslaan maakt een nieuwe versie van het Block Plan{approved ? "; de huidige goedkeuring geldt daar niet voor" : ""}. Keur het
        plan daarna (opnieuw) goed.
      </p>
      {error && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger">
          <p>{error.message}</p>
          {error.issues && error.issues.length > 0 && <p className="mt-1 text-xs">Controleer: {error.issues.join(", ")}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          Annuleren
        </Button>
        <button type="submit" disabled={pending} className={submitClass}>
          Opslaan als nieuwe versie
        </button>
      </div>
    </form>
  );
}

const submitClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-petrol-700 px-4 text-sm font-medium text-white transition-colors hover:bg-petrol-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol-600 disabled:cursor-not-allowed disabled:opacity-50";

/** Configuratie-intenties (instelling + intentie), maximaal 8; gedeeld door bewerken en toevoegen. */
function IntentFields({ value, onChange }: { value: { setting: string; intent: string }[]; onChange: (next: { setting: string; intent: string }[]) => void }) {
  const setIntent = (i: number, key: "setting" | "intent", v: string) => onChange(value.map((c, j) => (j === i ? { ...c, [key]: v } : c)));
  return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-muted">Configuratie-intenties (geen uiteindelijke inhoud)</legend>
        {value.map((c, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]" data-testid="config-row">
            <input className={inputClass} aria-label="Instelling" name={`setting-${i}`} value={c.setting} onChange={(e) => setIntent(i, "setting", e.target.value)} />
            <textarea
              className={`${inputClass} min-h-12`}
              aria-label="Intentie"
              name={`intent-${i}`}
              value={c.intent}
              onChange={(e) => setIntent(i, "intent", e.target.value)}
            />
            <button
              type="button"
              className="self-start rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              Verwijderen
            </button>
          </div>
        ))}
        {value.length < 8 && (
          <button
            type="button"
            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface"
            onClick={() => onChange([...value, { setting: "", intent: "" }])}
          >
            Intentie toevoegen
          </button>
        )}
      </fieldset>
  );
}

/**
 * Human Block Plan Override, toevoegen: positie, Certum-fase, bestaand catalogusblok, doel, motivering en
 * configuratie-intenties. Id en volgorde zet de server; minuten horen bij de blokinhoud (Editor), niet bij het plan.
 */
function AddBlockForm({
  blocks,
  approved,
  pending,
  onCancel,
  onAdd,
}: {
  blocks: PlannedBlock[];
  approved: boolean;
  pending: boolean;
  onCancel: () => void;
  onAdd: (addition: PlannedBlockAddition) => Promise<ActResult>;
}) {
  const options = BC_ONLINE_BLOCK_CATALOG.filter((c) => (PLANNABLE_BLOCK_IDS as readonly string[]).includes(c.certumCatalogId));
  const [placement, setPlacement] = useState("end");
  const [block, setBlock] = useState<PlannedBlockAddition["block"]>({
    certumPhase: METHODOLOGY_STEPS[METHODOLOGY_STEPS.length - 1].id as PlannedBlock["certumPhase"],
    catalogBlockId: options[0].certumCatalogId as PlannedBlock["catalogBlockId"],
    purpose: "",
    whyThisBlock: "",
    configurationIntent: [],
  });
  const [error, setError] = useState<{ message: string; issues?: string[] } | null>(null);
  const toPlacement = (v: string): PlannedBlockAddition["placement"] => {
    if (v === "end") return { position: "end" };
    const [position, anchorBlockId] = v.split(":") as ["before" | "after", string];
    return { position, anchorBlockId };
  };

  return (
    <form
      className="space-y-4"
      data-testid="add-block-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const result = await onAdd({ block, placement: toPlacement(placement) });
        if (!result.ok) setError(result);
      }}
    >
      <p className="text-sm font-medium text-ink">
        Blok toevoegen <span className="font-normal text-muted">· handmatige aanvulling van het plan, geen AI</span>
      </p>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Positie</span>
        <select className={inputClass} name="placement" value={placement} onChange={(e) => setPlacement(e.target.value)}>
          <option value="end">Aan het einde</option>
          {blocks.map((b) => (
            <option key={`before-${b.id}`} value={`before:${b.id}`}>
              Vóór blok {b.sequence} ({getCatalogBlock(b.catalogBlockId)?.visibleName ?? b.catalogBlockId})
            </option>
          ))}
          {blocks.map((b) => (
            <option key={`after-${b.id}`} value={`after:${b.id}`}>
              Na blok {b.sequence} ({getCatalogBlock(b.catalogBlockId)?.visibleName ?? b.catalogBlockId})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Certum-fase</span>
        <select
          className={inputClass}
          name="certumPhase"
          value={block.certumPhase}
          onChange={(e) => setBlock({ ...block, certumPhase: e.target.value as PlannedBlock["certumPhase"] })}
        >
          {METHODOLOGY_STEPS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Bloktype (BC Online)</span>
        <select
          className={inputClass}
          name="catalogBlockId"
          value={block.catalogBlockId}
          onChange={(e) => setBlock({ ...block, catalogBlockId: e.target.value as PlannedBlock["catalogBlockId"] })}
        >
          {options.map((c) => (
            <option key={c.certumCatalogId} value={c.certumCatalogId}>
              {c.visibleName}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Doel van dit blok</span>
        <textarea className={`${inputClass} min-h-20`} name="purpose" value={block.purpose} onChange={(e) => setBlock({ ...block, purpose: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Waarom dit blok</span>
        <textarea
          className={`${inputClass} min-h-20`}
          name="whyThisBlock"
          value={block.whyThisBlock}
          onChange={(e) => setBlock({ ...block, whyThisBlock: e.target.value })}
        />
      </label>
      <IntentFields value={block.configurationIntent} onChange={(configurationIntent) => setBlock((prev) => ({ ...prev, configurationIntent }))} />
      <p className="text-xs text-muted">
        Toevoegen maakt een nieuwe versie van het Block Plan{approved ? "; de huidige goedkeuring geldt daar niet voor" : ""}. De geschatte
        minuten stel je later per blok in bij de inhoud.
      </p>
      {error && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger">
          <p>{error.message}</p>
          {error.issues && error.issues.length > 0 && <p className="mt-1 text-xs">Controleer: {error.issues.join(", ")}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          Annuleren
        </Button>
        <button type="submit" disabled={pending || !block.purpose.trim() || !block.whyThisBlock.trim()} className={submitClass}>
          Toevoegen
        </button>
      </div>
    </form>
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
