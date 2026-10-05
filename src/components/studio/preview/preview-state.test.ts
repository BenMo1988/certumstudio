import { describe, expect, it } from "vitest";
import { applyChatResult, chatRequestFor, createSingleFlight, emptyChat, feedbackView, isFeedbackComplete } from "./preview-state";

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

describe("chat: afgekapt antwoord en dezelfde beurt opnieuw (Step 17E)", () => {
  const before = { ...emptyChat(), turns: [{ role: "participant" as const, text: "Eerste beurt." }, { role: "persona" as const, text: "Eerste antwoord." }] };
  const A = "Bericht A.";

  it("end_turn: zoals voorheen een afgeronde beurt deelnemer → persona", () => {
    const request = chatRequestFor(before, { kind: "send", message: ` ${A} ` })!;
    expect(request).toEqual({ history: before.turns, message: A });
    const after = applyChatResult(before, request.message, { status: "ok", reply: "Antwoord op A.", goalMessage: null });
    expect(after.turns.slice(2)).toEqual([{ role: "participant", text: A }, { role: "persona", text: "Antwoord op A." }]);
    expect(after.pendingRetry).toBeNull();
  });

  it("max_tokens: geen gedeeltelijk antwoord, de beurt blijft openstaan voor een expliciete retry", () => {
    const truncated = applyChatResult(before, A, { status: "rejected", reason: "output_truncated" });
    expect(truncated.turns).toEqual(before.turns);
    expect(truncated.pendingRetry).toBe(A);
  });

  it("retry: exact dezelfde geschiedenis en hetzelfde bericht; A komt niet dubbel in de geschiedenis", () => {
    const truncated = applyChatResult(before, A, { status: "rejected", reason: "output_truncated" });
    const retry = chatRequestFor(truncated, { kind: "retry" })!;
    expect(retry).toEqual({ history: before.turns, message: A });
    const done = applyChatResult(truncated, retry.message, { status: "ok", reply: "Antwoord op A.", goalMessage: null });
    expect(done.turns.filter((t) => t.text === A)).toHaveLength(1);
    expect(done.turns).toHaveLength(4);
    expect(done.pendingRetry).toBeNull();
  });

  it("zolang de beurt openstaat, kan geen nieuw bericht B worden verstuurd", () => {
    const truncated = applyChatResult(before, A, { status: "rejected", reason: "output_truncated" });
    expect(chatRequestFor(truncated, { kind: "send", message: "Bericht B." })).toBeNull();
  });

  it("geen retry zonder openstaande beurt, en niets na afronden", () => {
    expect(chatRequestFor(before, { kind: "retry" })).toBeNull();
    expect(chatRequestFor({ ...before, closed: true }, { kind: "send", message: A })).toBeNull();
  });

  it("andere weigeringen (bijv. privacy) laten het gesprek ongewijzigd en maken geen retry-stand", () => {
    expect(applyChatResult(before, A, { status: "rejected", reason: "privacy_blocked" })).toEqual(before);
  });
});
