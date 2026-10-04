import { describe, expect, it, vi } from "vitest";
import {
  BLOCK_GUIDANCE_V1_1,
  TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS,
  TRAINING_BLOCK_CONTENT_V1_1_PROMPT_VERSION,
  buildTrainingBlockContentV1_1Request,
} from "@/knowledge/prompts/training-block-content-v1-1";
import {
  BLOCK_GUIDANCE,
  buildTrainingBlockContentV1Request,
  TRAINING_BLOCK_CONTENT_PROMPT_VERSION,
  TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS,
} from "@/knowledge/prompts/training-block-content-v1";
import {
  CONTENT_BLOCK_IDS,
  buildBlockContentGenerationInput,
  resolveBlockTarget,
  type BlockContentDesign,
  type BlockContentResult,
} from "@/modules/block-content";
import { fixtureCase, type PlanCaseId } from "../../../test/block-content-fixtures";
import type { ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../analysis/errors";
import { ClaudeBlockContentService } from "./claude-block-content-service";
import { CLAUDE_BLOCK_CONTENT_DEFAULTS, readBlockContentConfig } from "./config";
import { buildBlockContentDesignSchema } from "./design";
import { BlockContentValidationError } from "./diagnostics";
import { createBlockContentService } from "./factory";
import { withBlockContentLogging, type BlockContentGenerationLogEntry } from "./logging";
import { MockBlockContentService } from "./mock/mock-block-content-service";
import { generateBlockContent, generateTrainingContentPackage } from "./orchestrator";
import type { BlockContentService } from "./services";

const mock = new MockBlockContentService();
const gen = async (r: ReturnType<typeof request>) => (await generateBlockContent(() => mock, r)).block;
const request = (id: PlanCaseId, plannedBlockId: string) => ({ ...fixtureCase(id), plannedBlockId, approvedEarlierContent: [] });

/** Wat Claude teruggeeft voor een blok: het ontwerp zonder trusted velden. */
function designOf(result: BlockContentResult): { result: BlockContentDesign } {
  const accreditation = {
    learningGoalContribution: result.accreditation.learningGoalContribution,
    assessmentRole: result.accreditation.assessmentRole,
    estimatedMinutes: result.accreditation.estimatedMinutes,
    sourceNeedRefs: result.accreditation.sourceNeedRefs,
  };
  const body = result.body;
  switch (body.status) {
    case "generated": {
      const { catalogBlockId, ...content } = body.content as Record<string, unknown>;
      void catalogBlockId;
      delete content.availableContext;
      delete content.unavailableContext;
      delete content.minimumWords;
      return { result: { status: "generated", accreditation, content } as BlockContentDesign };
    }
    case "needs_asset": {
      const { assetType, ...assetRequirement } = body.assetRequirement;
      void assetType;
      return { result: { status: "needs_asset", accreditation, assetRequirement } };
    }
    default: {
      const rest = { ...body } as Record<string, unknown>;
      return { result: { ...rest, accreditation } as BlockContentDesign };
    }
  }
}

type ParseResult = { stop_reason: string; stop_details?: { category: string | null } | null; parsed_output: unknown };
function claudeReturning(output: unknown) {
  const parse = vi.fn<(request: unknown) => Promise<ParseResult>>(async () => ({ stop_reason: "end_turn", parsed_output: output }));
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeBlockContentService(client, CLAUDE_BLOCK_CONTENT_DEFAULTS), parse };
}
async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => "geen fout",
    (e: unknown) => e,
  );
}

describe("configuratie en factory", () => {
  it("standaard mock, los van de andere providers", () => {
    expect(readBlockContentConfig({})).toEqual({ provider: "mock" });
    expect(
      readBlockContentConfig({ CERTUM_BLOCK_PLAN_PROVIDER: "claude", CERTUM_BLUEPRINT_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" }),
    ).toEqual({ provider: "mock" });
  });

  it("claude zonder sleutel faalt veilig, zonder terugval; onbekende provider is een config-fout", () => {
    expect(() => createBlockContentService({ CERTUM_BLOCK_CONTENT_PROVIDER: "claude" })).toThrow(AnalysisError);
    expect(() => readBlockContentConfig({ CERTUM_BLOCK_CONTENT_PROVIDER: "openai" })).toThrow(/Onbekende CERTUM_BLOCK_CONTENT_PROVIDER/);
  });

  it("claude met sleutel: eigen defaults (claude-opus-5-5, medium, maxRetries 0)", () => {
    expect(readBlockContentConfig({ CERTUM_BLOCK_CONTENT_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" })).toEqual({
      provider: "claude",
      claude: { apiKey: "sk-test", ...CLAUDE_BLOCK_CONTENT_DEFAULTS },
    });
    expect(CLAUDE_BLOCK_CONTENT_DEFAULTS).toMatchObject({ model: "claude-opus-5-5", effort: "medium", maxRetries: 0 });
    const service = createBlockContentService({ CERTUM_BLOCK_CONTENT_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-test" });
    expect(typeof service.generate).toBe("function");
  });
});

describe("evals met de mock (BC-001 t/m BC-005)", () => {
  it("BC-001: open Chat simulatie → generated, echte chatconfiguratie zonder sleutelwoorddoel", async () => {
    const block = await mock.generate(request("BLP-001", "blok-2"));
    expect(block).toMatchObject({ catalogBlockId: "certum.bco.chat-simulatie", routePolicy: "open_choice", body: { status: "generated" } });
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.chat-simulatie") throw new Error();
    expect(block.body.content).toMatchObject({ goal: null, timeLimitMinutes: null });
    expect(block.body.content.personaName.length).toBeGreaterThan(0);
    expect(block.body.content.firstMessage.length).toBeGreaterThan(0);
  });

  it("BC-002: voorgeschreven Productie → generated, prescribed_action blijft trusted", async () => {
    const ctx = fixtureCase("BLP-002");
    const block = await mock.generate(request("BLP-002", "blok-3"));
    expect(block).toMatchObject({ catalogBlockId: "certum.bco.productie", certumPhase: "actie", routePolicy: "prescribed_action" });
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.productie") throw new Error();
    expect(block.body.content.instructions).toContain(ctx.blueprint.decisionPoint.task.slice(0, 40));
    expect(block.body.content.template).toBeNull();
    // Een provider kan het routebeleid niet wijzigen: het staat niet in het ontwerpschema en wordt server-side gezet.
    const { service } = claudeReturning(designOf(block));
    expect((await service.generate(request("BLP-002", "blok-3"))).routePolicy).toBe("prescribed_action");
  });

  it("BC-003: Bron zonder gevalideerde bron → needs_source met SN-refs, geen kennis", async () => {
    const block = await gen(request("BLP-001", "blok-5"));
    expect(block.body.status).toBe("needs_source");
    expect(block.accreditation.sourceNeedRefs).toEqual(["SN1", "SN2"]);
    expect(block.accreditation.estimatedMinutes).toBeNull();
  });

  it("BC-004: media zonder asset → needs_asset, geen URL", async () => {
    const block = await gen(request("BLP-001-MEDIA", "blok-1"));
    expect(block.body).toMatchObject({ status: "needs_asset", assetRequirement: { assetType: "video", captionIntent: null } });
    expect(JSON.stringify(block)).not.toMatch(/https?:\/\/|www\.|\.mp4/);
  });

  it("BC-005: AI Feedback na Productie → alleen aantoonbare context; Productie expliciet uitgesloten", async () => {
    const block = await mock.generate(request("BLP-003", "blok-8"));
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.ai-feedback") throw new Error();
    expect(block.body.content.availableContext).toEqual(["blok-3", "blok-4", "blok-7"]);
    expect(block.body.content.unavailableContext).toEqual(["blok-6"]);
  });

  it("iedere planbare blokvorm in de fixtures levert een geldig resultaat", async () => {
    for (const id of ["BLP-001", "BLP-002", "BLP-003", "BLP-001-MEDIA"] as const) {
      for (const b of fixtureCase(id).blockPlan.plannedBlocks) {
        await expect(gen(request(id, b.id))).resolves.toMatchObject({ plannedBlockId: b.id });
      }
    }
  });
});

describe("ontwerpschema per doelblok", () => {
  it("open Chat simulatie: goal kan alleen null zijn", () => {
    const ctx = fixtureCase("BLP-001");
    const schema = buildBlockContentDesignSchema(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-2")!);
    const ok = { status: "generated", accreditation: { learningGoalContribution: "x", assessmentRole: "formative", estimatedMinutes: 10, sourceNeedRefs: [] }, content: { title: "t", personaName: "Sam", personaInstructions: "i", scenarioContext: null, firstMessage: "Hoi", goal: null, timeLimitMinutes: null } };
    expect(schema.safeParse({ result: ok }).success).toBe(true);
    const withGoal = { ...ok, content: { ...ok.content, goal: { keywords: ["a"], messageOnGoal: "b", instructionAfterGoal: "c" } } };
    expect(schema.safeParse({ result: withGoal }).success).toBe(false);
  });

  it("Bron en media: alleen de ene toegestane status", () => {
    const ctx = fixtureCase("BLP-001-MEDIA");
    const accreditation = { learningGoalContribution: "x", assessmentRole: "none", estimatedMinutes: null, sourceNeedRefs: [] };
    const media = buildBlockContentDesignSchema(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-1")!);
    expect(media.safeParse({ result: { status: "generated", accreditation, content: { title: "t", text: "x" } } }).success).toBe(false);
    const bron = buildBlockContentDesignSchema(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-5")!);
    expect(bron.safeParse({ result: { status: "generated", accreditation, content: { title: "t", text: "x" } } }).success).toBe(false);
    expect(bron.safeParse({ result: { status: "needs_source", accreditation: { ...accreditation, sourceNeedRefs: ["SN7"] }, whatToValidate: "a", generatableAfterValidation: "b" } }).success).toBe(false);
  });

  it("de trusted AI-context zit niet in het ontwerpschema", () => {
    const ctx = fixtureCase("BLP-003");
    const schema = buildBlockContentDesignSchema(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-8")!);
    const base = { status: "generated", accreditation: { learningGoalContribution: "x", assessmentRole: "formative", estimatedMinutes: 3, sourceNeedRefs: [] } };
    expect(schema.safeParse({ result: { ...base, content: { title: "t", instructions: "i" } } }).success).toBe(true);
    expect(schema.safeParse({ result: { ...base, content: { title: "t", instructions: "i", availableContext: ["blok-6"] } } }).success).toBe(false);
  });

  it("iedere inhoudsvorm heeft een blokaanwijzing in de prompt", () => {
    for (const id of CONTENT_BLOCK_IDS) expect(BLOCK_GUIDANCE[id]).toBeTruthy();
    expect(TRAINING_BLOCK_CONTENT_PROMPT_VERSION).toBe("training-block-content/v1");
  });
});

describe("Claude-provider (zonder echte aanroepen)", () => {
  it("geeft hetzelfde resultaat als de mock bij hetzelfde ontwerp; één aanroep per blok", async () => {
    const expected = await mock.generate(request("BLP-003", "blok-8"));
    const { service, parse } = claudeReturning(designOf(expected));
    expect(await service.generate(request("BLP-003", "blok-8"))).toEqual(expected);
    expect(parse).toHaveBeenCalledTimes(1);
    const sent = parse.mock.calls[0][0] as { model: string; system: string; output_config: { effort: string } };
    expect(sent).toMatchObject({ model: "claude-opus-5-5", system: TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS, output_config: { effort: "medium" } });
  });

  it("de provider krijgt geen oorspronkelijke invoer, analyse of bronsegment-ids", async () => {
    const ctx = fixtureCase("BLP-001");
    const { service, parse } = claudeReturning(designOf(await mock.generate(request("BLP-001", "blok-2"))));
    await service.generate(request("BLP-001", "blok-2"));
    const content = (parse.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content;
    expect(content).not.toContain('"sourceRefs"');
    expect(content).not.toContain(ctx.blueprint.selectedDirectionId);
    const input = buildBlockContentGenerationInput({ ...ctx, target: resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-2")!, approvedEarlierContent: [] });
    expect(Object.keys(input.blueprint)).not.toContain("sourceRefs");
    expect(Object.keys(input)).toEqual(["blueprint", "blockPlan", "targetBlock", "catalogDefinition", "approvedEarlierContent", "trustedContext"]);
  });

  it("alleen eerdere, goedgekeurde, gegenereerde inhoud gaat mee", async () => {
    const ctx = fixtureCase("BLP-003");
    const poll = { ...(await mock.generate(request("BLP-003", "blok-3"))), reviewStatus: "approved" as const };
    const draft = await mock.generate(request("BLP-003", "blok-4"));
    const later = { ...(await mock.generate(request("BLP-003", "blok-7"))), reviewStatus: "approved" as const };
    const input = buildBlockContentGenerationInput({ ...ctx, target: resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-5")!, approvedEarlierContent: [poll, draft, later] });
    expect(input.approvedEarlierContent.map((b) => b.plannedBlockId)).toEqual(["blok-3"]);
  });

  it("een gewijzigd bloktype of een verboden status wordt invalid-output, zonder tweede aanroep", async () => {
    const chat = designOf(await mock.generate(request("BLP-001", "blok-2")));
    const { service, parse } = claudeReturning({ result: { ...chat.result, content: { title: "t", text: "x" } } });
    const error = await errorOf(service.generate(request("BLP-001", "blok-2")));
    expect(error).toBeInstanceOf(BlockContentValidationError);
    expect(error).toMatchObject({ kind: "invalid-output", stage: "schema_validation" });
    expect(parse).toHaveBeenCalledTimes(1);

    const accreditation = { learningGoalContribution: "x", assessmentRole: "none", estimatedMinutes: 3, sourceNeedRefs: [] };
    // Een Bron-blok komt nooit bij de provider: de server bepaalt het; een directe aanroep is een config-fout.
    const bron = claudeReturning({ result: { status: "generated", accreditation, content: { title: "Bron", text: "Kennis" } } });
    expect(await errorOf(bron.service.generate(request("BLP-001", "blok-5")))).toMatchObject({ kind: "config" });
    expect(bron.parse).not.toHaveBeenCalled();
  });

  it("een URL in de inhoud wordt afgewezen in de fase domain_invariant", async () => {
    const tekst = designOf(await mock.generate(request("BLP-001", "blok-1")));
    const content = { ...(tekst.result as { content: object }).content, text: "Kijk op www.voorbeeld.nl" };
    const { service } = claudeReturning({ result: { ...tekst.result, content } });
    expect(await errorOf(service.generate(request("BLP-001", "blok-1")))).toMatchObject({ stage: "domain_invariant", codes: ["url-verzonnen"] });
  });

  it("refusal, max_tokens en lege output worden providerneutrale fouten", async () => {
    for (const [stop_reason, kind] of [["refusal", "refusal"], ["max_tokens", "incomplete"], ["end_turn", "empty"]] as const) {
      const parse = vi.fn(async () => ({ stop_reason, stop_details: null, parsed_output: null }));
      const service = new ClaudeBlockContentService({ messages: { parse } } as unknown as ClaudeMessagesClient, CLAUDE_BLOCK_CONTENT_DEFAULTS);
      expect(await errorOf(service.generate(request("BLP-001", "blok-1")))).toMatchObject({ kind });
    }
  });

  it("Vaste Start en Einde: titel, leerdoel en vervolg zijn trusted", async () => {
    const ctx = fixtureCase("BLP-001");
    const { service } = claudeReturning({ introduction: "Welkom.", closingText: "Tot slot.", summary: null });
    const frame = await service.generateFrame(ctx);
    expect(frame.start).toEqual({ title: ctx.blueprint.title, introduction: "Welkom.", learningGoals: [ctx.blueprint.learningGoal] });
    expect(frame.end.followUpRecommendation).toBeNull();
  });
});

describe("orchestrator en logging", () => {
  it("genereert ieder blok één keer in planvolgorde", async () => {
    const generate = vi.spyOn(mock, "generate");
    const { package: pkg, failure } = await generateTrainingContentPackage(() => mock, fixtureCase("BLP-003"));
    expect(failure).toBeNull();
    // blok-9 (Bron) bepaalt de server zelf; alle andere blokken gaan één keer naar de provider.
    expect(generate.mock.calls.map((c) => c[0].plannedBlockId)).toEqual(
      fixtureCase("BLP-003").blockPlan.plannedBlocks.filter((b) => b.certumPhase !== "bron").map((b) => b.id),
    );
    expect(pkg.blocks).toHaveLength(14);
    generate.mockRestore();
  });

  it("stopt bij de eerste fout: geen extra aanroepen, rest blijft not_generated", async () => {
    let calls = 0;
    const failing: BlockContentService = {
      generateFrame: (r) => mock.generateFrame(r),
      generate: async (r) => {
        calls += 1;
        if (r.plannedBlockId === "blok-3") throw new AnalysisError("rate-limit", "429");
        return mock.generate(r);
      },
    };
    const { package: pkg, failure } = await generateTrainingContentPackage(() => failing, fixtureCase("BLP-001"));
    expect(calls).toBe(3);
    expect(failure).toEqual({ plannedBlockId: "blok-3", errorKind: "rate-limit" });
    expect(pkg.blocks.map((b) => b.plannedBlockId)).toEqual(["blok-1", "blok-2"]);
    expect(pkg.unresolvedRequirements.filter((u) => u.kind === "not_generated").map((u) => u.plannedBlockId)).toEqual([
      "blok-3", "blok-4", "blok-5", "blok-6", "blok-7", "blok-8", "blok-9",
    ]);
    expect(pkg.readiness).toBe("incomplete");
  });

  it("logt alleen metadata, nooit inhoud", async () => {
    const entries: BlockContentGenerationLogEntry[] = [];
    const ctx = fixtureCase("BLP-003");
    const logged = withBlockContentLogging(mock, { provider: "mock" }, (e) => entries.push(e));
    const { package: pkg } = await generateTrainingContentPackage(() => logged, ctx);
    const failing = withBlockContentLogging(
      { generateFrame: mock.generateFrame, generate: async () => { throw new BlockContentValidationError("domain_invariant", ["url-verzonnen"]); } },
      { provider: "claude", model: "claude-opus-5-5", effort: "medium", promptVersion: TRAINING_BLOCK_CONTENT_PROMPT_VERSION },
      (e) => entries.push(e),
    );
    await errorOf(failing.generate(request("BLP-003", "blok-1")));

    const block = entries.find((e) => e.plannedBlockId === "blok-8")!;
    expect(block).toMatchObject({
      event: "certum.block_content_generation",
      contentContractVersion: "block-content/v1",
      target: "block",
      catalogBlockId: "certum.bco.ai-feedback",
      certumPhase: "feedback",
      outcome: "success",
      resultStatus: "generated",
      estimatedMinutes: 3,
    });
    expect(entries.at(-1)).toMatchObject({ outcome: "error", errorKind: "invalid-output", validationStage: "domain_invariant", violationCodes: ["url-verzonnen"], model: "claude-opus-5-5", promptVersion: "training-block-content/v1" });

    const allowed = new Set(["event", "provider", "model", "effort", "promptVersion", "contentContractVersion", "target", "plannedBlockId", "catalogBlockId", "certumPhase", "durationMs", "outcome", "resultStatus", "estimatedMinutes", "errorKind", "validationStage", "violationCodes"]);
    for (const entry of entries) expect(Object.keys(entry).every((k) => allowed.has(k))).toBe(true);
    const serialized = JSON.stringify(entries);
    const texts = [ctx.blueprint.title, ctx.blueprint.learningGoal, ctx.blueprint.professionalDilemma, pkg.start.introduction, ...pkg.blocks.flatMap((b) => (b.body.status === "generated" ? [b.body.content.title] : []))];
    for (const t of texts) expect(serialized).not.toContain(t);
  });
});

describe("grounding v1.1 (training-block-content/v1.1, contract block-content/v1)", () => {
  const productieDesign = async () => designOf(await gen(request("BLP-002", "blok-3")));

  it("Productie minimumWords komt niet van Claude en is server-side null", async () => {
    const design = await productieDesign();
    expect(Object.keys((design.result as { content: object }).content)).not.toContain("minimumWords");
    const { service } = claudeReturning(design);
    const block = await service.generate(request("BLP-002", "blok-3"));
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.productie") throw new Error();
    expect(block.body.content.minimumWords).toBeNull();
  });

  it("Claude kan geen minimumWords injecteren: het ontwerpschema is strict", async () => {
    const design = await productieDesign();
    const injected = { result: { ...design.result, content: { ...(design.result as { content: object }).content, minimumWords: 40 } } };
    const ctx = fixtureCase("BLP-002");
    expect(buildBlockContentDesignSchema(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-3")!).safeParse(injected).success).toBe(false);
    const { service, parse } = claudeReturning(injected);
    expect(await errorOf(service.generate(request("BLP-002", "blok-3")))).toMatchObject({ kind: "invalid-output", stage: "schema_validation" });
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("trusted bloktype en routebeleid blijven ongewijzigd (BC-002)", async () => {
    const { service } = claudeReturning(await productieDesign());
    expect(await service.generate(request("BLP-002", "blok-3"))).toMatchObject({
      catalogBlockId: "certum.bco.productie",
      routePolicy: "prescribed_action",
      body: { content: { catalogBlockId: "certum.bco.productie" } },
    });
  });

  it("Chat scenarioContext blijft gewoon een (nullable) string: geen contractverbouwing", async () => {
    const ctx = fixtureCase("BLP-001");
    const schema = buildBlockContentDesignSchema(resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-2")!);
    const chat = designOf(await gen(request("BLP-001", "blok-2")));
    const withContext = (scenarioContext: unknown) => ({ result: { ...chat.result, content: { ...(chat.result as { content: object }).content, scenarioContext } } });
    expect(schema.safeParse(withContext("De deelnemer is teamleider en voert een gesprek met een medewerker.")).success).toBe(true);
    expect(schema.safeParse(withContext(null)).success).toBe(true);
    expect(schema.safeParse(withContext({ participant: "x", persona: "y" })).success).toBe(false);
  });

  it("geen vrije-tekstheuristiek: een downstream-claim of 'Je bent …' maakt de output niet ongeldig", async () => {
    // De regels zijn semantisch (prompt, eval, human review); de code valideert geen natuurlijke taal.
    const design = await productieDesign();
    const content = { ...(design.result as { content: object }).content, instructions: "Schrijf de melding. Je melding wordt later gebruikt bij de feedback." };
    const { service } = claudeReturning({ result: { ...design.result, content } });
    await expect(service.generate(request("BLP-002", "blok-3"))).resolves.toMatchObject({ body: { status: "generated" } });
    const chat = designOf(await gen(request("BLP-001", "blok-2")));
    const chatContent = { ...(chat.result as { content: object }).content, scenarioContext: "Je bent teamleider." };
    await expect(claudeReturning({ result: { ...chat.result, content: chatContent } }).service.generate(request("BLP-001", "blok-2"))).resolves.toBeTruthy();
  });

  it("prompt v1.1 = v1 plus de drie regels; v1 blijft ongewijzigd en reproduceerbaar", () => {
    expect(TRAINING_BLOCK_CONTENT_V1_1_PROMPT_VERSION).toBe("training-block-content/v1.1");
    expect(TRAINING_BLOCK_CONTENT_PROMPT_VERSION).toBe("training-block-content/v1");
    expect(TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS).not.toContain("Geen onbewezen gebruik van output");
    expect(TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS).toContain("## Geen onbewezen gebruik van output");
    expect(TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS).toContain("## Geen verzonnen kwantitatieve eisen");
    expect(TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS.startsWith(TRAINING_BLOCK_CONTENT_V1_INSTRUCTIONS.slice(0, 500))).toBe(true);
    expect(BLOCK_GUIDANCE_V1_1["certum.bco.chat-simulatie"]).toContain("ontvanger-neutraal");
    expect(BLOCK_GUIDANCE["certum.bco.chat-simulatie"]).not.toContain("ontvanger-neutraal");
    for (const id of CONTENT_BLOCK_IDS) {
      if (id !== "certum.bco.chat-simulatie" && id !== "certum.bco.productie") expect(BLOCK_GUIDANCE_V1_1[id]).toBe(BLOCK_GUIDANCE[id]);
    }
    const ctx = fixtureCase("BLP-001");
    const input = { ...buildBlockContentGenerationInput({ ...ctx, target: resolveBlockTarget(ctx.blueprint, ctx.blockPlan, "blok-3")!, approvedEarlierContent: [] }), contractVersion: "block-content/v1" };
    // Voor een blok met ongewijzigde aanwijzing is het gebruikersbericht van v1 en v1.1 identiek.
    expect(buildTrainingBlockContentV1_1Request(input)).toBe(buildTrainingBlockContentV1Request(input));
  });

  it("de Claude-provider gebruikt v1.1 en logt die promptversie", async () => {
    const entries: BlockContentGenerationLogEntry[] = [];
    const { service, parse } = claudeReturning(await productieDesign());
    const logged = withBlockContentLogging(service, { provider: "claude", promptVersion: TRAINING_BLOCK_CONTENT_V1_1_PROMPT_VERSION }, (e) => entries.push(e));
    await logged.generate(request("BLP-002", "blok-3"));
    expect((parse.mock.calls[0][0] as { system: string }).system).toBe(TRAINING_BLOCK_CONTENT_V1_1_INSTRUCTIONS);
    expect((parse.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content).toContain(BLOCK_GUIDANCE_V1_1["certum.bco.productie"]);
    expect(entries[0]).toMatchObject({ promptVersion: "training-block-content/v1.1", contentContractVersion: "block-content/v1" });
  });
});
