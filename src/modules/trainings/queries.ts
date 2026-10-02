import { SAMPLE_TRAININGS } from "./sample-data";
import type { Training } from "./types";

/*
 * Nu gevoed met voorbeelddata. Later vervangen door aanroepen naar de
 * opslagservice; de signaturen (async) blijven gelijk, zodat pagina's niet
 * hoeven te veranderen.
 */

/** Trainingen, meest recent bijgewerkt eerst. */
export async function listTrainings(options?: { limit?: number }): Promise<Training[]> {
  const sorted = [...SAMPLE_TRAININGS].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return options?.limit ? sorted.slice(0, options.limit) : sorted;
}

/** Eén training op id, of `undefined` als die niet bestaat. */
export async function getTraining(id: string): Promise<Training | undefined> {
  return SAMPLE_TRAININGS.find((training) => training.id === id);
}
