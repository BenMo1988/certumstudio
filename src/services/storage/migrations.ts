/*
 * Versieerbare SQL-migraties uit `migrations/` (in Git). Iedere migratie wordt één keer toegepast, in een transactie,
 * en geregistreerd met een SHA-256-checksum in `schema_migrations`. Opnieuw draaien is veilig (al toegepast →
 * overslaan); een gewijzigd bestand dat al is toegepast is een fout (verifieerbaar).
 *
 * Bewust zonder imports buiten Node: dit bestand wordt ook direct door `scripts/db-migrate.mjs` geladen.
 */

export interface MigrationFile {
  name: string;
  sql: string;
}

interface MigrationDb {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Voert meerdere statements uit (DDL). */
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: MigrationDb) => Promise<T>): Promise<T>;
}

export type MigrationOutcome = { name: string; status: "applied" | "already_applied" };

async function sha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function applyMigrations(db: MigrationDb, files: MigrationFile[]): Promise<MigrationOutcome[]> {
  await db.exec(`create table if not exists schema_migrations (
    name text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`);
  const outcomes: MigrationOutcome[] = [];
  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    // Regeleinden normaliseren: Git kan op Windows CRLF uitchecken; de checksum moet per machine gelijk zijn.
    const checksum = await sha256(file.sql.replace(/\r\n/g, "\n"));
    const [existing] = await db.query<{ checksum: string }>("select checksum from schema_migrations where name = $1", [file.name]);
    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(`Migratie ${file.name} is al toegepast met een andere checksum; wijzig toegepaste migraties nooit.`);
      }
      outcomes.push({ name: file.name, status: "already_applied" });
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.exec(file.sql);
      await tx.query("insert into schema_migrations (name, checksum) values ($1, $2)", [file.name, checksum]);
    });
    outcomes.push({ name: file.name, status: "applied" });
  }
  return outcomes;
}
