/**
 * De enige databasevorm die de storage-laag kent: geparametriseerde SQL en transacties. Productie gebruikt
 * postgres.js tegen Supabase (postgres-db.ts); tests gebruiken PGlite (PostgreSQL in WASM) met dezelfde migraties.
 * Supabase- en driverdetails blijven hierachter.
 */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Voert `fn` uit in één transactie. Binnen een transactie is `transaction` een doorgeefluik (geen savepoints). */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}
