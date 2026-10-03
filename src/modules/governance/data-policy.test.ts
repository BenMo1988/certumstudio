import { describe, expect, it } from "vitest";
import { ACTIVE_DATA_POLICY, SYNTHETIC_DATA_ATTESTATION, evaluateDataPolicy } from "./data-policy";

describe("data-policy", () => {
  it("de actieve policy is synthetic_only", () => {
    expect(ACTIVE_DATA_POLICY).toBe("synthetic_only");
  });

  it("synthetic_only vereist een attestatie bij exact deze tekst", () => {
    expect(evaluateDataPolicy("synthetic_only", false)).toEqual({
      allowed: false,
      reason: "synthetic_data_attestation_required",
    });
    expect(evaluateDataPolicy("synthetic_only", true)).toEqual({ allowed: true });
  });

  it("de beoordeling krijgt geen inputsoort mee en kan daar dus niet van afhangen", () => {
    expect(evaluateDataPolicy.length).toBe(2);
  });

  it("de attestatietekst is exact de afgesproken formulering", () => {
    expect(SYNTHETIC_DATA_ATTESTATION).toBe(
      "Ik bevestig dat deze invoer uitsluitend fictieve/synthetische testdata bevat en geen gegevens uit een echte casus bevat.",
    );
  });
});
