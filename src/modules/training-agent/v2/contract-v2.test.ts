import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import {
  MOCK_V2_BLOCKED,
  MOCK_V2_NEEDS_ADJUSTMENT,
  MOCK_V2_UNSUITABLE,
  mockV2Ready,
} from "@/services/analysis/mock/v2/mock-outcomes";
import { evalInput } from "../../../../test/eval-inputs";
import {
  AnalysisOutcomeSchema,
  AnalysisResponseSchema,
  BlockedOutcomeSchema,
  NeedsAdjustmentOutcomeSchema,
  ReadyOutcomeSchema,
  UnsuitableOutcomeSchema,
} from "./schema";
import { findEpistemicFlags } from "./epistemic";
import { getProceedBlockerV2 } from "./rules";
import { segmentInput } from "./segments";
import { checkOutcomeInvariants } from "./validation";
import type { ReadyOutcome } from "./types";

const SEGMENTS = segmentInput("Eerste zin over de situatie. Tweede zin met het keuzemoment. Derde zin.");
const ready = (): ReadyOutcome => mockV2Ready(SEGMENTS);
const keys = (schema: { shape: object }) => Object.keys(schema.shape).sort();
const OPEN_GATE = { preflightPassed: true, syntheticDataAttested: true };

describe("AnalysisOutcomeSchema: discriminated union", () => {
  it.each([
    ["blocked", MOCK_V2_BLOCKED],
    ["unsuitable", MOCK_V2_UNSUITABLE],
    ["needs_adjustment", MOCK_V2_NEEDS_ADJUSTMENT],
    ["ready", ready()],
  ])("accepteert een geldige %s-uitkomst en voldoet aan alle invariants", (_, outcome) => {
    expect(AnalysisOutcomeSchema.safeParse(outcome).success).toBe(true);
    expect(checkOutcomeInvariants(outcome, SEGMENTS)).toEqual([]);
  });

  it("legt per uitkomst exact de toegestane velden vast", () => {
    expect(keys(BlockedOutcomeSchema)).toEqual(["nextStep", "outcome", "privacyFindings", "reason"]);
    expect(keys(UnsuitableOutcomeSchema)).toEqual(["explanation", "outcome", "summary", "whatWouldMakeItSuitable"]);
    expect(keys(NeedsAdjustmentOutcomeSchema)).toEqual([
      "abstractionNotes",
      "decisionRelevantGaps",
      "outcome",
      "possibleScopings",
      "provisionalProfessionalCore",
      "rationale",
      "summary",
    ]);
    expect(keys(ReadyOutcomeSchema)).toEqual([
      "abstractionNotes",
      "decisionRelevantGaps",
      "outcome",
      "professionalDilemma",
      "proposedLearningGoal",
      "rationale",
      "sourceCandidates",
      "summary",
      "targetAudience",
      "trainingDirections",
    ]);
  });

  it.each([
    ["blocked met summary", { ...MOCK_V2_BLOCKED, summary: "x" }],
    ["blocked met trainingDirections", { ...MOCK_V2_BLOCKED, trainingDirections: ready().trainingDirections }],
    ["unsuitable met leerdoel", { ...MOCK_V2_UNSUITABLE, proposedLearningGoal: "x" }],
    ["unsuitable met richtingen", { ...MOCK_V2_UNSUITABLE, trainingDirections: ready().trainingDirections }],
    ["unsuitable met doelgroep", { ...MOCK_V2_UNSUITABLE, targetAudience: "x" }],
    ["needs_adjustment met richtingen", { ...MOCK_V2_NEEDS_ADJUSTMENT, trainingDirections: ready().trainingDirections }],
    ["ready met afbakeningen", { ...ready(), possibleScopings: MOCK_V2_NEEDS_ADJUSTMENT.possibleScopings }],
  ])("weigert verboden velden: %s", (_, outcome) => {
    expect(AnalysisOutcomeSchema.safeParse(outcome).success).toBe(false);
  });

  it("weigert een uitkomst waarvan outcome niet bij de velden past", () => {
    expect(AnalysisOutcomeSchema.safeParse({ ...MOCK_V2_UNSUITABLE, outcome: "ready" }).success).toBe(false);
    expect(AnalysisOutcomeSchema.safeParse({ ...ready(), outcome: "misschien" }).success).toBe(false);
  });

  it.each([
    ["4 richtingen", { ...ready(), trainingDirections: [1, 2, 3, 4].map((n) => ({ ...ready().trainingDirections[0], id: `r${n}` })) }],
    ["0 richtingen", { ...ready(), trainingDirections: [] }],
    ["4 gaps", { ...ready(), decisionRelevantGaps: Array(4).fill(ready().decisionRelevantGaps[0]) }],
    ["4 sourceCandidates", { ...ready(), sourceCandidates: Array(4).fill(ready().sourceCandidates[0]) }],
    ["4 afbakeningen", { ...MOCK_V2_NEEDS_ADJUSTMENT, possibleScopings: [1, 2, 3, 4].map((n) => ({ ...MOCK_V2_NEEDS_ADJUSTMENT.possibleScopings[0], id: `a${n}` })) }],
    ["0 afbakeningen", { ...MOCK_V2_NEEDS_ADJUSTMENT, possibleScopings: [] }],
    ["4 aanwijzingen bij unsuitable", { ...MOCK_V2_UNSUITABLE, whatWouldMakeItSuitable: ["a", "b", "c", "d"] }],
  ])("bewaakt minima en maxima: %s", (_, outcome) => {
    expect(AnalysisOutcomeSchema.safeParse(outcome).success).toBe(false);
  });

  it("weigert een ongeldig affects-gebied", () => {
    const gap = { ...MOCK_V2_NEEDS_ADJUSTMENT.decisionRelevantGaps[0], affects: "methodiek" };
    expect(AnalysisOutcomeSchema.safeParse({ ...MOCK_V2_NEEDS_ADJUSTMENT, decisionRelevantGaps: [gap] }).success).toBe(false);
  });

  it("structured output: object als root met result als anyOf over vier strikte varianten", () => {
    const format = zodOutputFormat(AnalysisResponseSchema) as unknown as {
      schema: { type: string; required: string[]; additionalProperties: boolean; properties: { result: { anyOf: { additionalProperties: boolean }[] } } };
    };
    expect(format.schema.type).toBe("object");
    expect(format.schema.required).toEqual(["result"]);
    expect(format.schema.additionalProperties).toBe(false);
    expect(format.schema.properties.result.anyOf).toHaveLength(4);
    expect(format.schema.properties.result.anyOf.every((v) => v.additionalProperties === false)).toBe(true);
  });
});

describe("segmentInput", () => {
  it("splitst in zinnen met stabiele ids", () => {
    expect(SEGMENTS).toEqual([
      { id: "S1", text: "Eerste zin over de situatie." },
      { id: "S2", text: "Tweede zin met het keuzemoment." },
      { id: "S3", text: "Derde zin." },
    ]);
  });

  it("houdt citaten en afkortingen bij elkaar", () => {
    const segments = segmentInput('Ze zegt: "Het gaat wel" en loopt weg. Hij spreekt met dhr. Jansen, bijv. over thuis.');
    expect(segments.map((s) => s.text)).toEqual([
      'Ze zegt: "Het gaat wel" en loopt weg.',
      "Hij spreekt met dhr. Jansen, bijv. over thuis.",
    ]);
  });

  it("een los onderwerp is één segment; alinea's worden apart gesegmenteerd", () => {
    expect(segmentInput("Omgaan met weerstand")).toEqual([{ id: "S1", text: "Omgaan met weerstand" }]);
    expect(segmentInput("Eerste alinea\n\nTweede alinea.").map((s) => s.id)).toEqual(["S1", "S2"]);
  });

  it("is deterministisch voor alle evalinputs en geeft geen lege segmenten", () => {
    for (const id of ["CA-001", "CA-002", "CA-003", "CA-005", "CA-006", "CA-007", "CA-008"]) {
      const a = segmentInput(evalInput(id));
      expect(a).toEqual(segmentInput(evalInput(id)));
      expect(a.length).toBeGreaterThan(0);
      expect(a.every((s) => s.text.trim().length > 0)).toBe(true);
    }
  });
});

describe("checkOutcomeInvariants: grounding via sourceRefs", () => {
  const withRefs = (refs: string[]): ReadyOutcome => {
    const outcome = ready();
    outcome.trainingDirections[0].sourceRefs = refs;
    return outcome;
  };

  it("accepteert bestaande refs", () => {
    expect(checkOutcomeInvariants(withRefs(["S1", "S3"]), SEGMENTS)).toEqual([]);
  });

  it("onbekende ref → onbekende-sourceref", () => {
    expect(checkOutcomeInvariants(withRefs(["S9"]), SEGMENTS)).toContain("onbekende-sourceref");
  });

  it("dubbele ref binnen een richting → dubbele-sourceref", () => {
    expect(checkOutcomeInvariants(withRefs(["S1", "S1"]), SEGMENTS)).toContain("dubbele-sourceref");
  });

  it("ontbrekende ref (lege lijst) → schemafout", () => {
    expect(checkOutcomeInvariants(withRefs([]), SEGMENTS)).toEqual(["schema"]);
  });

  it("refs worden tegen de werkelijk aangeleverde segmenten gecontroleerd, niet tegen een patroon", () => {
    expect(checkOutcomeInvariants(withRefs(["S3"]), SEGMENTS.slice(0, 2))).toContain("onbekende-sourceref");
  });

  it("dubbele richting-id's en lege teksten worden geweigerd", () => {
    const dup = ready();
    dup.trainingDirections[1].id = dup.trainingDirections[0].id;
    expect(checkOutcomeInvariants(dup, SEGMENTS)).toContain("dubbele-id");
    expect(checkOutcomeInvariants({ ...ready(), summary: " " }, SEGMENTS)).toContain("lege-tekst");
  });

  it("een provider-blocked die een direct herkenbare waarde herhaalt wordt geweigerd", () => {
    const leaking = { ...MOCK_V2_BLOCKED, reason: "De input bevat het nummer 06-00000000." };
    expect(checkOutcomeInvariants(leaking, SEGMENTS)).toContain("privacywaarde-herhaald");
  });
});

describe("findEpistemicFlags: controlled terms", () => {
  it("een gecontroleerd begrip buiten sourceCandidates en niet in de input wordt gemarkeerd", () => {
    const outcome = mockV2Ready(SEGMENTS, true); // dilemma noemt "zorgplicht"
    expect(findEpistemicFlags(outcome, "Een docent twijfelt of hij moet doorvragen.")).toEqual([
      { term: "zorgplicht", category: "zorgplicht", field: "professionalDilemma" },
    ]);
  });

  it("een begrip dat al in de input staat, mag normaal worden gebruikt", () => {
    const outcome = mockV2Ready(SEGMENTS, true);
    expect(findEpistemicFlags(outcome, "De school wijst op haar zorgplicht. De docent twijfelt.")).toEqual([]);
  });

  it("sourceCandidates tellen niet mee", () => {
    const outcome = ready(); // sourceCandidates bevat "meldcode"
    expect(outcome.sourceCandidates.map((c) => c.term)).toContain("meldcode");
    expect(findEpistemicFlags(outcome, "Een docent twijfelt.")).toEqual([]);
  });

  it("herkent vervoegingen en meerdere velden, ook in trainingsrichtingen", () => {
    const outcome = ready();
    outcome.summary = "Er speelt mogelijk een loyaliteitsconflict.";
    outcome.trainingDirections[0].focus = "De professional blijft meerzijdig partijdig.";
    const flags = findEpistemicFlags(outcome, "Twee ouders verwijten elkaar veel.");
    expect(flags.map((f) => [f.term, f.field])).toEqual([
      ["meerzijdige partijdigheid", "trainingDirections[0].focus"],
      ["loyaliteitsconflict", "summary"],
    ]);
  });

  it("geen valse treffer op gewone woorden", () => {
    const outcome = ready();
    outcome.summary = "De ouder zorgt goed voor het kind en wil de plicht van school bespreken.";
    expect(findEpistemicFlags(outcome, "Een ouder twijfelt.")).toEqual([]);
  });
});

describe("getProceedBlockerV2", () => {
  const r = ready();
  const firstId = r.trainingDirections[0].id;

  it("alleen ready met een bestaande richting en open poorten mag door", () => {
    expect(getProceedBlockerV2(r, firstId, OPEN_GATE)).toBeNull();
  });

  it.each([
    ["blocked", MOCK_V2_BLOCKED],
    ["unsuitable", MOCK_V2_UNSUITABLE],
    ["needs_adjustment", MOCK_V2_NEEDS_ADJUSTMENT],
  ])("%s mag nooit door, ook niet met een id", (_, outcome) => {
    expect(getProceedBlockerV2(outcome, firstId, OPEN_GATE)).toBe("not_ready");
  });

  it("vraagt om een (bestaande) richting", () => {
    expect(getProceedBlockerV2(r, null, OPEN_GATE)).toBe("geen-richting");
    expect(getProceedBlockerV2(r, "bestaat-niet", OPEN_GATE)).toBe("onbekende-richting");
  });

  it("preflight en synthetic-only-attestatie zijn voorwaarden, ook bij ready", () => {
    expect(getProceedBlockerV2(r, firstId, { preflightPassed: false, syntheticDataAttested: true })).toBe("preflight");
    expect(getProceedBlockerV2(r, firstId, { preflightPassed: true, syntheticDataAttested: false })).toBe("data_policy");
  });
});
