import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DatabaseNotice } from "@/components/studio/DatabaseNotice";
import { LearningLineWorkspace } from "@/components/studio/learning-lines/LearningLineWorkspace";
import { StorageError, getDb } from "@/services/storage";
import { loadLearningLineView } from "../workflow/learning-lines";

export const metadata: Metadata = { title: "Leerlijn · Certum Studio" };

/** Eén leerlijn, hervatbaar: ontwerp, Gate 1, productie per module, pakketten en Gate 2. Alles uit Postgres. */
export default async function LearningLinePage({ params }: PageProps<"/learning-lines/[id]">) {
  await connection();
  const { id } = await params;
  let view;
  try {
    view = await loadLearningLineView(getDb(), id);
  } catch (error) {
    if (error instanceof StorageError && error.code === "not_configured") return <DatabaseNotice />;
    throw error;
  }
  if (!view) notFound();
  return <LearningLineWorkspace key={view.line.id} initial={view} />;
}
