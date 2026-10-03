import type { Metadata } from "next";
import { NewTrainingForm } from "@/components/studio/NewTrainingForm";
import { PageHeader } from "@/components/studio/PageHeader";
import { METHODOLOGY_STEPS } from "@/knowledge";
import { parseInputKind } from "@/modules/training-agent";

export const metadata: Metadata = { title: "Nieuwe training · Certum Studio" };

/** `?input=onderwerp|praktijkvraag|casus` selecteert vooraf een inputsoort. */
export default async function NewTrainingPage({ searchParams }: PageProps<"/trainings/new">) {
  const initialKind = parseInputKind((await searchParams).input);

  return (
    <>
      <PageHeader eyebrow="Nieuwe training" title="Waar wil je een training van maken?" />

      <NewTrainingForm key={initialKind ?? "geen"} initialKind={initialKind} />

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Elke training volgt de Certum-methodiek:{" "}
        <span className="text-ink">{METHODOLOGY_STEPS.map((s) => s.label).join(" → ")}</span>
      </p>
    </>
  );
}
