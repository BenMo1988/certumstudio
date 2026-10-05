import { describe, expect, it } from "vitest";
import { createSingleFlight, feedbackView, isFeedbackComplete } from "./preview-state";

/* Step 17E: expliciete, handmatige retry na afgekapte feedback en nooit twee gelijktijdige runtime-calls. */

describe("feedbackweergave", () => {
  it("afgekapt is een eigen stand, niet de gewone 'Feedback ophalen'-stand, en rondt het blok niet af", () => {
    expect(feedbackView(undefined)).toBe("request");
    expect(feedbackView({ status: "truncated" })).toBe("truncated");
    expect(feedbackView({ status: "done", text: "x", usedContext: [] })).toBe("done");
    expect(isFeedbackComplete({ status: "truncated" })).toBe(false);
    expect(isFeedbackComplete(undefined)).toBe(false);
    expect(isFeedbackComplete({ status: "done", text: "x", usedContext: [] })).toBe(true);
  });
});

describe("single flight", () => {
  it("een tweede actie terwijl de eerste loopt, start geen tweede call", async () => {
    const run = createSingleFlight();
    let calls = 0;
    let release!: () => void;
    const task = () =>
      new Promise<void>((resolve) => {
        calls++;
        release = resolve;
      });
    const first = run(task);
    const second = run(task);
    expect(await second).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(calls).toBe(1);
    // Daarna kan een nieuwe, bewuste actie wel weer: geen automatische retry, wel een handmatige.
    const third = run(async () => {
      calls++;
    });
    expect(await third).toBe(true);
    expect(calls).toBe(2);
  });

  it("een mislukte call geeft de guard weer vrij", async () => {
    const run = createSingleFlight();
    await expect(run(async () => Promise.reject(new Error("fout")))).rejects.toThrow("fout");
    expect(await run(async () => {})).toBe(true);
  });
});
