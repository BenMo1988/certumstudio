import { Icon } from "./Icon";

const STEPS = ["Invoer", "Analyse", "Training"] as const;

/** Vaste volgorde van een nieuwe training: Input → Analyse → (keuze) → Training. */
export function FlowSteps({ current }: { current: (typeof STEPS)[number] }) {
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol className="mb-10 flex items-center gap-3 text-sm" aria-label="Voortgang">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-3">
            {index > 0 && <span className="h-px w-6 bg-line sm:w-10" aria-hidden="true" />}
            <span
              className={`flex items-center gap-2 ${active ? "font-medium text-ink" : "text-muted"}`}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums ${
                  active
                    ? "bg-petrol-700 text-white"
                    : done
                      ? "bg-petrol-50 text-petrol-700"
                      : "border border-line text-muted"
                }`}
              >
                {done ? <Icon name="check" className="size-3.5" /> : index + 1}
              </span>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
