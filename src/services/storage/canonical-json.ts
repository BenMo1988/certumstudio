import { createHash } from "node:crypto";

/**
 * Deterministische JSON: objectsleutels recursief gesorteerd (codepuntvolgorde), arrays in volgorde, geen witruimte.
 * Onafhankelijk van de sleutelvolgorde van het object of van hoe Postgres (JSONB) het teruggeeft.
 * Alleen JSON-waarden: `undefined`, functies, symbolen, bigint en niet-eindige getallen zijn een fout.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
    case "boolean":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new TypeError("canonicalJson: niet-eindig getal");
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
    }
    default:
      throw new TypeError(`canonicalJson: geen JSON-waarde (${typeof value})`);
  }
}

/** SHA-256 (hex) over de canonieke JSON van een payload. */
export function contentHash(payload: unknown): string {
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}
