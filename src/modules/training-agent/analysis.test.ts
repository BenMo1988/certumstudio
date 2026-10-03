import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import {
  MOCK_ANALYSIS_CASUS,
  MOCK_ANALYSIS_CASUS_BLOCKED,
  MOCK_ANALYSIS_ONDERWERP,
  MOCK_ANALYSIS_PRAKTIJKVRAAG,
  MOCK_ANALYSIS_UNSUITABLE,
} from "@/services/analysis/mock/mock-analyses";
import { InputAnalysisSchema } from "./analysis-schema";
import { getProceedBlocker, isAnalysisBlocked } from "./analysis-rules";
import { checkAnalysisInvariants } from "./analysis-validation";
import type { InputAnalysis } from "./types";

const valid = (): InputAnalysis => structuredClone(MOCK_ANALYSIS_PRAKTIJKVRAAG);

describe("InputAnalysisSchema", () => {
  it.each([
    ["onderwerp", MOCK_ANALYSIS_ONDERWERP],
    ["praktijkvraag", MOCK_ANALYSIS_PRAKTIJKVRAAG],
    ["casus", MOCK_ANALYSIS_CASUS],
    ["casus geblokkeerd", MOCK_ANALYSIS_CASUS_BLOCKED],
    ["ongeschikt", MOCK_ANALYSIS_UNSUITABLE],
  ])("accepteert mock %s en die voldoet aan alle domeinregels", (_, analysis) => {
    expect(InputAnalysisSchema.safeParse(analysis).success).toBe(true);
    expect(checkAnalysisInvariants(analysis)).toEqual([]);
  });

  it("weigert 0 en meer dan 3 trainingsrichtingen", () => {
    const none = { ...valid(), trainingDirections: [] };
    const direction = valid().trainingDirections[0];
    const four = { ...valid(), trainingDirections: [1, 2, 3, 4].map((n) => ({ ...direction, id: `r${n}` })) };
    expect(InputAnalysisSchema.safeParse(none).success).toBe(false);
    expect(InputAnalysisSchema.safeParse(four).success).toBe(false);
  });

  it("weigert onbekende verdicts en privacylevels", () => {
    const verdict = { ...valid(), suitability: { verdict: "misschien", explanation: "x" } };
    const privacy = { ...valid(), privacyAssessment: { level: "laag", description: null } };
    expect(InputAnalysisSchema.safeParse(verdict).success).toBe(false);
    expect(InputAnalysisSchema.safeParse(privacy).success).toBe(false);
  });

  it("weigert extra en ontbrekende velden", () => {
    const missing: Partial<InputAnalysis> = valid();
    delete missing.rationale;
    expect(InputAnalysisSchema.safeParse(missing).success).toBe(false);
    expect(InputAnalysisSchema.strict().safeParse({ ...valid(), extra: "x" }).success).toBe(false);
  });

  it("levert een structured-output-schema dat strikt is en alle velden verplicht stelt", () => {
    const format = zodOutputFormat(InputAnalysisSchema) as unknown as {
      type: string;
      schema: { additionalProperties: boolean; required: string[] };
    };
    expect(format.type).toBe("json_schema");
    expect(format.schema.additionalProperties).toBe(false);
    expect(format.schema.required).toEqual(Object.keys(InputAnalysisSchema.shape));
  });
});

describe("checkAnalysisInvariants", () => {
  it("meldt een schemafout voor willekeurige input", () => {
    expect(checkAnalysisInvariants({ foo: 1 })).toEqual(["schema"]);
  });

  it("meldt dubbele richting-id's", () => {
    const analysis = valid();
    analysis.trainingDirections = [analysis.trainingDirections[0], { ...analysis.trainingDirections[0] }];
    expect(checkAnalysisInvariants(analysis)).toContain("dubbele-richting-id");
  });

  it("meldt een privacybevinding zonder omschrijving", () => {
    const analysis = { ...valid(), privacyAssessment: { level: "blokkeren" as const, description: " " } };
    expect(checkAnalysisInvariants(analysis)).toContain("privacy-zonder-omschrijving");
  });

  it("meldt lege verplichte tekst", () => {
    expect(checkAnalysisInvariants({ ...valid(), professionalDilemma: "  " })).toContain("lege-tekst");
  });
});

describe("getProceedBlocker", () => {
  const firstId = (a: InputAnalysis) => a.trainingDirections[0].id;

  it("blokkeert bij privacy, ook als een richting gekozen is", () => {
    expect(getProceedBlocker(MOCK_ANALYSIS_CASUS_BLOCKED, firstId(MOCK_ANALYSIS_CASUS_BLOCKED))).toBe("privacy");
    expect(isAnalysisBlocked(MOCK_ANALYSIS_CASUS_BLOCKED)).toBe(true);
  });

  it("privacy weegt zwaarder dan ongeschiktheid", () => {
    const both: InputAnalysis = {
      ...MOCK_ANALYSIS_UNSUITABLE,
      privacyAssessment: { level: "blokkeren", description: "Bevat een naam." },
    };
    expect(getProceedBlocker(both, firstId(both))).toBe("privacy");
  });

  it("blokkeert bij ongeschikte input", () => {
    expect(getProceedBlocker(MOCK_ANALYSIS_UNSUITABLE, firstId(MOCK_ANALYSIS_UNSUITABLE))).toBe("ongeschikt");
  });

  it("vraagt om een (bestaande) richting", () => {
    expect(getProceedBlocker(MOCK_ANALYSIS_CASUS, null)).toBe("geen-richting");
    expect(getProceedBlocker(MOCK_ANALYSIS_CASUS, "bestaat-niet")).toBe("onbekende-richting");
  });

  it("laat door bij aandachtspunt en 'aanpassen' met gekozen richting", () => {
    expect(getProceedBlocker(MOCK_ANALYSIS_CASUS, firstId(MOCK_ANALYSIS_CASUS))).toBeNull();
    expect(getProceedBlocker(MOCK_ANALYSIS_ONDERWERP, firstId(MOCK_ANALYSIS_ONDERWERP))).toBeNull();
  });
});
