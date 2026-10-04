import type { BlockContentResult, BlockPayload } from "@/modules/block-content";

/*
 * Formulier- en weergavespecificatie per bloktype, afgeleid van het contentcontract (`block-content/v1`). Alleen de
 * velden die een opleider mag bewerken; trusted velden (bloktype, fase, routebeleid, AI-context, minimumWords) staan
 * hier niet in en worden als uitleg getoond. De server controleert alles opnieuw.
 */

export type FieldSpec =
  | { key: string; label: string; kind: "text" | "textarea"; nullable?: boolean; hint?: string }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; kind: "number"; nullable?: boolean; min: number; max: number }
  | { key: string; label: string; kind: "stringList"; itemLabel: string; min: number; max: number }
  | { key: string; label: string; kind: "correctOption"; optionsKey: string }
  | { key: string; label: string; kind: "objectList"; itemLabel: string; min: number; max: number; fields: FieldSpec[]; empty: Record<string, unknown> }
  | { key: string; label: string; kind: "questions" }
  | { key: string; label: string; kind: "goal" }
  | { key: string; label: string; kind: "readonlyBlock" };

const title: FieldSpec = { key: "title", label: "Bloktitel", kind: "text" };

export const FIELD_SPECS: Record<string, FieldSpec[]> = {
  "certum.bco.tekst": [title, { key: "text", label: "Tekst", kind: "textarea" }],
  "certum.bco.whatsapp-email": [
    title,
    { key: "messageType", label: "Type berichten", kind: "select", options: [{ value: "whatsapp", label: "WhatsApp" }, { value: "email", label: "E-mail" }] },
    {
      key: "messages",
      label: "Berichten",
      kind: "objectList",
      itemLabel: "Bericht",
      min: 1,
      max: 12,
      empty: { sender: "", time: null, body: "" },
      fields: [
        { key: "sender", label: "Afzender", kind: "text" },
        { key: "time", label: "Tijd", kind: "text", nullable: true, hint: "Optioneel, bijv. 08:15" },
        { key: "body", label: "Bericht", kind: "textarea" },
      ],
    },
  ],
  "certum.bco.meerkeuze": [
    title,
    { key: "question", label: "Vraag", kind: "textarea" },
    { key: "options", label: "Antwoordopties", kind: "stringList", itemLabel: "Optie", min: 2, max: 6 },
    { key: "correctOptionIndex", label: "Juist antwoord", kind: "correctOption", optionsKey: "options" },
    { key: "feedback", label: "Feedback", kind: "textarea", nullable: true },
  ],
  "certum.bco.open-vraag": [
    title,
    { key: "question", label: "Vraag", kind: "textarea" },
    { key: "exampleAnswer", label: "Voorbeeldantwoord", kind: "textarea", nullable: true, hint: "Alleen als het didactisch past; leeg laten mag." },
    { key: "feedback", label: "Feedback", kind: "textarea", nullable: true },
  ],
  "certum.bco.poll": [
    title,
    { key: "question", label: "Vraag", kind: "textarea" },
    { key: "options", label: "Opties", kind: "stringList", itemLabel: "Optie", min: 2, max: 6 },
  ],
  "certum.bco.chat-simulatie": [
    title,
    { key: "personaName", label: "Naam fictieve persoon", kind: "text" },
    { key: "personaInstructions", label: "Instructies voor de fictieve persoon", kind: "textarea" },
    { key: "scenarioContext", label: "Context", kind: "textarea", nullable: true, hint: "Schrijf ontvanger-neutraal: begrijpelijk voor deelnemer én persona." },
    { key: "firstMessage", label: "Eerste bericht", kind: "textarea" },
    { key: "goal", label: "Gespreksdoel", kind: "goal" },
    { key: "timeLimitMinutes", label: "Tijdslimiet (minuten)", kind: "number", nullable: true, min: 1, max: 60 },
  ],
  "certum.bco.informatie-opvragen": [
    title,
    { key: "instruction", label: "Instructie", kind: "textarea" },
    {
      key: "items",
      label: "Informatie-items",
      kind: "objectList",
      itemLabel: "Item",
      min: 1,
      max: 10,
      empty: { title: "", content: "" },
      fields: [
        { key: "title", label: "Titel", kind: "text" },
        { key: "content", label: "Inhoud", kind: "textarea" },
      ],
    },
  ],
  "certum.bco.ai-feedback": [title, { key: "instructions", label: "Feedbackinstructie voor de AI", kind: "textarea" }],
  "certum.bco.conditionele-logica": [
    title,
    { key: "sourceBlockId", label: "Bronblok", kind: "readonlyBlock" },
    {
      key: "condition",
      label: "Voorwaarde",
      kind: "select",
      options: [
        { value: "antwoord_is_gelijk_aan", label: "Antwoord is gelijk aan" },
        { value: "antwoord_bevat", label: "Antwoord bevat" },
        { value: "heeft_geantwoord", label: "Heeft geantwoord" },
      ],
    },
    { key: "value", label: "Waarde", kind: "text", nullable: true, hint: "Leeg bij ‘Heeft geantwoord’." },
    { key: "textIfTrue", label: "Tekst als de voorwaarde is vervuld", kind: "textarea" },
    { key: "textIfFalse", label: "Tekst als de voorwaarde niet is vervuld", kind: "textarea" },
  ],
  "certum.bco.productie": [
    title,
    {
      key: "productType",
      label: "Type product",
      kind: "select",
      options: [
        { value: "rapportage", label: "Rapportage" },
        { value: "e_mail", label: "E-mail" },
        { value: "veiligheidsplan", label: "Veiligheidsplan" },
        { value: "anders", label: "Anders" },
      ],
    },
    { key: "instructions", label: "Opdracht", kind: "textarea" },
    { key: "template", label: "Sjabloon of starttekst", kind: "textarea", nullable: true },
  ],
  "certum.bco.toets": [
    title,
    { key: "questionOrder", label: "Vraagvolgorde", kind: "select", options: [{ value: "vast", label: "Vaste volgorde" }, { value: "willekeurig", label: "Willekeurige volgorde" }] },
    { key: "passPercentage", label: "Slagingspercentage", kind: "number", min: 1, max: 100 },
    { key: "questions", label: "Toetsvragen", kind: "questions" },
  ],
};

export const REVIEW_LABEL: Record<BlockContentResult["reviewStatus"], string> = {
  draft: "Concept",
  approved: "Goedgekeurd",
  needs_revision: "Moet aangepast",
};

export const UNRESOLVED_LABEL = {
  needs_source: "Bron nodig",
  needs_asset: "Asset nodig",
  blocked_by_capability: "Technische beperking",
} as const;

export const ASSESSMENT_LABEL: Record<BlockContentResult["accreditation"]["assessmentRole"], string> = {
  none: "Geen beoordeling",
  formative: "Formatief",
  summative: "Summatief",
  transfer: "Transfer",
};

/** De bewerkbare velden van gegenereerde inhoud (wat de editor naar de server stuurt). */
export function editableFields(content: BlockPayload): Record<string, unknown> {
  const { catalogBlockId, ...rest } = content as Record<string, unknown>;
  void catalogBlockId;
  delete rest.availableContext;
  delete rest.unavailableContext;
  delete rest.minimumWords;
  return rest;
}

const clip = (text: string, max = 150) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/** Een korte preview van de inhoud voor de blokkaart. */
export function previewOf(block: BlockContentResult): string {
  const body = block.body;
  switch (body.status) {
    case "needs_source":
      return clip(body.whatToValidate);
    case "needs_asset":
      return clip(body.assetRequirement.desiredContent);
    case "blocked_by_capability":
      return clip(body.missingCapability);
    case "generated": {
      const c = body.content;
      switch (c.catalogBlockId) {
        case "certum.bco.tekst":
          return clip(c.text);
        case "certum.bco.whatsapp-email":
          return clip(`${c.messages[0]?.sender ?? ""}: ${c.messages[0]?.body ?? ""}`);
        case "certum.bco.meerkeuze":
        case "certum.bco.open-vraag":
        case "certum.bco.poll":
          return clip(c.question);
        case "certum.bco.chat-simulatie":
          return clip(`${c.personaName}: “${c.firstMessage}”`);
        case "certum.bco.informatie-opvragen":
          return clip(c.instruction);
        case "certum.bco.ai-feedback":
          return clip(c.instructions);
        case "certum.bco.conditionele-logica":
          return clip(c.textIfTrue);
        case "certum.bco.productie":
          return clip(c.instructions);
        case "certum.bco.toets":
          return `${c.questions.length} toetsvragen · slagen vanaf ${c.passPercentage}%`;
      }
    }
  }
}
