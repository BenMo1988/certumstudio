import { describe, expect, it, vi } from "vitest";
import { CLAUDE_ANALYSIS_DEFAULTS, readAnalysisConfig } from "./config";
import { AnalysisError } from "./errors";
import { createTrainingAnalysisService } from "./factory";
import { withAnalysisLogging, type AnalysisLogEntry } from "./logging";
import { MockTrainingAnalysisService } from "./mock/mock-training-analysis-service";

describe("readAnalysisConfig", () => {
  it("gebruikt mock als er niets is ingesteld", () => {
    expect(readAnalysisConfig({})).toEqual({ provider: "mock" });
    expect(readAnalysisConfig({ CERTUM_ANALYSIS_PROVIDER: "  " })).toEqual({ provider: "mock" });
  });

  it("kiest mock ook als er wel een sleutel staat", () => {
    expect(readAnalysisConfig({ CERTUM_ANALYSIS_PROVIDER: "mock", ANTHROPIC_API_KEY: "sk-test" })).toEqual({
      provider: "mock",
    });
  });

  it("kiest claude met sleutel en vaste modelinstellingen", () => {
    const config = readAnalysisConfig({ CERTUM_ANALYSIS_PROVIDER: "Claude", ANTHROPIC_API_KEY: " sk-test " });
    expect(config).toEqual({ provider: "claude", claude: { apiKey: "sk-test", ...CLAUDE_ANALYSIS_DEFAULTS } });
  });

  it("geeft een config-fout als claude gekozen is zonder ANTHROPIC_API_KEY", () => {
    for (const key of [undefined, "", "   "]) {
      const read = () => readAnalysisConfig({ CERTUM_ANALYSIS_PROVIDER: "claude", ANTHROPIC_API_KEY: key });
      expect(read).toThrow(AnalysisError);
      expect(read).toThrow(/ANTHROPIC_API_KEY ontbreekt/);
    }
  });

  it("geeft een config-fout bij een onbekende provider", () => {
    expect(() => readAnalysisConfig({ CERTUM_ANALYSIS_PROVIDER: "openai" })).toThrow(/Onbekende/);
  });
});

describe("createTrainingAnalysisService", () => {
  it("levert zonder configuratie een werkende mock", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const service = createTrainingAnalysisService({});
    const analysis = await service.analyze({ kind: "praktijkvraag", text: "Hoe reageer ik op een boze ouder?" });
    expect(analysis.suitability.verdict).toBe("geschikt");
  });

  it("maakt een claude-service zonder netwerkaanroep bij het aanmaken", () => {
    const service = createTrainingAnalysisService({ CERTUM_ANALYSIS_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" });
    expect(typeof service.analyze).toBe("function");
  });

  it("valt niet stil terug op mock als de claude-configuratie onvolledig is", () => {
    expect(() => createTrainingAnalysisService({ CERTUM_ANALYSIS_PROVIDER: "claude" })).toThrow(AnalysisError);
  });
});

describe("withAnalysisLogging", () => {
  const SECRET = "Jan Jansen, geboren 01-02-2015, Dorpsstraat 1";
  const CLAUDE_INFO = {
    provider: "claude",
    model: CLAUDE_ANALYSIS_DEFAULTS.model,
    effort: CLAUDE_ANALYSIS_DEFAULTS.effort,
  };

  it("logt bij succes provider, model, effort en promptversie, en geen analyse-inhoud", async () => {
    const entries: AnalysisLogEntry[] = [];
    const analysis = await new MockTrainingAnalysisService(0).analyze({ kind: "casus", text: "x" });
    const succeeding = { analyze: async () => analysis };
    const service = withAnalysisLogging(succeeding, CLAUDE_INFO, (e) => entries.push(e));
    await service.analyze({ kind: "casus", text: SECRET });

    expect(entries[0]).toMatchObject({
      event: "certum.analysis",
      provider: "claude",
      model: "claude-opus-5-5",
      effort: "medium",
      promptVersion: "training-analysis/v1",
      inputKind: "casus",
      outcome: "success",
    });
    expect(Object.keys(entries[0]).sort()).toEqual(
      [
        "event", "provider", "model", "effort", "promptVersion", "inputKind",
        "inputLength", "durationMs", "outcome", "privacyLevel", "verdict",
      ].sort(),
    );
    const logged = JSON.stringify(entries);
    for (const content of [SECRET, analysis.summary, analysis.professionalDilemma, analysis.proposedLearningGoal]) {
      expect(logged).not.toContain(content);
    }
  });

  it("logt alleen metadata, nooit de inputtekst of analyse-inhoud", async () => {
    const entries: AnalysisLogEntry[] = [];
    const service = withAnalysisLogging(new MockTrainingAnalysisService(0), { provider: "mock" }, (e) => entries.push(e));
    await service.analyze({ kind: "casus", text: `${SECRET} #blokkeren` });

    expect(entries).toHaveLength(1);
    const logged = JSON.stringify(entries);
    expect(logged).not.toContain("Jan");
    expect(logged).not.toContain("Dorpsstraat");
    expect(entries[0]).toMatchObject({
      provider: "mock",
      inputKind: "casus",
      outcome: "success",
      privacyLevel: "blokkeren",
    });
    expect(entries[0]).not.toHaveProperty("model");
    expect(entries[0]).not.toHaveProperty("effort");
  });

  it("logt het fouttype en gooit de fout door", async () => {
    const entries: AnalysisLogEntry[] = [];
    const failing = { analyze: async () => Promise.reject(new AnalysisError("rate-limit", "429")) };
    const service = withAnalysisLogging(failing, CLAUDE_INFO, (e) => entries.push(e));

    await expect(service.analyze({ kind: "casus", text: SECRET })).rejects.toThrow(AnalysisError);
    expect(entries[0]).toMatchObject({ ...CLAUDE_INFO, outcome: "error", errorKind: "rate-limit" });
    expect(JSON.stringify(entries)).not.toContain("Jan");
  });
});
