/**
 * Voert `fn` uit over alle items met hooguit `limit` taken tegelijk. Resultaten in de volgorde van de items. Een fout
 * in één taak stopt de andere niet (de aanroeper kiest per taak wat een fout betekent); er is geen automatische retry.
 */
export async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}
