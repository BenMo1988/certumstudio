import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { runBlockPlanFlow, runBlueprintFlowV2, type BlueprintLogEntry } from "@/app/trainings/new/blueprint-flow";
import { TRAINING_BLUEPRINT_PROMPT_VERSION, TRAINING_BLUEPRINT_V1_INSTRUCTIONS } from "@/knowledge/prompts/training-blueprint-v1";
import {
  TRAINING_BLUEPRINT_V2_INSTRUCTIONS,
  TRAINING_BLUEPRINT_V2_PROMPT_VERSION,
} from "@/knowledge/prompts/training-blueprint-v2";
import { checkBlockPlanInvariants } from "@/modules/block-plan";
import { hashPreflightText } from "@/modules/privacy";
import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2";
import { TRAINING_BLUEPRINT_VERSION, TrainingBlueprintSchema, checkBlueprintInvariants } from "@/modules/training-blueprint";
import {
  TRAINING_BLUEPRINT_V2_VERSION,
  TrainingBlueprintV2Schema,
  buildBlueprintGenerationInputV2,
  checkBlueprintV2Invariants,
  composeTrainingBlueprintV2,
  type BlueprintV2Design,
  type TrainingBlueprintV2,
} from "@/modules/training-blueprint/v2";
import { MOCK_V2_BLOCKED, MOCK_V2_NEEDS_ADJUSTMENT, MOCK_V2_UNSUITABLE } from "@/services/analysis/mock/v2/mock-outcomes";
import fixture from "../../../../test/fixtures/v2-baseline-ready-analyses.json";
import type { ClaudeMessagesClient } from "../../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../../analysis/errors";
import { CLAUDE_BLUEPRINT_DEFAULTS } from "../config";
import { createTrainingBlueprintServiceV2 } from "../factory";
import { withBlueprintLogging, type BlueprintGenerationLogEntry } from "../logging";
import { MockBlockPlanService } from "../mock/mock-block-plan-service";
import type { BlueprintRequest, TrainingBlueprintServiceV2 } from "../services";
import { ClaudeTrainingBlueprintServiceV2 } from "./claude-training-blueprint-service-v2";
import { BlueprintV2DesignSchema } from "./design";
import { MockTrainingBlueprintServiceV2 } from "./mock-blueprint-service-v2";

type FixtureCase = { kind: "casus"; input: string; segments: SourceSegment[]; analysis: ReadyOutcome };
const CASES = fixture.cases as unknown as Record<string, FixtureCase>;

const BP = {
  "BP-001": { source: "CA-001", direction: "escalatie-begrenzen" },
  "BP-002": { source: "CA-006", direction: "grens-respecteren-en-werk-bespreken" },
  "BP-003": { source: "CA-008", direction: "volgorde-vervolgcontact" },
} as const;
type BpId = keyof typeof BP;

function requestFor(bp: BpId): BlueprintRequest {
  const c = CASES[BP[bp].source];
  return { input: { kind: c.kind, text: c.input }, analysis: c.analysis, segments: c.segments, selectedDirectionId: BP[bp].direction };
}

const contextFor = (bp: BpId) => {
  const r = requestFor(bp);
  return { analysis: r.analysis, segments: r.segments };
};

const mockBlueprint = (bp: BpId) => new MockTrainingBlueprintServiceV2().generate(requestFor(bp));

const TRUSTED = ["version", "targetAudience", "selectedDirectionId", "learningGoal", "professionalDilemma", "sourceRefs"] as const;

/** Wat Claude teruggeeft: het ontwerp, zonder vaste velden en zonder afgeleid routebeleid. */
function designOf(blueprint: TrainingBlueprintV2): BlueprintV2Design {
  const copy = structuredClone(blueprint) as unknown as Record<string, unknown> & {
    decisionPoint: Record<string, unknown>;
    learningArc: { actie: Record<string, unknown> };
  };
  for (const field of TRUSTED) delete copy[field];
  delete copy.decisionPoint.routePolicy;
  delete copy.learningArc.actie.routePolicy;
  return BlueprintV2DesignSchema.parse(copy);
}

/** Variant van een geldige mock-Blueprint, gecontroleerd met de V2-invarianten. */
async function violationsOf(bp: BpId, change: (b: TrainingBlueprintV2) => void) {
  const copy = structuredClone(await mockBlueprint(bp));
  change(copy);
  return checkBlueprintV2Invariants(copy, contextFor(bp));
}

type ParseResult = { stop_reason: string; stop_details?: { category: string | null } | null; parsed_output: unknown };

function claudeReturning(result: ParseResult | Error) {
  const parse = vi.fn<(request: unknown) => Promise<ParseResult>>(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeTrainingBlueprintServiceV2(client, CLAUDE_BLUEPRINT_DEFAULTS), parse };
}
const ok = (output: unknown): ParseResult => ({ stop_reason: "end_turn", parsed_output: output });

async function errorKindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof AnalysisError ? error.kind : "geen AnalysisError";
  }
  return "geen fout";
}

const ack = async (text: string) => ({ textHash: await hashPreflightText(text), acknowledgedFindingIds: [], syntheticDataAttested: true });

describe("Blueprint Contract V2: mockresultaten BP-001 t/m BP-003", () => {
  it.each(["BP-001", "BP-002", "BP-003"] as const)("%s: geldig, meerdere routes, open keuzemoment en open Actie", async (bp) => {
    const blueprint = await mockBlueprint(bp);
    expect(blueprint.version).toBe(TRAINING_BLUEPRINT_V2_VERSION);
    expect(blueprint.ambiguity).toBe("multiple_defensible_actions");
    expect(blueprint.decisionPoint.routePolicy).toBe("open_choice");
    expect(blueprint.learningArc.actie.routePolicy).toBe("open_choice");
    expect(blueprint.learningArc.feedback.evaluationBasis).not.toContain("voorgeschreven_handeling");
    expect(blueprint.learningArc.toets.evaluationBasis).not.toContain("voorgeschreven_handeling");
    expect(blueprint.learningArc.bron.sourceNeedRefs).toEqual(blueprint.sourceNeeds.map((n) => n.id));
    expect(checkBlueprintV2Invariants(blueprint, contextFor(bp))).toEqual([]);
  });

  it("BP-002: keuzemoment en Actie schrijven geen route voor (erkennen, terugbrengen, niet doorvragen)", async () => {
    const blueprint = await mockBlueprint("BP-002");
    for (const text of [blueprint.decisionPoint.task, blueprint.learningArc.actie.participantMust]) {
      expect(text).not.toMatch(/\berkent\b|\bbrengt .* terug\b|zonder door te vragen/i);
    }
    expect(blueprint.learningArc.actie.participantMust).toMatch(/niet één voorgeschreven route/);
  });
});

describe("ambiguïteit bestuurt de structuur", () => {
  it.each<[string, (b: TrainingBlueprintV2) => void, string]>([
    ["meerdere routes + voorgeschreven keuzemoment", (b) => (b.decisionPoint.routePolicy = "prescribed_action"), "routebeleid-inconsistent"],
    ["meerdere routes + voorgeschreven Actie", (b) => (b.learningArc.actie.routePolicy = "prescribed_action"), "routebeleid-inconsistent"],
    ["meerdere routes + Feedback beoordeelt de route", (b) => b.learningArc.feedback.evaluationBasis.push("voorgeschreven_handeling"), "voorgeschreven-route-bij-meerdere-routes"],
    ["meerdere routes + Toets schrijft een route voor", (b) => (b.learningArc.toets.evaluationBasis = ["voorgeschreven_handeling"]), "voorgeschreven-route-bij-meerdere-routes"],
    ["meerdere routes zonder behandeling in Feedback", (b) => (b.learningArc.feedback.multipleDefensibleHandling = null), "ambiguiteit-zonder-behandeling"],
  ])("%s → afgewezen", async (_, change, violation) => {
    expect(await violationsOf("BP-002", change)).toContain(violation);
  });

  it("single_best_action blijft geldig, met voorgeschreven handeling", async () => {
    const r = requestFor("BP-002");
    const direction = r.analysis.trainingDirections.find((d) => d.id === r.selectedDirectionId)!;
    const closed = { ...direction, focus: "De teamleider erkent de grens en bespreekt daarna de gemiste deadlines." };
    const request = { ...r, analysis: { ...r.analysis, trainingDirections: [closed] } };
    const blueprint = await new MockTrainingBlueprintServiceV2().generate(request);
    expect(blueprint.ambiguity).toBe("single_best_action");
    expect(blueprint.decisionPoint.routePolicy).toBe("prescribed_action");
    expect(blueprint.learningArc.actie.routePolicy).toBe("prescribed_action");
    expect(blueprint.learningArc.feedback.evaluationBasis).toContain("voorgeschreven_handeling");
    expect(checkBlueprintV2Invariants(blueprint, { analysis: request.analysis, segments: r.segments })).toEqual([]);
  });

  it("single_best_action met open keuzemoment is ook inconsistent", async () => {
    const violations = await violationsOf("BP-002", (b) => {
      b.ambiguity = "single_best_action";
      b.learningArc.feedback.multipleDefensibleHandling = null;
    });
    expect(violations).toContain("routebeleid-inconsistent");
  });

  it("samenstellen leidt het routebeleid altijd af uit de ambiguïteit", async () => {
    const r = requestFor("BP-003");
    const input = buildBlueprintGenerationInputV2({ inputKind: "casus", analysis: r.analysis, segments: r.segments, selectedDirectionId: r.selectedDirectionId });
    const design = designOf(await mockBlueprint("BP-003"));
    const sneaky = { ...design, decisionPoint: { ...design.decisionPoint, routePolicy: "prescribed_action" } } as BlueprintV2Design;
    expect(composeTrainingBlueprintV2(sneaky, input).decisionPoint.routePolicy).toBe("open_choice");
  });
});

describe("sourceNeeds zijn de enige kenniswaarheid voor Bron", () => {
  const sn = (id: string) => ({ id, question: `Welke kennis is nodig (${id})?`, sourceType: "nog_te_bepalen" as const, whyNeeded: "Voor de afweging." });

  it.each([0, 1, 2, 3])("%i sourceNeeds met passende refs zijn geldig", async (count) => {
    const ids = Array.from({ length: count }, (_, i) => `SN${i + 1}`);
    const violations = await violationsOf("BP-003", (b) => {
      b.sourceNeeds = ids.map(sn);
      b.learningArc.bron.sourceNeedRefs = [...ids];
    });
    expect(violations).toEqual([]);
  });

  it.each<[string, (b: TrainingBlueprintV2) => void, string]>([
    ["onbekende SN-ref", (b) => (b.learningArc.bron.sourceNeedRefs = ["SN1", "SN2"]), "bron-ref-onbekend"],
    ["dubbele SN-ref", (b) => (b.learningArc.bron.sourceNeedRefs = ["SN1", "SN1"]), "bron-ref-dubbel"],
    ["sourceNeed niet gebruikt in Bron", (b) => (b.learningArc.bron.sourceNeedRefs = []), "sourceneed-niet-gebruikt"],
    ["ids niet in volgorde", (b) => (b.sourceNeeds = [{ ...b.sourceNeeds[0], id: "SN2" }]), "sourceneed-id-ongeldig"],
    ["dubbele sourceNeed-ids", (b) => (b.sourceNeeds = [sn("SN1"), sn("SN1")]), "sourceneed-id-ongeldig"],
    ["kennisvraag in Bron zelf", (b) => (b.learningArc.bron.learningIntent = "Welke richtlijn geldt hier?"), "bron-kennisvraag-buiten-sourceneeds"],
    ["concrete bron in Bron", (b) => (b.learningArc.bron.learningIntent = "Koppelen aan artikel 7 van de wet."), "bronverwijzing-verzonnen"],
    ["concrete bron in sourceNeed", (b) => (b.sourceNeeds[0].question = "Wat zegt https://example.org hierover"), "bronverwijzing-verzonnen"],
  ])("%s → afgewezen", async (_, change, violation) => {
    expect(await violationsOf("BP-003", change)).toContain(violation);
  });

  it("een eigen kennislijst in Bron kan structureel niet worden toegevoegd", async () => {
    const copy = structuredClone(await mockBlueprint("BP-003")) as unknown as { learningArc: { bron: Record<string, unknown> } };
    copy.learningArc.bron.knowledgeQuestions = ["Welke kennis is nodig?"];
    expect(TrainingBlueprintV2Schema.safeParse(copy).success).toBe(false);
    expect(checkBlueprintV2Invariants(copy, contextFor("BP-003"))).toEqual(["schema"]);
  });

  it("een sourceNeed-id buiten het formaat is een schemafout", async () => {
    expect(await violationsOf("BP-003", (b) => (b.sourceNeeds[0].id = "S1"))).toEqual(["schema"]);
  });
});

describe("assumptions V2", () => {
  it("regressie BP-001 (V1-baseline): een aanname die trusted context uit de situatie haalt, wordt afgewezen", async () => {
    // Letterlijk uit de V1-run van BP-001 (tag blueprint-v1-baseline).
    const v1Assumption =
      "Het keuzemoment wordt gesitueerd vóórdat een ouder de professional vraagt partij te kiezen; dat verzoek en het meeluisteren van de dochter worden niet als centrale elementen van het keuzemoment uitgewerkt.";
    const violations = await violationsOf("BP-001", (b) => (b.assumptions = [{ assumption: v1Assumption, reason: "Focus." }]));
    expect(violations).toContain("aanname-sluit-context-uit");
  });

  it.each([
    "Het verzoek om partij te kiezen speelt in deze simulatie geen rol.",
    "Het meeluisteren van de dochter wordt niet meegenomen.",
    "De dochter is niet aanwezig.",
  ])("ook afgewezen: %s", async (assumption) => {
    expect(await violationsOf("BP-001", (b) => (b.assumptions = [{ assumption, reason: "Focus." }]))).toContain("aanname-sluit-context-uit");
  });

  it.each([
    "De simulatie start op het moment waarop de toon escaleert.",
    "In de simulatie blijft open of ouder en jongere hebben ingestemd met contact met school; de deelnemer weegt die onzekerheid mee.",
  ])("toegestaan: %s", async (assumption) => {
    expect(await violationsOf("BP-001", (b) => (b.assumptions = [{ assumption, reason: "Startmoment staat niet in de bron." }]))).toEqual([]);
  });

  it("0 aannames is geldig", async () => {
    expect(await violationsOf("BP-002", (b) => (b.assumptions = []))).toEqual([]);
  });

  it("aannames kunnen trusted velden niet overschrijven: die komen altijd uit de context", async () => {
    const r = requestFor("BP-001");
    const input = buildBlueprintGenerationInputV2({ inputKind: "casus", analysis: r.analysis, segments: r.segments, selectedDirectionId: r.selectedDirectionId });
    const design = designOf(await mockBlueprint("BP-001"));
    design.assumptions = [{ assumption: "Het leerdoel is in deze simulatie: de deelnemer kan iets anders.", reason: "Poging." }];
    const blueprint = composeTrainingBlueprintV2(design, input);
    expect(blueprint.learningGoal).toBe(input.selectedDirection.proposedLearningGoal);
    expect(blueprint.professionalDilemma).toBe(input.professionalCore.professionalDilemma);
  });
});

describe("trusted velden blijven onveranderbaar", () => {
  it.each<[string, (b: TrainingBlueprintV2) => void, string]>([
    ["leerdoel", (b) => (b.learningGoal = "De deelnemer kan iets anders."), "leerdoel-niet-gekoppeld"],
    ["dilemma", (b) => (b.professionalDilemma = "Een ander dilemma."), "dilemma-gewijzigd"],
    ["doelgroep", (b) => (b.targetAudience = "Een andere doelgroep."), "doelgroep-gewijzigd"],
    ["sourceRefs", (b) => (b.sourceRefs = ["S1"]), "sourceref-buiten-richting"],
    ["onbekende sourceRef", (b) => (b.sourceRefs = ["S42"]), "onbekende-sourceref"],
  ])("gewijzigd %s → afgewezen", async (_, change, violation) => {
    expect(await violationsOf("BP-001", change)).toContain(violation);
  });

  it("onbekende richting → afgewezen", async () => {
    expect(await violationsOf("BP-001", (b) => (b.selectedDirectionId = "verzonnen"))).toEqual(["onbekende-richting"]);
  });
});

describe("ClaudeTrainingBlueprintServiceV2", () => {
  it("stuurt prompt v2 en een outputschema zonder vaste velden en zonder routebeleid", async () => {
    const expected = await mockBlueprint("BP-002");
    const { service, parse } = claudeReturning(ok(designOf(expected)));
    await expect(service.generate(requestFor("BP-002"))).resolves.toEqual(expected);

    const sent = parse.mock.calls[0][0] as {
      system: string;
      output_config: {
        effort: string;
        format: { schema: { properties: Record<string, { properties?: Record<string, unknown> }> } };
      };
    };
    expect(sent.system).toBe(TRAINING_BLUEPRINT_V2_INSTRUCTIONS);
    expect(sent.output_config.effort).toBe("medium");
    const props = sent.output_config.format.schema.properties;
    for (const field of TRUSTED) expect(Object.keys(props)).not.toContain(field);
    expect(Object.keys(props.decisionPoint.properties ?? {})).toEqual(["task"]);
    expect(JSON.stringify(props.learningArc)).not.toContain("routePolicy");
    expect(JSON.stringify(props.learningArc)).not.toContain("knowledgeQuestions");
  });

  it.each(["BP-001", "BP-002", "BP-003"] as const)("%s: trusted waarden en routebeleid komen van de server", async (bp) => {
    const r = requestFor(bp);
    const direction = r.analysis.trainingDirections.find((d) => d.id === r.selectedDirectionId)!;
    const { service } = claudeReturning(ok(designOf(await mockBlueprint(bp))));
    const blueprint = await service.generate(r);
    expect(blueprint.version).toBe(TRAINING_BLUEPRINT_V2_VERSION);
    expect(blueprint.selectedDirectionId).toBe(direction.id);
    expect(blueprint.learningGoal).toBe(direction.proposedLearningGoal);
    expect(blueprint.professionalDilemma).toBe(r.analysis.professionalDilemma);
    expect(blueprint.targetAudience).toBe(r.analysis.targetAudience);
    expect(blueprint.sourceRefs).toEqual(direction.sourceRefs);
    expect(blueprint.decisionPoint.routePolicy).toBe("open_choice");
  });

  it.each<[string, (d: Record<string, unknown> & BlueprintV2Design) => void]>([
    ["routebeleid meegestuurd", (d) => ((d.decisionPoint as Record<string, unknown>).routePolicy = "prescribed_action")],
    ["leerdoel meegestuurd", (d) => (d.learningGoal = "Anders.")],
    ["doelgroep meegestuurd", (d) => (d.targetAudience = "Anders.")],
    ["voorgeschreven route in Feedback", (d) => d.learningArc.feedback.evaluationBasis.push("voorgeschreven_handeling")],
    ["eigen kennisvragen in Bron", (d) => ((d.learningArc.bron as Record<string, unknown>).knowledgeQuestions = ["Welke?"])],
    ["onbekende SN-ref", (d) => (d.learningArc.bron.sourceNeedRefs = ["SN3"])],
    ["aanname sluit context uit", (d) => (d.assumptions = [{ assumption: "De dochter is niet aanwezig.", reason: "Focus." }])],
    ["BC Online-blok", (d) => (d.learningArc.actie.participantMust = "Reageren in een chatsimulatie.")],
  ])("%s → invalid-output", async (_, change) => {
    const design = structuredClone(designOf(await mockBlueprint("BP-001"))) as Record<string, unknown> & BlueprintV2Design;
    change(design);
    const { service } = claudeReturning(ok(design));
    expect(await errorKindOf(service.generate(requestFor("BP-001")))).toBe("invalid-output");
  });

  it.each<[string, ParseResult | Error]>([
    ["refusal", { stop_reason: "refusal", stop_details: { category: "bio" }, parsed_output: null }],
    ["incomplete", { stop_reason: "max_tokens", parsed_output: null }],
    ["empty", { stop_reason: "end_turn", parsed_output: null }],
    ["invalid-output", new Anthropic.AnthropicError("Failed to parse structured output")],
  ])("%s wordt een providerneutrale fout, zonder tweede aanroep", async (kind, result) => {
    const { service, parse } = claudeReturning(result);
    expect(await errorKindOf(service.generate(requestFor("BP-001")))).toBe(kind);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});

describe("prompt training-blueprint/v2", () => {
  it("heeft eigen versies, los van v1", () => {
    expect(TRAINING_BLUEPRINT_V2_PROMPT_VERSION).toBe("training-blueprint/v2");
    expect(TRAINING_BLUEPRINT_V2_VERSION).toBe("blueprint-contract/v2");
    expect(TRAINING_BLUEPRINT_PROMPT_VERSION).toBe("training-blueprint/v1");
    expect(TRAINING_BLUEPRINT_VERSION).toBe("blueprint-contract/v1");
    expect(TRAINING_BLUEPRINT_V2_INSTRUCTIONS).not.toBe(TRAINING_BLUEPRINT_V1_INSTRUCTIONS);
  });

  it("bevat de nieuwe regels", () => {
    const p = TRAINING_BLUEPRINT_V2_INSTRUCTIONS;
    expect(p).toMatch(/## Ambiguïteit bestuurt het keuzemoment/);
    expect(p).toMatch(/open opdracht/);
    expect(p).toMatch(/"evaluationBasis" bevat dan nooit "voorgeschreven_handeling"/);
    expect(p).toMatch(/professioneel afwegen onder gewijzigde omstandigheden/);
    expect(p).toMatch(/## sourceNeeds: de enige kennisinhoud/);
    expect(p).toMatch(/"sourceNeedRefs"/);
    expect(p).toMatch(/## Focus vernauwt, context blijft/);
    expect(p).toMatch(/speelt in deze simulatie niet/);
    expect(p).toMatch(/Vul een lijst nooit aan om het maximum te bereiken/);
    expect(p).not.toMatch(/Formuleer alleen te valideren kennisvragen/);
  });
});

describe("factory, logging en flow V2", () => {
  it("de V2-factory gebruikt standaard de mock en logt de V2-contractversie", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const blueprint = await createTrainingBlueprintServiceV2({}).generate(requestFor("BP-003"));
    expect(blueprint.version).toBe(TRAINING_BLUEPRINT_V2_VERSION);
    const line = JSON.parse(String(info.mock.calls[0][0])) as BlueprintGenerationLogEntry;
    expect(line).toMatchObject({ event: "certum.blueprint_generation", provider: "mock", blueprintContractVersion: "blueprint-contract/v2" });
    info.mockRestore();
  });

  it("claude zonder sleutel faalt veilig, zonder terugval", () => {
    expect(() => createTrainingBlueprintServiceV2({ CERTUM_BLUEPRINT_PROVIDER: "claude" })).toThrow(AnalysisError);
  });

  it("logging V2 bevat alleen metadata", async () => {
    const r = requestFor("BP-002");
    const { service } = claudeReturning(ok(designOf(await mockBlueprint("BP-002"))));
    const logs: BlueprintGenerationLogEntry[] = [];
    const wrapped = withBlueprintLogging(
      service,
      { provider: "claude", model: "claude-opus-5-5", effort: "medium", promptVersion: TRAINING_BLUEPRINT_V2_PROMPT_VERSION, contractVersion: TRAINING_BLUEPRINT_V2_VERSION },
      (e) => logs.push(e),
    );
    const blueprint = await wrapped.generate(r);
    const { durationMs, ...rest } = logs[0];
    expect(typeof durationMs).toBe("number");
    expect(rest).toEqual({
      event: "certum.blueprint_generation",
      provider: "claude",
      model: "claude-opus-5-5",
      effort: "medium",
      promptVersion: "training-blueprint/v2",
      blueprintContractVersion: "blueprint-contract/v2",
      inputKind: "casus",
      outcome: "success",
      ambiguity: "multiple_defensible_actions",
      successCriteria: blueprint.successCriteria.length,
      assumptions: blueprint.assumptions.length,
      sourceNeeds: blueprint.sourceNeeds.length,
    });
    const line = JSON.stringify(logs);
    for (const forbidden of [r.selectedDirectionId, blueprint.learningGoal, blueprint.decisionPoint.task, blueprint.learningArc.bron.learningIntent]) {
      expect(line).not.toContain(forbidden);
    }
  });

  it("de V2-flow levert een V2-Blueprint en daarna een geldig Block Plan (Block Plan ongewijzigd)", async () => {
    const c = CASES["CA-001"];
    const logs: BlueprintLogEntry[] = [];
    const result = await runBlueprintFlowV2({ kind: "casus", text: c.input }, await ack(c.input), c.analysis, "escalatie-begrenzen", {
      getService: () => new MockTrainingBlueprintServiceV2(),
      log: (e) => logs.push(e),
    });
    if (result.status !== "blueprint") throw new Error(result.reason);
    expect(logs[0]).toMatchObject({ event: "certum.blueprint", version: "blueprint-contract/v2", outcome: "success" });

    const plan = await runBlockPlanFlow(result.blueprint, { status: "approved" }, { getService: () => new MockBlockPlanService(), log: () => {} });
    if (plan.status !== "block_plan") throw new Error(plan.reason);
    expect(plan.blockPlan.blueprintVersion).toBe("blueprint-contract/v2");
    expect(checkBlockPlanInvariants(plan.blockPlan, result.blueprint)).toEqual([]);
  });

  it.each([
    ["blocked", MOCK_V2_BLOCKED],
    ["unsuitable", MOCK_V2_UNSUITABLE],
    ["needs_adjustment", MOCK_V2_NEEDS_ADJUSTMENT],
  ])("een %s-analyse bereikt de V2-provider nooit", async (_, analysis) => {
    const c = CASES["CA-001"];
    const getService = vi.fn((): TrainingBlueprintServiceV2 => {
      throw new Error("provider mag hier niet worden aangemaakt");
    });
    const result = await runBlueprintFlowV2({ kind: "casus", text: c.input }, await ack(c.input), analysis, "escalatie-begrenzen", { getService, log: () => {} });
    expect(result.status).toBe("rejected");
    expect(getService).not.toHaveBeenCalled();
  });

  it("zonder attestatie bereikt de V2-flow de provider niet", async () => {
    const c = CASES["CA-001"];
    const getService = vi.fn((): TrainingBlueprintServiceV2 => new MockTrainingBlueprintServiceV2());
    const noAttest = { ...(await ack(c.input)), syntheticDataAttested: false };
    const result = await runBlueprintFlowV2({ kind: "casus", text: c.input }, noAttest, c.analysis, "escalatie-begrenzen", { getService, log: () => {} });
    expect(result).toEqual({ status: "rejected", reason: "input_gate" });
    expect(getService).not.toHaveBeenCalled();
  });

  it("een V2-Blueprint is geen geldige V1-Blueprint en andersom", async () => {
    const v2 = await mockBlueprint("BP-001");
    expect(TrainingBlueprintSchema.safeParse(v2).success).toBe(false);
  });
});

describe("V1 blijft intact (tag blueprint-v1-baseline)", () => {
  const RUN = "2026-10-03_training-blueprint-v1_claude-opus-5-5_medium.md";
  const root = join(process.cwd(), "evals/training-blueprint/cases");

  it.each(["BP-001", "BP-002", "BP-003"] as const)("de V1-run van %s is nog een geldige V1-Blueprint", (bp) => {
    const dir = readdirSync(root).find((d) => d.startsWith(bp))!;
    const md = readFileSync(join(root, dir, "runs", RUN), "utf8").replace(/\r\n/g, "\n");
    const section = md.split("## Volledige gebruikerszichtbare Training Blueprint")[1];
    const json = section.match(/```json\n([\s\S]*?)\n```/)![1];
    const blueprint = JSON.parse(json) as unknown;
    expect(TrainingBlueprintSchema.safeParse(blueprint).success).toBe(true);
    expect(checkBlueprintInvariants(blueprint, contextFor(bp))).toEqual([]);
    expect(md).toContain("promptVersion | training-blueprint/v1");
  });
});
