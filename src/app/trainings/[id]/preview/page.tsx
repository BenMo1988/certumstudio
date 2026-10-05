import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DatabaseNotice } from "@/components/studio/DatabaseNotice";
import { ParticipantPreview } from "@/components/studio/preview/ParticipantPreview";
import { StorageError, getDb } from "@/services/storage";
import { loadPreview } from "../../preview/preview-runtime";

export const metadata: Metadata = { title: "Trainer preview · Certum Studio" };

/**
 * Participant Preview V1: een goedgekeurde training (Training gereed) als deelnemer doorlopen. Alleen de current
 * goedgekeurde stand uit de database; geen configuratie uit de browser. Is de training niet gereed, dan een blokkade.
 */
export default async function PreviewPage({ params }: PageProps<"/trainings/[id]/preview">) {
  await connection();
  const { id } = await params;
  let result;
  try {
    result = await loadPreview(getDb(), id);
  } catch (error) {
    if (error instanceof StorageError && error.code === "not_configured") return <DatabaseNotice />;
    throw error;
  }
  if (result.status === "not_found") notFound();

  if (result.status === "not_ready") {
    return (
      <div className="mx-auto max-w-2xl" data-testid="preview-blocked">
        <p className="mb-6 rounded-md border border-attention/30 bg-attention-50 px-4 py-2 text-sm font-medium text-attention-700">Trainer preview — niet voor deelnemers</p>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Preview niet beschikbaar</h1>
        <p className="mt-3 text-[15px] text-ink">
          {result.training.code} is nog niet gereed. Een preview kan alleen voor een training waarvan alle onderdelen in de
          huidige versie zijn goedgekeurd (Training gereed).
        </p>
        <p className="mt-6">
          <Link href={`/trainings/${result.training.id}`} className="text-sm text-petrol-700 underline underline-offset-2">
            Terug naar de training
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mx-auto mb-4 max-w-2xl">
        <Link href={`/trainings/${result.training.id}`} className="text-sm text-muted hover:text-petrol-700">
          ← Terug naar de Studio
        </Link>
      </p>
      <ParticipantPreview trainingId={result.training.id} code={result.training.code} preview={result.preview} />
    </>
  );
}
