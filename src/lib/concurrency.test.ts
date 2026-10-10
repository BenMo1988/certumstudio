import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("nooit meer dan de grens tegelijk, resultaten in de volgorde van de items", async () => {
    let running = 0;
    let peak = 0;
    const results = await mapWithConcurrency([5, 1, 4, 2, 3, 1, 2], 3, async (ms, i) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, ms));
      running--;
      return i;
    });
    expect(peak).toBe(3);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("werkt parallel: zes taken van 30 ms met grens 6 duren geen 180 ms", async () => {
    const started = Date.now();
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 6, () => new Promise((r) => setTimeout(r, 30)));
    expect(Date.now() - started).toBeLessThan(120);
  });

  it("lege lijst en grens 0 zijn veilig", async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
    expect(await mapWithConcurrency([1, 2], 0, async (x) => x * 2)).toEqual([2, 4]);
  });
});
