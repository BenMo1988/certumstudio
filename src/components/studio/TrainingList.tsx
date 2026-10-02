import type { Training } from "@/modules/trainings";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function TrainingList({ trainings }: { trainings: Training[] }) {
  if (trainings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
        Nog geen trainingen.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {trainings.map((training) => (
        <li
          key={training.id}
          className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[1fr_7rem_11rem]"
        >
          <span className="font-medium text-ink">{training.title}</span>
          <span className="justify-self-end sm:justify-self-start">
            <StatusBadge status={training.status} />
          </span>
          <span className="col-span-2 text-sm whitespace-nowrap text-muted sm:col-span-1 sm:text-right">
            Bijgewerkt {formatDate(training.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
