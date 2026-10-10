import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@/components/studio/Button";
import { DatabaseNotice } from "@/components/studio/DatabaseNotice";
import { Icon } from "@/components/studio/Icon";
import { PageHeader } from "@/components/studio/PageHeader";
import { formatDate } from "@/lib/format";
import { StorageError, getDb } from "@/services/storage";
import { listLearningLines, type LearningLineRecord } from "@/services/storage/learning-line-record";

export const metadata: Metadata = { title: "Leerlijnen · Certum Studio" };

export default async function LearningLinesPage() {
  await connection();
  let lines: LearningLineRecord[] | null = null;
  try {
    lines = await listLearningLines(getDb());
  } catch (error) {
    if (!(error instanceof StorageError && error.code === "not_configured")) throw error;
  }

  return (
    <>
      <PageHeader
        title="Leerlijnen"
        description="Een leerlijn van zes modules, ontworpen uit één prompt en geproduceerd met de bestaande Training Engine."
        action={
          <Button href="/learning-lines/new">
            <Icon name="plus" className="size-4" />
            Nieuwe leerlijn
          </Button>
        }
      />
      <div className="mt-10">
        {!lines ? (
          <DatabaseNotice />
        ) : lines.length === 0 ? (
          <p className="text-[15px] text-muted">Nog geen leerlijnen.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {lines.map((l) => (
              <li key={l.id}>
                <Link href={`/learning-lines/${l.id}`} className="flex flex-col gap-1 px-4 py-4 hover:bg-canvas sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="mr-2 text-sm font-medium text-petrol-700">{l.code}</span>
                    <span className="text-[15px] text-ink">{l.title}</span>
                  </span>
                  <span className="text-sm text-muted">{formatDate(l.updatedAt.toISOString())}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
