import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import type { Db } from "@/services/storage/db";
import { applyMigrations, type MigrationFile } from "@/services/storage/migrations";

/**
 * Alleen voor tests: een echte PostgreSQL (PGlite, WASM, in-process) met exact de migraties uit `migrations/`.
 * Zelfde SQL, constraints en triggers als Supabase; geen netwerk en geen Docker nodig.
 */
export interface TestDb extends Db {
  pg: PGlite;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: TestDb) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

export function migrationFiles(): MigrationFile[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8") }));
}

type Runner = PGlite | Transaction;

function wrap(runner: Runner, pg: PGlite, inTransaction: boolean): TestDb {
  const db: TestDb = {
    pg,
    async query<T>(text: string, params: unknown[] = []) {
      return (await runner.query<T>(text, params)).rows;
    },
    async exec(sql: string) {
      await runner.exec(sql);
    },
    async transaction<T>(fn: (tx: TestDb) => Promise<T>): Promise<T> {
      if (inTransaction) return fn(db);
      return pg.transaction((tx) => fn(wrap(tx, pg, true)));
    },
    async close() {
      await pg.close();
    },
  };
  return db;
}

/** Nieuwe database (optioneel met een dataDir om sluiten en heropenen te testen), met alle migraties. */
export async function createTestDb(dataDir?: string): Promise<TestDb> {
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  const db = wrap(pg, pg, false);
  await applyMigrations(db, migrationFiles());
  return db;
}
