import { describe, expect, it } from "vitest";
import { buildBlockContentGenerationInput, resolveBlockTarget } from "@/modules/block-content";
import type { ValidatedSource } from "@/modules/sources";
import { fixtureCase } from "../../../test/block-content-fixtures";
import { BRON_GUIDANCE } from "./training-block-content-v1";
import { buildTrainingBlockContentV1_2Request } from "./training-block-content-v1-2";

/*
 * Prompt training-block-content/v1.2: een Bron-blok krijgt alleen de relevante gevalideerde bronnen mee, met de
 * instructie uitsluitend daaruit te schrijven. Zonder gevalideerde bronnen blijft het verzoek gelijk aan v1.1.
 */

const ctx = fixtureCase("BLP-001");
const bronId = ctx.blockPlan.plannedBlocks.find((b) => b.certumPhase === "bron")!.id;
const source = (over: Partial<ValidatedSource> = {}): ValidatedSource => ({
  sourceId: "src-1",
  revisionId: "rev-1",
  title: "Synthetische richtlijn",
  sourceType: "guideline",
  author: null,
  publisher: null,
  publicationDate: null,
  url: null,
  sourceNeedRefs: ctx.blueprint.sourceNeeds.map((s) => s.id),
  relevantContent: "Synthetische passage PX-19.",
  ...over,
});

function request(sources: ValidatedSource[], plannedBlockId = bronId) {
  const target = resolveBlockTarget(ctx.blueprint, ctx.blockPlan, plannedBlockId, sources)!;
  return buildTrainingBlockContentV1_2Request({ ...buildBlockContentGenerationInput({ ...ctx, target, approvedEarlierContent: [] }), contractVersion: "block-content/v1" });
}

describe("training-block-content/v1.2", () => {
  it("een Bron-blok met gevalideerde bronnen krijgt alleen die bronnen en de bron-instructie", () => {
    const text = request([source()]);
    expect(text).toContain("<gevalideerde_bronnen>");
    expect(text).toContain("PX-19");
    expect(text).not.toContain(BRON_GUIDANCE);
  });

  it("zonder gevalideerde bronnen geen bronnenblok en de gewone Bron-instructie", () => {
    const text = request([]);
    expect(text).not.toContain("<gevalideerde_bronnen>");
    expect(text).toContain(BRON_GUIDANCE);
  });

  it("een bron voor een andere sourceNeed komt niet in het verzoek", () => {
    const text = request([source({ sourceNeedRefs: ["SN9"], relevantContent: "Andere passage QQ-2." })]);
    expect(text).not.toContain("QQ-2");
  });

  it("andere blokken krijgen geen bronnen mee", () => {
    const other = ctx.blockPlan.plannedBlocks.find((b) => b.certumPhase !== "bron")!.id;
    expect(request([source()], other)).not.toContain("PX-19");
  });
});
