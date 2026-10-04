import Link from "next/link";
import { ActionCard } from "@/components/studio/ActionCard";
import { PageHeader } from "@/components/studio/PageHeader";
import { TrainingList } from "@/components/studio/TrainingList";
import { connection } from "next/server";
import { DatabaseNotice } from "@/components/studio/DatabaseNotice";
import { StorageError, getDb } from "@/services/storage";
import { listTrainingSummaries, type TrainingSummary } from "@/services/storage/workspace";

export default async function DashboardPage() {
  await connection();
  let recent: TrainingSummary[] | null = null;
  try {
    recent = await listTrainingSummaries(getDb(), { limit: 3 });
  } catch (error) {
    if (!(error instanceof StorageError && error.code === "not_configured")) throw error;
  }

  return (
    <>
      <PageHeader
        title="Certum Studio"
        description="Van praktijk naar professionele ontwikkeling."
      />

      <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Acties">
        <ActionCard
          href="/trainings/new"
          icon="plus"
          title="Nieuwe training"
          description="Start vanuit een onderwerp, praktijkvraag of casus."
        />
        <ActionCard
          href="/trainings/new?input=casus"
          icon="case"
          title="Casus invoeren"
          description="Leg een fictieve of synthetische praktijksituatie vast."
        />
        <ActionCard
          href="/trainings"
          icon="trainings"
          title="Mijn trainingen"
          description="Open en beheer je trainingsprojecten."
        />
      </section>

      <section className="mt-16">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Recente trainingen</h2>
          <Link href="/trainings" className="text-sm font-medium text-petrol-600 hover:text-petrol-800">
            Alles bekijken
          </Link>
        </div>
        {recent ? <TrainingList trainings={recent} /> : <DatabaseNotice />}
      </section>
    </>
  );
}
