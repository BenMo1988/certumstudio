import { AnalysisError } from "../analysis/errors";

/**
 * Inhoudsvrije diagnose van ongeldige Block Content-output (zelfde opzet als het Block Plan): alleen de fase en
 * stabiele codes (`<zod-code>@<veldpad>` of violation codes). Nooit gegenereerde tekst of Zod-meldingen.
 */
export const BLOCK_CONTENT_VALIDATION_STAGES = ["structured_output", "schema_validation", "domain_invariant"] as const;
export type BlockContentValidationStage = (typeof BLOCK_CONTENT_VALIDATION_STAGES)[number];

export class BlockContentValidationError extends AnalysisError {
  constructor(
    readonly stage: BlockContentValidationStage,
    readonly codes: readonly string[],
  ) {
    super("invalid-output", `Block Content ongeldig (${stage}${codes.length ? `: ${codes.join(", ")}` : ""}).`);
    this.name = "BlockContentValidationError";
  }
}

export { zodIssueCodes } from "../block-plan/diagnostics";
