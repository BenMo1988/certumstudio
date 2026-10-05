import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
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

/** Maximaal aantal vastgelegde codes per fout. */
const MAX_CODES = 10;

/**
 * Zod-issues als inhoudsvrije codes, met de grens uit het schema als Zod die in het issue meegeeft:
 * `too_big@result.content.text:max=4000`, `too_small@result.content.title:min=1`, `invalid_type@result.status`.
 * Alleen issue-code, veldpad (schemasleutels en array-indexen) en een getal uit het schema; nooit ontvangen waarden,
 * Zod-meldingen of gegenereerde tekst.
 */
export function zodIssueCodesWithLimits(error: z.ZodError): string[] {
  return error.issues.slice(0, MAX_CODES).map((issue) => {
    const path = issue.path.map((segment) => String(segment)).join(".") || "(root)";
    const base = `${issue.code}@${path}`;
    const limits = issue as { maximum?: unknown; minimum?: unknown };
    if (issue.code === "too_big" && (typeof limits.maximum === "number" || typeof limits.maximum === "bigint")) return `${base}:max=${limits.maximum}`;
    if (issue.code === "too_small" && (typeof limits.minimum === "number" || typeof limits.minimum === "bigint")) return `${base}:min=${limits.minimum}`;
    return base;
  });
}

/**
 * `zodOutputFormat` met dezelfde parse-semantiek als de SDK (`JSON.parse`, daarna `safeParse` op exact hetzelfde
 * schema), maar met een inhoudsvrije diagnose bij een fout: een `BlockContentValidationError` in de fase
 * `structured_output` met `invalid_json` of de Zod-issuecodes met grenzen. De SDK-melding (die inhoud kan bevatten)
 * ontstaat zo niet. Geen gedragswijziging: zelfde schema, zelfde grenzen, zelfde uitkomst (ongeldig = `invalid-output`).
 */
export function diagnosedOutputFormat<S extends Parameters<typeof zodOutputFormat>[0]>(schema: S) {
  const format = zodOutputFormat(schema);
  return {
    ...format,
    parse: (content: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new BlockContentValidationError("structured_output", ["invalid_json"]);
      }
      const result = schema.safeParse(parsed);
      if (!result.success) throw new BlockContentValidationError("structured_output", zodIssueCodesWithLimits(result.error));
      return result.data;
    },
  };
}
