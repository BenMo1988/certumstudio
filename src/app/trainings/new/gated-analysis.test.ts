import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import type { AgentInput, InputAnalysis } from "@/modules/training-agent";
import {
  MOCK_ANALYSIS_CASUS,
  MOCK_ANALYSIS_CASUS_BLOCKED,
} from "@/services/analysis/mock/mock-analyses";
import { runGatedAnalysis, type PreflightLogEntry } from "./gated-analysis";

function evalInput(id: string): string {
  const dir = "evals/training-analysis/cases";
  const d = readdirSync(dir).find((x) => x.startsWith(id + "-"))!;
  const md = readFileSync(`${dir}/${d}/case.md`, "utf8").replace(/\r\n/g, "\n");
  return md.match(/```text\n([\s\S]*?)\n```/)![1];
}

/** Spion: telt of de service wordt aangemaakt en of analyze() wordt aangeroepen. */
function spyDeps(result: InputAnalysis = MOCK_ANALYSIS_CASUS) {
  const analyze = vi.fn<(input: AgentInput) => Promise<InputAnalysis>>(async () => structuredClone(result));
  const getService = vi.fn(() => ({ analyze }));
  const logs: PreflightLogEntry[] = [];
  return { deps: { getService, log: (e: PreflightLogEntry) => logs.push(e) }, analyze, getService, logs };
}

async function ackFor(text: string, ids: string[], attested: boolean) {
  return { textHash: await hashPreflightText(text), acknowledgedFindingIds: ids, anonymizationAttested: attested };
}

describe("runGatedAnalysis: blocked input bereikt de provider nooit", () => {
  it("CA-004 wordt lokaal geblokkeerd; de service wordt niet aangemaakt en niet aangeroepen", async () => {
    const text = evalInput("CA-004");
    const { deps, analyze, getService } = spyDeps();
    const allIds = runPrivacyPreflight(text).findings.map((f) => f.id);

    // Zelfs met "bevestiging" van alle bevindingen en attestatie blijft blocked blocked.
    const result = await runGatedAnalysis({ kind: "casus", text }, await ackFor(text, allIds, true), deps);

    expect(result).toMatchObject({ status: "preflight", reason: "blocked" });
    expect(getService).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it("review_required zonder bevestiging: geen provider-aanroep", async () => {
    const text = evalInput("CA-011");
    const { deps, analyze, getService } = spyDeps();
    const result = await runGatedAnalysis({ kind: "casus", text }, null, deps);
    expect(result).toMatchObject({ status: "preflight", reason: "review_required" });
    expect(getService).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it("review bevestigd maar casus zonder attestatie: geen provider-aanroep", async () => {
    const text = evalInput("CA-011");
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis(
      { kind: "casus", text },
      await ackFor(text, ["possible_person_name-1"], false),
      deps,
    );
    expect(result).toMatchObject({ status: "preflight", reason: "attestation_required" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("bevestiging van een eerdere versie van de tekst is ongeldig: geen provider-aanroep", async () => {
    const original = evalInput("CA-011");
    const changed = original.replace("broertje", "zusje");
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis(
      { kind: "casus", text: changed },
      await ackFor(original, ["possible_person_name-1"], true),
      deps,
    );
    expect(result).toMatchObject({ status: "preflight", reason: "stale_acknowledgement" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("CA-009 (safe) zonder attestatie: geen provider-aanroep", async () => {
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis({ kind: "casus", text: evalInput("CA-009") }, null, deps);
    expect(result).toMatchObject({ status: "preflight", reason: "attestation_required" });
    expect(analyze).not.toHaveBeenCalled();
  });
});

describe("runGatedAnalysis: geldige doorgang", () => {
  it("CA-011 met bevestiging en attestatie: precies één aanroep met exact de tekst", async () => {
    const text = evalInput("CA-011");
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis(
      { kind: "casus", text },
      await ackFor(text, ["possible_person_name-1"], true),
      deps,
    );
    expect(result.status).toBe("analysis");
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith({ kind: "casus", text });
  });

  it("CA-010 (praktijkvraag) na bevestiging van de datum: door, zonder attestatie", async () => {
    const text = evalInput("CA-010");
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis(
      { kind: "praktijkvraag", text },
      await ackFor(text, ["full_date-1"], false),
      deps,
    );
    expect(result.status).toBe("analysis");
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("onderwerp zonder bevindingen gaat direct door", async () => {
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis({ kind: "onderwerp", text: "Omgaan met weerstand" }, null, deps);
    expect(result.status).toBe("analysis");
    expect(analyze).toHaveBeenCalledTimes(1);
  });
});

describe("runGatedAnalysis: logging", () => {
  it("logt alleen metadata: geen tekst, waarden, posities of hashes", async () => {
    const text = evalInput("CA-004");
    const { deps, logs } = spyDeps();
    await runGatedAnalysis({ kind: "casus", text }, await ackFor(text, [], true), deps);

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ event: "certum.preflight", status: "blocked", decision: "blocked" });
    const logged = JSON.stringify(logs);
    for (const secret of ["Noor", "Testpersoon", "14 maart 2012", "Voorbeeldstraat", "06-00000000", "Voorbeeldhof"]) {
      expect(logged).not.toContain(secret);
    }
    expect(logged).not.toContain(await hashPreflightText(text));
    expect(logged).not.toMatch(/"start"|"end"|"span"/);
  });

  it("logt preflightMiss als de provider na een geslaagde preflight alsnog blokkeert", async () => {
    const text = evalInput("CA-009");
    const { deps, logs } = spyDeps(MOCK_ANALYSIS_CASUS_BLOCKED);
    const result = await runGatedAnalysis({ kind: "casus", text }, await ackFor(text, [], true), deps);

    expect(result.status).toBe("analysis");
    expect(logs.map((l) => l.event)).toEqual(["certum.preflight", "certum.preflight_miss"]);
    expect(logs[1]).toEqual({
      event: "certum.preflight_miss",
      preflightMiss: true,
      preflightVersion: "privacy-preflight/v1",
      preflightStatus: "safe",
      inputKind: "casus",
    });
  });
});
