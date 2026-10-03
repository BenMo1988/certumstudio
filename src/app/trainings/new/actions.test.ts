import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPreflightText } from "@/modules/privacy";
import type { AnalysisRequestV2 } from "@/services/analysis/training-analysis-service-v2";
import { mockV2Ready } from "@/services/analysis/mock/v2/mock-outcomes";
import { evalInput } from "../../../../test/eval-inputs";

/*
 * Test op de Server Action zelf (de route die de browser aanroept), met een spion in plaats
 * van de echte analyse-service. Bewijst dat de server de poorten afdwingt, ongeacht de UI.
 */
const analyze = vi.fn(async ({ segments }: AnalysisRequestV2) => mockV2Ready(segments));
const getTrainingAnalysisService = vi.fn(() => ({ analyze }));

vi.mock("@/services/analysis", async () => {
  const errors = await import("@/services/analysis/errors");
  return { AnalysisError: errors.AnalysisError, getTrainingAnalysisService: () => getTrainingAnalysisService() };
});

const { analyzeInput } = await import("./actions");

const CASE_LIKE_TEXT =
  "Vorige week sprak ik een moeder die zich zorgen maakt over haar zoon. Hij komt steeds later thuis en zegt weinig.";

beforeEach(() => {
  analyze.mockClear();
  getTrainingAnalysisService.mockClear();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("analyzeInput (Server Action): synthetic_only", () => {
  it.each(["onderwerp", "praktijkvraag", "casus"])(
    "%s zonder attestatie wordt server-side geweigerd, ook als een browser de UI omzeilt",
    async (kind) => {
      const result = await analyzeInput(kind, CASE_LIKE_TEXT, {
        textHash: await hashPreflightText(CASE_LIKE_TEXT),
        acknowledgedFindingIds: [],
        syntheticDataAttested: false,
      });
      expect(result).toMatchObject({ status: "preflight", reason: "synthetic_data_attestation_required" });
      expect(getTrainingAnalysisService).not.toHaveBeenCalled();
      expect(analyze).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["geen bevestiging", undefined],
    ["oude veldnaam anonymizationAttested", { acknowledgedFindingIds: [], anonymizationAttested: true }],
    ["attestatie als string", { acknowledgedFindingIds: [], syntheticDataAttested: "true" }],
  ])("%s: geweigerd", async (_label, partial) => {
    const ack = partial && { textHash: await hashPreflightText(CASE_LIKE_TEXT), ...partial };
    const result = await analyzeInput("praktijkvraag", CASE_LIKE_TEXT, ack);
    expect(result).toMatchObject({ status: "preflight", reason: "synthetic_data_attestation_required" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("met geldige attestatie bij exact deze tekst: één analyse", async () => {
    const result = await analyzeInput("praktijkvraag", `  ${CASE_LIKE_TEXT}  `, {
      textHash: await hashPreflightText(CASE_LIKE_TEXT),
      acknowledgedFindingIds: [],
      syntheticDataAttested: true,
    });
    expect(result.status).toBe("analysis");
    expect(analyze).toHaveBeenCalledTimes(1);
  });
});

describe("analyzeInput (Server Action): privacypoort", () => {
  it("CA-004 bereikt de analyse-service nooit, bij geen enkele inputsoort", async () => {
    const text = evalInput("CA-004");
    for (const kind of ["onderwerp", "praktijkvraag", "casus"]) {
      const result = await analyzeInput(kind, text, {
        textHash: await hashPreflightText(text),
        acknowledgedFindingIds: [],
        syntheticDataAttested: true,
      });
      expect(result).toMatchObject({ status: "preflight", reason: "blocked" });
    }
    expect(getTrainingAnalysisService).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });
});
