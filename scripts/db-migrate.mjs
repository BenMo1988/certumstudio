// Past de SQL-migraties uit `migrations/` toe op de database in DATABASE_URL (.env.local).
// Gebruik: npm run db:migrate
// Print alleen migratienamen en status; nooit de connection string of andere secrets.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
import { applyMigrations } from "../src/services/storage/migrations.ts";
import { createPostgresDb } from "../src/services/storage/postgres-db.ts";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL ontbreekt in .env.local.");
  process.exit(1);
}

const dir = join(process.cwd(), "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .map((name) => ({ name, sql: readFileSync(join(dir, name), "utf8") }));

const db = createPostgresDb(url);
try {
  for (const outcome of await applyMigrations(db, files)) console.log(`${outcome.name}: ${outcome.status}`);
} catch (error) {
  // Alleen de melding; driverfouten bevatten geen connection string, maar we tonen geen stack of details.
  console.error(`Migratie mislukt: ${error instanceof Error ? error.message : "onbekende fout"}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
