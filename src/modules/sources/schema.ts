import { z } from "zod";
import { SOURCE_NEED_ID } from "@/modules/training-blueprint/v2/schema";

/*
 * Certum Source V1 (`certum-source/v1`): een door de opleider aangeleverde bron bij een training. Certum-eigendom;
 * geen SKJ- of BC Online-bronmodel. Basis voor de latere accreditatielaag (welke bron, voor welke kennisbehoefte,
 * wanneer gevalideerd, welke Bron-inhoud is erop gebaseerd).
 *
 * - `relevantContent` is de door de opleider aangeleverde relevante tekst of gecontroleerde notitie: het enige waarop
 *   Certum bij Bron-inhoud mag steunen. Een URL alleen is onvoldoende; er wordt niets van internet gehaald.
 * - Een bron is pas bruikbaar als de opleider hem bewust heeft gevalideerd (een besluit op exact deze versie). Een AI
 *   valideert nooit; een domeinnaam of auteur maakt een bron niet automatisch betrouwbaar.
 * - Opslag: als immutable revision (`artifact_type = 'source'`) in het Training Record; wijzigen = nieuwe versie die
 *   opnieuw gevalideerd moet worden.
 */

export const CERTUM_SOURCE_VERSION = "certum-source/v1";

export const SOURCE_KINDS = ["webpage", "article", "guideline", "book", "document", "other"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  webpage: "Webpagina",
  article: "Artikel",
  guideline: "Richtlijn",
  book: "Boek",
  document: "Document",
  other: "Anders",
};

/** De validatieverklaring die de opleider bewust bevestigt. */
export const SOURCE_VALIDATION_STATEMENT = "Ik heb deze bron gecontroleerd en wil deze gebruiken voor deze training.";

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable();

export const CertumSourceSchema = z.strictObject({
  version: z.literal(CERTUM_SOURCE_VERSION),
  /** Bestaande sourceNeed-ids van de goedgekeurde Blueprint; nooit nieuwe. */
  sourceNeedRefs: z.array(z.string().regex(SOURCE_NEED_ID)).min(1).max(3),
  title: z.string().trim().min(1).max(300),
  sourceType: z.enum(SOURCE_KINDS),
  author: optionalText(300),
  publisher: optionalText(300),
  /** JJJJ, JJJJ-MM of JJJJ-MM-DD, of leeg. */
  publicationDate: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).nullable(),
  /** Alleen http(s); een URL alleen is nooit genoeg om Bron-inhoud te maken. */
  url: z.string().trim().max(2000).regex(/^https?:\/\/\S+$/i).nullable(),
  /** De relevante passage of gecontroleerde notitie waarop Certum mag steunen. */
  relevantContent: z.string().trim().min(1).max(20_000),
});

export type CertumSource = z.infer<typeof CertumSourceSchema>;

/** Een current, gevalideerde bron zoals de Block Content Engine hem krijgt (met herkomst). */
export interface ValidatedSource {
  sourceId: string;
  revisionId: string;
  title: string;
  sourceType: SourceKind;
  author: string | null;
  publisher: string | null;
  publicationDate: string | null;
  url: string | null;
  sourceNeedRefs: string[];
  relevantContent: string;
}

/** Per sourceNeed: gedekt als minstens één current gevalideerde bron eraan gekoppeld is. Afgeleid, niet opgeslagen. */
export function sourceNeedCoverage(sourceNeedIds: string[], validated: Pick<ValidatedSource, "sourceNeedRefs">[]): Record<string, boolean> {
  return Object.fromEntries(sourceNeedIds.map((id) => [id, validated.some((s) => s.sourceNeedRefs.includes(id))]));
}

/**
 * Waarom een bron (nog) niet gevalideerd kan worden, of `null`. Bewust alleen deterministische, laag-risico vormen die
 * de Full Training Pilot (TR-0014) aantoonde: relevante inhoud die exact de titel is, exact de URL, of uitsluitend een
 * http(s)-URL. Geen semantische kwaliteitsscore en geen minimale lengte: een korte, inhoudelijke notitie blijft geldig.
 */
export type RelevantContentIssue = "relevant_content_is_title" | "relevant_content_is_url";

const ONLY_URL = /^https?:\/\/\S+$/i;

export function relevantContentIssue(source: Pick<CertumSource, "title" | "url" | "relevantContent">): RelevantContentIssue | null {
  const content = source.relevantContent.trim();
  if (content === source.title.trim()) return "relevant_content_is_title";
  if ((source.url !== null && content === source.url.trim()) || ONLY_URL.test(content)) return "relevant_content_is_url";
  return null;
}
