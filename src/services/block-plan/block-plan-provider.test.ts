import { describe, expect, it, vi } from "vitest";
import { runBlockPlanFlow, type BlueprintLogEntry } from "@/app/trainings/new/blueprint-flow";
import {
  BC_ONLINE_BLOCK_CATALOG,
  NOT_EVIDENCED_CAPABILITIES,
  PLANNABLE_BLOCK_IDS,
  getCatalogBlock,
} from "@/knowledge/platform/bc-online-block-catalog";
import {
  TRAINING_BLOCK_PLAN_PROMPT_VERSION,
  TRAINING_BLOCK_PLAN_V1_INSTRUCTIONS,
} from "@/knowledge/prompts/training-block-plan-v1";
import { composeBlockPlan, type BlockPlanDesign } from "@/modules/block-plan/compose";
import { BC_ONLINE_BLOCK_PLAN_VERSION, BcOnlineBlockPlanSchema, type BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import { checkBlockPlanInvariants } from "@/modules/block-plan/validation";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import blueprints from "../../../test/fixtures/approved-blueprints.json";
import v21 from "../../../test/fixtures/v21-ready-analyses.json";
import type { ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../analysis/errors";
import { MockBlockPlanService } from "../blueprint/mock/mock-block-plan-service";
import type { BlockPlanService } from "../blueprint/services";
import { ClaudeBlockPlanService } from "./claude-block-plan-service";
import { CLAUDE_BLOCK_PLAN_DEFAULTS, readBlockPlanConfig } from "./config";
import { BlockPlanDesignSchema } from "./design";
import { createBlockPlanService } from "./factory";
import { BlockPlanValidationError } from "./diagnostics";
import { withBlockPlanLogging, type BlockPlanGenerationLogEntry } from "./logging";
import Anthropic from "@anthropic-ai/sdk";

type BlpId = "BLP-001" | "BLP-002" | "BLP-003";
const BLUEPRINT = (id: BlpId) => structuredClone((blueprints.cases as unknown as Record<BlpId, { blueprint: TrainingBlueprintV2 }>)[id].blueprint);
const mockPlan = (id: BlpId) => new MockBlockPlanService().generate({ blueprint: BLUEPRINT(id) });

/** Wat Claude teruggeeft: het ontwerp zonder de vaste velden. */
function designOf(plan: BcOnlineBlockPlan): BlockPlanDesign {
  return BlockPlanDesignSchema.parse({
    courseShell: { description: plan.courseShell.description },
    startIntent: { explanationIntent: plan.startIntent.explanationIntent },
    plannedBlocks: plan.plannedBlocks.map((block) => {
      const { id, sequence, ...rest } = block;
      void id;
      void sequence;
      return rest;
    }),
    endIntent: { closingIntent: plan.endIntent.closingIntent, summaryIntent: plan.endIntent.summaryIntent },
    capabilityGaps: plan.capabilityGaps,
  });
}

type ParseResult = { stop_reason: string; stop_details?: { category: string | null } | null; parsed_output: unknown };
function claudeReturning(output: unknown) {
  const parse = vi.fn<(request: unknown) => Promise<ParseResult>>(async () => ({ stop_reason: "end_turn", parsed_output: output }));
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeBlockPlanService(client, CLAUDE_BLOCK_PLAN_DEFAULTS), parse };
}
async function errorKindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof AnalysisError ? error.kind : "geen AnalysisError";
  }
  return "geen fout";
}

describe("configuratie en factory", () => {
  it("standaard en expliciet mock; los van de analyse- en Blueprint-provider", () => {
    expect(readBlockPlanConfig({})).toEqual({ provider: "mock" });
    expect(readBlockPlanConfig({ CERTUM_BLOCK_PLAN_PROVIDER: "mock" })).toEqual({ provider: "mock" });
    expect(
      readBlockPlanConfig({ CERTUM_ANALYSIS_PROVIDER: "claude", CERTUM_BLUEPRINT_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" }),
    ).toEqual({ provider: "mock" });
  });

  it("claude zonder sleutel faalt veilig, zonder terugval; onbekende provider is een config-fout", () => {
    expect(() => createBlockPlanService({ CERTUM_BLOCK_PLAN_PROVIDER: "claude" })).toThrow(AnalysisError);
    expect(() => readBlockPlanConfig({ CERTUM_BLOCK_PLAN_PROVIDER: "openai" })).toThrow(/Onbekende CERTUM_BLOCK_PLAN_PROVIDER/);
  });

  it("claude met sleutel: eigen defaults (claude-opus-5-5, medium, maxRetries 0)", () => {
    expect(readBlockPlanConfig({ CERTUM_BLOCK_PLAN_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" })).toEqual({
      provider: "claude",
      claude: { apiKey: "sk-test", ...CLAUDE_BLOCK_PLAN_DEFAULTS },
    });
    expect(CLAUDE_BLOCK_PLAN_DEFAULTS).toMatchObject({ model: "claude-opus-5-5", effort: "medium", maxRetries: 0 });
    expect(typeof createBlockPlanService({ CERTUM_BLOCK_PLAN_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" }).generate).toBe("function");
  });

  it("mock en Claude implementeren hetzelfde contract en leveren bij hetzelfde ontwerp hetzelfde plan", async () => {
    const expected = await mockPlan("BLP-001");
    const mock: BlockPlanService = new MockBlockPlanService();
    const { service } = claudeReturning(designOf(expected));
    const claude: BlockPlanService = service;
    await expect(claude.generate({ blueprint: BLUEPRINT("BLP-001") })).resolves.toEqual(await mock.generate({ blueprint: BLUEPRINT("BLP-001") }));
  });
});

describe("providerinput: alleen de goedgekeurde Blueprint, catalogus en versies", () => {
  it("stuurt prompt training-block-plan/v1 met de Blueprint en de catalogus, zonder oorspronkelijke input of analyse", async () => {
    const { service, parse } = claudeReturning(designOf(await mockPlan("BLP-001")));
    await service.generate({ blueprint: BLUEPRINT("BLP-001") });
    const sent = parse.mock.calls[0][0] as { system: string; messages: { content: string }[]; output_config: { effort: string } };
    const content = sent.messages[0].content;
    expect(TRAINING_BLOCK_PLAN_PROMPT_VERSION).toBe("training-block-plan/v1");
    expect(TRAINING_BLOCK_PLAN_PROMPT_VERSION).not.toBe(BC_ONLINE_BLOCK_PLAN_VERSION);
    expect(sent.system).toBe(TRAINING_BLOCK_PLAN_V1_INSTRUCTIONS);
    expect(sent.output_config.effort).toBe("medium");
    expect(content).toContain(BLUEPRINT("BLP-001").learningGoal);
    expect(content).toContain('<catalogus versie="bc-online-block-catalog/v1">');
    for (const id of PLANNABLE_BLOCK_IDS) expect(content).toContain(id);
    // Nooit de oorspronkelijke casus, analyse-uitvoer of bronsegmenten.
    const analysis = (v21.cases as unknown as Record<string, { input: string; analysis: { rationale: string; sourceCandidates: { term: string }[] } }>)["CA-006"];
    expect(content).not.toContain(analysis.input);
    expect(content).not.toContain(analysis.analysis.rationale);
    for (const c of analysis.analysis.sourceCandidates) expect(content).not.toContain(c.term);
  });

  it("het outputschema bevat geen vaste velden; catalogBlockId is de enum van planbare ids", async () => {
    const { service, parse } = claudeReturning(designOf(await mockPlan("BLP-002")));
    await service.generate({ blueprint: BLUEPRINT("BLP-002") });
    const schema = (parse.mock.calls[0][0] as { output_config: { format: { schema: Record<string, unknown> } } }).output_config.format.schema;
    const json = JSON.stringify(schema);
    const props = (schema as { properties: Record<string, { properties?: Record<string, unknown> }> }).properties;
    expect(Object.keys(props).sort()).toEqual(["capabilityGaps", "courseShell", "endIntent", "plannedBlocks", "startIntent"]);
    expect(Object.keys(props.courseShell.properties ?? {})).toEqual(["description"]);
    expect(Object.keys(props.startIntent.properties ?? {})).toEqual(["explanationIntent"]);
    for (const forbidden of ["skjPoints", "learningGoals", "blueprintVersion", '"sequence"']) expect(json).not.toContain(forbidden);
    for (const id of PLANNABLE_BLOCK_IDS) expect(json).toContain(id);
    expect(json).not.toContain("certum.bco.vaste-start");
  });
});

describe("trusted velden server-side", () => {
  it.each(["BLP-001", "BLP-002", "BLP-003"] as const)("%s: titel, leerdoel, versies, SKJ, status, tijdsduur, ids en volgorde uit de server", async (id) => {
    const blueprint = BLUEPRINT(id);
    const { service } = claudeReturning(designOf(await mockPlan(id)));
    const plan = await service.generate({ blueprint });
    expect(plan.version).toBe(BC_ONLINE_BLOCK_PLAN_VERSION);
    expect(plan.blueprintVersion).toBe(blueprint.version);
    expect(plan.courseShell).toMatchObject({ title: blueprint.title, skjPoints: null, status: "concept", estimatedDurationMinutes: null });
    expect(plan.startIntent).toMatchObject({ learningGoals: [blueprint.learningGoal], estimatedDurationMinutes: null });
    expect(plan.plannedBlocks.map((b) => [b.id, b.sequence])).toEqual(plan.plannedBlocks.map((_, i) => [`blok-${i + 1}`, i + 1]));
  });

  it.each<[string, (d: Record<string, unknown> & { courseShell: Record<string, unknown>; startIntent: Record<string, unknown> }) => void]>([
    ["titel", (d) => (d.courseShell.title = "Andere titel")],
    ["SKJ-punten", (d) => (d.courseShell.skjPoints = 4)],
    ["status", (d) => (d.courseShell.status = "gepubliceerd")],
    ["leerdoelen", (d) => (d.startIntent.learningGoals = ["Een ander leerdoel."])],
    ["contractversie", (d) => (d.version = "bc-online-block-plan/v0")],
    ["blok-id", (d) => ((d.plannedBlocks as Record<string, unknown>[])[0].id = "eigen-id")],
  ])("Claude kan %s niet meesturen of overschrijven (invalid-output)", async (_, change) => {
    const design = structuredClone(designOf(await mockPlan("BLP-001"))) as unknown as Record<string, unknown> & {
      courseShell: Record<string, unknown>;
      startIntent: Record<string, unknown>;
    };
    change(design);
    const { service, parse } = claudeReturning(design);
    expect(await errorKindOf(service.generate({ blueprint: BLUEPRINT("BLP-001") }))).toBe("invalid-output");
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("samenstellen overschrijft vaste velden altijd", async () => {
    const design = designOf(await mockPlan("BLP-002"));
    const sneaky = { ...design, courseShell: { ...design.courseShell, title: "Anders" } } as BlockPlanDesign;
    expect(composeBlockPlan(sneaky, BLUEPRINT("BLP-002")).courseShell.title).toBe(BLUEPRINT("BLP-002").title);
  });
});

describe("gesloten catalogus", () => {
  it.each([
    ["onbekend blok", "certum.bco.branching"],
    ["vast onderdeel", "certum.bco.vaste-start"],
  ])("%s → invalid-output", async (_, blockId) => {
    const design = structuredClone(designOf(await mockPlan("BLP-001"))) as unknown as { plannedBlocks: Record<string, unknown>[] };
    design.plannedBlocks[0].catalogBlockId = blockId;
    const { service } = claudeReturning(design);
    expect(await errorKindOf(service.generate({ blueprint: BLUEPRINT("BLP-001") }))).toBe("invalid-output");
  });

  it("alle blokken in de mockplannen zijn bestaande, planbare catalogus-ids", async () => {
    for (const id of ["BLP-001", "BLP-002", "BLP-003"] as const) {
      const plan = await mockPlan(id);
      for (const b of plan.plannedBlocks) {
        expect(PLANNABLE_BLOCK_IDS).toContain(b.catalogBlockId);
        expect(getCatalogBlock(b.catalogBlockId)?.fixed).toBe(false);
      }
    }
  });
});

describe("BLP-001: open keuze niet reduceren tot één juist antwoord", () => {
  it("mockplan: geldig, geen Meerkeuze of formele Toets in Actie of Toets", async () => {
    const plan = await mockPlan("BLP-001");
    expect(checkBlockPlanInvariants(plan, BLUEPRINT("BLP-001"))).toEqual([]);
    const coreBlocks = plan.plannedBlocks.filter((b) => b.certumPhase === "actie" || b.certumPhase === "toets").map((b) => b.catalogBlockId);
    expect(coreBlocks).not.toContain("certum.bco.meerkeuze");
    expect(coreBlocks).not.toContain("certum.bco.toets");
  });

  type Id = BlockPlanDesign["plannedBlocks"][number]["catalogBlockId"];
  /** Zet in één fase de blokken om: `from` → `to` (alle blokken van dat type in die fase). */
  const swap = (d: BlockPlanDesign, phase: string, from: Id, to: Id) => {
    for (const b of d.plannedBlocks.filter((b) => b.certumPhase === phase && b.catalogBlockId === from)) b.catalogBlockId = to;
  };
  const verdict = async (change: (d: BlockPlanDesign) => void) => {
    const design = structuredClone(designOf(await mockPlan("BLP-001")));
    change(design);
    const { service } = claudeReturning(design);
    return errorKindOf(service.generate({ blueprint: BLUEPRINT("BLP-001") }));
  };

  it("open keuze + alleen Meerkeuze in Actie → invalid-output", async () => {
    expect(await verdict((d) => swap(d, "actie", "certum.bco.chat-simulatie", "certum.bco.meerkeuze"))).toBe("invalid-output");
  });

  it("open keuze + Chat simulatie in Actie → geldig", async () => {
    expect(await verdict(() => {})).toBe("geen fout");
  });

  it("open keuze + alleen een formele Toets als transfer → invalid-output", async () => {
    expect(await verdict((d) => swap(d, "toets", "certum.bco.chat-simulatie", "certum.bco.toets"))).toBe("invalid-output");
  });

  it("open keuze + Chat simulatie plus aanvullende formele Toets → geldig", async () => {
    expect(await verdict((d) => swap(d, "toets", "certum.bco.tekst", "certum.bco.toets"))).toBe("geen fout");
  });

  it("open keuze + Productie plus aanvullende formele Toets → geldig", async () => {
    expect(
      await verdict((d) => {
        swap(d, "toets", "certum.bco.chat-simulatie", "certum.bco.productie");
        swap(d, "toets", "certum.bco.tekst", "certum.bco.toets");
      }),
    ).toBe("geen fout");
  });

  it("open keuze + Meerkeuze naast een open blok in Actie → geldig (aanvullend kennisblok)", async () => {
    expect(
      await verdict((d) => {
        const actie = d.plannedBlocks.findIndex((b) => b.certumPhase === "actie");
        d.plannedBlocks.splice(actie, 0, { ...structuredClone(d.plannedBlocks[actie]), catalogBlockId: "certum.bco.meerkeuze" });
      }),
    ).toBe("geen fout");
  });
});

describe("BLP-002: voorgeschreven handeling blijft uitvoerbaar", () => {
  it("mockplan: geldig, met een Actie-blok dat het gesprek uitvoerbaar maakt en zonder Poll", async () => {
    const plan = await mockPlan("BLP-002");
    expect(checkBlockPlanInvariants(plan, BLUEPRINT("BLP-002"))).toEqual([]);
    const actie = plan.plannedBlocks.filter((b) => b.certumPhase === "actie").map((b) => b.catalogBlockId);
    expect(actie.length).toBeGreaterThan(0);
    expect(actie).not.toContain("certum.bco.poll");
  });

  it("prescribed_action ongewijzigd: alleen Meerkeuze in Actie of alleen een formele Toets is niet structureel uitgesloten", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-002")));
    for (const b of design.plannedBlocks.filter((b) => b.certumPhase === "actie")) b.catalogBlockId = "certum.bco.meerkeuze";
    for (const b of design.plannedBlocks.filter((b) => b.certumPhase === "toets" && b.catalogBlockId === "certum.bco.chat-simulatie")) {
      b.catalogBlockId = "certum.bco.toets";
    }
    const { service } = claudeReturning(design);
    await expect(service.generate({ blueprint: BLUEPRINT("BLP-002") })).resolves.toBeTruthy();
  });
});

describe("BLP-003: branching blijft een capability gap", () => {
  it("mockplan: branching als gap met partial workaround; geen gepland blok als vertakking", async () => {
    const plan = await mockPlan("BLP-003");
    expect(checkBlockPlanInvariants(plan, BLUEPRINT("BLP-003"))).toEqual([]);
    const gap = plan.capabilityGaps.find((g) => /branching/.test(g.need))!;
    expect(gap).toBeTruthy();
    expect(gap.workaround?.type).toBe("partial");
    expect(gap.workaround?.limitation).toMatch(/conditionele tekstweergave/);
    expect(gap.workaround?.limitation).toMatch(/branching blijft niet ondersteund/);
  });

  it("branching staat niet in de catalogus; Conditionele logica blijft conditionele tekstweergave", () => {
    expect(NOT_EVIDENCED_CAPABILITIES.map((c) => c.id)).toContain("branching_routing");
    expect(BC_ONLINE_BLOCK_CATALOG.some((b) => (b.observedCapabilities as readonly string[]).includes("branching_routing"))).toBe(false);
    expect(getCatalogBlock("certum.bco.conditionele-logica")!.observedCapabilities).toEqual(["conditionele_tekstweergave"]);
  });

  it("een gepland blok dat zich als vertakking voordoet → invalid-output", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-003")));
    design.plannedBlocks[1].purpose = "Vertakking naar het vervolg dat bij de gekozen route hoort.";
    const { service } = claudeReturning(design);
    expect(await errorKindOf(service.generate({ blueprint: BLUEPRINT("BLP-003") }))).toBe("invalid-output");
  });

  it("een 'volledige' workaround of een workaround zonder beperking bestaat niet (schema)", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-003"))) as unknown as { capabilityGaps: { workaround: Record<string, unknown> }[] };
    design.capabilityGaps[0].workaround.type = "full";
    expect(BlockPlanDesignSchema.safeParse(design).success).toBe(false);
    const noLimit = structuredClone(designOf(await mockPlan("BLP-003"))) as unknown as { capabilityGaps: { workaround: Record<string, unknown> }[] };
    delete noLimit.capabilityGaps[0].workaround.limitation;
    expect(BlockPlanDesignSchema.safeParse(noLimit).success).toBe(false);
  });
});

describe("plan, geen inhoud: alleen deterministische controles", () => {
  const run = async (change: (d: BlockPlanDesign) => void) => {
    const design = structuredClone(designOf(await mockPlan("BLP-002")));
    change(design);
    const { service } = claudeReturning(design);
    return errorKindOf(service.generate({ blueprint: BLUEPRINT("BLP-002") }));
  };

  it.each<[string, (d: BlockPlanDesign) => void]>([
    ["concrete bron-URL", (d) => (d.plannedBlocks.find((b) => b.certumPhase === "bron")!.purpose = "Toon https://example.org/richtlijn")],
    ["www-verwijzing", (d) => (d.endIntent.closingIntent = "Verwijs naar www.voorbeeld.nl voor de achtergrond.")],
  ])("%s → invalid-output", async (_, change) => {
    expect(await run(change)).toBe("invalid-output");
  });

  it.each<[string, (d: BlockPlanDesign) => void]>([
    ["vraagteken in een planintentie", (d) => (d.plannedBlocks[1].configurationIntent[0].intent = "Welke reactie past bij de zorg van de collega? Dat bepaalt de deelnemer zelf.")],
    ["aanhalingstekens in een planintentie", (d) => (d.plannedBlocks[1].configurationIntent[0].intent = 'Rol "collega" die vraagt te wachten met het vrijmaken.')],
    ["het woord artikel met een getal", (d) => (d.endIntent.closingIntent = "Afronden met de kern van de afweging uit artikel 1 van de Blueprint-opzet.")],
  ])("geen tekstheuristiek meer: %s is toegestaan (bewaakt via prompt, evals en review)", async (_, change) => {
    expect(await run(change)).toBe("geen fout");
  });
});

describe("human gate en flow", () => {
  const spy = () => vi.fn((): BlockPlanService => {
    throw new Error("provider mag hier niet worden aangemaakt");
  });

  it("zonder goedkeuring wordt geen provider aangemaakt", async () => {
    const getService = spy();
    const result = await runBlockPlanFlow(BLUEPRINT("BLP-001"), { status: "concept" }, { getService, log: () => {} });
    expect(result).toEqual({ status: "rejected", reason: "blueprint_not_approved" });
    expect(getService).not.toHaveBeenCalled();
  });

  it("een ongeldige Blueprint (schema) bereikt de provider nooit", async () => {
    const getService = spy();
    const broken = { ...BLUEPRINT("BLP-001"), learningGoal: "" };
    expect((await runBlockPlanFlow(broken, { status: "approved" }, { getService, log: () => {} })).status).toBe("rejected");
    expect(getService).not.toHaveBeenCalled();
  });

  it("een Blueprint met inconsistent routebeleid bereikt de provider nooit", async () => {
    const getService = spy();
    const tampered = BLUEPRINT("BLP-001");
    tampered.decisionPoint.routePolicy = "prescribed_action";
    const result = await runBlockPlanFlow(tampered, { status: "approved" }, { getService, log: () => {} });
    expect(result).toEqual({ status: "rejected", reason: "invalid_blueprint" });
    expect(getService).not.toHaveBeenCalled();
  });

  it("een providerfout wordt provider_error, zonder terugval naar mock", async () => {
    const logs: BlueprintLogEntry[] = [];
    const result = await runBlockPlanFlow(BLUEPRINT("BLP-001"), { status: "approved" }, {
      getService: () => createBlockPlanService({ CERTUM_BLOCK_PLAN_PROVIDER: "claude" }),
      log: (e) => logs.push(e),
    });
    expect(result).toEqual({ status: "rejected", reason: "provider_error" });
    expect(logs[0]).toMatchObject({ event: "certum.block_plan", reason: "provider_error", errorKind: "config" });
  });

  it("ongeldige Claude-output wordt invalid_block_plan", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-001")));
    design.plannedBlocks.find((b) => b.certumPhase === "actie")!.catalogBlockId = "certum.bco.meerkeuze";
    const { service } = claudeReturning(design);
    const result = await runBlockPlanFlow(BLUEPRINT("BLP-001"), { status: "approved" }, { getService: () => service, log: () => {} });
    expect(result).toEqual({ status: "rejected", reason: "invalid_block_plan" });
  });

  it("geldige Claude-output komt door de flow", async () => {
    const expected = await mockPlan("BLP-002");
    const { service, parse } = claudeReturning(designOf(expected));
    const result = await runBlockPlanFlow(BLUEPRINT("BLP-002"), { status: "approved" }, { getService: () => service, log: () => {} });
    expect(result).toEqual({ status: "block_plan", blockPlan: expected });
    expect(BcOnlineBlockPlanSchema.safeParse(expected).success).toBe(true);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});

describe("logging", () => {
  it("logt alleen metadata en aantallen", async () => {
    const plan = await mockPlan("BLP-001");
    const { service } = claudeReturning(designOf(plan));
    const logs: BlockPlanGenerationLogEntry[] = [];
    await withBlockPlanLogging(
      service,
      { provider: "claude", model: "claude-opus-5-5", effort: "medium", promptVersion: TRAINING_BLOCK_PLAN_PROMPT_VERSION },
      (e) => logs.push(e),
    ).generate({ blueprint: BLUEPRINT("BLP-001") });
    const { durationMs, ...rest } = logs[0];
    expect(typeof durationMs).toBe("number");
    expect(rest).toEqual({
      event: "certum.block_plan_generation",
      provider: "claude",
      model: "claude-opus-5-5",
      effort: "medium",
      promptVersion: "training-block-plan/v1",
      contractVersion: "bc-online-block-plan/v1",
      catalogVersion: "bc-online-block-catalog/v1",
      blueprintVersion: "blueprint-contract/v2",
      outcome: "success",
      plannedBlocks: plan.plannedBlocks.length,
      capabilityGaps: plan.capabilityGaps.length,
    });
    const line = JSON.stringify(logs);
    const b = BLUEPRINT("BLP-001");
    for (const forbidden of [b.title, b.learningGoal, b.professionalDilemma, b.sourceNeeds[0].question, plan.plannedBlocks[0].purpose, plan.plannedBlocks[0].configurationIntent[0].intent]) {
      expect(line).not.toContain(forbidden);
    }
  });

  it("de factory-mock logt provider mock", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await createBlockPlanService({}).generate({ blueprint: BLUEPRINT("BLP-003") });
    expect(JSON.parse(String(info.mock.calls.at(-1)![0]))).toMatchObject({ event: "certum.block_plan_generation", provider: "mock" });
    info.mockRestore();
  });
});

describe("veilige diagnose van invalid-output", () => {
  const validationOf = async (output: unknown) => {
    const { service } = claudeReturning(output);
    try {
      await service.generate({ blueprint: BLUEPRINT("BLP-001") });
    } catch (error) {
      return error;
    }
    throw new Error("verwacht een fout");
  };

  it("domain_invariant: alleen inhoudsvrije violation codes", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-001")));
    for (const b of design.plannedBlocks.filter((b) => b.certumPhase === "actie")) b.catalogBlockId = "certum.bco.meerkeuze";
    const error = await validationOf(design);
    expect(error).toBeInstanceOf(BlockPlanValidationError);
    expect(error).toMatchObject({ kind: "invalid-output", stage: "domain_invariant", codes: ["juist-antwoord-bij-meerdere-routes"] });
  });

  it("domain_invariant: een vertakkingsblok geeft branching-als-capability", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-003")));
    design.plannedBlocks[1].purpose = "Vertakking naar het vervolg dat bij de gekozen route hoort.";
    const { service } = claudeReturning(design);
    const error = await service.generate({ blueprint: BLUEPRINT("BLP-003") }).catch((e: unknown) => e);
    expect(error).toMatchObject({ stage: "domain_invariant", codes: ["branching-als-capability"] });
  });

  it("schema_validation: alleen issue-code en veldpad, geen ontvangen waarden", async () => {
    const secret = "GEHEIME-INHOUD-die-nooit-gelogd-mag-worden";
    const design = structuredClone(designOf(await mockPlan("BLP-001"))) as unknown as { plannedBlocks: Record<string, unknown>[] };
    design.plannedBlocks[0].catalogBlockId = secret;
    const error = (await validationOf(design)) as BlockPlanValidationError;
    expect(error.stage).toBe("schema_validation");
    expect(error.codes.length).toBeGreaterThan(0);
    expect(error.codes.every((c) => /^[a-z_]+@[A-Za-z0-9_.()]+$/.test(c))).toBe(true);
    expect(error.codes.join(" ")).toContain("plannedBlocks.0.catalogBlockId");
    expect(JSON.stringify(error.codes) + error.message).not.toContain(secret);
  });

  it("structured_output: SDK-parsefout zonder details", async () => {
    const parse = vi.fn(async () => {
      throw new Anthropic.AnthropicError("Failed to parse structured output: GEHEIM");
    });
    const service = new ClaudeBlockPlanService({ messages: { parse } } as unknown as ClaudeMessagesClient, CLAUDE_BLOCK_PLAN_DEFAULTS);
    const error = await service.generate({ blueprint: BLUEPRINT("BLP-001") }).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "invalid-output", stage: "structured_output", codes: [] });
    expect((error as Error).message).not.toContain("GEHEIM");
  });

  it("de logregel bevat de validatiefase en codes, maar geen inhoud", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-001")));
    for (const b of design.plannedBlocks.filter((b) => b.certumPhase === "actie")) b.catalogBlockId = "certum.bco.meerkeuze";
    const { service } = claudeReturning(design);
    const logs: BlockPlanGenerationLogEntry[] = [];
    await withBlockPlanLogging(service, { provider: "claude" }, (e) => logs.push(e))
      .generate({ blueprint: BLUEPRINT("BLP-001") })
      .catch(() => {});
    expect(logs[0]).toMatchObject({
      outcome: "error",
      errorKind: "invalid-output",
      validationStage: "domain_invariant",
      violationCodes: ["juist-antwoord-bij-meerdere-routes"],
    });
    const line = JSON.stringify(logs);
    for (const forbidden of [design.plannedBlocks[0].purpose, BLUEPRINT("BLP-001").learningGoal]) expect(line).not.toContain(forbidden);
  });

  it("de flow meldt invalid_block_plan; de reden staat in de generatielog", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-001")));
    for (const b of design.plannedBlocks.filter((b) => b.certumPhase === "actie")) b.catalogBlockId = "certum.bco.meerkeuze";
    const { service } = claudeReturning(design);
    const result = await runBlockPlanFlow(BLUEPRINT("BLP-001"), { status: "approved" }, { getService: () => service, log: () => {} });
    expect(result).toEqual({ status: "rejected", reason: "invalid_block_plan" });
  });
});

describe("geen vervolgactiviteit verzinnen", () => {
  it("followUpRecommendation zit niet in het Claude-designschema", async () => {
    const { service, parse } = claudeReturning(designOf(await mockPlan("BLP-002")));
    await service.generate({ blueprint: BLUEPRINT("BLP-002") });
    const schema = (parse.mock.calls[0][0] as { output_config: { format: { schema: unknown } } }).output_config.format.schema;
    expect(JSON.stringify(schema)).not.toContain("followUpRecommendation");
  });

  it("Claude kan geen vervolgaanbeveling injecteren (invalid-output, schema_validation)", async () => {
    const design = structuredClone(designOf(await mockPlan("BLP-001"))) as unknown as { endIntent: Record<string, unknown> };
    design.endIntent.followUpRecommendation = "Bespreek de afweging in intervisie.";
    const { service } = claudeReturning(design);
    const error = await service.generate({ blueprint: BLUEPRINT("BLP-001") }).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "invalid-output", stage: "schema_validation" });
  });

  it.each(["BLP-001", "BLP-002", "BLP-003"] as const)("%s: de server zet followUpRecommendation op null; plan blijft geldig", async (id) => {
    const { service } = claudeReturning(designOf(await mockPlan(id)));
    const plan = await service.generate({ blueprint: BLUEPRINT(id) });
    expect(plan.endIntent.followUpRecommendation).toBeNull();
    expect(checkBlockPlanInvariants(plan, BLUEPRINT(id))).toEqual([]);
  });

  it("bestaande capability gaps blijven gelijk (mock BLP-003: één branching-gap met partial workaround)", async () => {
    const plan = await mockPlan("BLP-003");
    expect(plan.capabilityGaps).toHaveLength(1);
    expect(plan.capabilityGaps[0].workaround?.type).toBe("partial");
    expect((await mockPlan("BLP-001")).capabilityGaps).toHaveLength(0);
  });
});
