import type { Db } from "./db";

/*
 * Inhoudsvrije meting van database-round-trips, voor tests en performance-proofs (niet voor productielogging).
 * Telt queries en DB-tijd, gegroepeerd per SQL-statement: alleen de statische querytekst uit de repository, nooit
 * parameters of resultaten.
 */

export interface QueryStats {
  count: number;
  ms: number;
  byStatement: Record<string, { count: number; ms: number }>;
}

/** Korte, stabiele vingerafdruk van een querytekst (eerste 80 tekens, witruimte genormaliseerd). */
function fingerprint(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function instrumentDb<D extends Db>(db: D): { db: D; stats: QueryStats; reset: () => void } {
  const stats: QueryStats = { count: 0, ms: 0, byStatement: {} };

  function wrap<T extends Db>(inner: T): T {
    return new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === "query") {
          return async (text: string, params?: unknown[]) => {
            const started = performance.now();
            try {
              return await target.query(text, params);
            } finally {
              const ms = performance.now() - started;
              const key = fingerprint(text);
              stats.count += 1;
              stats.ms += ms;
              const entry = (stats.byStatement[key] ??= { count: 0, ms: 0 });
              entry.count += 1;
              entry.ms += ms;
            }
          };
        }
        if (prop === "transaction") {
          return <R>(fn: (tx: Db) => Promise<R>) => target.transaction((tx) => fn(wrap(tx)));
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  return {
    db: wrap(db),
    stats,
    reset() {
      stats.count = 0;
      stats.ms = 0;
      stats.byStatement = {};
    },
  };
}

/** Een momentopname van de teller, afgerond, voor rapportage. */
export function summarize(stats: QueryStats, top = 8) {
  return {
    queries: stats.count,
    dbMs: Math.round(stats.ms),
    top: Object.entries(stats.byStatement)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, top)
      .map(([statement, s]) => ({ statement, count: s.count, ms: Math.round(s.ms) })),
  };
}
