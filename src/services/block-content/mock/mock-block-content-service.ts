import { METHODOLOGY_STEPS } from "@/knowledge";
import {
  DEFAULT_ASSESSMENT_ROLE,
  type BlockContentDesign,
  type BlockContentResult,
  type BlockPayloadDesign,
  type BlockTarget,
  type FrameContent,
} from "@/modules/block-content";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import { finalizeBlockContent, finalizeFrame, targetOf } from "../finalize";
import type { BlockContentRequest, BlockContentService, FrameContentRequest } from "../services";

/** Kapt een tekst af op de maximale veldlengte; de mock leidt alles af uit Blueprint en plan. */
const fit = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

const MINUTES: Partial<Record<string, number>> = {
  "certum.bco.tekst": 3,
  "certum.bco.whatsapp-email": 2,
  "certum.bco.meerkeuze": 2,
  "certum.bco.open-vraag": 5,
  "certum.bco.poll": 1,
  "certum.bco.chat-simulatie": 10,
  "certum.bco.informatie-opvragen": 5,
  "certum.bco.ai-feedback": 3,
  "certum.bco.conditionele-logica": 1,
  "certum.bco.productie": 15,
  "certum.bco.toets": 10,
};

/**
 * Mock Block Content. Deterministisch, zonder netwerk; leidt alle inhoud af uit de goedgekeurde Blueprint en het
 * doelblok en volgt daarna exact dezelfde weg als de Claude-provider (ontwerpschema → compose → Zod → invarianten).
 *
 * Krijgt alleen doelblokken die gegenereerd kunnen worden: Bron, media en blokken zonder aantoonbare context lost de
 * server zelf op (`resolveDeterministicResult`), zonder provider.
 * - Chat simulatie zonder gespreksdoel en zonder tijdslimiet (sleutelwoorden zijn geen beoordeling van redeneren).
 * - AI Feedback noemt alleen de aantoonbare context; niet-aangetoonde context wordt expliciet uitgesloten.
 */
export class MockBlockContentService implements BlockContentService {
  async generate(request: BlockContentRequest): Promise<BlockContentResult> {
    const target = targetOf(request);
    return finalizeBlockContent({ result: designFor(target, request.blueprint) }, target, request);
  }

  async generateFrame(request: FrameContentRequest): Promise<FrameContent> {
    const { blockPlan } = request;
    return finalizeFrame(
      {
        introduction: blockPlan.startIntent.explanationIntent,
        closingText: blockPlan.endIntent.closingIntent,
        summary: blockPlan.endIntent.summaryIntent,
      },
      request,
    );
  }
}

/** Testmarkering in broninhoud: de mock behandelt de bron dan als inhoudelijk onvoldoende (blijft needs_source). */
export const MOCK_INSUFFICIENT_SOURCE = "#onvoldoende";

function designFor(target: BlockTarget, blueprint: TrainingBlueprintV2): BlockContentDesign {
  const { block } = target;
  const accreditation = {
    learningGoalContribution: fit(block.purpose, 500),
    assessmentRole: DEFAULT_ASSESSMENT_ROLE[block.certumPhase],
    estimatedMinutes: MINUTES[block.catalogBlockId] ?? null,
    // Een Bron-blok steunt op de vereiste sourceNeeds; andere blokken niet.
    sourceNeedRefs: target.sourcesCover ? target.requiredSourceNeedIds : [],
  };
  // Bron met onvoldoende broninhoud: eerlijk needs_source in plaats van kennis aanvullen.
  if (target.sourcesCover && target.sources.some((s) => s.relevantContent.includes(MOCK_INSUFFICIENT_SOURCE))) {
    return {
      status: "needs_source",
      accreditation: { ...accreditation, estimatedMinutes: null },
      whatToValidate: "De aangeleverde broninhoud is onvoldoende om de kennisvraag te beantwoorden.",
      generatableAfterValidation: fit(`Na aanvulling van de bron: ${block.purpose}`, 1000),
    };
  }
  return { status: "generated", accreditation, content: contentFor(target, blueprint) };
}

/** Bron-tekst uitsluitend uit de aangeleverde gevalideerde broninhoud. */
const fromSources = (target: BlockTarget) => target.sources.map((s) => `${s.title}: ${s.relevantContent}`).join("\n\n");

function contentFor(target: BlockTarget, blueprint: TrainingBlueprintV2): BlockPayloadDesign {
  const { block } = target;
  const phase = METHODOLOGY_STEPS.find((s) => s.id === block.certumPhase)?.label ?? block.certumPhase;
  const title = fit(`${phase}: ${target.workform}`, 120);
  const arc = blueprint.learningArc;
  const situation = block.certumPhase === "toets" ? arc.toets.newDecisionPoint : blueprint.scenarioPremise;

  switch (block.catalogBlockId) {
    case "certum.bco.tekst":
      return { title, text: fit(target.sourcesCover ? fromSources(target) : situation, 4000) };
    case "certum.bco.whatsapp-email":
      return {
        title,
        messageType: "whatsapp",
        messages: [{ sender: "Collega (fictief)", time: null, body: fit(arc.context.tensionArises, 1500) }],
      };
    case "certum.bco.meerkeuze":
      return {
        title,
        question: fit(blueprint.decisionPoint.task, 600),
        options: [fit(blueprint.successCriteria[0], 300), "Afwachten zonder iets te doen."],
        correctOptionIndex: 0,
        feedback: null,
      };
    case "certum.bco.open-vraag": {
      const question =
        block.certumPhase === "reflectie"
          ? `${arc.reflectie.looksBackOn} ${arc.reflectie.explicitTradeOff}`
          : block.certumPhase === "toets"
            ? arc.toets.demonstrate
            : blueprint.decisionPoint.task;
      return { title, question: fit(question, 600), exampleAnswer: null, feedback: null };
    }
    case "certum.bco.poll":
      return {
        title,
        question: fit(blueprint.decisionPoint.task, 600),
        options: ["Ik kies de eerste route die ik zie.", "Ik kies een andere route.", "Ik wil eerst meer weten."],
      };
    case "certum.bco.chat-simulatie":
      return {
        title,
        personaName: "Fictieve gesprekspartner",
        personaInstructions: fit(
          `Je speelt de betrokkene tegenover: ${blueprint.participantRole} Blijf binnen de situatie zoals beschreven en voeg geen nieuwe gebeurtenissen toe.`,
          3000,
        ),
        scenarioContext: fit(situation, 2000),
        firstMessage: fit(arc.context.tensionArises, 800),
        goal: null,
        timeLimitMinutes: null,
      };
    case "certum.bco.informatie-opvragen":
      return { title, instruction: fit(block.purpose, 800), items: [{ title: "Situatie", content: fit(situation, 1500) }] };
    case "certum.bco.ai-feedback": {
      const multiple = arc.feedback.multipleDefensibleHandling ? ` ${arc.feedback.multipleDefensibleHandling}` : "";
      const excluded =
        target.unprovenContextBlockIds.length > 0
          ? ` Ga er niet van uit dat je de inhoud van ${target.unprovenContextBlockIds.join(", ")} kent.`
          : "";
      return {
        title,
        instructions: fit(
          `Geef feedback op de antwoorden uit ${target.provenContextBlockIds.join(", ")}, op: ${arc.feedback.dimensions.join("; ")}.${multiple}${excluded}`,
          3000,
        ),
      };
    }
    case "certum.bco.conditionele-logica":
      return {
        title,
        sourceBlockId: target.provenContextBlockIds.at(-1)!,
        condition: "heeft_geantwoord",
        value: null,
        textIfTrue: "Je hebt je keuze vastgelegd. Neem die mee naar het volgende blok.",
        textIfFalse: "Je hebt nog geen keuze vastgelegd. Ga terug en leg je keuze vast.",
      };
    case "certum.bco.productie":
      return {
        title,
        productType: "anders",
        instructions: fit(`${blueprint.decisionPoint.task} ${arc.actie.participantMust}`, 2000),
        template: null,
      };
    case "certum.bco.toets":
      return {
        title,
        questionOrder: "vast",
        passPercentage: 70,
        questions: [{ type: "ja_nee", question: fit(`Klopt het dat ${arc.toets.demonstrate}`, 600), correctAnswer: true }],
      };
    default:
      throw new Error("Een mediablok heeft geen te genereren inhoud.");
  }
}
