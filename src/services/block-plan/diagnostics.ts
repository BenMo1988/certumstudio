import type { z } from "zod";
import { AnalysisError } from "../analysis/errors";

/**
 * Inhoudsvrije diagnose van een ongeldige Block Plan-output, zodat een `invalid-output` in logs en evals uitlegbaar is
 * zonder dat er gegenereerde tekst, Blueprint-inhoud of Zod-meldingen (die waarden kunnen bevatten) worden vastgelegd.
 *
 * - `structured_output`: de SDK kon de output niet als het ontwerpschema lezen (geen details: de SDK-melding kan
 *   inhoud bevatten);
 * - `schema_validation`: Zod-fout op het ontwerp of het samengestelde plan; alleen issue-code en veldpad;
 * - `domain_invariant`: Block Plan-invarianten; alleen de stabiele violation codes.
 */
export const BLOCK_PLAN_VALIDATION_STAGES = ["structured_output", "schema_validation", "domain_invariant"] as const;
export type BlockPlanValidationStage = (typeof BLOCK_PLAN_VALIDATION_STAGES)[number];

/** Maximaal aantal vastgelegde codes per fout. */
const MAX_CODES = 10;

export class BlockPlanValidationError extends AnalysisError {
  constructor(
    readonly stage: BlockPlanValidationStage,
    readonly codes: readonly string[],
  ) {
    super("invalid-output", `Block Plan ongeldig (${stage}${codes.length ? `: ${codes.join(", ")}` : ""}).`);
    this.name = "BlockPlanValidationError";
  }
}

/**
 * Zod-issues als inhoudsvrije codes: `<issue.code>@<veldpad>`. Het veldpad bestaat uit schemasleutels en
 * array-indexen; ontvangen waarden, Zod-meldingen en onbekende sleutelnamen worden bewust weggelaten.
 */
export function zodIssueCodes(error: z.ZodError): string[] {
  return error.issues.slice(0, MAX_CODES).map((issue) => {
    const path = issue.path.map((segment) => (typeof segment === "number" ? String(segment) : String(segment))).join(".");
    return `${issue.code}@${path || "(root)"}`;
  });
}
