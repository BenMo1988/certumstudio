/**
 * BC Online block catalog: wat aantoonbaar al in de BC Online-builder bestaat.
 *
 * Bron: waarneming van de huidige BC Online-builder (schermafbeeldingen), niet de technische documentatie.
 *
 * BELANGRIJK
 * - `certumCatalogId` is een interne Certum-id. Het is NIET het technische backend-type van BC Online:
 *   certumCatalogId !== bewezen BC Online backend type. Die types en het API/JSON-schema zijn nog onbekend.
 * - De echte mapping hoort later in een aparte BC Online Adapter, zodra het technische contract bekend is.
 * - Leg niet méér gedrag vast dan aantoonbaar uit de builder blijkt. Onbekend blijft onbekend.
 * - Beschikbaarheid van een blok betekent niet dat het didactisch geschikt is.
 */
export const BC_ONLINE_CATALOG_VERSION = "bc-online-block-catalog/v1";

/** Bevestigt in code dat backend-types nog niet bekend zijn; de adapter vult dit later. */
export const BC_ONLINE_BACKEND_TYPES_KNOWN = false as const;

export type BcOnlineCategory = "vast" | "input" | "actie" | "feedback" | "productie" | "afronding";

/** Waargenomen capabilities. Bewust geen "branching": dat blijkt niet uit de builder. */
export type BcOnlineCapability =
  | "tekstweergave"
  | "afbeeldingen"
  | "video_url"
  | "audio_url"
  | "document_link"
  | "gesimuleerde_berichten"
  | "meerkeuze_met_juist_antwoord"
  | "optionele_feedbacktekst"
  | "open_antwoord"
  | "voorbeeldantwoord"
  | "poll_zonder_juist_antwoord"
  | "ai_rollenspel_chat"
  | "chat_gespreksdoel_sleutelwoorden"
  | "chat_bericht_bij_doel"
  | "chat_ai_instructie_na_doel"
  | "chat_volgende_stap_na_doel"
  | "chat_tijdslimiet_auto_door"
  | "informatie_opvragen"
  | "ai_feedback_met_eerdere_antwoorden"
  | "conditionele_tekstweergave"
  | "schriftelijke_productie"
  | "productie_sjabloon"
  | "productie_minimum_woorden"
  | "toets_meerkeuze_en_ja_nee"
  | "toets_vraagvolgorde"
  | "toets_slagingspercentage"
  | "leerdoelen_weergave"
  | "geschatte_tijdsduur"
  | "afsluiting_samenvatting_vervolg";

/**
 * Bekende niet-ondersteunde of onbekende capabilities: hier mag Certum niet op rekenen.
 * Een didactische behoefte hieraan wordt een capabilityGap in het Block Plan.
 */
export const NOT_EVIDENCED_CAPABILITIES = [
  { id: "branching_routing", description: "Routeren naar verschillende vervolgblokken op basis van een antwoord. Conditionele logica toont alleen verschillende tekst." },
  { id: "deelnemer_antwoordt_in_berichten", description: "Deelnemer antwoordt binnen een WhatsApp/E-mail-blok. Uit de builder blijkt alleen een berichtweergave." },
  { id: "poll_juist_antwoord", description: "Juist/fout bij een Poll." },
  { id: "backend_types_en_api", description: "Technische block types, JSON/database-schema en API van BC Online." },
  { id: "ai_context_buiten_vraagblokken", description: "Welke context AI Feedback precies krijgt buiten antwoorden op eerdere vraagblokken." },
] as const;

export interface ObservedField {
  name: string;
  optional?: boolean;
  /** Toelichting, bijv. toegestane waarden. */
  note?: string;
}

export interface CatalogBlock {
  certumCatalogId: string;
  /** Naam zoals zichtbaar in de BC Online-builder. */
  visibleName: string;
  category: BcOnlineCategory;
  /** Vaste onderdelen (Start/Einde) staan altijd in een training en worden niet als los blok gepland. */
  fixed: boolean;
  observedFields: ObservedField[];
  observedCapabilities: BcOnlineCapability[];
  knownLimitations: string[];
  /** Mogelijke didactische toepassingen. Geen vaste koppeling aan één Certum-fase. */
  possibleDidacticUses: string[];
}

/** Velden op trainingsniveau (e-learning), zoals waargenomen. */
export const BC_ONLINE_COURSE_FIELDS: ObservedField[] = [
  { name: "Titel" },
  { name: "Beschrijving" },
  { name: "Geschatte tijdsduur", note: "in minuten" },
  { name: "SKJ-punten", note: "Certum vult dit nooit automatisch: null tot een geaccrediteerde waarde bekend is." },
  { name: "Status", note: "o.a. Concept" },
];

export const BC_ONLINE_BLOCK_CATALOG = [
  {
    certumCatalogId: "certum.bco.vaste-start",
    visibleName: "Vaste Start",
    category: "vast",
    fixed: true,
    observedFields: [{ name: "Bloktitel" }, { name: "Uitleg over de e-learning" }, { name: "Geschatte tijdsduur" }, { name: "Leerdoelen", note: "één per regel" }],
    observedCapabilities: ["tekstweergave", "geschatte_tijdsduur", "leerdoelen_weergave"],
    knownLimitations: [],
    possibleDidacticUses: ["Introductie, verwachtingen en leerdoelen van de training."],
  },
  {
    certumCatalogId: "certum.bco.tekst",
    visibleName: "Tekst",
    category: "input",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Tekst" }],
    observedCapabilities: ["tekstweergave"],
    knownLimitations: [],
    possibleDidacticUses: ["Situatieschets (Context).", "Toelichting of gevalideerde kennis (Bron).", "Nieuwe situatie voor transfer (Toets)."],
  },
  {
    certumCatalogId: "certum.bco.beeld",
    visibleName: "Beeld",
    category: "input",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Foto's", note: "één of meerdere uploaden" }, { name: "Onderschrift", optional: true }],
    observedCapabilities: ["afbeeldingen"],
    knownLimitations: [],
    possibleDidacticUses: ["Visuele context of observatiemateriaal."],
  },
  {
    certumCatalogId: "certum.bco.video",
    visibleName: "Video",
    category: "input",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Video URL" }, { name: "Onderschrift", optional: true }],
    observedCapabilities: ["video_url"],
    knownLimitations: [],
    possibleDidacticUses: ["Situatie laten zien (Context).", "Uitleg of voorbeeld (Bron)."],
  },
  {
    certumCatalogId: "certum.bco.audio",
    visibleName: "Audio",
    category: "input",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Audio URL" }, { name: "Onderschrift", optional: true }],
    observedCapabilities: ["audio_url"],
    knownLimitations: [],
    possibleDidacticUses: ["Situatie laten horen, bijv. een gesprek of voicemail (Context)."],
  },
  {
    certumCatalogId: "certum.bco.document",
    visibleName: "Document",
    category: "input",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Document URL" }, { name: "Documentnaam" }, { name: "Beschrijving", optional: true }],
    observedCapabilities: ["document_link"],
    knownLimitations: [],
    possibleDidacticUses: ["Dossierstuk of verslag als context (Context).", "Gevalideerd brondocument (Bron)."],
  },
  {
    certumCatalogId: "certum.bco.whatsapp-email",
    visibleName: "WhatsApp/E-mail",
    category: "input",
    fixed: false,
    observedFields: [
      { name: "Bloktitel" },
      { name: "Type berichten", note: "WhatsApp of E-mail" },
      { name: "Berichten", note: "meerdere; per bericht: Afzender, Tijd (optioneel), Berichtinhoud" },
    ],
    observedCapabilities: ["gesimuleerde_berichten"],
    knownLimitations: ["Gesimuleerde berichtweergave. Uit de builder blijkt niet dat de deelnemer in dit blok kan antwoorden."],
    possibleDidacticUses: ["Situatie die via berichten binnenkomt (Context)."],
  },
  {
    certumCatalogId: "certum.bco.meerkeuze",
    visibleName: "Meerkeuze",
    category: "actie",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Vraag" }, { name: "Antwoordopties" }, { name: "Juist antwoord" }, { name: "Feedback", optional: true }],
    observedCapabilities: ["meerkeuze_met_juist_antwoord", "optionele_feedbacktekst"],
    knownLimitations: ["Vereist één juist antwoord; ongeschikt als meerdere routes professioneel verdedigbaar zijn."],
    possibleDidacticUses: ["Keuze met één verdedigbaar beste antwoord (Actie).", "Kennis- of toepassingsvraag (Toets)."],
  },
  {
    certumCatalogId: "certum.bco.open-vraag",
    visibleName: "Open vraag",
    category: "actie",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Vraag" }, { name: "Voorbeeldantwoord", optional: true }, { name: "Feedback", optional: true }],
    observedCapabilities: ["open_antwoord", "voorbeeldantwoord", "optionele_feedbacktekst"],
    knownLimitations: [],
    possibleDidacticUses: ["Keuze maken en onderbouwen (Actie).", "Terugkijken op de eigen afweging (Reflectie).", "Toepassen in een nieuwe situatie (Toets)."],
  },
  {
    certumCatalogId: "certum.bco.poll",
    visibleName: "Poll",
    category: "actie",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Vraag" }, { name: "Opties" }],
    observedCapabilities: ["poll_zonder_juist_antwoord"],
    knownLimitations: ["Geen juist antwoord zichtbaar in de builder; meet geen juist/fout."],
    possibleDidacticUses: ["Een route of standpunt laten kiezen zonder goed/fout (Actie)."],
  },
  {
    certumCatalogId: "certum.bco.chat-simulatie",
    visibleName: "Chat simulatie",
    category: "actie",
    fixed: false,
    observedFields: [
      { name: "Bloktitel" },
      { name: "Naam fictieve persoon" },
      { name: "Instructies voor fictieve persoon" },
      { name: "Scenario/context", optional: true },
      { name: "Eerste bericht fictieve persoon" },
      { name: "Gespreksdoel", optional: true, note: "Sleutelwoorden; bericht aan deelnemer bij doelbehaling; AI-instructie na doelbehaling" },
      { name: "Tijdslimiet in minuten", optional: true },
    ],
    observedCapabilities: [
      "ai_rollenspel_chat",
      "chat_gespreksdoel_sleutelwoorden",
      "chat_bericht_bij_doel",
      "chat_ai_instructie_na_doel",
      "chat_volgende_stap_na_doel",
      "chat_tijdslimiet_auto_door",
    ],
    knownLimitations: [
      "Een gespreksdoel werkt met sleutelwoorden; dat is geen beoordeling van professioneel redeneren en hoort niet standaard te worden gebruikt.",
    ],
    possibleDidacticUses: ["Een gesprek in het moment voeren (Actie).", "Hetzelfde handelen in een nieuwe situatie laten zien (Toets)."],
  },
  {
    certumCatalogId: "certum.bco.informatie-opvragen",
    visibleName: "Informatie opvragen",
    category: "actie",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Instructie" }, { name: "Informatie-items", note: "meerdere; per item: Titel, Inhoud" }],
    observedCapabilities: ["informatie_opvragen"],
    knownLimitations: [],
    possibleDidacticUses: ["Zelf bepalen welke informatie nodig is voordat je handelt (Context of Actie)."],
  },
  {
    certumCatalogId: "certum.bco.ai-feedback",
    visibleName: "AI Feedback",
    category: "feedback",
    fixed: false,
    observedFields: [{ name: "Bloktitel" }, { name: "Instructies voor AI" }],
    observedCapabilities: ["ai_feedback_met_eerdere_antwoorden"],
    knownLimitations: ["Ontvangt antwoorden op eerdere vraagblokken als context; verdere context is niet aangetoond."],
    possibleDidacticUses: ["Feedback op handelen en afweging (Feedback).", "Terugkoppeling na een transferopdracht (Toets)."],
  },
  {
    certumCatalogId: "certum.bco.conditionele-logica",
    visibleName: "Conditionele logica",
    category: "feedback",
    fixed: false,
    observedFields: [
      { name: "Bloktitel" },
      { name: "Eerder antwoord/blok" },
      { name: "Voorwaarde", note: "Antwoord is gelijk aan, Antwoord bevat, Heeft geantwoord" },
      { name: "Tekst als voorwaarde is vervuld" },
      { name: "Tekst als voorwaarde niet is vervuld" },
    ],
    observedCapabilities: ["conditionele_tekstweergave"],
    knownLimitations: ["Conditionele tekstweergave; geen aangetoonde branching of routering naar andere blokken."],
    possibleDidacticUses: ["Korte, gekozen-optie-afhankelijke toelichting (Feedback)."],
  },
  {
    certumCatalogId: "certum.bco.productie",
    visibleName: "Productie",
    category: "productie",
    fixed: false,
    observedFields: [
      { name: "Bloktitel" },
      { name: "Type product", note: "Rapportage, E-mail, Veiligheidsplan, Anders" },
      { name: "Instructies" },
      { name: "Sjabloon/starttekst", optional: true },
      { name: "Minimum aantal woorden", optional: true },
    ],
    observedCapabilities: ["schriftelijke_productie", "productie_sjabloon", "productie_minimum_woorden"],
    knownLimitations: [],
    possibleDidacticUses: ["Een professioneel product schrijven (Actie).", "Toepassing aantonen in een product (Toets)."],
  },
  {
    certumCatalogId: "certum.bco.toets",
    visibleName: "Toets",
    category: "afronding",
    fixed: false,
    observedFields: [
      { name: "Bloktitel" },
      { name: "Vraagvolgorde", note: "Vaste volgorde of Willekeurige volgorde" },
      { name: "Slagingspercentage" },
      { name: "Toetsvragen", note: "Meerkeuze (vraag, opties, één juist antwoord) of Ja/Nee (vraag, juist antwoord)" },
    ],
    observedCapabilities: ["toets_meerkeuze_en_ja_nee", "toets_vraagvolgorde", "toets_slagingspercentage"],
    knownLimitations: ["Eén technisch toetsmiddel; niet automatisch hetzelfde als de didactische Certum-fase Toets."],
    possibleDidacticUses: ["Kennis- of herkenningsvragen met één juist antwoord (deel van Toets)."],
  },
  {
    certumCatalogId: "certum.bco.vast-einde",
    visibleName: "Vast Einde",
    category: "vast",
    fixed: true,
    observedFields: [
      { name: "Bloktitel" },
      { name: "Afsluitende tekst" },
      { name: "Samenvatting", optional: true },
      { name: "Vervolgaanbeveling", optional: true },
    ],
    observedCapabilities: ["tekstweergave", "afsluiting_samenvatting_vervolg"],
    knownLimitations: [],
    possibleDidacticUses: ["Afsluiting, samenvatting en vervolgaanbeveling."],
  },
] as const satisfies readonly CatalogBlock[];

export type CatalogBlockId = (typeof BC_ONLINE_BLOCK_CATALOG)[number]["certumCatalogId"];

/** Alleen deze blokken kunnen als los blok worden gepland (Vaste Start/Einde zijn vaste onderdelen). */
export const PLANNABLE_BLOCK_IDS = BC_ONLINE_BLOCK_CATALOG.filter((b) => !b.fixed).map(
  (b) => b.certumCatalogId,
) as Exclude<CatalogBlockId, "certum.bco.vaste-start" | "certum.bco.vast-einde">[];

export type PlannableBlockId = (typeof PLANNABLE_BLOCK_IDS)[number];

export function getCatalogBlock(id: string): CatalogBlock | undefined {
  return BC_ONLINE_BLOCK_CATALOG.find((b) => b.certumCatalogId === id);
}
