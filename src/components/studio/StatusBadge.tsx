type Tone = "new" | "active" | "done";

const DOT: Record<Tone, string> = {
  new: "bg-subtle",
  active: "bg-attention",
  done: "bg-petrol-600",
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink">
      <span className={`size-1.5 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      {label}
    </span>
  );
}
