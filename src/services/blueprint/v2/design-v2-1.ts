import { z } from "zod";
import type { BlueprintV21Design } from "@/modules/training-blueprint/v2";
import { BlueprintV2DesignSchema } from "./design";

/**
 * Wat een V2.1-provider ontwerpt: het V2-ontwerpschema zonder `ambiguity`, die server-side uit het routebeleid van de
 * Analysis-richting komt. Afgeleid met `.omit()` en strict: een provider kan de ambiguïteit niet meesturen.
 */
export const BlueprintV21DesignSchema = BlueprintV2DesignSchema.omit({ ambiguity: true });

export type BlueprintV21DesignOutput = z.infer<typeof BlueprintV21DesignSchema>;

// Compile-time: het afgeleide schema en het compose-contract beschrijven exact hetzelfde ontwerp.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const designMatchesCompose: Same<BlueprintV21DesignOutput, BlueprintV21Design> = true;
void designMatchesCompose;
