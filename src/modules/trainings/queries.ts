import { SAMPLE_TRAININGS } from "./sample-data";
import type { Training } from "./types";

/**
 * Trainingen, meest recent bijgewerkt eerst.
 *
 * Nu gevoed met voorbeelddata. Later vervangen door een aanroep naar de
 * opslagservice; de signatuur (async) blijft gelijk, zodat pagina's niet
 * hoeven te veranderen.
 */
export async function listTrainings(options?: { limit?: number }): Promise<Training[]> {
  const sorted = [...SAMPLE_TRAININGS].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return options?.limit ? sorted.slice(0, options.limit) : sorted;
}
