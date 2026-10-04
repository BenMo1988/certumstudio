import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DatabaseNotice } from "@/components/studio/DatabaseNotice";
import { TrainingWorkflow } from "@/components/studio/TrainingWorkflow";
import { METHODOLOGY_STEPS } from "@/knowledge";
import { StorageError, getDb } from "@/services/storage";
import { loadTrainingWorkspace } from "@/services/storage/workspace";

export const metadata: Metadata = { title: "Training · Certum Studio" };

/**
 * Eén opgeslagen training, hervatbaar. Alles komt uit Postgres; verversen of later heropenen toont exact dezelfde
 * stand. Geen client state als waarheid.
 */
export default async function TrainingPage({ params }: PageProps<"/trainings/[id]">) {
  await connection();
  const { id } = await params;
  let workspace;
  try {
    workspace = await loadTrainingWorkspace(getDb(), id);
  } catch (error) {
    if (error instanceof StorageError && error.code === "not_configured") return <DatabaseNotice />;
    throw error;
  }
  if (!workspace) notFound();

  return (
    <>
      <TrainingWorkflow key={workspace.training.id} initial={workspace} />
      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Elke training volgt de Certum-methodiek:{" "}
        <span className="text-ink">{METHODOLOGY_STEPS.map((s) => s.label).join(" → ")}</span>
      </p>
    </>
  );
}
