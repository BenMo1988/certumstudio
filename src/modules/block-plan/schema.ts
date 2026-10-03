import { z } from "zod";
import { PLANNABLE_BLOCK_IDS, type PlannableBlockId } from "@/knowledge/platform/bc-online-block-catalog";
import { CERTUM_PHASES, MAX_INTENT_LENGTH } from "@/modules/training-blueprint/schema";

/*
 * BC Online Block Plan V1: een technisch uitvoeringsvoorstel op basis van de bekende BC Online-blokken.
 *
 * Vraag: met welke reeds bestaande BC Online-blokken kan de leerervaring uit de Blueprint waarschijnlijk worden
 * uitgevoerd? Het Block Plan bepaalt de Blueprint nooit inhoudelijk.
 *
 * `certumPhase` (didactische functie) en `catalogBlockId` (uitvoeringsmiddel) zijn bewust losse velden zonder
 * vaste koppeling: één fase kan meerdere blokken hebben en één bloktype kan in meerdere fasen voorkomen.
 * Dit is géén BC Online-payload; de vertaling naar het echte schema hoort later in een adapter.
 */

export const BC_ONLINE_BLOCK_PLAN_VERSION = "bc-online-block-plan/v1";

const intent = (description: string) => z.string().min(1).max(MAX_INTENT_LENGTH).describe(description);

export const ConfigurationIntentSchema = z.strictObject({
  setting: z.string().min(1).max(80).describe("Welke instelling van het blok, bijv. 'rol fictieve persoon'."),
  intent: intent("Wat er later ingesteld moet worden; geen uiteindelijke content."),
});

export const PlannedBlockSchema = z.strictObject({
  id: z.string().min(1),
  sequence: z.number().int().min(1),
  certumPhase: z.enum(CERTUM_PHASES),
  catalogBlockId: z.enum(PLANNABLE_BLOCK_IDS as [PlannableBlockId, ...PlannableBlockId[]]),
  purpose: intent("Didactisch doel van dit blok binnen de fase."),
  whyThisBlock: intent("Waarom juist dit bestaande blok; eenvoudigste passende middel."),
  configurationIntent: z.array(ConfigurationIntentSchema).max(8),
});

export const CapabilityGapSchema = z.strictObject({
  certumPhase: z.enum(CERTUM_PHASES),
  need: intent("Didactisch gewenste capability die niet aantoonbaar in BC Online bestaat."),
  whyNeeded: intent("Waarom dit nodig is voor de Blueprint."),
  workaround: z
    .strictObject({
      // Een workaround is per definitie gedeeltelijk: hij laat het gat bestaan en maakt de capability niet ondersteund.
      type: z.literal("partial"),
      description: intent("Wat er met bestaande blokken wél kan."),
      limitation: intent("Wat de workaround níét biedt; het gat blijft bestaan."),
    })
    .nullable()
    .describe("Eventueel beperkt alternatief met bestaande blokken; sluit het gat nooit."),
});

export const BcOnlineBlockPlanSchema = z.strictObject({
  version: z.literal(BC_ONLINE_BLOCK_PLAN_VERSION),
  blueprintVersion: z.string().min(1),
  courseShell: z.strictObject({
    title: z.string().min(1).max(120),
    description: intent("Korte beschrijving van de training."),
    estimatedDurationMinutes: z.number().int().positive().nullable(),
    /** Nooit automatisch: null tot een daadwerkelijk geaccrediteerde waarde bekend is. */
    skjPoints: z.null(),
    status: z.literal("concept"),
  }),
  startIntent: z.strictObject({
    explanationIntent: intent("Wat de uitleg bij de start moet bevatten."),
    estimatedDurationMinutes: z.number().int().positive().nullable(),
    learningGoals: z.array(intent("Leerdoel, één per regel.")).min(1).max(5),
  }),
  plannedBlocks: z.array(PlannedBlockSchema).min(1).max(20),
  endIntent: z.strictObject({
    closingIntent: intent("Afsluitende bedoeling."),
    summaryIntent: z.string().min(1).max(MAX_INTENT_LENGTH).nullable(),
    followUpRecommendation: z.string().min(1).max(MAX_INTENT_LENGTH).nullable(),
  }),
  capabilityGaps: z.array(CapabilityGapSchema).max(10),
});

export type BcOnlineBlockPlan = z.infer<typeof BcOnlineBlockPlanSchema>;
export type PlannedBlock = z.infer<typeof PlannedBlockSchema>;
export type CapabilityGap = z.infer<typeof CapabilityGapSchema>;
