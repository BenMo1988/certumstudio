"use client";

import { useState } from "react";
import { INPUT_KINDS, type AgentInputKind } from "@/modules/training-agent";
import { Button } from "./Button";
import { ChoiceCard } from "./ChoiceCard";
import { Icon, type IconName } from "./Icon";

const ICONS: Record<AgentInputKind, IconName> = {
  onderwerp: "topic",
  praktijkvraag: "question",
  casus: "case",
};

/**
 * Kies het startpunt en voer de input in. Slaat bewust nog niets op en
 * stuurt nog niets naar de agent.
 */
export function NewTrainingForm({ initialKind }: { initialKind?: AgentInputKind }) {
  const [kind, setKind] = useState<AgentInputKind | null>(initialKind ?? null);
  const [text, setText] = useState("");
  const selected = INPUT_KINDS.find((option) => option.kind === kind);

  return (
    <div className="mt-12">
      <fieldset>
        <legend className="sr-only">Startpunt kiezen</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {INPUT_KINDS.map((option) => (
            <ChoiceCard
              key={option.kind}
              name="input-kind"
              value={option.kind}
              icon={ICONS[option.kind]}
              title={option.label}
              description={option.description}
              checked={kind === option.kind}
              onSelect={(value) => setKind(value as AgentInputKind)}
            />
          ))}
        </div>
      </fieldset>

      {selected && (
        <section className="mt-12">
          <label htmlFor="training-input" className="block text-lg font-semibold tracking-tight text-ink">
            {selected.prompt}
          </label>

          {selected.notice && (
            <p className="mt-3 flex items-start gap-2.5 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-3 text-sm text-petrol-800">
              <Icon name="info" className="mt-px size-4 shrink-0" />
              {selected.notice}
            </p>
          )}

          <textarea
            id="training-input"
            rows={selected.kind === "onderwerp" ? 4 : 10}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-4 block w-full resize-y rounded-lg border border-line bg-canvas px-5 py-4 text-[15px] leading-relaxed text-ink focus:border-petrol-600/50 focus:outline-none"
          />

          <div className="mt-4 flex justify-end">
            <Button disabled={text.trim().length === 0}>
              Verder naar analyse
              <Icon name="arrowRight" className="size-4" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
