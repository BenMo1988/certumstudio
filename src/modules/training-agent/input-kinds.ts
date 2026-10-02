import type { AgentInput } from "./types";

export type AgentInputKind = AgentInput["kind"];

/** De drie startpunten voor een nieuwe training, in vaste volgorde. */
export const INPUT_KINDS: { kind: AgentInputKind; label: string; description: string }[] = [
  {
    kind: "onderwerp",
    label: "Onderwerp",
    description: "Een thema of vaardigheid, bijvoorbeeld professioneel begrenzen.",
  },
  {
    kind: "praktijkvraag",
    label: "Praktijkvraag",
    description: "Een concrete vraag uit de praktijk die je wilt uitwerken.",
  },
  {
    kind: "casus",
    label: "Casus",
    description: "Een geanonimiseerde situatie die zich echt heeft voorgedaan.",
  },
];
