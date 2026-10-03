import { describe, expect, it, vi } from "vitest";
import { METHODOLOGY_STEPS } from "@/knowledge";
import {
  BC_ONLINE_BACKEND_TYPES_KNOWN,
  BC_ONLINE_BLOCK_CATALOG,
  NOT_EVIDENCED_CAPABILITIES,
  PLANNABLE_BLOCK_IDS,
  getCatalogBlock,
} from "@/knowledge/platform/bc-online-block-catalog";
import { hashPreflightText } from "@/modules/privacy";
import { BcOnlineBlockPlanSchema, checkBlockPlanInvariants, type BcOnlineBlockPlan } from "@/modules/block-plan";
import type { AnalysisOutcome, ReadyOutcome, SourceSegment } from "@/modules/training-agent/v2";
import {
  LearningArcSchema,
  MAX_INTENT_LENGTH,
} from "@/modules/training-blueprint/schema";
import {
  TrainingBlueprintSchema,
  checkBlueprintInvariants,
  getBlockPlanGenerationBlocker,
  getExportBlocker,
  type TrainingBlueprint,
} from "@/modules/training-blueprint";
import { MOCK_V2_BLOCKED, MOCK_V2_NEEDS_ADJUSTMENT, MOCK_V2_UNSUITABLE } from "@/services/analysis/mock/v2/mock-outcomes";
import { MockBlockPlanService } from "@/services/blueprint/mock/mock-block-plan-service";
import { MockTrainingBlueprintService } from "@/services/blueprint/mock/mock-blueprint-service";
import fixture from "../../../../test/fixtures/v2-baseline-ready-analyses.json";
import { runBlockPlanFlow, runBlueprintFlow, type BlueprintLogEntry } from "./blueprint-flow";

type FixtureCase = { kind: "casus"; input: string; segments: SourceSegment[]; analysis: ReadyOutcome };
const CASES = fixture.cases as unknown as Record<string, FixtureCase>;

/** BP-001 t/m BP-003 zoals vastgelegd in evals/training-blueprint (bestaande richtingen uit de V2-baseline). */
const BP = {
  "BP-001": { source: "CA-001", direction: "escalatie-begrenzen" },
  "BP-002": { source: "CA-006", direction: "grens-respecteren-en-werk-bespreken" },
  "BP-003": { source: "CA-008", direction: "volgorde-vervolgcontact" },
} as const;

async function ack(text: string, attested = true) {
  return { textHash: await hashPreflightText(text), acknowledgedFindingIds: [], syntheticDataAttested: attested };
}

function deps() {
  const generate = vi.fn((req: Parameters<MockTrainingBlueprintService["generate"]>[0]) => new MockTrainingBlueprintService().generate(req));
  const logs: BlueprintLogEntry[] = [];
  return { deps: { getService: () => ({ generate }), log: (e: BlueprintLogEntry) => logs.push(e) }, generate, logs };
}

async function blueprintFor(bp: keyof typeof BP): Promise<{ blueprint: TrainingBlueprint; c: FixtureCase }> {
  const c = CASES[BP[bp].source];
  const { deps: d } = deps();
  const result = await runBlueprintFlow({ kind: c.kind, text: c.input }, await ack(c.input), c.analysis, BP[bp].direction, d);
  if (result.status !== "blueprint") throw new Error(`geen blueprint: ${result.reason}`);
  return { blueprint: result.blueprint, c };
}

async function planFor(bp: keyof typeof BP): Promise<{ plan: BcOnlineBlockPlan; blueprint: TrainingBlueprint }> {
  const { blueprint } = await blueprintFor(bp);
  const result = await runBlockPlanFlow(blueprint, { status: "approved" }, { getService: () => new MockBlockPlanService(), log: () => {} });
  if (result.status !== "block_plan") throw new Error(`geen plan: ${result.reason}`);
  return { plan: result.blockPlan, blueprint };
}

describe("BC Online Block Catalog", () => {
  it("unieke Certum-ids; backend-types zijn expliciet onbekend", () => {
    const ids = BC_ONLINE_BLOCK_CATALOG.map((b) => b.certumCatalogId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("certum.bco."))).toBe(true);
    expect(BC_ONLINE_BACKEND_TYPES_KNOWN).toBe(false);
  });

  it("Vaste Start en Vast Einde zijn vaste onderdelen, geen planbare blokken", () => {
    expect(PLANNABLE_BLOCK_IDS).not.toContain("certum.bco.vaste-start");
    expect(PLANNABLE_BLOCK_IDS).not.toContain("certum.bco.vast-einde");
    expect(PLANNABLE_BLOCK_IDS).toHaveLength(BC_ONLINE_BLOCK_CATALOG.length - 2);
  });

  it("Conditionele logica is conditionele tekstweergave, geen branching", () => {
    const block = getCatalogBlock("certum.bco.conditionele-logica")!;
    expect(block.observedCapabilities).toEqual(["conditionele_tekstweergave"]);
    expect(BC_ONLINE_BLOCK_CATALOG.some((b) => (b.observedCapabilities as readonly string[]).includes("branching_routing"))).toBe(false);
    expect(NOT_EVIDENCED_CAPABILITIES.map((c) => c.id)).toContain("branching_routing");
  });

  it("legt bekende beperkingen vast: Poll zonder juist antwoord, berichten zonder antwoorden, Toets ≠ Certum Toets", () => {
    expect(getCatalogBlock("certum.bco.poll")!.observedCapabilities).toEqual(["poll_zonder_juist_antwoord"]);
    expect(getCatalogBlock("certum.bco.whatsapp-email")!.knownLimitations.join(" ")).toMatch(/niet .*antwoorden/);
    expect(getCatalogBlock("certum.bco.toets")!.knownLimitations.join(" ")).toMatch(/niet automatisch hetzelfde/);
  });

  it("learningArc-fasen zijn exact de Certum-methodiek, in dezelfde volgorde", () => {
    expect(Object.keys(LearningArcSchema.shape)).toEqual(METHODOLOGY_STEPS.map((s) => s.id));
  });
});

describe("Training Blueprint: BP-001 t/m BP-003 via de mockflow", () => {
  it.each(Object.keys(BP) as (keyof typeof BP)[])("%s: geldig, bij de gekozen richting, met zes fasen", async (bp) => {
    const { blueprint, c } = await blueprintFor(bp);
    const direction = c.analysis.trainingDirections.find((d) => d.id === BP[bp].direction)!;
    expect(blueprint.selectedDirectionId).toBe(BP[bp].direction);
    expect(blueprint.learningGoal).toBe(direction.proposedLearningGoal);
    expect(blueprint.professionalDilemma).toBe(c.analysis.professionalDilemma);
    expect(blueprint.sourceRefs).toEqual(direction.sourceRefs);
    expect(Object.keys(blueprint.learningArc)).toEqual(METHODOLOGY_STEPS.map((s) => s.id));
    expect(checkBlueprintInvariants(blueprint, { analysis: c.analysis, segments: c.segments })).toEqual([]);
  });

  it("behoudt ambiguïteit: BP-001, BP-002 en BP-003 hebben meerdere verdedigbare routes", async () => {
    expect((await blueprintFor("BP-001")).blueprint.ambiguity).toBe("multiple_defensible_actions");
    // BP-002: de richting laat open hoe de teamleider reageert; bron en richting dragen geen enkele normatieve route.
    const bp2 = (await blueprintFor("BP-002")).blueprint;
    expect(bp2.ambiguity).toBe("multiple_defensible_actions");
    expect(bp2.learningArc.feedback.multipleDefensibleHandling).toMatch(/niet welke route/);
    const bp3 = (await blueprintFor("BP-003")).blueprint;
    expect(bp3.ambiguity).toBe("multiple_defensible_actions");
    expect(bp3.learningArc.feedback.multipleDefensibleHandling).toMatch(/niet welke route/);
  });

  it("single_best_action alleen als de richting geen open keuze laat", async () => {
    const c = CASES["CA-006"];
    const direction = c.analysis.trainingDirections.find((d) => d.id === BP["BP-002"].direction)!;
    const closed = { ...direction, focus: "De teamleider erkent de grens en bespreekt daarna de gemiste deadlines." };
    const analysis = { ...c.analysis, trainingDirections: [closed] };
    const blueprint = await new MockTrainingBlueprintService().generate({
      input: { kind: c.kind, text: c.input },
      analysis,
      segments: c.segments,
      selectedDirectionId: closed.id,
    });
    expect(blueprint.ambiguity).toBe("single_best_action");
    expect(blueprint.learningArc.feedback.multipleDefensibleHandling).toBeNull();
  });

  it("source needs zijn te valideren kennisvragen, geen bronnen", async () => {
    const { blueprint } = await blueprintFor("BP-001");
    expect(blueprint.sourceNeeds.length).toBeLessThanOrEqual(3);
    expect(blueprint.sourceNeeds.every((n) => n.sourceType === "nog_te_bepalen" && n.question.startsWith("Welke gevalideerde kennis"))).toBe(true);
  });
});

describe("runBlueprintFlow: poorten", () => {
  const c = CASES["CA-001"];

  it.each<[string, AnalysisOutcome]>([
    ["blocked", MOCK_V2_BLOCKED],
    ["unsuitable", MOCK_V2_UNSUITABLE],
    ["needs_adjustment", MOCK_V2_NEEDS_ADJUSTMENT],
  ])("%s levert nooit een Blueprint op; service wordt niet aangeroepen", async (_, outcome) => {
    const { deps: d, generate } = deps();
    const result = await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), outcome, "escalatie-begrenzen", d);
    expect(result).toEqual({ status: "rejected", reason: "not_ready" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("onbekende richting wordt geweigerd", async () => {
    const { deps: d, generate } = deps();
    const result = await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), c.analysis, "bestaat-niet", d);
    expect(result).toEqual({ status: "rejected", reason: "unknown_direction" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("zonder synthetic-only-attestatie of bij een andere tekst: geweigerd", async () => {
    const { deps: d, generate } = deps();
    expect(await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input, false), c.analysis, "escalatie-begrenzen", d)).toEqual({ status: "rejected", reason: "input_gate" });
    expect(await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(`${c.input} x`), c.analysis, "escalatie-begrenzen", d)).toEqual({ status: "rejected", reason: "input_gate" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("een gemanipuleerde analyse (onbekende sourceRef) wordt geweigerd", async () => {
    const tampered = structuredClone(c.analysis);
    tampered.trainingDirections[0].sourceRefs = ["S99"];
    const { deps: d, generate } = deps();
    expect(await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), tampered, "escalatie-begrenzen", d)).toEqual({ status: "rejected", reason: "invalid_analysis" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("logt alleen metadata", async () => {
    const { deps: d, logs } = deps();
    await runBlueprintFlow({ kind: "casus", text: c.input }, await ack(c.input), c.analysis, "escalatie-begrenzen", d);
    expect(logs).toEqual([
      { event: "certum.blueprint", version: "blueprint-contract/v1", outcome: "success", ambiguity: "multiple_defensible_actions", sourceNeeds: 1, inputKind: "casus" },
    ]);
  });
});

describe("checkBlueprintInvariants", () => {
  const variant = async (change: (b: TrainingBlueprint) => void) => {
    const { blueprint, c } = await blueprintFor("BP-001");
    const copy = structuredClone(blueprint);
    change(copy);
    return checkBlueprintInvariants(copy, { analysis: c.analysis, segments: c.segments });
  };

  it.each<[string, (b: TrainingBlueprint) => void, string]>([
    ["ander leerdoel", (b) => (b.learningGoal = "De deelnemer kan iets anders."), "leerdoel-niet-gekoppeld"],
    ["ander dilemma", (b) => (b.professionalDilemma = "Een ander dilemma."), "dilemma-gewijzigd"],
    ["sourceRef buiten de richting", (b) => (b.sourceRefs = ["S1"]), "sourceref-buiten-richting"],
    ["onbekende sourceRef", (b) => (b.sourceRefs = ["S42"]), "onbekende-sourceref"],
    ["onbekende richting", (b) => (b.selectedDirectionId = "verzonnen"), "onbekende-richting"],
    ["meerdere routes zonder behandeling", (b) => (b.learningArc.feedback.multipleDefensibleHandling = null), "ambiguiteit-zonder-behandeling"],
    ["vaag succescriterium", (b) => (b.successCriteria = ["De deelnemer begrijpt het dilemma."]), "vaag-succescriterium"],
    ["verzonnen bron", (b) => (b.learningArc.bron.knowledgeQuestions = ["Wat zegt artikel 12 hierover?"]), "bronverwijzing-verzonnen"],
  ])("%s → %s", async (_, change, violation) => {
    expect(await variant(change)).toContain(violation);
  });

  it("één beste handelwijze mag geen behandeling van meerdere routes hebben", async () => {
    expect(await variant((b) => (b.ambiguity = "single_best_action"))).toContain("behandeling-zonder-ambiguiteit");
  });

  it.each<[string, (b: TrainingBlueprint) => void]>([
    ["4 succescriteria", (b) => (b.successCriteria = ["a", "b", "c", "d"])],
    ["4 aannames", (b) => (b.assumptions = Array(4).fill(b.assumptions[0]))],
    ["4 source needs", (b) => (b.sourceNeeds = Array(4).fill(b.sourceNeeds[0]))],
    ["uitgeschreven content (te lang)", (b) => (b.learningArc.actie.participantMust = "Professional: ...\nOuder: ...\n".repeat(60))],
    ["onbekende ambiguïteit", (b) => ((b as { ambiguity: string }).ambiguity = "misschien")],
    ["zevende fase", (b) => ((b.learningArc as Record<string, unknown>).extra = { x: "y" })],
  ])("schema weigert: %s", async (_, change) => {
    const { blueprint } = await blueprintFor("BP-001");
    const copy = structuredClone(blueprint);
    change(copy);
    expect(TrainingBlueprintSchema.safeParse(copy).success).toBe(false);
  });

  it("de maximale intentielengte is te kort voor uitgeschreven content", () => {
    expect(MAX_INTENT_LENGTH).toBeLessThanOrEqual(600);
  });
});

describe("BC Online Block Plan", () => {
  it("menselijke goedkeuring van de Blueprint is verplicht; service wordt anders niet aangeroepen", async () => {
    const { blueprint } = await blueprintFor("BP-001");
    const generate = vi.fn();
    const result = await runBlockPlanFlow(blueprint, { status: "concept" }, { getService: () => ({ generate }), log: () => {} });
    expect(result).toEqual({ status: "rejected", reason: "blueprint_not_approved" });
    expect(generate).not.toHaveBeenCalled();
    expect(getBlockPlanGenerationBlocker({ status: "approved" })).toBeNull();
  });

  it.each(Object.keys(BP) as (keyof typeof BP)[])("%s: geldig plan met alleen bestaande catalogusblokken", async (bp) => {
    const { plan, blueprint } = await planFor(bp);
    expect(checkBlockPlanInvariants(plan, blueprint)).toEqual([]);
    expect(plan.plannedBlocks.every((b) => (PLANNABLE_BLOCK_IDS as string[]).includes(b.catalogBlockId))).toBe(true);
    expect(plan.courseShell).toMatchObject({ skjPoints: null, status: "concept", title: blueprint.title });
  });

  it("een Certum-fase kan meerdere blokken hebben en één bloktype kan in meerdere fasen voorkomen", async () => {
    const { plan } = await planFor("BP-003");
    expect(plan.plannedBlocks.filter((b) => b.certumPhase === "toets").length).toBeGreaterThan(1);
    const phasesOfOpenQuestion = new Set(plan.plannedBlocks.filter((b) => b.catalogBlockId === "certum.bco.open-vraag").map((b) => b.certumPhase));
    expect(phasesOfOpenQuestion.size).toBeGreaterThan(1);
    const phasesOfAiFeedback = new Set(plan.plannedBlocks.filter((b) => b.catalogBlockId === "certum.bco.ai-feedback").map((b) => b.certumPhase));
    expect([...phasesOfAiFeedback]).toEqual(["feedback", "toets"]);
  });

  it("capability gap zonder fictief blok (BP-003: route-afhankelijke vervolgstappen)", async () => {
    const { plan } = await planFor("BP-003");
    expect(plan.capabilityGaps).toHaveLength(1);
    expect(plan.capabilityGaps[0].need).toMatch(/branching/);
    expect(plan.capabilityGaps[0].workaround?.type).toBe("partial");
    expect(plan.capabilityGaps[0].workaround?.description).toMatch(/Conditionele logica/);
    expect(plan.plannedBlocks.every((b) => getCatalogBlock(b.catalogBlockId))).toBe(true);
  });

  it("regressie: een workaround maakt branching niet ondersteund en laat het gat bestaan", async () => {
    // Branching blijft unsupported; Conditionele logica blijft conditionele tekstweergave.
    expect(NOT_EVIDENCED_CAPABILITIES.map((c) => c.id)).toContain("branching_routing");
    expect(getCatalogBlock("certum.bco.conditionele-logica")!.observedCapabilities).toEqual(["conditionele_tekstweergave"]);

    const { plan, blueprint } = await planFor("BP-003");
    const gap = plan.capabilityGaps.find((g) => /branching/.test(g.need))!;
    // Het gat bestaat óók met workaround, en de workaround is expliciet gedeeltelijk.
    expect(gap.workaround).not.toBeNull();
    expect(gap.workaround!.type).toBe("partial");
    expect(gap.workaround!.limitation).toMatch(/conditionele tekstweergave/);
    expect(gap.workaround!.limitation).toMatch(/branching blijft niet ondersteund/);
    // Geen blok claimt branching: Conditionele logica komt niet als route-vervanger in het plan.
    expect(plan.plannedBlocks.some((b) => b.catalogBlockId === "certum.bco.conditionele-logica")).toBe(false);
    expect(checkBlockPlanInvariants(plan, blueprint)).toEqual([]);

    // Het contract kent geen "volledige" workaround en geen workaround als losse tekst.
    const full = structuredClone(plan);
    (full.capabilityGaps[0].workaround as { type: string }).type = "full";
    expect(BcOnlineBlockPlanSchema.safeParse(full).success).toBe(false);
    const freeText = structuredClone(plan) as unknown as { capabilityGaps: { workaround: unknown }[] };
    freeText.capabilityGaps[0].workaround = "Conditionele logica lost dit op.";
    expect(BcOnlineBlockPlanSchema.safeParse(freeText).success).toBe(false);
    const noLimitation = structuredClone(plan) as unknown as { capabilityGaps: { workaround: Record<string, unknown> }[] };
    delete noLimitation.capabilityGaps[0].workaround.limitation;
    expect(BcOnlineBlockPlanSchema.safeParse(noLimitation).success).toBe(false);
  });

  it("chatsimulatie zonder sleutelwoorddoel en Toets zonder formeel Toetsblok zijn geldig (BP-001)", async () => {
    const { plan, blueprint } = await planFor("BP-001");
    const chats = plan.plannedBlocks.filter((b) => b.catalogBlockId === "certum.bco.chat-simulatie");
    expect(chats.length).toBeGreaterThan(0);
    expect(chats[0].configurationIntent.find((c) => c.setting === "gespreksdoel")?.intent).toMatch(/Geen sleutelwoorddoel/);
    expect(plan.plannedBlocks.some((b) => b.catalogBlockId === "certum.bco.toets")).toBe(false);
    expect(checkBlockPlanInvariants(plan, blueprint)).toEqual([]);
  });

  it.each<[string, (p: BcOnlineBlockPlan) => void]>([
    ["onbekend bloktype", (p) => ((p.plannedBlocks[0] as { catalogBlockId: string }).catalogBlockId = "certum.bco.vr-headset")],
    ["vast blok als los blok", (p) => ((p.plannedBlocks[0] as { catalogBlockId: string }).catalogBlockId = "certum.bco.vaste-start")],
    ["SKJ-punten automatisch ingevuld", (p) => ((p.courseShell as { skjPoints: unknown }).skjPoints = 2)],
    ["status anders dan concept", (p) => ((p.courseShell as { status: string }).status = "gepubliceerd")],
  ])("schema weigert: %s", async (_, change) => {
    const { plan } = await planFor("BP-001");
    const copy = structuredClone(plan);
    change(copy);
    expect(BcOnlineBlockPlanSchema.safeParse(copy).success).toBe(false);
  });

  it("Meerkeuze met één juist antwoord in Actie bij meerdere verdedigbare routes wordt geweigerd", async () => {
    const { plan, blueprint } = await planFor("BP-003");
    const copy = structuredClone(plan);
    copy.plannedBlocks.find((b) => b.certumPhase === "actie")!.catalogBlockId = "certum.bco.meerkeuze";
    expect(checkBlockPlanInvariants(copy, blueprint)).toContain("juist-antwoord-bij-meerdere-routes");
  });

  it("iedere fase heeft een blok of een capability gap; titel volgt de Blueprint", async () => {
    const { plan, blueprint } = await planFor("BP-001");
    const noBron = structuredClone(plan);
    noBron.plannedBlocks = noBron.plannedBlocks.filter((b) => b.certumPhase !== "bron").map((b, i) => ({ ...b, sequence: i + 1 }));
    expect(checkBlockPlanInvariants(noBron, blueprint)).toContain("fase-zonder-blok-of-gap");
    noBron.capabilityGaps = [{ certumPhase: "bron", need: "Gevalideerde bron", whyNeeded: "Nog niet gevalideerd", workaround: null }];
    expect(checkBlockPlanInvariants(noBron, blueprint)).not.toContain("fase-zonder-blok-of-gap");
    expect(checkBlockPlanInvariants({ ...plan, courseShell: { ...plan.courseShell, title: "Anders" } }, blueprint)).toContain("titel-wijkt-af");
  });
});

describe("Export naar BC Online", () => {
  it("vereist beide menselijke goedkeuringen en blijft in V1 geblokkeerd zonder adapter", () => {
    expect(getExportBlocker({ status: "concept" }, { status: "concept" })).toBe("blueprint_not_approved");
    expect(getExportBlocker({ status: "approved" }, { status: "concept" })).toBe("block_plan_not_approved");
    expect(getExportBlocker({ status: "approved" }, { status: "approved" })).toBe("adapter_not_available");
  });
});
