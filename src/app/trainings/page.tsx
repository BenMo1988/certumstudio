import type { Metadata } from "next";
import { Button } from "@/components/studio/Button";
import { Icon } from "@/components/studio/Icon";
import { PageHeader } from "@/components/studio/PageHeader";
import { TrainingList } from "@/components/studio/TrainingList";
import { connection } from "next/server";
import { DatabaseNotice } from "@/components/studio/DatabaseNotice";
import { StorageError, getDb } from "@/services/storage";
import { listTrainingSummaries, type TrainingSummary } from "@/services/storage/workspace";

export const metadata: Metadata = { title: "Mijn trainingen · Certum Studio" };

export default async function TrainingsPage() {
  await connection();
  let trainings: TrainingSummary[] | null = null;
  try {
    trainings = await listTrainingSummaries(getDb());
  } catch (error) {
    if (!(error instanceof StorageError && error.code === "not_configured")) throw error;
  }

  return (
    <>
      <PageHeader
        title="Mijn trainingen"
        description="Alle opgeslagen trainingen. Open een training om verder te gaan waar je was."
        action={
          <Button href="/trainings/new">
            <Icon name="plus" className="size-4" />
            Nieuwe training
          </Button>
        }
      />

      <div className="mt-10">
        {trainings ? <TrainingList trainings={trainings} /> : <DatabaseNotice />}
      </div>
    </>
  );
}
