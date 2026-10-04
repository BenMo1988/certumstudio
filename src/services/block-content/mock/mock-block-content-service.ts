import { METHODOLOGY_STEPS } from "@/knowledge";
import type { BlockContentDesign, BlockContentResult, BlockPayloadDesign, BlockTarget, FrameContent } from "@/modules/block-content";
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

const ASSESSMENT_ROLE = {
  context: "none",
  actie: "formative",
  reflectie: "formative",
  feedback: "formative",
  bron: "none",
  toets: "transfer",
} as const;

/**
 * Mock Block Content. Deterministisch, zonder netwerk; leidt alle inhoud af uit de goedgekeurde Blueprint en het
 * doelblok en volgt daarna exact dezelfde weg als de Claude-provider (ontwerpschema → compose → Zod → invarianten).
 *
 * - Media → `needs_asset`; Bron → `needs_source` met de sourceNeed-refs van de Blueprint; AI Feedback of Conditionele
 *   logica zonder eerder vraagblok → `blocked_by_capability`.
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

function designFor(target: BlockTarget, blueprint: TrainingBlueprintV2): BlockContentDesign {
  const { block } = target;
  const status = target.allowedStatuses[0];
  const bronRefs = blueprint.learningArc.bron.sourceNeedRefs.filter((r) => target.sourceNeedIds.includes(r));
  const accreditation = {
    learningGoalContribution: fit(block.purpose, 500),
    assessmentRole: ASSESSMENT_ROLE[block.certumPhase],
    estimatedMinutes: status === "generated" ? (MINUTES[block.catalogBlockId] ?? null) : null,
    sourceNeedRefs: status === "needs_source" ? (bronRefs.length > 0 ? bronRefs : target.sourceNeedIds) : [],
  };

  switch (status) {
    case "needs_asset":
      return {
        status,
        accreditation,
        assetRequirement: {
          why: fit(block.whyThisBlock, 800),
          desiredContent: fit(block.configurationIntent.map((c) => c.intent).join(" ") || block.purpose, 1200),
          captionIntent: null,
        },
      };
    case "needs_source": {
      const questions = blueprint.sourceNeeds.filter((s) => accreditation.sourceNeedRefs.includes(s.id));
      return {
        status,
        accreditation,
        whatToValidate: fit(questions.map((s) => `${s.id}: ${s.question}`).join(" "), 1000),
        generatableAfterValidation: fit(`Na validatie: ${block.purpose}`, 1000),
      };
    }
    case "blocked_by_capability":
      return {
        status,
        accreditation,
        missingCapability: "Aantoonbare context voor dit blok: er gaat geen vraagblok aan vooraf.",
        why: "Zonder eerder vraagblok is niet aangetoond dat dit blok antwoorden van de deelnemer ontvangt.",
      };
    case "generated":
      return { status, accreditation, content: contentFor(target, blueprint) };
  }
}

function contentFor(target: BlockTarget, blueprint: TrainingBlueprintV2): BlockPayloadDesign {
  const { block } = target;
  const phase = METHODOLOGY_STEPS.find((s) => s.id === block.certumPhase)?.label ?? block.certumPhase;
  const title = fit(`${phase}: ${target.workform}`, 120);
  const arc = blueprint.learningArc;
  const situation = block.certumPhase === "toets" ? arc.toets.newDecisionPoint : blueprint.scenarioPremise;

  switch (block.catalogBlockId) {
    case "certum.bco.tekst":
      return { title, text: fit(situation, 4000) };
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
        minimumWords: null,
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
