import type { AgentInput } from "./types";

export type AgentInputKind = AgentInput["kind"];

export interface InputKindOption {
  kind: AgentInputKind;
  label: string;
  description: string;
  /** Vraag boven het invoerveld zodra deze soort is gekozen. */
  prompt: string;
  /** Aandachtsregel bij de invoer, bijv. over privacy en de huidige ontwikkelfase. */
  notice?: string;
}

/** De drie startpunten voor een nieuwe training, in vaste volgorde. */
export const INPUT_KINDS: InputKindOption[] = [
  {
    kind: "onderwerp",
    label: "Onderwerp",
    description: "Een thema of vaardigheid, bijvoorbeeld professioneel begrenzen.",
    prompt: "Welk onderwerp wil je omzetten in een praktijksimulatie?",
  },
  {
    kind: "praktijkvraag",
    label: "Praktijkvraag",
    description: "Een concrete vraag uit de praktijk die je wilt uitwerken.",
    prompt: "Welke professionele situatie of uitdaging wil je trainen?",
  },
  {
    kind: "casus",
    label: "Casus",
    // Copy volgt de tijdelijke governance-policy (zie modules/governance/data-policy.ts).
    description: "Een fictieve of synthetische beroepssituatie die je wilt gebruiken als basis voor een praktijksimulatie.",
    prompt: "Beschrijf de fictieve of synthetische praktijkcasus die je als basis wilt gebruiken.",
    notice:
      "In deze ontwikkelfase mag Certum Studio geen gegevens uit echte casuïstiek verwerken. Gebruik geen namen of andere direct herleidbare persoonsgegevens.",
  },
];

/** Zet een vrije waarde (bijv. uit `?input=`) om naar een geldige inputsoort, anders `undefined`. */
export function parseInputKind(value: unknown): AgentInputKind | undefined {
  return INPUT_KINDS.find((option) => option.kind === value)?.kind;
}
