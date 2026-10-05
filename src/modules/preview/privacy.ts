import { runPrivacyPreflight } from "@/modules/privacy/preflight";
import type { PreflightCategory, PreflightStatus } from "@/modules/privacy/types";
import type { PreviewModel } from "./view";

/*
 * Privacy in Participant Preview (Step 17B-fix, `preview_privacy_context_false_positive`).
 *
 * De bestaande Privacy Preflight blijft leidend en ongewijzigd. Eén smalle vrijstelling: een bevinding
 * `possible_person_name` (severity `review_required`) telt niet als blokkade wanneer exact die span-tekst ook als
 * `possible_person_name` voorkomt in de inhoud die de deelnemer tot en met de huidige stap van de current goedgekeurde
 * training heeft kunnen zien. Zo kan de deelnemer de synthetische personen uit het scenario bij naam noemen.
 *
 * - De vertrouwde set komt uitsluitend server-side uit de deelnemersweergave (`buildPreview`) van het goedgekeurde
 *   pakket: nooit uit de client, nooit uit de chatgeschiedenis (die levert de client aan) en nooit uit verborgen velden
 *   (persona-instructies, feedbackinstructies). Scope: Vaste Start, alle eerdere stappen en de huidige stap; een naam
 *   die uitsluitend in een toekomstige, nog niet zichtbare stap staat, telt niet.
 * - Exacte span-match, hoofdlettergevoelig, geen fuzzy matching: "Noor Bakker" matcht niet met "Noor".
 * - `blocked`-categorieën en alle andere `review_required`-categorieën worden nooit vrijgesteld. Staat er naast een
 *   vrijgestelde naam nog één andere bevinding, dan blijft de tekst geblokkeerd.
 * - Restrisico (bewust geaccepteerd voor Trainer Preview + synthetic-only-attestatie, V1): een echte persoon met
 *   exact dezelfde naam als een scenariopersoon is niet te onderscheiden. Voor een publiek deelnemersproduct opnieuw
 *   beoordelen.
 */

const EXCLUDED_KEYS = new Set(["kind", "plannedBlockId", "sequence"]);

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    if (value.trim()) out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out));
  } else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) if (!EXCLUDED_KEYS.has(key)) collectStrings(v, out);
  }
}

/** De span-tekst van iedere bevinding, zoals de preflight haar ziet (op de getrimde tekst). */
function spansOf(text: string) {
  const input = text.trim();
  const result = runPrivacyPreflight(input);
  return { result, spans: result.findings.map((f) => ({ finding: f, text: input.slice(f.span.start, f.span.end) })) };
}

/**
 * De synthetische namen die de deelnemer tot en met de stap van `plannedBlockId` heeft kunnen zien: de
 * `possible_person_name`-spans in de zichtbare teksten van Vaste Start en de blokken tot en met die stap.
 * Een onbekend blok levert een lege set (geen vrijstelling).
 */
export function approvedVisibleEntities(preview: PreviewModel, plannedBlockId: string): Set<string> {
  const index = preview.steps.findIndex((s) => "plannedBlockId" in s && s.plannedBlockId === plannedBlockId);
  const entities = new Set<string>();
  if (index < 0) return entities;
  const texts: string[] = [];
  collectStrings(preview.steps.slice(0, index + 1), texts);
  for (const text of texts) {
    for (const s of spansOf(text).spans) if (s.finding.category === "possible_person_name") entities.add(s.text);
  }
  return entities;
}

export interface PreviewPrivacyDecision {
  decision: "allowed" | "blocked";
  /** De onvrijgestelde, blokkerende categorieën (leeg bij `allowed`). */
  blockingCategories: PreflightCategory[];
  /** Ongefilterde preflight: de zwaarste status over alle teksten. */
  preflightStatus: PreflightStatus;
  /** Aantal bevindingen per categorie, vóór vrijstelling. Alleen aantallen, nooit waarden of posities. */
  categories: Partial<Record<PreflightCategory, number>>;
  /** Aantal vrijgestelde `possible_person_name`-bevindingen. */
  approvedEntityMatches: number;
}

const RANK: Record<PreflightStatus, number> = { safe: 0, review_required: 1, blocked: 2 };

/** De preflight op de deelnemersteksten, met uitsluitend de smalle vrijstelling hierboven. */
export function evaluatePreviewPrivacy(texts: string[], trusted: ReadonlySet<string>): PreviewPrivacyDecision {
  const blocking = new Set<PreflightCategory>();
  const categories: Partial<Record<PreflightCategory, number>> = {};
  let preflightStatus: PreflightStatus = "safe";
  let approvedEntityMatches = 0;
  for (const text of texts) {
    const { result, spans } = spansOf(text);
    if (RANK[result.status] > RANK[preflightStatus]) preflightStatus = result.status;
    for (const { finding, text: span } of spans) {
      categories[finding.category] = (categories[finding.category] ?? 0) + 1;
      if (finding.severity === "review_required" && finding.category === "possible_person_name" && trusted.has(span)) {
        approvedEntityMatches++;
      } else {
        blocking.add(finding.category);
      }
    }
  }
  return { decision: blocking.size === 0 ? "allowed" : "blocked", blockingCategories: [...blocking], preflightStatus, categories, approvedEntityMatches };
}
