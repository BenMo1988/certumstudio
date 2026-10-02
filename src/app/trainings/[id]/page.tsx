import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/studio/Icon";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { TrainingSection } from "@/components/studio/TrainingSection";
import { METHODOLOGY_STEPS } from "@/knowledge";
import { formatDate } from "@/lib/format";
import { getTraining } from "@/modules/trainings";

export async function generateMetadata({ params }: PageProps<"/trainings/[id]">): Promise<Metadata> {
  const training = await getTraining((await params).id);
  return { title: `${training?.title ?? "Training"} · Certum Studio` };
}

export default async function TrainingWorkspacePage({ params }: PageProps<"/trainings/[id]">) {
  const { id } = await params;
  const training = await getTraining(id);
  if (!training) notFound();

  const metadata = [
    { label: "Doelgroep", value: training.targetAudience },
    { label: "Leerdoel", value: training.learningGoal },
  ];

  return (
    <>
      <Link
        href="/trainings"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-petrol-700"
      >
        <Icon name="arrowLeft" className="size-4" />
        Mijn trainingen
      </Link>

      <header className="mt-6">
        <p className="text-sm font-medium text-petrol-600">Training</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-[2.125rem]">
          {training.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <StatusBadge status={training.status} />
          <span>Laatst gewijzigd {formatDate(training.updatedAt)}</span>
        </div>
      </header>

      <dl className="mt-10 grid gap-6 rounded-lg bg-surface px-6 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-10">
        {metadata.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</dt>
            <dd className={`mt-1.5 text-[15px] leading-relaxed ${value ? "text-ink" : "text-muted italic"}`}>
              {value ?? "Nog niet bepaald"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-16">
        <h2 className="sr-only">Opbouw volgens de Certum-methodiek</h2>
        <ol>
          {METHODOLOGY_STEPS.map((step, index) => (
            <TrainingSection
              key={step.id}
              step={step}
              number={index + 1}
              section={training.sections[step.id]}
              isLast={index === METHODOLOGY_STEPS.length - 1}
            />
          ))}
        </ol>
      </div>
    </>
  );
}
