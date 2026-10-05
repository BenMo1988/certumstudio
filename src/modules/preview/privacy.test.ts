import { describe, expect, it } from "vitest";
import type { TrainingContentPackage } from "@/modules/block-content";
import fixture from "../../../test/fixtures/tr-0018-package.json";
import { approvedVisibleEntities, evaluatePreviewPrivacy } from "./privacy";
import { buildPreview } from "./view";

/*
 * Step 17B-fix (`preview_privacy_context_false_positive`), op het goedgekeurde pakket van TR-0018. In de Transfer-chat
 * (blok-6) introduceert de goedgekeurde training zelf de synthetische naam "Noor".
 */

const pkg = fixture.package as unknown as TrainingContentPackage;
const preview = buildPreview(pkg);
const ACTION_CHAT = "blok-2";
const TRANSFER_CHAT = "blok-6";
const transferSet = approvedVisibleEntities(preview, TRANSFER_CHAT);

describe("vertrouwde set: alleen wat de deelnemer tot en met deze stap kon zien", () => {
  it("de scenarionaam uit de Transfer-chat is vertrouwd in die stap", () => {
    expect(transferSet.has("Noor")).toBe(true);
  });

  it("een naam uit een latere stap is in een eerdere stap nog niet vertrouwd", () => {
    expect(approvedVisibleEntities(preview, ACTION_CHAT).has("Noor")).toBe(false);
    expect(evaluatePreviewPrivacy(["Ik begrijp dat Noor dit lastig vindt."], approvedVisibleEntities(preview, ACTION_CHAT)).decision).toBe("blocked");
  });

  it("verborgen velden (persona-instructies) leveren geen vertrouwde namen", () => {
    const hidden = structuredClone(pkg);
    const block = hidden.blocks.find((b) => b.plannedBlockId === ACTION_CHAT)!;
    if (block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.chat-simulatie") throw new Error("geen chat");
    block.body.content.personaInstructions += " Je praat ook over collega Gerrit.";
    expect(approvedVisibleEntities(buildPreview(hidden), ACTION_CHAT).has("Gerrit")).toBe(false);
  });

  it("een onbekend blok levert geen vrijstelling", () => {
    expect(approvedVisibleEntities(preview, "blok-onbekend").size).toBe(0);
  });
});

describe("besluit: bestaande preflight leidend, smalle exacte vrijstelling", () => {
  it("de scenarionaam alleen: toegestaan, als vrijgestelde bevinding geteld", () => {
    expect(evaluatePreviewPrivacy(["Ik begrijp dat Noor dit lastig vindt, en ik wil haar vertrouwen niet beschamen."], transferSet)).toEqual({
      decision: "allowed",
      blockingCategories: [],
      preflightStatus: "review_required",
      categories: { possible_person_name: 1 },
      approvedEntityMatches: 1,
    });
  });

  it("geen fuzzy matching: 'Noor Bakker' matcht niet met 'Noor'", () => {
    expect(evaluatePreviewPrivacy(["Ik heb het met Noor Bakker besproken."], transferSet)).toMatchObject({ decision: "blocked", blockingCategories: ["possible_person_name"], approvedEntityMatches: 0 });
  });

  it("naast de scenarionaam een onbekende naam: het hele bericht blijft geblokkeerd", () => {
    expect(evaluatePreviewPrivacy(["Ik spreek eerst Noor en daarna ook Sanne."], transferSet)).toMatchObject({ decision: "blocked", approvedEntityMatches: 1 });
  });

  it("blocked-categorieën worden nooit vrijgesteld, ook niet naast een vertrouwde naam", () => {
    expect(evaluatePreviewPrivacy(["Ik mail Noor via noor@example.nl."], transferSet)).toMatchObject({ decision: "blocked", blockingCategories: ["email"], preflightStatus: "blocked" });
  });

  it("andere review_required-categorieën worden niet vrijgesteld", () => {
    expect(evaluatePreviewPrivacy(["Ik zie Noor op 12 maart 2026 weer."], transferSet)).toMatchObject({ decision: "blocked", blockingCategories: ["full_date"] });
  });

  it("de vrijstelling geldt per tekst ook voor meerdere antwoorden (AI Feedback)", () => {
    expect(evaluatePreviewPrivacy(["Noor vertrouwde mij iets toe. Ik sprak Noor later opnieuw.", "Geen namen hier."], transferSet).decision).toBe("allowed");
    expect(evaluatePreviewPrivacy(["Ik sprak later opnieuw met Noor.", "Ik sprak ook met Pieter."], transferSet).decision).toBe("blocked");
  });

  it("zonder bevindingen is het besluit toegestaan zonder vrijstelling", () => {
    expect(evaluatePreviewPrivacy(["Ik zou eerst vragen wat de leerling zelf wil."], transferSet)).toMatchObject({ decision: "allowed", preflightStatus: "safe", approvedEntityMatches: 0 });
  });
});
