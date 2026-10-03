import { z } from "zod";
import {
  BlockedOutcomeSchema,
  MAX_LIST_ITEMS,
  NeedsAdjustmentOutcomeSchema,
  ReadyOutcomeSchema,
  TrainingDirectionV2Schema,
  UnsuitableOutcomeSchema,
} from "../v2/schema";

/*
 * Analysis Contract V2.1: een kleine opvolger van V2 (../v2), dat ongewijzigd blijft (tag analysis-v2-baseline).
 *
 * Enige wijziging: iedere `ready.trainingDirections[]` krijgt een `routePolicy`. De overige uitkomsten (blocked,
 * unsuitable, needs_adjustment) zijn exact de V2-schema's. Alles is afgeleid van V2 met `.extend()`, dus er is geen
 * tweede handmatig bijgehouden schema.
 */

export const ANALYSIS_CONTRACT_V21_VERSION = "analysis-contract/v2.1";

/**
 * Hoe de trainingsrichting met handelingsroutes omgaat. Zelfde waarden en betekenis als het routebeleid in
 * Blueprint Contract V2:
 * - `open_choice`: een professioneel keuzemoment waarin verschillende handelingsroutes verdedigbaar kunnen zijn;
 *   beoordeling op afweging, aansluiting op de situatie, onderbouwing, proportionaliteit, consequenties en
 *   uitvoering, niet op het kiezen van één vooraf bepaalde route;
 * - `prescribed_action`: professioneel handelen waarbij één handelingslijn normatief of inhoudelijk leidend is; dat
 *   betekent niet dat iedere formulering of tussenstap vastligt.
 * Een ontwerpclassificatie van de richting, geen bronfeit.
 */
export const DIRECTION_ROUTE_POLICIES = ["open_choice", "prescribed_action"] as const;
export type DirectionRoutePolicy = (typeof DIRECTION_ROUTE_POLICIES)[number];

export const TrainingDirectionV21Schema = TrainingDirectionV2Schema.extend({
  routePolicy: z
    .enum(DIRECTION_ROUTE_POLICIES)
    .describe(
      "open_choice: meerdere handelingsroutes verdedigbaar; prescribed_action: één handelingslijn normatief leidend.",
    ),
});

export const ReadyOutcomeV21Schema = ReadyOutcomeSchema.extend({
  trainingDirections: z.array(TrainingDirectionV21Schema).min(1).max(MAX_LIST_ITEMS),
});

export const AnalysisOutcomeV21Schema = z.discriminatedUnion("outcome", [
  BlockedOutcomeSchema,
  UnsuitableOutcomeSchema,
  NeedsAdjustmentOutcomeSchema,
  ReadyOutcomeV21Schema,
]);

/** Wat de provider via structured output teruggeeft: een object als root, met de uitkomst in `result`. */
export const AnalysisResponseV21Schema = z.strictObject({ result: AnalysisOutcomeV21Schema });

export type TrainingDirectionV21 = z.infer<typeof TrainingDirectionV21Schema>;
export type ReadyOutcomeV21 = z.infer<typeof ReadyOutcomeV21Schema>;
export type AnalysisOutcomeV21 = z.infer<typeof AnalysisOutcomeV21Schema>;
