import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { TrainingSummary } from "@/services/storage/workspace";
import { StatusBadge } from "./StatusBadge";

/** Opgeslagen trainingen met hun afgeleide voortgang. */
export function TrainingList({ trainings }: { trainings: TrainingSummary[] }) {
  if (trainings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
        Nog geen trainingen.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line" data-testid="training-list">
      {trainings.map((training) => {
        const p = training.progress;
        return (
          <li key={training.id} data-training-code={training.code} data-stage={p.stage}>
            <Link
              href={`/trainings/${training.id}`}
              className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-5 py-4 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-petrol-600 sm:grid-cols-[1fr_14rem_11rem]"
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium text-muted tabular-nums">{training.code}</span>
                <span className="block truncate font-medium text-ink group-hover:text-petrol-700">{training.title}</span>
                {p.totalBlocks > 0 && p.storedBlocks > 0 && (
                  <span className="block text-xs text-muted">
                    {p.generatedBlocks}/{p.totalBlocks} blokken gereed · {p.approvedBlocks}/{p.totalBlocks} goedgekeurd
                  </span>
                )}
              </span>
              <span className="justify-self-end sm:justify-self-start">
                <StatusBadge label={p.label} tone={p.stage === "training_ready" ? "done" : p.stage === "intake_complete" ? "new" : "active"} />
              </span>
              <span className="col-span-2 text-sm whitespace-nowrap text-muted sm:col-span-1 sm:text-right">
                Bijgewerkt {formatDate(training.updatedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
