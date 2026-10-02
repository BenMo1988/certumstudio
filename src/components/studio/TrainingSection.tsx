import type { MethodologyStep } from "@/knowledge";
import type { TrainingSection as TrainingSectionData } from "@/modules/trainings";
import { ContentBlocks } from "./ContentBlocks";

interface TrainingSectionProps {
  step: MethodologyStep;
  number: number;
  section?: TrainingSectionData;
  isLast: boolean;
}

/** Eén methodiekonderdeel van een training, als schakel in de verticale ruggengraat. */
export function TrainingSection({ step, number, section, isLast }: TrainingSectionProps) {
  const hasContent = section !== undefined && section.blocks.length > 0;

  return (
    <li className="relative grid grid-cols-[2.25rem_1fr] gap-x-5 sm:gap-x-8">
      <div className="flex flex-col items-center">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${
            hasContent
              ? "bg-petrol-700 text-white"
              : "border border-line bg-canvas text-muted"
          }`}
        >
          {number}
        </span>
        {!isLast && <span className="w-px flex-1 bg-line" aria-hidden="true" />}
      </div>

      <section aria-labelledby={`step-${step.id}`} className={isLast ? "pb-0" : "pb-12"}>
        <header className="flex items-start justify-between gap-4 pt-1.5">
          <div>
            <h2 id={`step-${step.id}`} className="text-lg font-semibold tracking-tight text-ink">
              {step.label}
            </h2>
            <p className="mt-0.5 text-sm text-muted">{step.description}</p>
          </div>
          <button
            type="button"
            disabled
            title="Bewerken is nog niet beschikbaar"
            className="shrink-0 rounded-md px-2.5 py-1 text-sm font-medium text-petrol-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Bewerken
          </button>
        </header>

        <div className="mt-5">
          {hasContent ? (
            <ContentBlocks blocks={section.blocks} />
          ) : (
            <p className="rounded-md border border-dashed border-line px-4 py-3 text-sm text-muted">
              Nog niet uitgewerkt.
            </p>
          )}
        </div>
      </section>
    </li>
  );
}
