import type { Metadata } from "next";
import { Button } from "@/components/studio/Button";
import { Icon } from "@/components/studio/Icon";
import { PageHeader } from "@/components/studio/PageHeader";
import { TrainingList } from "@/components/studio/TrainingList";
import { listTrainings } from "@/modules/trainings";

export const metadata: Metadata = { title: "Mijn trainingen · Certum Studio" };

export default async function TrainingsPage() {
  const trainings = await listTrainings();

  return (
    <>
      <PageHeader
        title="Mijn trainingen"
        description="Alle trainingsprojecten in Certum Studio."
        action={
          <Button href="/trainings/new">
            <Icon name="plus" className="size-4" />
            Nieuwe training
          </Button>
        }
      />

      <div className="mt-10">
        <TrainingList trainings={trainings} />
      </div>
    </>
  );
}
