import type { Metadata } from "next";
import { ActionCard } from "@/components/studio/ActionCard";
import type { IconName } from "@/components/studio/Icon";
import { PageHeader } from "@/components/studio/PageHeader";
import { METHODOLOGY_STEPS } from "@/knowledge";
import { INPUT_KINDS, type AgentInputKind } from "@/modules/training-agent";

export const metadata: Metadata = { title: "Nieuwe training · Certum Studio" };

const ICONS: Record<AgentInputKind, IconName> = {
  onderwerp: "topic",
  praktijkvraag: "question",
  casus: "case",
};

export default function NewTrainingPage() {
  return (
    <>
      <PageHeader eyebrow="Nieuwe training" title="Waar wil je een training van maken?" />

      <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Startpunt kiezen">
        {INPUT_KINDS.map((option) => (
          <ActionCard
            key={option.kind}
            icon={ICONS[option.kind]}
            title={option.label}
            description={option.description}
          />
        ))}
      </section>

      <p className="mt-10 text-sm text-muted">
        Elke training volgt de Certum-methodiek:{" "}
        <span className="text-ink">{METHODOLOGY_STEPS.map((s) => s.label).join(" → ")}</span>
      </p>
    </>
  );
}
