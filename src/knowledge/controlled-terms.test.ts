import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findEpistemicFlags, segmentInput, type ReadyOutcome } from "@/modules/training-agent/v2";
import { mockV2Ready } from "@/services/analysis/mock/v2/mock-outcomes";
import { evalInput } from "../../test/eval-inputs";
import { CONTROLLED_TERMS, controlledTermRegex } from "./controlled-terms";

/** Termen (weergavenaam) die in een tekst worden gevonden. */
const termsIn = (text: string) => CONTROLLED_TERMS.filter((t) => controlledTermRegex(t).test(text)).map((t) => t.term);

/** Ready-uitkomst met de gegeven zin als samenvatting; verder neutraal. */
function readyWithSummary(summary: string): ReadyOutcome {
  const outcome = mockV2Ready(segmentInput("Een professional twijfelt over een keuze."));
  outcome.summary = summary;
  return outcome;
}

const NEUTRAL_INPUT = "Een professional twijfelt over een keuze in een gesprek.";

describe("controlled terms: regressie op bekende valse treffers", () => {
  it.each([
    "Hij spreekt met gezag en rust.",
    "Het gesprek verloopt oplossingsgericht.",
    "Ze heeft een traumatische ervaring meegemaakt.",
  ])("neutrale zin geeft 0 flags: %s", (sentence) => {
    expect(termsIn(sentence)).toEqual([]);
    expect(findEpistemicFlags(readyWithSummary(sentence), NEUTRAL_INPUT)).toEqual([]);
  });

  it.each([
    ["Er is een conflict over het ouderlijk gezag.", "ouderlijk gezag"],
    ["De ouders hebben gezamenlijk gezag.", "ouderlijk gezag"],
    ["Er loopt een procedure over de gezagsregeling.", "ouderlijk gezag"],
    ["De vader is gezagsdrager.", "ouderlijk gezag"],
    ["De professional past oplossingsgericht werken toe.", "oplossingsgericht werken"],
    ["Een oplossingsgerichte benadering ligt voor de hand.", "oplossingsgericht werken"],
    ["Mogelijk speelt PTSS een rol.", "PTSS / traumatisering"],
    ["Het kind lijkt getraumatiseerd.", "PTSS / traumatisering"],
    ["Er is risico op traumatisering.", "PTSS / traumatisering"],
  ])("duidelijke juridische/methodische/klinische variant geeft wel een flag: %s", (sentence, term) => {
    expect(termsIn(sentence)).toContain(term);
    expect(findEpistemicFlags(readyWithSummary(sentence), NEUTRAL_INPUT).map((f) => f.term)).toContain(term);
  });

  it("een gecontroleerd begrip dat letterlijk in de input staat, geeft geen flag", () => {
    const input = "De ouders hebben ouderlijk gezag en er speelt mogelijk PTSS. De professional twijfelt.";
    const outcome = readyWithSummary("Er speelt een vraag over het ouderlijk gezag en mogelijk PTSS.");
    expect(findEpistemicFlags(outcome, input)).toEqual([]);
  });
});

describe("controlled terms: relevante v1-bevindingen blijven detecteerbaar", () => {
  /** Leest de sectie Output van het bevroren v1-runbestand van een case. */
  function v1Output(id: string): string {
    const dir = "evals/training-analysis/cases";
    const caseDir = readdirSync(dir).find((d) => d.startsWith(id + "-"))!;
    const run = readdirSync(`${dir}/${caseDir}/runs`).find((f) => f.includes("training-analysis-v1"))!;
    const md = readFileSync(`${dir}/${caseDir}/runs/${run}`, "utf8").replace(/\r\n/g, "\n");
    return md.split("## Output")[1].split("## Menselijke evaluatie")[0];
  }

  it("CA-001: meerzijdige partijdigheid, meldplicht en kindbescherming (niet in de input)", () => {
    const found = termsIn(v1Output("CA-001")).filter((t) => !termsIn(evalInput("CA-001")).includes(t));
    expect(found).toEqual(expect.arrayContaining(["meldplicht", "kindbescherming", "meerzijdige partijdigheid"]));
  });

  it("CA-005: zorgplicht (niet in de input)", () => {
    expect(termsIn(v1Output("CA-005"))).toContain("zorgplicht");
    expect(termsIn(evalInput("CA-005"))).not.toContain("zorgplicht");
  });

  it.each(["CA-002", "CA-003", "CA-004", "CA-006", "CA-007", "CA-008"])("%s: geen treffers in de v1-output", (id) => {
    expect(termsIn(v1Output(id))).toEqual([]);
  });
});
