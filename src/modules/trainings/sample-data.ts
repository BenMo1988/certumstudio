import type { Training } from "./types";

/**
 * Fictieve voorbeeldtrainingen. Tijdelijk: wordt vervangen door echte opslag.
 * Alleen gebruiken via `listTrainings()`, nooit rechtstreeks in de UI.
 */
export const SAMPLE_TRAININGS: Training[] = [
  {
    id: "professioneel-begrenzen",
    title: "Professioneel begrenzen",
    status: "concept",
    createdAt: "2026-09-29T09:00:00.000Z",
    updatedAt: "2026-10-01T14:20:00.000Z",
    sections: {},
  },
  {
    id: "veiligheid-bij-ouderconflict",
    title: "Veiligheid bij ouderconflict",
    status: "review",
    createdAt: "2026-09-18T08:30:00.000Z",
    updatedAt: "2026-09-27T10:05:00.000Z",
    sections: {},
  },
  {
    id: "omgaan-met-weerstand",
    title: "Omgaan met weerstand",
    status: "gereed",
    createdAt: "2026-09-02T12:00:00.000Z",
    updatedAt: "2026-09-15T16:40:00.000Z",
    sections: {},
  },
];
