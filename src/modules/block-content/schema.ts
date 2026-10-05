import { z } from "zod";
import { PLANNABLE_BLOCK_IDS, type PlannableBlockId } from "@/knowledge/platform/bc-online-block-catalog";
import { CERTUM_PHASES } from "@/modules/training-blueprint/schema";
import { ROUTE_POLICIES, SOURCE_NEED_ID } from "@/modules/training-blueprint/v2/schema";

/*
 * Block Content V1: de daadwerkelijke trainingsinhoud per gepland blok, na een goedgekeurde Blueprint en een
 * goedgekeurd Block Plan.
 *
 * - Eén resultaat hoort bij precies één gepland blok (`plannedBlockId`), zodat ieder blok los te regenereren en goed
 *   te keuren is.
 * - De inhoud volgt de velden die het bloktype in BC Online aantoonbaar heeft (`bc-online-block-catalog/v1`). Het is
 *   géén BC Online-payload; de vertaling hoort later in een adapter.
 * - Wat niet te maken is, krijgt een expliciete status (`needs_source`, `needs_asset`, `blocked_by_capability`) en
 *   wordt nooit stil met verzonnen inhoud gevuld.
 */

export const BLOCK_CONTENT_VERSION = "block-content/v1";
export const TRAINING_CONTENT_PACKAGE_VERSION = "training-content-package/v1";

const text = (max: number, description: string) => z.string().min(1).max(max).describe(description);
const title = text(120, "Bloktitel zoals de deelnemer hem ziet.");

/** Media-blokken: Certum maakt nooit een URL, bestand of asset; deze blokken krijgen altijd `needs_asset`. */
export const MEDIA_BLOCK_IDS = ["certum.bco.beeld", "certum.bco.video", "certum.bco.audio", "certum.bco.document"] as const;
export type MediaBlockId = (typeof MEDIA_BLOCK_IDS)[number];
export type ContentBlockId = Exclude<PlannableBlockId, MediaBlockId>;

export const ASSET_TYPES = ["afbeelding", "video", "audio", "document"] as const;
export const ASSET_TYPE_BY_BLOCK: Record<MediaBlockId, (typeof ASSET_TYPES)[number]> = {
  "certum.bco.beeld": "afbeelding",
  "certum.bco.video": "video",
  "certum.bco.audio": "audio",
  "certum.bco.document": "document",
};

export function isMediaBlock(id: string): id is MediaBlockId {
  return (MEDIA_BLOCK_IDS as readonly string[]).includes(id);
}

// ---------------------------------------------------------------------------------------------------------------
// Inhoud per bloktype (alleen de velden uit de catalogus)
// ---------------------------------------------------------------------------------------------------------------

const options = z.array(text(300, "Antwoordoptie.")).min(2).max(6);

export const CONTENT_FIELDS = {
  "certum.bco.tekst": { title, text: text(4000, "De tekst van het blok.") },
  "certum.bco.whatsapp-email": {
    title,
    messageType: z.enum(["whatsapp", "email"]),
    messages: z
      .array(
        z.strictObject({
          sender: text(80, "Fictieve afzender."),
          time: z.string().min(1).max(40).nullable().describe("Optioneel tijdstip, bijv. '08:15'."),
          body: text(1500, "Berichtinhoud."),
        }),
      )
      .min(1)
      .max(12),
  },
  "certum.bco.meerkeuze": {
    title,
    question: text(600, "De vraag."),
    options,
    correctOptionIndex: z.number().int().min(0).max(5).describe("Index (vanaf 0) van het ene juiste antwoord."),
    feedback: z.string().min(1).max(1500).nullable(),
  },
  "certum.bco.open-vraag": {
    title,
    question: text(600, "De vraag."),
    exampleAnswer: z.string().min(1).max(1500).nullable().describe("Alleen als een voorbeeldantwoord didactisch past."),
    feedback: z.string().min(1).max(1500).nullable(),
  },
  "certum.bco.poll": { title, question: text(600, "De vraag."), options },
  "certum.bco.chat-simulatie": {
    title,
    personaName: text(80, "Naam van de fictieve persoon."),
    personaInstructions: text(3000, "Instructies voor de fictieve persoon: rol, houding, grenzen."),
    scenarioContext: z.string().min(1).max(2000).nullable(),
    firstMessage: text(800, "Eerste bericht van de fictieve persoon."),
    goal: z
      .strictObject({
        keywords: z.array(text(60, "Sleutelwoord.")).min(1).max(8),
        messageOnGoal: text(600, "Bericht aan de deelnemer bij doelbehaling."),
        instructionAfterGoal: text(1000, "AI-instructie na doelbehaling."),
      })
      .nullable()
      .describe("Gespreksdoel met sleutelwoorden; null bij meerdere verdedigbare routes."),
    timeLimitMinutes: z.number().int().min(1).max(60).nullable(),
  },
  "certum.bco.informatie-opvragen": {
    title,
    instruction: text(800, "Instructie aan de deelnemer."),
    items: z
      .array(z.strictObject({ title: text(120, "Titel van het item."), content: text(1500, "Inhoud van het item.") }))
      .min(1)
      .max(10),
  },
  "certum.bco.ai-feedback": {
    title,
    instructions: text(3000, "Instructies voor AI; alleen op basis van aantoonbaar beschikbare context."),
    /** Trusted: eerdere vraagblokken waarvan de catalogus aantoont dat AI Feedback de antwoorden krijgt. */
    availableContext: z.array(z.string().min(1)).min(1),
    /** Trusted: eerdere invoerblokken waarvan niet is aangetoond dat AI Feedback ze krijgt. */
    unavailableContext: z.array(z.string().min(1)),
  },
  "certum.bco.conditionele-logica": {
    title,
    sourceBlockId: z.string().min(1).describe("Het eerdere vraagblok waarop de voorwaarde betrekking heeft."),
    condition: z.enum(["antwoord_is_gelijk_aan", "antwoord_bevat", "heeft_geantwoord"]),
    value: z.string().min(1).max(300).nullable().describe("Vergelijkingswaarde; null bij 'heeft_geantwoord'."),
    textIfTrue: text(1500, "Tekst als de voorwaarde is vervuld."),
    textIfFalse: text(1500, "Tekst als de voorwaarde niet is vervuld."),
  },
  "certum.bco.productie": {
    title,
    productType: z.enum(["rapportage", "e_mail", "veiligheidsplan", "anders"]),
    instructions: text(2000, "Opdracht aan de deelnemer."),
    template: z.string().min(1).max(2000).nullable(),
    minimumWords: z.number().int().min(1).max(2000).nullable(),
  },
  "certum.bco.toets": {
    title,
    questionOrder: z.enum(["vast", "willekeurig"]),
    passPercentage: z.number().int().min(1).max(100),
    questions: z
      .array(
        z.discriminatedUnion("type", [
          z.strictObject({
            type: z.literal("meerkeuze"),
            question: text(600, "Toetsvraag."),
            options,
            correctOptionIndex: z.number().int().min(0).max(5),
          }),
          z.strictObject({ type: z.literal("ja_nee"), question: text(600, "Toetsvraag."), correctAnswer: z.boolean() }),
        ]),
      )
      .min(1)
      .max(10),
  },
} as const satisfies Record<ContentBlockId, z.ZodRawShape>;

export const CONTENT_BLOCK_IDS = Object.keys(CONTENT_FIELDS) as ContentBlockId[];

const payload = <K extends ContentBlockId>(id: K) =>
  z.strictObject({ catalogBlockId: z.literal(id), ...CONTENT_FIELDS[id] });

export const BlockPayloadSchema = z.discriminatedUnion("catalogBlockId", [
  payload("certum.bco.tekst"),
  payload("certum.bco.whatsapp-email"),
  payload("certum.bco.meerkeuze"),
  payload("certum.bco.open-vraag"),
  payload("certum.bco.poll"),
  payload("certum.bco.chat-simulatie"),
  payload("certum.bco.informatie-opvragen"),
  payload("certum.bco.ai-feedback"),
  payload("certum.bco.conditionele-logica"),
  payload("certum.bco.productie"),
  payload("certum.bco.toets"),
]);

// ---------------------------------------------------------------------------------------------------------------
// Uitkomst per blok
// ---------------------------------------------------------------------------------------------------------------

export const BLOCK_CONTENT_STATUSES = ["generated", "needs_source", "needs_asset", "blocked_by_capability"] as const;
export type BlockContentStatus = (typeof BLOCK_CONTENT_STATUSES)[number];

export const NEEDS_SOURCE_FIELDS = {
  whatToValidate: text(1000, "Welke kennis eerst gevalideerd moet worden, in termen van de sourceNeeds."),
  generatableAfterValidation: text(1000, "Welke inhoud dit blok daarna kan krijgen."),
};

export const ASSET_REQUIREMENT_FIELDS = {
  why: text(800, "Waarom dit asset nodig is voor de didactische functie."),
  desiredContent: text(1200, "Gewenste inhoud of functie van het asset."),
  captionIntent: z.string().min(1).max(400).nullable().describe("Bedoeling van een eventueel onderschrift."),
};

export const BLOCKED_FIELDS = {
  missingCapability: text(600, "Welke capability ontbreekt of niet is aangetoond."),
  why: text(800, "Waarom het blok daardoor niet eerlijk te vullen is."),
};

export const BlockBodySchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("generated"), content: BlockPayloadSchema }),
  z.strictObject({ status: z.literal("needs_source"), ...NEEDS_SOURCE_FIELDS }),
  z.strictObject({
    status: z.literal("needs_asset"),
    assetRequirement: z.strictObject({ assetType: z.enum(ASSET_TYPES), ...ASSET_REQUIREMENT_FIELDS }),
  }),
  z.strictObject({ status: z.literal("blocked_by_capability"), ...BLOCKED_FIELDS }),
]);

export const ASSESSMENT_ROLES = ["none", "formative", "summative", "transfer"] as const;
export const REVIEW_STATUSES = ["draft", "approved", "needs_revision"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Register-onafhankelijke accreditatiemetadata per blok. Bevat bewust geen SKJ-velden. */
export const ACCREDITATION_FIELDS = {
  learningGoalContribution: text(500, "Hoe dit blok bijdraagt aan het leerdoel."),
  assessmentRole: z.enum(ASSESSMENT_ROLES),
  estimatedMinutes: z.number().int().min(1).max(120).nullable().describe("Bewerkbare schatting; null als onbekend."),
  sourceNeedRefs: z.array(z.string().regex(SOURCE_NEED_ID)).max(3).describe("Alleen bestaande sourceNeed-ids (SN1…)."),
};

export const BlockContentResultSchema = z.strictObject({
  version: z.literal(BLOCK_CONTENT_VERSION),
  // Trusted: uit het goedgekeurde Block Plan, de catalogus en de Blueprint.
  plannedBlockId: z.string().min(1),
  sequence: z.number().int().min(1),
  certumPhase: z.enum(CERTUM_PHASES),
  catalogBlockId: z.enum(PLANNABLE_BLOCK_IDS as [PlannableBlockId, ...PlannableBlockId[]]),
  routePolicy: z.enum(ROUTE_POLICIES),
  reviewStatus: z.enum(REVIEW_STATUSES),
  accreditation: z.strictObject({ workform: z.string().min(1), ...ACCREDITATION_FIELDS }),
  body: BlockBodySchema,
});

export type BlockContentResult = z.infer<typeof BlockContentResultSchema>;
export type BlockBody = z.infer<typeof BlockBodySchema>;
export type BlockPayload = z.infer<typeof BlockPayloadSchema>;

// ---------------------------------------------------------------------------------------------------------------
// Vaste Start en Vast Einde
// ---------------------------------------------------------------------------------------------------------------

export const StartContentSchema = z.strictObject({
  /** Trusted: titel van de Blueprint. */
  title: z.string().min(1).max(120),
  introduction: text(2000, "Uitleg over de e-learning voor de deelnemer."),
  /** Trusted: het leerdoel van de Blueprint. */
  learningGoals: z.array(z.string().min(1)).min(1).max(5),
  /** Afgeleid: de som van de blokschattingen, alleen als alle blokken een schatting hebben. */
  estimatedDurationMinutes: z.number().int().positive().nullable(),
});

export const EndContentSchema = z.strictObject({
  closingText: text(1500, "Afsluitende tekst."),
  summary: z.string().min(1).max(1500).nullable(),
  /** Trusted null: de Blueprint modelleert geen vervolgactiviteit. */
  followUpRecommendation: z.null(),
});

export type StartContent = z.infer<typeof StartContentSchema>;
export type EndContent = z.infer<typeof EndContentSchema>;

// ---------------------------------------------------------------------------------------------------------------
// Training Content Package
// ---------------------------------------------------------------------------------------------------------------

export const UNRESOLVED_KINDS = ["source", "asset", "capability", "ai_context", "not_generated", "organisation_source"] as const;

export const UnresolvedRequirementSchema = z.strictObject({
  plannedBlockId: z.string().min(1),
  kind: z.enum(UNRESOLVED_KINDS),
  /**
   * Bij `source`: de sourceNeed-ids. Bij `organisation_source`: organisatiegebonden sourceNeeds zonder organisatiebron
   * (zichtbaar aandachtspunt, blokkeert de readiness niet). Bij `ai_context`: de blokken waarvan context niet is aangetoond.
   */
  refs: z.array(z.string().min(1)),
});

export const READINESS = ["incomplete", "in_review", "approved"] as const;
export type Readiness = (typeof READINESS)[number];

export const TrainingContentPackageSchema = z.strictObject({
  version: z.literal(TRAINING_CONTENT_PACKAGE_VERSION),
  contentContractVersion: z.literal(BLOCK_CONTENT_VERSION),
  blueprintVersion: z.string().min(1),
  blockPlanVersion: z.string().min(1),
  title: z.string().min(1).max(120),
  learningGoal: z.string().min(1),
  start: StartContentSchema,
  blocks: z.array(BlockContentResultSchema).max(20),
  end: EndContentSchema,
  unresolvedRequirements: z.array(UnresolvedRequirementSchema),
  readiness: z.enum(READINESS),
});

export type TrainingContentPackage = z.infer<typeof TrainingContentPackageSchema>;
export type UnresolvedRequirement = z.infer<typeof UnresolvedRequirementSchema>;
