"use client";

import type { ReactNode } from "react";
import type { FieldSpec } from "./block-fields";

/*
 * Bewerken en weergeven van blokinhoud op basis van de veldspecificatie per bloktype. Geen JSON: de opleider ziet
 * gewone velden. De structurele regels (opties min/max, geen gespreksdoel bij open keuze, bronblok read-only) zitten
 * in het formulier én worden server-side opnieuw gecontroleerd.
 */

type Value = Record<string, unknown>;

export interface FieldContext {
  /** Bij `open_choice` is een gespreksdoel met sleutelwoorden niet toegestaan. */
  routePolicy: "open_choice" | "prescribed_action";
  /** Leesbare naam van een gepland blok, bijv. "3. Reflectie · Open vraag". */
  blockLabel: (plannedBlockId: string) => string;
}

const inputClass =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petrol-600 disabled:bg-surface disabled:text-muted";
const smallButton = "rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface disabled:opacity-40";

function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-ink">{label}</p>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const asText = (v: unknown) => (typeof v === "string" ? v : "");

/** Eén veld bewerken. */
function FieldInput({ spec, value, onChange, all, ctx }: { spec: FieldSpec; value: unknown; onChange: (v: unknown) => void; all: Value; ctx: FieldContext }) {
  switch (spec.kind) {
    case "text":
    case "textarea": {
      const disabled = spec.key === "value" && all.condition === "heeft_geantwoord";
      const set = (text: string) => onChange(spec.nullable && text.trim() === "" ? null : text);
      return (
        <Labeled label={spec.label} hint={spec.hint}>
          {spec.kind === "text" ? (
            <input className={inputClass} value={asText(value)} disabled={disabled} onChange={(e) => set(e.target.value)} />
          ) : (
            <textarea className={`${inputClass} min-h-28`} value={asText(value)} onChange={(e) => set(e.target.value)} />
          )}
        </Labeled>
      );
    }
    case "select":
      return (
        <Labeled label={spec.label}>
          <select className={inputClass} value={asText(value)} onChange={(e) => onChange(e.target.value)}>
            {spec.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Labeled>
      );
    case "number":
      return (
        <Labeled label={spec.label} hint={spec.nullable ? "Leeg laten mag." : undefined}>
          <input
            className={`${inputClass} max-w-40`}
            type="number"
            min={spec.min}
            max={spec.max}
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? (spec.nullable ? null : undefined) : Number(e.target.value))}
          />
        </Labeled>
      );
    case "stringList":
      return <StringList label={spec.label} itemLabel={spec.itemLabel} min={spec.min} max={spec.max} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    case "correctOption": {
      const options = Array.isArray(all[spec.optionsKey]) ? (all[spec.optionsKey] as string[]) : [];
      return (
        <Labeled label={spec.label}>
          <select className={inputClass} value={typeof value === "number" ? String(value) : "0"} onChange={(e) => onChange(Number(e.target.value))}>
            {options.map((o, i) => (
              <option key={i} value={i}>
                {i + 1}. {o || "(leeg)"}
              </option>
            ))}
          </select>
        </Labeled>
      );
    }
    case "objectList": {
      const items = Array.isArray(value) ? (value as Value[]) : [];
      const update = (next: Value[]) => onChange(next);
      return (
        <Labeled label={spec.label}>
          <ol className="space-y-3">
            {items.map((item, i) => (
              <li key={i} className="space-y-3 rounded-md border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                    {spec.itemLabel} {i + 1}
                  </p>
                  <div className="flex gap-1.5">
                    <button type="button" className={smallButton} disabled={i === 0} onClick={() => update(move(items, i, -1))}>
                      Omhoog
                    </button>
                    <button type="button" className={smallButton} disabled={i === items.length - 1} onClick={() => update(move(items, i, 1))}>
                      Omlaag
                    </button>
                    <button type="button" className={smallButton} disabled={items.length <= spec.min} onClick={() => update(items.filter((_, j) => j !== i))}>
                      Verwijderen
                    </button>
                  </div>
                </div>
                {spec.fields.map((f) => (
                  <FieldInput key={f.key} spec={f} value={item[f.key]} all={item} ctx={ctx} onChange={(v) => update(items.map((it, j) => (j === i ? { ...it, [f.key]: v } : it)))} />
                ))}
              </li>
            ))}
          </ol>
          <button type="button" className={smallButton} disabled={items.length >= spec.max} onClick={() => update([...items, { ...spec.empty }])}>
            {spec.itemLabel} toevoegen
          </button>
        </Labeled>
      );
    }
    case "questions":
      return <QuestionsInput value={Array.isArray(value) ? (value as Value[]) : []} onChange={onChange} />;
    case "goal": {
      if (ctx.routePolicy === "open_choice") {
        return (
          <Labeled label={spec.label}>
            <p className="rounded-md bg-surface px-3 py-2 text-sm text-muted">
              Geen gespreksdoel: bij meerdere verdedigbare routes zou een sleutelwoorddoel één route afdwingen.
            </p>
          </Labeled>
        );
      }
      const goal = value as { keywords: string[]; messageOnGoal: string; instructionAfterGoal: string } | null;
      return (
        <Labeled label={spec.label}>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={goal !== null} onChange={(e) => onChange(e.target.checked ? { keywords: [""], messageOnGoal: "", instructionAfterGoal: "" } : null)} />
            Gespreksdoel met sleutelwoorden gebruiken
          </label>
          {goal && (
            <div className="space-y-3 rounded-md border border-line p-4">
              <StringList label="Sleutelwoorden" itemLabel="Sleutelwoord" min={1} max={8} value={goal.keywords} onChange={(k) => onChange({ ...goal, keywords: k })} />
              <Labeled label="Bericht aan de deelnemer bij doelbehaling">
                <textarea className={`${inputClass} min-h-20`} value={goal.messageOnGoal} onChange={(e) => onChange({ ...goal, messageOnGoal: e.target.value })} />
              </Labeled>
              <Labeled label="Instructie voor de AI na doelbehaling">
                <textarea className={`${inputClass} min-h-20`} value={goal.instructionAfterGoal} onChange={(e) => onChange({ ...goal, instructionAfterGoal: e.target.value })} />
              </Labeled>
            </div>
          )}
        </Labeled>
      );
    }
    case "readonlyBlock":
      return (
        <Labeled label={spec.label} hint="Vast: het eerdere vraagblok waarop de tekst reageert.">
          <p className="rounded-md bg-surface px-3 py-2 text-sm text-ink">{ctx.blockLabel(asText(value))}</p>
        </Labeled>
      );
  }
}

function move<T>(items: T[], i: number, delta: number): T[] {
  const next = [...items];
  const [item] = next.splice(i, 1);
  next.splice(i + delta, 0, item);
  return next;
}

function StringList({ label, itemLabel, min, max, value, onChange }: { label: string; itemLabel: string; min: number; max: number; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Labeled label={label}>
      <ol className="space-y-2">
        {value.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 text-right text-sm text-muted tabular-nums">{i + 1}.</span>
            <input className={inputClass} aria-label={`${itemLabel} ${i + 1}`} value={item} onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))} />
            <button type="button" className={smallButton} disabled={value.length <= min} onClick={() => onChange(value.filter((_, j) => j !== i))}>
              Verwijderen
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={smallButton} disabled={value.length >= max} onClick={() => onChange([...value, ""])}>
        {itemLabel} toevoegen
      </button>
    </Labeled>
  );
}

function QuestionsInput({ value, onChange }: { value: Value[]; onChange: (v: Value[]) => void }) {
  const set = (i: number, q: Value) => onChange(value.map((x, j) => (j === i ? q : x)));
  return (
    <Labeled label="Toetsvragen">
      <ol className="space-y-3">
        {value.map((q, i) => (
          <li key={i} className="space-y-3 rounded-md border border-line p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">Vraag {i + 1}</p>
              <button type="button" className={smallButton} disabled={value.length <= 1} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                Verwijderen
              </button>
            </div>
            <Labeled label="Soort vraag">
              <select
                className={inputClass}
                value={asText(q.type)}
                onChange={(e) =>
                  set(i, e.target.value === "ja_nee" ? { type: "ja_nee", question: q.question, correctAnswer: true } : { type: "meerkeuze", question: q.question, options: ["", ""], correctOptionIndex: 0 })
                }
              >
                <option value="meerkeuze">Meerkeuze</option>
                <option value="ja_nee">Ja/Nee</option>
              </select>
            </Labeled>
            <Labeled label="Vraag">
              <textarea className={`${inputClass} min-h-20`} value={asText(q.question)} onChange={(e) => set(i, { ...q, question: e.target.value })} />
            </Labeled>
            {q.type === "meerkeuze" ? (
              <>
                <StringList label="Opties" itemLabel="Optie" min={2} max={6} value={(q.options as string[]) ?? []} onChange={(o) => set(i, { ...q, options: o })} />
                <Labeled label="Juist antwoord">
                  <select className={inputClass} value={String(q.correctOptionIndex ?? 0)} onChange={(e) => set(i, { ...q, correctOptionIndex: Number(e.target.value) })}>
                    {((q.options as string[]) ?? []).map((o, j) => (
                      <option key={j} value={j}>
                        {j + 1}. {o || "(leeg)"}
                      </option>
                    ))}
                  </select>
                </Labeled>
              </>
            ) : (
              <Labeled label="Juist antwoord">
                <select className={inputClass} value={q.correctAnswer ? "ja" : "nee"} onChange={(e) => set(i, { ...q, correctAnswer: e.target.value === "ja" })}>
                  <option value="ja">Ja</option>
                  <option value="nee">Nee</option>
                </select>
              </Labeled>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className={smallButton} disabled={value.length >= 10} onClick={() => onChange([...value, { type: "ja_nee", question: "", correctAnswer: true }])}>
        Vraag toevoegen
      </button>
    </Labeled>
  );
}

export function BlockForm({ specs, value, onChange, ctx }: { specs: FieldSpec[]; value: Value; onChange: (v: Value) => void; ctx: FieldContext }) {
  return (
    <div className="space-y-5" data-testid="block-form">
      {specs.map((spec) => (
        <FieldInput
          key={spec.key}
          spec={spec}
          value={value[spec.key]}
          all={value}
          ctx={ctx}
          onChange={(v) => onChange(spec.key === "condition" && v === "heeft_geantwoord" ? { ...value, condition: v, value: null } : { ...value, [spec.key]: v })}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Weergave (alleen lezen)
// ---------------------------------------------------------------------------------------------------------------

function ReadValue({ spec, value, all, ctx }: { spec: FieldSpec; value: unknown; all: Value; ctx: FieldContext }): ReactNode {
  const empty = <span className="text-muted italic">Geen</span>;
  if (value === null || value === undefined || value === "") return empty;
  switch (spec.kind) {
    case "text":
    case "textarea":
    case "number":
      return <span className="whitespace-pre-line">{String(value)}</span>;
    case "select":
      return spec.options.find((o) => o.value === value)?.label ?? String(value);
    case "stringList":
      return (
        <ol className="list-decimal space-y-1 pl-5">
          {(value as string[]).map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ol>
      );
    case "correctOption": {
      const options = (all[spec.optionsKey] as string[]) ?? [];
      return `${Number(value) + 1}. ${options[Number(value)] ?? ""}`;
    }
    case "objectList":
      return (
        <ol className="space-y-2">
          {(value as Value[]).map((item, i) => (
            <li key={i} className="border-l-2 border-petrol-100 pl-3">
              {spec.fields.map((f) => (
                <p key={f.key} className="text-sm">
                  <span className="font-medium text-muted">{f.label}: </span>
                  <ReadValue spec={f} value={item[f.key]} all={item} ctx={ctx} />
                </p>
              ))}
            </li>
          ))}
        </ol>
      );
    case "questions":
      return (
        <ol className="list-decimal space-y-2 pl-5">
          {(value as Value[]).map((q, i) => (
            <li key={i}>
              {asText(q.question)}
              <span className="text-muted">
                {" "}
                · {q.type === "ja_nee" ? `juist: ${q.correctAnswer ? "Ja" : "Nee"}` : `opties: ${((q.options as string[]) ?? []).join(" / ")} · juist: ${Number(q.correctOptionIndex) + 1}`}
              </span>
            </li>
          ))}
        </ol>
      );
    case "goal": {
      const g = value as { keywords: string[]; messageOnGoal: string; instructionAfterGoal: string };
      return (
        <span>
          Sleutelwoorden: {g.keywords.join(", ")}. Bericht: {g.messageOnGoal}. Daarna: {g.instructionAfterGoal}
        </span>
      );
    }
    case "readonlyBlock":
      return ctx.blockLabel(asText(value));
  }
}

export function BlockView({ specs, value, ctx }: { specs: FieldSpec[]; value: Value; ctx: FieldContext }) {
  return (
    <dl className="divide-y divide-line rounded-lg border border-line px-5" data-testid="content-fields">
      {specs.map((spec) => (
        <div key={spec.key} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
          <dt className="text-sm font-medium text-muted">{spec.label}</dt>
          <dd className="text-[15px] leading-relaxed text-ink">
            {spec.kind === "goal" && value[spec.key] === null ? <span className="text-muted italic">Geen gespreksdoel</span> : <ReadValue spec={spec} value={value[spec.key]} all={value} ctx={ctx} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
