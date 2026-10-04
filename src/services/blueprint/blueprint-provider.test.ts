import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { runBlueprintFlow, type BlueprintLogEntry } from "@/app/trainings/new/blueprint-flow";
import {
  TRAINING_BLUEPRINT_PROMPT_VERSION,
  TRAINING_BLUEPRINT_V1_INSTRUCTIONS,
} from "@/knowledge/prompts/training-blueprint-v1";
import { hashPreflightText } from "@/modules/privacy";
import type { ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2";
import {
  TRAINING_BLUEPRINT_VERSION,
  buildBlueprintGenerationInput,
  composeTrainingBlueprint,
  type TrainingBlueprint,
} from "@/modules/training-blueprint";
import { MOCK_V2_BLOCKED, MOCK_V2_NEEDS_ADJUSTMENT, MOCK_V2_UNSUITABLE } from "@/services/analysis/mock/v2/mock-outcomes";
import fixture from "../../../test/fixtures/v2-baseline-ready-analyses.json";
import type { ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../analysis/errors";
import { ClaudeTrainingBlueprintService } from "./claude/claude-training-blueprint-service";
import { CLAUDE_BLUEPRINT_DEFAULTS, readBlueprintConfig } from "./config";
import { BlueprintDesignSchema, type BlueprintDesign } from "./design";
import { readBlockPlanConfig } from "../block-plan/config";
import { createBlockPlanService, createTrainingBlueprintService } from "./factory";
import { withBlueprintLogging, type BlueprintGenerationLogEntry } from "./logging";
import { MockTrainingBlueprintService } from "./mock/mock-blueprint-service";
import type { BlueprintRequest, TrainingBlueprintService } from "./services";

type FixtureCase = { kind: "casus"; input: string; segments: SourceSegment[]; analysis: ReadyOutcome };
const CASES = fixture.cases as unknown as Record<string, FixtureCase>;

const BP = {
  "BP-001": { source: "CA-001", direction: "escalatie-begrenzen" },
  "BP-002": { source: "CA-006", direction: "grens-respecteren-en-werk-bespreken" },
  "BP-003": { source: "CA-008", direction: "volgorde-vervolgcontact" },
} as const;

function requestFor(bp: keyof typeof BP): BlueprintRequest {
  const c = CASES[BP[bp].source];
  return { input: { kind: c.kind, text: c.input }, analysis: c.analysis, segments: c.segments, selectedDirectionId: BP[bp].direction };
}

/** Een geldige, volledige Blueprint (zelfde contract als de mock). */
async function validBlueprint(bp: keyof typeof BP): Promise<TrainingBlueprint> {
  return new MockTrainingBlueprintService().generate(requestFor(bp));
}

const TRUSTED_FIELDS = ["version", "targetAudience", "selectedDirectionId", "learningGoal", "professionalDilemma", "sourceRefs"] as const;

/** Wat Claude teruggeeft: alleen het ontwerp, zonder de vaste velden. */
function designOf(blueprint: TrainingBlueprint): BlueprintDesign {
  const copy: Record<string, unknown> = structuredClone(blueprint);
  for (const field of TRUSTED_FIELDS) delete copy[field];
  return BlueprintDesignSchema.parse(copy);
}

async function validOutput(bp: keyof typeof BP): Promise<BlueprintDesign> {
  return designOf(await validBlueprint(bp));
}

type ParseResult = { stop_reason: string; stop_details?: { category: string | null } | null; parsed_output: unknown };

function claudeReturning(result: ParseResult | Error) {
  const parse = vi.fn<(request: unknown) => Promise<ParseResult>>(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeTrainingBlueprintService(client, CLAUDE_BLUEPRINT_DEFAULTS), parse };
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

describe("provider-inputcontract (buildBlueprintGenerationInput)", () => {
  it("bevat de gekozen richting, de professionele kern en alleen de segmenten van die richting", () => {
    const r = requestFor("BP-001");
    const input = buildBlueprintGenerationInput({ inputKind: "casus", analysis: r.analysis, segments: r.segments, selectedDirectionId: r.selectedDirectionId });
    const direction = r.analysis.trainingDirections.find((d) => d.id === r.selectedDirectionId)!;

    expect(input.contractVersion).toBe(TRAINING_BLUEPRINT_VERSION);
    expect(input.analysisContractVersion).toBe("analysis-contract/v2");
    expect(input.selectedDirection).toEqual({
      id: direction.id,
      title: direction.title,
      focus: direction.focus,
      proposedLearningGoal: direction.proposedLearningGoal,
      sourceRefs: direction.sourceRefs,
    });
    expect(input.professionalCore.professionalDilemma).toBe(r.analysis.professionalDilemma);
    expect(input.sourceSegments.map((s) => s.id)).toEqual(direction.sourceRefs);
    expect(input.sourceSegments.length).toBeLessThan(r.segments.length);
  });

  it("stuurt geen niet gekozen richtingen, sourceCandidates, abstractionNotes of rationale mee", () => {
    const r = requestFor("BP-001");
    const input = buildBlueprintGenerationInput({ inputKind: "casus", analysis: r.analysis, segments: r.segments, selectedDirectionId: r.selectedDirectionId });
    const json = JSON.stringify(input);
    for (const other of r.analysis.trainingDirections.filter((d) => d.id !== r.selectedDirectionId)) {
      expect(json).not.toContain(other.id);
      expect(json).not.toContain(other.focus);
    }
    for (const candidate of r.analysis.sourceCandidates) expect(json).not.toContain(candidate.whyPossiblyRelevant);
    expect(json).not.toContain(r.analysis.rationale);
    expect(Object.keys(input).sort()).toEqual(
      ["analysisContractVersion", "contractVersion", "decisionRelevantGaps", "inputKind", "professionalCore", "selectedDirection", "sourceSegments"].sort(),
    );
  });

  it("gooit bij een onbekende richting", () => {
    const r = requestFor("BP-001");
    expect(() => buildBlueprintGenerationInput({ inputKind: "casus", analysis: r.analysis, segments: r.segments, selectedDirectionId: "verzonnen" })).toThrow();
  });
});

describe("prompt training-blueprint/v1", () => {
  it("heeft een eigen promptversie, los van de analyse", () => {
    expect(TRAINING_BLUEPRINT_PROMPT_VERSION).toBe("training-blueprint/v1");
    expect(TRAINING_BLUEPRINT_PROMPT_VERSION).not.toBe("training-analysis/v2");
    expect(TRAINING_BLUEPRINT_VERSION).toBe("blueprint-contract/v1");
    expect(TRAINING_BLUEPRINT_PROMPT_VERSION).not.toBe(TRAINING_BLUEPRINT_VERSION);
  });

  it("legt de harde regels vast", () => {
    const p = TRAINING_BLUEPRINT_V1_INSTRUCTIONS;
    expect(p).toContain("Certum Learning Architect");
    expect(p).toMatch(/bindende context/);
    expect(p).toMatch(/door het systeem aan de Blueprint toegevoegd/);
    expect(p).not.toMatch(/teken voor teken/);
    expect(p).not.toMatch(/"targetAudience" neem je over/);
    expect(p).toMatch(/Ontwerp passend bij de doelgroep/);
    expect(p).toMatch(/Geen nieuwe bronfeiten/);
    expect(p).toMatch(/"single_best_action" alleen als de gekozen richting werkelijk één normatief gewenste/);
    expect(p).toMatch(/Een lege lijst is toegestaan/);
    expect(p).toMatch(/Kies geen blokken/);
    expect(p).toMatch(/Noem nooit een concrete bron/);
    expect(p).toContain("Context → Actie → Reflectie → Feedback → Bron → Toets");
  });
});

describe("ClaudeTrainingBlueprintService", () => {
  it("implementeert hetzelfde contract als de mock en stuurt alleen de provider-input", async () => {
    const expected = await validBlueprint("BP-001");
    const output = designOf(expected);
    const { service, parse } = claudeReturning(ok(output));
    const mock: TrainingBlueprintService = new MockTrainingBlueprintService();
    const claude: TrainingBlueprintService = service;
    expect(typeof mock.generate).toBe(typeof claude.generate);

    const r = requestFor("BP-001");
    await expect(claude.generate(r)).resolves.toEqual(expected);

    const sent = parse.mock.calls[0][0] as {
      model: string;
      system: string;
      messages: { content: string }[];
      output_config: { effort: string; format: { type: string; schema: { type: string; additionalProperties: boolean } } };
    };
    expect(sent.model).toBe("claude-opus-5-5");
    expect(sent.output_config.effort).toBe("medium");
    expect(sent.system).toBe(TRAINING_BLUEPRINT_V1_INSTRUCTIONS);
    expect(sent.output_config.format.type).toBe("json_schema");
    expect(sent.output_config.format.schema.type).toBe("object");
    expect(sent.output_config.format.schema.additionalProperties).toBe(false);

    const content = sent.messages[0].content;
    const direction = r.analysis.trainingDirections.find((d) => d.id === r.selectedDirectionId)!;
    // Alleen de segmenten van de richting gaan als bronsegment mee; de (gevalideerde) samenvatting beschrijft de
    // hele situatie en mag daarom ook andere feiten uit de input noemen.
    const segmentBlock = content.match(/<bronsegmenten>\n([\s\S]*?)\n<\/bronsegmenten>/)![1];
    expect(segmentBlock.split("\n")).toEqual(
      r.segments.filter((s) => direction.sourceRefs.includes(s.id)).map((s) => `[${s.id}] ${s.text}`),
    );
    expect(content).toContain(direction.proposedLearningGoal);
    expect(content).toContain(r.analysis.professionalDilemma);
    for (const candidate of r.analysis.sourceCandidates) expect(content).not.toContain(candidate.whyPossiblyRelevant);
  });

  it.each<[string, ParseResult | Error]>([
    ["refusal", { stop_reason: "refusal", stop_details: { category: "bio" }, parsed_output: null }],
    ["incomplete", { stop_reason: "max_tokens", parsed_output: null }],
    ["empty", { stop_reason: "end_turn", parsed_output: null }],
    ["invalid-output", new Anthropic.AnthropicError("Failed to parse structured output")],
    ["rate-limit", new Anthropic.RateLimitError(429, undefined, undefined, new Headers())],
  ])("%s wordt een providerneutrale fout", async (kind, result) => {
    const { service } = claudeReturning(result);
    expect(await errorKindOf(service.generate(requestFor("BP-001")))).toBe(kind);
  });

  it.each<[string, (b: BlueprintDesign) => void]>([
    ["te veel succescriteria (schema)", (b) => (b.successCriteria = ["Onderbouwt a.", "Onderbouwt b.", "Onderbouwt c.", "Onderbouwt d."])],
    ["concrete bron in sourceNeeds", (b) => (b.sourceNeeds = [{ question: "Wat zegt artikel 7 hierover?", sourceType: "wet_regelgeving", whyNeeded: "Kader." }])],
    ["link in kennisvraag", (b) => (b.learningArc.bron.knowledgeQuestions = ["Zie https://example.org/richtlijn"])],
    ["vaag succescriterium", (b) => (b.successCriteria = ["De deelnemer begrijpt de afweging."])],
    ["multiple zonder behandeling", (b) => (b.learningArc.feedback.multipleDefensibleHandling = null)],
    ["single met behandeling", (b) => (b.ambiguity = "single_best_action")],
    ["BC Online-blok gekozen", (b) => (b.learningArc.actie.participantMust = "De deelnemer reageert in een chatsimulatie.")],
  ])("%s → invalid-output (invarianten draaien na samenstellen)", async (_, change) => {
    const output = structuredClone(await validOutput("BP-001"));
    change(output);
    const { service } = claudeReturning(ok(output));
    expect(await errorKindOf(service.generate(requestFor("BP-001")))).toBe("invalid-output");
  });

  it("multiple_defensible_actions met behandeling is geldig (BP-001, BP-002, BP-003)", async () => {
    for (const bp of ["BP-001", "BP-002", "BP-003"] as const) {
      const expected = await validBlueprint(bp);
      expect(expected.ambiguity).toBe("multiple_defensible_actions");
      const { service } = claudeReturning(ok(designOf(expected)));
      await expect(service.generate(requestFor(bp))).resolves.toEqual(expected);
    }
  });

  it("single_best_action blijft mogelijk bij passende output", async () => {
    const output = structuredClone(await validOutput("BP-002"));
    output.ambiguity = "single_best_action";
    output.learningArc.feedback.multipleDefensibleHandling = null;
    const { service } = claudeReturning(ok(output));
    await expect(service.generate(requestFor("BP-002"))).resolves.toMatchObject({ ambiguity: "single_best_action" });
  });

  it("lege assumptions, sourceNeeds en kennisvragen zijn toegestaan", async () => {
    const output = structuredClone(await validOutput("BP-003"));
    output.assumptions = [];
    output.sourceNeeds = [];
    output.learningArc.bron.knowledgeQuestions = [];
    output.learningArc.bron.sourceTypes = [];
    const { service } = claudeReturning(ok(output));
    await expect(service.generate(requestFor("BP-003"))).resolves.toMatchObject({ assumptions: [], sourceNeeds: [] });
  });

  it("doet nooit een tweede aanroep of reparatie", async () => {
    const output = structuredClone(await validOutput("BP-001"));
    output.successCriteria = ["De deelnemer begrijpt de afweging."];
    const { service, parse } = claudeReturning(ok(output));
    await expect(service.generate(requestFor("BP-001"))).rejects.toBeInstanceOf(AnalysisError);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});

describe("vaste velden worden server-side samengesteld", () => {
  it("het outputschema voor Claude bevat de vaste velden niet", async () => {
    const { service, parse } = claudeReturning(ok(await validOutput("BP-001")));
    await service.generate(requestFor("BP-001"));
    const sent = parse.mock.calls[0][0] as { output_config: { format: { schema: { properties: Record<string, unknown>; required: string[] } } } };
    const properties = Object.keys(sent.output_config.format.schema.properties);
    for (const field of TRUSTED_FIELDS) {
      expect(properties).not.toContain(field);
      expect(sent.output_config.format.schema.required).not.toContain(field);
    }
    expect(properties).toEqual(expect.arrayContaining(["decisionPoint", "ambiguity", "learningArc", "successCriteria"]));
  });

  it.each(["BP-001", "BP-002", "BP-003"] as const)("%s: de Blueprint bevat exact de trusted waarden", async (bp) => {
    const r = requestFor(bp);
    const direction = r.analysis.trainingDirections.find((d) => d.id === r.selectedDirectionId)!;
    const { service } = claudeReturning(ok(await validOutput(bp)));
    const blueprint = await service.generate(r);
    expect(blueprint.version).toBe(TRAINING_BLUEPRINT_VERSION);
    expect(blueprint.selectedDirectionId).toBe(direction.id);
    expect(blueprint.learningGoal).toBe(direction.proposedLearningGoal);
    expect(blueprint.professionalDilemma).toBe(r.analysis.professionalDilemma);
    expect(blueprint.sourceRefs).toEqual(direction.sourceRefs);
    expect(blueprint.targetAudience).toBe(r.analysis.targetAudience);
  });

  it.each(["BP-001", "BP-002", "BP-003"] as const)("%s behoudt exact de doelgroep uit de analyse", async (bp) => {
    const r = requestFor(bp);
    const design = await validOutput(bp);
    expect(Object.keys(design)).not.toContain("targetAudience");
    const { service } = claudeReturning(ok(design));
    const blueprint = await service.generate(r);
    expect(r.analysis.targetAudience).not.toBeNull();
    expect(blueprint.targetAudience).toBe(r.analysis.targetAudience);
  });

  it("een null-doelgroep uit de analyse blijft null; er wordt geen doelgroep verzonnen", async () => {
    const r = requestFor("BP-002");
    const request = { ...r, analysis: { ...r.analysis, targetAudience: null } };
    const { service } = claudeReturning(ok(await validOutput("BP-002")));
    expect((await service.generate(request)).targetAudience).toBeNull();
  });

  it.each<[string, Record<string, unknown>]>([
    ["leerdoel", { learningGoal: "De professional kan iets anders." }],
    ["dilemma", { professionalDilemma: "Een ander dilemma." }],
    ["richting", { selectedDirectionId: "meeluisterend-kind" }],
    ["sourceRefs", { sourceRefs: ["S1"] }],
    ["contractversie", { version: "blueprint-contract/v0" }],
    ["doelgroep", { targetAudience: "Een andere doelgroep." }],
  ])("Claude kan %s niet via de output meesturen of wijzigen", async (_, extra) => {
    const { service } = claudeReturning(ok({ ...(await validOutput("BP-001")), ...extra }));
    expect(await errorKindOf(service.generate(requestFor("BP-001")))).toBe("invalid-output");
  });

  it("samenstellen overschrijft vaste velden altijd met de trusted context", async () => {
    const r = requestFor("BP-001");
    const input = buildBlueprintGenerationInput({ inputKind: "casus", analysis: r.analysis, segments: r.segments, selectedDirectionId: r.selectedDirectionId });
    const sneaky = { ...(await validOutput("BP-001")), learningGoal: "Anders.", selectedDirectionId: "verzonnen" } as BlueprintDesign;
    const blueprint = composeTrainingBlueprint(sneaky, input);
    expect(blueprint.learningGoal).toBe(input.selectedDirection.proposedLearningGoal);
    expect(blueprint.selectedDirectionId).toBe(input.selectedDirection.id);
  });

  it("een ontwerp dat niet past bij de richting wordt na samenstellen nog steeds afgewezen", async () => {
    // BP-002 heeft meerdere verdedigbare routes; een ontwerp dat dat negeert, botst met de invarianten.
    const design = structuredClone(await validOutput("BP-002"));
    design.learningArc.feedback.multipleDefensibleHandling = null;
    const { service } = claudeReturning(ok(design));
    expect(await errorKindOf(service.generate(requestFor("BP-002")))).toBe("invalid-output");
  });
});

describe("configuratie en factory", () => {
  it("mock is de standaard en expliciet te kiezen", () => {
    expect(readBlueprintConfig({})).toEqual({ provider: "mock" });
    expect(readBlueprintConfig({ CERTUM_BLUEPRINT_PROVIDER: "mock" })).toEqual({ provider: "mock" });
  });

  it("staat los van de analyseprovider: claude-analyse betekent geen betaalde Blueprint", () => {
    expect(readBlueprintConfig({ CERTUM_ANALYSIS_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" })).toEqual({ provider: "mock" });
  });

  it("claude zonder sleutel faalt veilig met een config-fout, zonder terugval naar mock", () => {
    expect(() => readBlueprintConfig({ CERTUM_BLUEPRINT_PROVIDER: "claude" })).toThrow(AnalysisError);
    expect(() => createTrainingBlueprintService({ CERTUM_BLUEPRINT_PROVIDER: "claude", ANTHROPIC_API_KEY: "  " })).toThrow(
      /ANTHROPIC_API_KEY ontbreekt/,
    );
  });

  it("onbekende provider is een config-fout", () => {
    expect(() => readBlueprintConfig({ CERTUM_BLUEPRINT_PROVIDER: "openai" })).toThrow(/Onbekende CERTUM_BLUEPRINT_PROVIDER/);
  });

  it("claude met sleutel geeft de eigen Blueprint-defaults (zonder netwerkaanroep)", () => {
    const config = readBlueprintConfig({ CERTUM_BLUEPRINT_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" });
    expect(config).toEqual({ provider: "claude", claude: { apiKey: "sk-test", ...CLAUDE_BLUEPRINT_DEFAULTS } });
    expect(CLAUDE_BLUEPRINT_DEFAULTS).toMatchObject({ model: "claude-opus-5-5", effort: "medium", maxRetries: 0 });
    expect(typeof createTrainingBlueprintService({ CERTUM_BLUEPRINT_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" }).generate).toBe("function");
  });

  it("de mock via de factory levert een geldige Blueprint", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const blueprint = await createTrainingBlueprintService({}).generate(requestFor("BP-002"));
    expect(blueprint.selectedDirectionId).toBe(BP["BP-002"].direction);
    info.mockRestore();
  });

  it("Block Plan blijft mock-only", () => {
    // Sinds stap 9A heeft het Block Plan een eigen provider; standaard blijft het de mock.
    expect(readBlockPlanConfig({})).toEqual({ provider: "mock" });
    expect(typeof createBlockPlanService({}).generate).toBe("function");
  });
});

describe("logging", () => {
  it("logt alleen metadata en aantallen, geen inhoud of richting-id", async () => {
    const output = await validBlueprint("BP-001");
    const { service } = claudeReturning(ok(designOf(output)));
    const logs: BlueprintGenerationLogEntry[] = [];
    const wrapped = withBlueprintLogging(
      service,
      { provider: "claude", model: "claude-opus-5-5", effort: "medium", promptVersion: TRAINING_BLUEPRINT_PROMPT_VERSION },
      (e) => logs.push(e),
    );
    const r = requestFor("BP-001");
    await wrapped.generate(r);

    expect(logs).toHaveLength(1);
    const { durationMs, ...rest } = logs[0];
    expect(typeof durationMs).toBe("number");
    expect(rest).toEqual({
      event: "certum.blueprint_generation",
      provider: "claude",
      model: "claude-opus-5-5",
      effort: "medium",
      promptVersion: "training-blueprint/v1",
      blueprintContractVersion: "blueprint-contract/v1",
      inputKind: "casus",
      outcome: "success",
      ambiguity: "multiple_defensible_actions",
      successCriteria: output.successCriteria.length,
      assumptions: output.assumptions.length,
      sourceNeeds: output.sourceNeeds.length,
    });
    const line = JSON.stringify(logs);
    for (const forbidden of [r.selectedDirectionId, r.analysis.professionalDilemma, output.learningGoal, output.decisionPoint, ...r.segments.map((s) => s.text)]) {
      expect(line).not.toContain(forbidden);
    }
  });

  it("logt een fout met alleen het fouttype", async () => {
    const { service } = claudeReturning({ stop_reason: "refusal", stop_details: { category: "bio" }, parsed_output: null });
    const logs: BlueprintGenerationLogEntry[] = [];
    const wrapped = withBlueprintLogging(service, { provider: "claude" }, (e) => logs.push(e));
    await expect(wrapped.generate(requestFor("BP-001"))).rejects.toThrow();
    expect(logs[0]).toMatchObject({ outcome: "error", errorKind: "refusal" });
    expect(Object.keys(logs[0])).not.toContain("ambiguity");
  });
});

describe("poorten vóór providercreatie (runBlueprintFlow)", () => {
  const c = CASES["CA-001"];
  const ack = async (text: string, attested = true) => ({
    textHash: await hashPreflightText(text),
    acknowledgedFindingIds: [],
    syntheticDataAttested: attested,
  });
  const spyDeps = () => {
    const logs: BlueprintLogEntry[] = [];
    const getService = vi.fn((): TrainingBlueprintService => {
      throw new Error("provider mag hier niet worden aangemaakt");
    });
    return { deps: { getService, log: (e: BlueprintLogEntry) => logs.push(e) }, getService, logs };
  };

  it("zonder synthetic-only-attestatie wordt geen provider aangemaakt", async () => {
    const { deps, getService } = spyDeps();
    const result = await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input, false), c.analysis, "escalatie-begrenzen", deps);
    expect(result).toEqual({ status: "rejected", reason: "input_gate" });
    expect(getService).not.toHaveBeenCalled();
  });

  it("met een geblokkeerde preflight wordt geen provider aangemaakt", async () => {
    const text = `${c.input} Bel 06-12345678.`;
    const { deps, getService } = spyDeps();
    const result = await runBlueprintFlow({ kind: "casus", text }, await ack(text), c.analysis, "escalatie-begrenzen", deps);
    expect(result).toEqual({ status: "rejected", reason: "input_gate" });
    expect(getService).not.toHaveBeenCalled();
  });

  it("een attestatie voor een andere tekst telt niet", async () => {
    const { deps, getService } = spyDeps();
    const result = await runBlueprintFlow({ kind: "casus", text: c.input }, await ack("andere tekst"), c.analysis, "escalatie-begrenzen", deps);
    expect(result.status).toBe("rejected");
    expect(getService).not.toHaveBeenCalled();
  });

  it.each([
    ["blocked", MOCK_V2_BLOCKED],
    ["unsuitable", MOCK_V2_UNSUITABLE],
    ["needs_adjustment", MOCK_V2_NEEDS_ADJUSTMENT],
  ])("een %s-analyse bereikt de provider nooit", async (_, analysis) => {
    const { deps, getService } = spyDeps();
    const result = await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), analysis, "escalatie-begrenzen", deps);
    expect(result.status).toBe("rejected");
    expect(getService).not.toHaveBeenCalled();
  });

  it("een gemanipuleerde analyse of onbekende richting bereikt de provider nooit", async () => {
    const { deps, getService } = spyDeps();
    const tampered = structuredClone(c.analysis);
    tampered.trainingDirections[0].sourceRefs = ["S99"];
    expect((await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), tampered, "escalatie-begrenzen", deps)).status).toBe("rejected");
    expect((await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), c.analysis, "verzonnen", deps)).status).toBe("rejected");
    expect(getService).not.toHaveBeenCalled();
  });

  it("een config-fout (claude zonder sleutel) wordt provider_error, zonder terugval naar mock", async () => {
    const logs: BlueprintLogEntry[] = [];
    const mockGenerate = vi.spyOn(MockTrainingBlueprintService.prototype, "generate");
    const result = await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), c.analysis, "escalatie-begrenzen", {
      getService: () => createTrainingBlueprintService({ CERTUM_BLUEPRINT_PROVIDER: "claude" }),
      log: (e) => logs.push(e),
    });
    expect(result).toEqual({ status: "rejected", reason: "provider_error" });
    expect(logs).toEqual([{ event: "certum.blueprint", version: TRAINING_BLUEPRINT_VERSION, outcome: "rejected", reason: "provider_error", errorKind: "config" }]);
    expect(mockGenerate).not.toHaveBeenCalled();
    mockGenerate.mockRestore();
  });

  it("ongeldige Claude-output wordt invalid_blueprint en wordt niet getoond", async () => {
    const output = structuredClone(await validOutput("BP-001"));
    output.sourceNeeds = [{ question: "Wat zegt artikel 7 hierover?", sourceType: "wet_regelgeving", whyNeeded: "Kader." }];
    const { service } = claudeReturning(ok(output));
    const logs: BlueprintLogEntry[] = [];
    const result = await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), c.analysis, "escalatie-begrenzen", {
      getService: () => service,
      log: (e) => logs.push(e),
    });
    expect(result).toEqual({ status: "rejected", reason: "invalid_blueprint" });
    expect(logs[0]).toMatchObject({ reason: "invalid_blueprint", errorKind: "invalid-output" });
  });

  it("geldige Claude-output komt door alle poorten", async () => {
    const expected = await validBlueprint("BP-001");
    const { service, parse } = claudeReturning(ok(designOf(expected)));
    const result = await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), c.analysis, "escalatie-begrenzen", {
      getService: () => service,
      log: () => {},
    });
    expect(result).toEqual({ status: "blueprint", blueprint: expected });
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
