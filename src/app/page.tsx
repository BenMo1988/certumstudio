import { METHODOLOGY_STEPS } from "@/knowledge";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-medium text-petrol-600">Interne werkomgeving</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        Certum Studio
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        Hier ontwikkel je professionele trainingen en praktijksimulaties volgens
        de methodiek van Bureau Certum.
      </p>

      <section className="mt-14">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Methodiek
        </h2>
        <ol className="mt-4 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {METHODOLOGY_STEPS.map((step, index) => (
            <li key={step.id} className="bg-canvas p-4">
              <span className="text-xs tabular-nums text-petrol-600">
                {index + 1}
              </span>
              <p className="mt-1 font-medium text-ink">{step.label}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
