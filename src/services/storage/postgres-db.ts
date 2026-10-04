import postgres from "postgres";
import type { Db } from "./db";

/*
 * postgres.js tegen Supabase Postgres. Alleen server-side; de connection string komt uit `DATABASE_URL`
 * (.env.local) en wordt nooit gelogd.
 *
 * `prepare: false`: compatibel met de Supabase transaction pooler (poort 6543), die voor serverless hosting wordt
 * aangeraden omdat zulke omgevingen veel kortlevende verbindingen openen. Werkt ook met een directe verbinding.
 *
 * Bewust alleen type-only imports buiten `postgres`: `scripts/db-migrate.mjs` laadt dit bestand direct in Node.
 */

type Sql = postgres.Sql | postgres.TransactionSql;

export interface PostgresDb extends Db {
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: PostgresDb) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function wrap(sql: Sql, root: postgres.Sql | null): PostgresDb {
  const db: PostgresDb = {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as T[];
    },
    async exec(text: string) {
      await sql.unsafe(text);
    },
    async transaction<T>(fn: (tx: PostgresDb) => Promise<T>): Promise<T> {
      // Binnen een transactie: geen geneste transactie of savepoint.
      if (!root) return fn(db);
      return (await root.begin((tx) => fn(wrap(tx, null)))) as T;
    },
    async close() {
      if (root) await root.end({ timeout: 5 });
    },
  };
  return db;
}

export function createPostgresDb(connectionString: string): PostgresDb {
  const sql = postgres(connectionString, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    // Geen NOTICE-meldingen naar de console (die kunnen SQL-details bevatten).
    onnotice: () => {},
  });
  return wrap(sql, sql);
}
