import { describe, expect, it } from "vitest";
import { buildBlockContentGenerationInput, resolveBlockTarget } from "@/modules/block-content";
import { ACCREDITATION_FIELDS, CONTENT_FIELDS } from "@/modules/block-content/schema";
import type { ValidatedSource } from "@/modules/sources";
import { CLAUDE_BLOCK_CONTENT_DEFAULTS } from "@/services/block-content/config";
import { MockBlockContentService } from "@/services/block-content/mock/mock-block-content-service";
import { fixtureCase, type PlanCaseId } from "../../../test/block-content-fixtures";
import { TRAINING_BLOCK_CONTENT_V1_2_INSTRUCTIONS, buildTrainingBlockContentV1_2Request } from "./training-block-content-v1-2";
import {
  BLOCK_CONTENT_LENGTH_BUDGETS,
  TRAINING_BLOCK_CONTENT_V1_3_INSTRUCTIONS,
  TRAINING_BLOCK_CONTENT_V1_3_PROMPT_VERSION,
  buildTrainingBlockContentV1_3Request,
} from "./training-block-content-v1-3";

/*
 * Prompt training-block-content/v1.3: expliciete lengtebudgetten (Tekst ≤ 3600, Open vraag ≤ 500) onder de ongewijzigde
 * schemagrenzen (4000 en 600). Aanleiding: TR-0019 `too_big@result.content.question:max=600`. 0 AI-aanroepen.
 */

type Ctx = ReturnType<typeof fixtureCase>;
const CASES: PlanCaseId[] = ["BLP-001", "BLP-002", "BLP-003"];

/** Eerste blok van dit type (optioneel in deze fase) over de vaste fixtures heen. */
function find(catalogBlockId: string, phase?: string): { ctx: Ctx; id: string } {
  for (const c of CASES) {
    const ctx = fixtureCase(c);
    const block = ctx.blockPlan.plannedBlocks.find((b) => b.catalogBlockId === catalogBlockId && (phase === undefined || b.certumPhase === phase));
    if (block) return { ctx, id: block.id };
  }
  throw new Error(`geen fixtureblok ${catalogBlockId}`);
}

function input(ctx: Ctx, id: string, sources: ValidatedSource[] = []) {
  const target = resolveBlockTarget(ctx.blueprint, ctx.blockPlan, id, sources)!;
  return { ...buildBlockContentGenerationInput({ ...ctx, target, approvedEarlierContent: [] }), contractVersion: "block-content/v1" };
}

const source = (refs: string[]): ValidatedSource => ({
  sourceId: "src-1",
  revisionId: "rev-1",
  title: "Synthetische richtlijn",
  sourceType: "guideline",
  author: null,
  publisher: null,
  publicationDate: null,
  url: null,
  sourceNeedRefs: refs,
  relevantContent: "Synthetische passage PX-19.",
});

describe("training-block-content/v1.3: lengtebudget", () => {
  it("de system-instructie bevat beide budgetten en is verder exact v1.2", () => {
    expect(TRAINING_BLOCK_CONTENT_V1_3_PROMPT_VERSION).toBe("training-block-content/v1.3");
    expect(TRAINING_BLOCK_CONTENT_V1_3_INSTRUCTIONS).toContain('"text" maximaal 3600 tekens');
    expect(TRAINING_BLOCK_CONTENT_V1_3_INSTRUCTIONS).toContain('"question" maximaal 500 tekens');
    expect(TRAINING_BLOCK_CONTENT_V1_3_INSTRUCTIONS.replace(/## Lengtebudget[\s\S]*?(?=## Taal en toon)/, "")).toBe(TRAINING_BLOCK_CONTENT_V1_2_INSTRUCTIONS);
  });

  it("een Tekst-blok krijgt de budgetregel ≤ 3600; verder is het verzoek exact v1.2", () => {
    const { ctx, id } = find("certum.bco.tekst");
    const v13 = buildTrainingBlockContentV1_3Request(input(ctx, id));
    expect(v13).toBe(`${buildTrainingBlockContentV1_2Request(input(ctx, id))}\n\nLengtebudget voor dit blok: "text" maximaal 3600 tekens.`);
  });

  it("een Open vraag krijgt de budgetregel ≤ 500", () => {
    const { ctx, id } = find("certum.bco.open-vraag");
    expect(buildTrainingBlockContentV1_3Request(input(ctx, id))).toContain('Lengtebudget voor dit blok: "question" maximaal 500 tekens.');
  });

  it("Bron-blokken krijgen het budget ook (ze krijgen de blokaanwijzing niet) en houden de broninstructies", () => {
    for (const [type, line] of [
      ["certum.bco.tekst", '"text" maximaal 3600 tekens.'],
      ["certum.bco.open-vraag", '"question" maximaal 500 tekens.'],
    ] as const) {
      const { ctx, id } = find(type, "bron");
      const refs = ctx.blueprint.sourceNeeds.map((s) => s.id);
      const text = buildTrainingBlockContentV1_3Request(input(ctx, id, [source(refs)]));
      expect(text).toContain("<gevalideerde_bronnen>");
      expect(text).toContain("PX-19");
      expect(text).toContain(`Lengtebudget voor dit blok: ${line}`);
    }
    expect(TRAINING_BLOCK_CONTENT_V1_3_INSTRUCTIONS).toContain("## Bron-inhoud alleen uit gevalideerde bronnen");
  });

  it("andere bloktypes krijgen geen budgetregel: hun verzoek is exact v1.2", () => {
    const { ctx, id } = find("certum.bco.chat-simulatie");
    expect(buildTrainingBlockContentV1_3Request(input(ctx, id))).toBe(buildTrainingBlockContentV1_2Request(input(ctx, id)));
  });
});

describe("schema en contract ongewijzigd", () => {
  it("schemagrenzen blijven Tekst 4000 en Open vraag 600; de budgetten liggen eronder", () => {
    expect(CONTENT_FIELDS["certum.bco.tekst"].text.safeParse("x".repeat(4000)).success).toBe(true);
    expect(CONTENT_FIELDS["certum.bco.tekst"].text.safeParse("x".repeat(4001)).success).toBe(false);
    expect(CONTENT_FIELDS["certum.bco.open-vraag"].question.safeParse("x".repeat(600)).success).toBe(true);
    expect(CONTENT_FIELDS["certum.bco.open-vraag"].question.safeParse("x".repeat(601)).success).toBe(false);
    expect(BLOCK_CONTENT_LENGTH_BUDGETS["certum.bco.tekst"].maxChars).toBeLessThan(4000);
    expect(BLOCK_CONTENT_LENGTH_BUDGETS["certum.bco.open-vraag"].maxChars).toBeLessThan(600);
  });

  it("assessmentRole, estimatedMinutes en sourceNeedRefs: contract ongewijzigd", () => {
    expect(ACCREDITATION_FIELDS.assessmentRole.options).toEqual(["none", "formative", "summative", "transfer"]);
    expect(ACCREDITATION_FIELDS.estimatedMinutes.safeParse(1).success).toBe(true);
    expect(ACCREDITATION_FIELDS.estimatedMinutes.safeParse(120).success).toBe(true);
    expect(ACCREDITATION_FIELDS.estimatedMinutes.safeParse(121).success).toBe(false);
    expect(ACCREDITATION_FIELDS.estimatedMinutes.safeParse(null).success).toBe(true);
    expect(ACCREDITATION_FIELDS.sourceNeedRefs.safeParse(["SN1", "SN2", "SN3"]).success).toBe(true);
    expect(ACCREDITATION_FIELDS.sourceNeedRefs.safeParse(["SN1", "SN2", "SN3", "SN4"]).success).toBe(false);
  });

  it("geen automatische retry: maxRetries blijft 0", () => {
    expect(CLAUDE_BLOCK_CONTENT_DEFAULTS.maxRetries).toBe(0);
  });

  it("mock-output voor Tekst en Open vraag blijft geldig", async () => {
    const mock = new MockBlockContentService();
    for (const type of ["certum.bco.tekst", "certum.bco.open-vraag"]) {
      const { ctx, id } = find(type);
      const block = await mock.generate({ ...ctx, plannedBlockId: id, approvedEarlierContent: [] });
      expect(block.body.status).toBe("generated");
    }
  });
});

describe("eval-fixture: Bron → Open vraag (zoals TR-0019 blok-10)", () => {
  // Synthetische referentie van de beoogde opdracht: één eigen reactie kiezen, aanscherpen, kort uitleggen wat en
  // waarom. Geen modelantwoord; alleen bewijs dat deze functie ruim binnen het budget past.
  const QUESTION =
    "Kies één reactie die je eerder in het gesprek met Erik gaf.\n1. Schrijf die reactie opnieuw of scherper op, met de bronprincipes uit het vorige blok in gedachten.\n2. Benoem kort wat je inhoudelijk hebt veranderd en waarom.";

  it("de beoogde opdracht past ruim binnen 500 tekens en binnen het schema", () => {
    expect(QUESTION.length).toBeLessThanOrEqual(300);
    expect(CONTENT_FIELDS["certum.bco.open-vraag"].question.safeParse(QUESTION).success).toBe(true);
  });
});
