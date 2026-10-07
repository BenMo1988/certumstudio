import { describe, expect, it } from "vitest";
import fixture from "../../../test/fixtures/tr-0014.json";
import { PlannedBlockAdditionSchema, applyPlannedBlockAddition, type PlannedBlockAddition } from "./compose";
import type { BcOnlineBlockPlan } from "./schema";

/* Human Block Plan Override, toevoegen: pure invoeglogica op het TR-0014-plan (9 blokken, blok-1 t/m blok-9). */

const plan = fixture.blockPlan as unknown as BcOnlineBlockPlan;
const block: PlannedBlockAddition["block"] = {
  certumPhase: "toets",
  catalogBlockId: "certum.bco.open-vraag",
  purpose: "Formele pilottoets, casus A: drie deelopdrachten.",
  whyThisBlock: "Een open antwoord maakt de afweging zichtbaar voor menselijke beoordeling.",
  configurationIntent: [{ setting: "vraagintentie", intent: "Drie genummerde deelopdrachten." }],
};
const order = (p: BcOnlineBlockPlan) => [...p.plannedBlocks].sort((a, b) => a.sequence - b.sequence).map((b) => b.id);

describe("applyPlannedBlockAddition", () => {
  it("aan het einde: nieuw id blok-10, volgorde 1..n, bestaande ids en volgorde onveranderd", () => {
    const result = applyPlannedBlockAddition(plan, { block, placement: { position: "end" } })!;
    expect(result.addedBlockId).toBe("blok-10");
    expect(order(result.plan)).toEqual([...order(plan), "blok-10"]);
    expect(result.plan.plannedBlocks.map((b) => b.sequence).sort((a, b) => a - b)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
    expect(result.plan.plannedBlocks.find((b) => b.id === "blok-10")).toMatchObject({ ...block, sequence: 10 });
  });

  it("vóór en na een bestaand blok; latere blokken schuiven deterministisch door", () => {
    const before = applyPlannedBlockAddition(plan, { block, placement: { position: "before", anchorBlockId: "blok-9" } })!;
    expect(order(before.plan).slice(-3)).toEqual(["blok-8", "blok-10", "blok-9"]);
    const after = applyPlannedBlockAddition(plan, { block, placement: { position: "after", anchorBlockId: "blok-5" } })!;
    expect(order(after.plan).slice(4, 7)).toEqual(["blok-5", "blok-10", "blok-6"]);
    for (const p of [before.plan, after.plan]) {
      expect(new Set(p.plannedBlocks.map((b) => b.id)).size).toBe(10);
      expect(new Set(p.plannedBlocks.map((b) => b.sequence)).size).toBe(10);
    }
  });

  it("het origineel blijft ongewijzigd en een onbekend anker levert null", () => {
    const snapshot = structuredClone(plan);
    applyPlannedBlockAddition(plan, { block, placement: { position: "after", anchorBlockId: "blok-2" } });
    expect(plan).toEqual(snapshot);
    expect(applyPlannedBlockAddition(plan, { block, placement: { position: "before", anchorBlockId: "blok-99" } })).toBeNull();
  });

  it("een tweede toevoeging krijgt weer een nieuw, uniek id", () => {
    const first = applyPlannedBlockAddition(plan, { block, placement: { position: "end" } })!;
    const second = applyPlannedBlockAddition(first.plan, { block, placement: { position: "end" } })!;
    expect(second.addedBlockId).toBe("blok-11");
  });

  it("het schema accepteert geen id, sequence of extra velden van de client", () => {
    expect(PlannedBlockAdditionSchema.safeParse({ block: { ...block, id: "blok-3" }, placement: { position: "end" } }).success).toBe(false);
    expect(PlannedBlockAdditionSchema.safeParse({ block: { ...block, sequence: 1 }, placement: { position: "end" } }).success).toBe(false);
    expect(PlannedBlockAdditionSchema.safeParse({ block: { ...block, estimatedMinutes: 10 }, placement: { position: "end" } }).success).toBe(false);
    expect(PlannedBlockAdditionSchema.safeParse({ block, placement: { position: "before" } }).success).toBe(false);
    expect(PlannedBlockAdditionSchema.safeParse({ block: { ...block, catalogBlockId: "certum.bco.verzonnen" }, placement: { position: "end" } }).success).toBe(false);
  });
});
