/**
 * De kernmethodiek van Bureau Certum.
 *
 * Elke praktijksimulatie doorloopt deze zes onderdelen, in deze volgorde.
 * Dit is de enige bron van waarheid voor de methodiek binnen Certum Studio.
 */
export const METHODOLOGY_STEPS = [
  {
    id: "context",
    label: "Context",
    description: "De professionele situatie waarin de deelnemer zich bevindt.",
  },
  {
    id: "actie",
    label: "Actie",
    description: "De keuze of handeling die de deelnemer moet maken.",
  },
  {
    id: "reflectie",
    label: "Reflectie",
    description: "De deelnemer staat stil bij de eigen keuze en afwegingen.",
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Inhoudelijke terugkoppeling op de gemaakte keuze.",
  },
  {
    id: "bron",
    label: "Bron",
    description: "De onderbouwing: wet- en regelgeving, beleid of vakliteratuur.",
  },
  {
    id: "toets",
    label: "Toets",
    description: "Controle of het leerdoel is bereikt.",
  },
] as const;

export type MethodologyStepId = (typeof METHODOLOGY_STEPS)[number]["id"];
