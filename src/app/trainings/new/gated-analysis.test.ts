import { describe, expect, it, vi } from "vitest";
import { hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import type { AgentInput, InputAnalysis } from "@/modules/training-agent";
import {
  MOCK_ANALYSIS_CASUS,
  MOCK_ANALYSIS_CASUS_BLOCKED,
} from "@/services/analysis/mock/mock-analyses";
import { evalInput } from "../../../../test/eval-inputs";
import { runGatedAnalysis, type PreflightLogEntry } from "./gated-analysis";

/** Spion: telt of de service wordt aangemaakt en of analyze() wordt aangeroepen. */
function spyDeps(result: InputAnalysis = MOCK_ANALYSIS_CASUS) {
  const analyze = vi.fn<(input: AgentInput) => Promise<InputAnalysis>>(async () => structuredClone(result));
  const getService = vi.fn(() => ({ analyze }));
  const logs: PreflightLogEntry[] = [];
  return { deps: { getService, log: (e: PreflightLogEntry) => logs.push(e) }, analyze, getService, logs };
}

async function ackFor(text: string, ids: string[], syntheticDataAttested: boolean) {
  return { textHash: await hashPreflightText(text), acknowledgedFindingIds: ids, syntheticDataAttested };
}

/** Synthetisch voorbeeld van wat er bij een "echte casus" zou worden ingevoerd. Geen persoonsgegevens. */
const CASE_LIKE_TEXT =
  "Vorige week sprak ik een moeder die zich zorgen maakt over haar zoon. Hij komt steeds later thuis en zegt weinig. " +
  "Ik twijfel of ik de school moet inschakelen.";

describe("runGatedAnalysis: privacypoort", () => {
  it("CA-004 wordt lokaal geblokkeerd; de service wordt niet aangemaakt en niet aangeroepen", async () => {
    const text = evalInput("CA-004");
    const { deps, analyze, getService } = spyDeps();
    const allIds = runPrivacyPreflight(text).findings.map((f) => f.id);

    // Zelfs met "bevestiging" van alle bevindingen en de synthetische-data-attestatie blijft blocked blocked.
    const result = await runGatedAnalysis({ kind: "casus", text }, await ackFor(text, allIds, true), deps);

    expect(result).toMatchObject({ status: "preflight", reason: "blocked" });
    expect(getService).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it("CA-004 als praktijkvraag of onderwerp: ook geblokkeerd", async () => {
    const text = evalInput("CA-004");
    for (const kind of ["praktijkvraag", "onderwerp"] as const) {
      const { deps, analyze } = spyDeps();
      const result = await runGatedAnalysis({ kind, text }, await ackFor(text, [], true), deps);
      expect(result).toMatchObject({ status: "preflight", reason: "blocked" });
      expect(analyze).not.toHaveBeenCalled();
    }
  });

  it("review_required zonder bevestiging: geen provider-aanroep", async () => {
    const text = evalInput("PP-003");
    const { deps, analyze, getService } = spyDeps();
    const result = await runGatedAnalysis({ kind: "casus", text }, await ackFor(text, [], true), deps);
    expect(result).toMatchObject({ status: "preflight", reason: "review_required" });
    expect(getService).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it("bevestiging van een eerdere versie van de tekst is ongeldig: geen provider-aanroep", async () => {
    const original = evalInput("PP-003");
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
});

describe("runGatedAnalysis: data-policy synthetic_only (alle inputsoorten)", () => {
  it.each(["onderwerp", "praktijkvraag", "casus"] as const)(
    "%s zonder synthetische-data-attestatie: geweigerd, service niet aangemaakt",
    async (kind) => {
      const { deps, analyze, getService } = spyDeps();
      const result = await runGatedAnalysis(
        { kind, text: CASE_LIKE_TEXT },
        await ackFor(CASE_LIKE_TEXT, [], false),
        deps,
      );
      expect(result).toMatchObject({ status: "preflight", reason: "synthetic_data_attestation_required" });
      expect(getService).not.toHaveBeenCalled();
      expect(analyze).not.toHaveBeenCalled();
    },
  );

  it.each(["onderwerp", "praktijkvraag", "casus"] as const)(
    "%s zonder enige bevestiging (null): geweigerd",
    async (kind) => {
      const { deps, analyze } = spyDeps();
      const result = await runGatedAnalysis({ kind, text: CASE_LIKE_TEXT }, null, deps);
      expect(result).toMatchObject({ status: "preflight", reason: "synthetic_data_attestation_required" });
      expect(analyze).not.toHaveBeenCalled();
    },
  );

  it("attestatie bij een andere tekst telt niet: geweigerd", async () => {
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis(
      { kind: "praktijkvraag", text: CASE_LIKE_TEXT },
      await ackFor(CASE_LIKE_TEXT + " Aanvulling.", [], true),
      deps,
    );
    expect(result.status).toBe("preflight");
    expect(analyze).not.toHaveBeenCalled();
  });

  it("PP-001 (safe) zonder attestatie: geweigerd door de policy", async () => {
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis({ kind: "casus", text: evalInput("PP-001") }, null, deps);
    expect(result).toMatchObject({ status: "preflight", reason: "synthetic_data_attestation_required" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("een bevinding bevestigen zonder attestatie: geweigerd door de policy", async () => {
    const text = evalInput("PP-003");
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis(
      { kind: "casus", text },
      await ackFor(text, ["possible_person_name-1"], false),
      deps,
    );
    expect(result).toMatchObject({ status: "preflight", reason: "synthetic_data_attestation_required" });
    expect(analyze).not.toHaveBeenCalled();
  });
});

describe("runGatedAnalysis: geldige doorgang", () => {
  it.each(["onderwerp", "praktijkvraag", "casus"] as const)(
    "%s met attestatie bij exact deze tekst: precies één aanroep",
    async (kind) => {
      const { deps, analyze } = spyDeps();
      const result = await runGatedAnalysis(
        { kind, text: CASE_LIKE_TEXT },
        await ackFor(CASE_LIKE_TEXT, [], true),
        deps,
      );
      expect(result.status).toBe("analysis");
      expect(analyze).toHaveBeenCalledTimes(1);
      expect(analyze).toHaveBeenCalledWith({ kind, text: CASE_LIKE_TEXT });
    },
  );

  it("PP-003 met bevestiging van de naam en attestatie: door", async () => {
    const text = evalInput("PP-003");
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis(
      { kind: "casus", text },
      await ackFor(text, ["possible_person_name-1"], true),
      deps,
    );
    expect(result.status).toBe("analysis");
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("PP-002 (praktijkvraag) na bevestiging van de datum en attestatie: door", async () => {
    const text = evalInput("PP-002");
    const { deps, analyze } = spyDeps();
    const result = await runGatedAnalysis(
      { kind: "praktijkvraag", text },
      await ackFor(text, ["full_date-1"], true),
      deps,
    );
    expect(result.status).toBe("analysis");
    expect(analyze).toHaveBeenCalledTimes(1);
  });
});

describe("runGatedAnalysis: logging", () => {
  it("logt alleen metadata: geen tekst, waarden, posities of hashes; wel de policy", async () => {
    const text = evalInput("CA-004");
    const { deps, logs } = spyDeps();
    await runGatedAnalysis({ kind: "casus", text }, await ackFor(text, [], true), deps);

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      event: "certum.preflight",
      dataPolicy: "synthetic_only",
      status: "blocked",
      decision: "blocked",
    });
    const logged = JSON.stringify(logs);
    for (const secret of ["Noor", "Testpersoon", "14 maart 2012", "Voorbeeldstraat", "06-00000000", "Voorbeeldhof"]) {
      expect(logged).not.toContain(secret);
    }
    expect(logged).not.toContain(await hashPreflightText(text));
    expect(logged).not.toMatch(/"start"|"end"|"span"/);
  });

  it("logt de policy-weigering als beslissing", async () => {
    const { deps, logs } = spyDeps();
    await runGatedAnalysis({ kind: "onderwerp", text: CASE_LIKE_TEXT }, null, deps);
    expect(logs[0]).toMatchObject({
      decision: "synthetic_data_attestation_required",
      syntheticDataAttested: false,
    });
  });

  it("logt preflightMiss als de provider na een geslaagde preflight alsnog blokkeert", async () => {
    const text = evalInput("PP-001");
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
