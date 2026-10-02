import type { TrainingStatus } from "@/modules/trainings";

const STATUS: Record<TrainingStatus, { label: string; dot: string }> = {
  concept: { label: "Concept", dot: "bg-subtle" },
  review: { label: "Review", dot: "bg-attention" },
  gereed: { label: "Gereed", dot: "bg-petrol-600" },
};

export function StatusBadge({ status }: { status: TrainingStatus }) {
  const { label, dot } = STATUS[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink">
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
