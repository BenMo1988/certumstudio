import type { MethodologyStepId } from "@/knowledge";

export type TrainingStatus = "concept" | "review" | "gereed";

/**
 * Inhoud van een training bestaat uit blokken in plaats van één tekst per onderdeel.
 *
 * Waarom: Context, Actie, Reflectie, Feedback, Bron en Toets krijgen later elk
 * eigen gestructureerde inhoud (bijv. keuzeopties bij Actie, bronverwijzingen
 * bij Bron, vragen met antwoorden bij Toets). Met een blokkenlijst voeg je dat
 * toe als nieuw bloktype, zonder bestaande inhoud of de rest van het model om
 * te bouwen. Voor nu bestaan alleen de twee bloktypes die de voorbeelden nodig hebben.
 */
export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean };

/** Inhoud van één methodiekonderdeel. */
export interface TrainingSection {
  blocks: ContentBlock[];
}

/** Per methodiekonderdeel; een ontbrekend onderdeel is nog niet uitgewerkt. */
export type TrainingSections = Partial<Record<MethodologyStepId, TrainingSection>>;

/** Een trainingsproject in Certum Studio. */
export interface Training {
  id: string;
  title: string;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  /** Voor wie de training bedoeld is; leeg zolang nog niet bepaald. */
  targetAudience?: string;
  /** Wat de deelnemer na afloop kan; leeg zolang nog niet bepaald. */
  learningGoal?: string;
  /** Optionele koppeling met de casus waarop de training is gebaseerd. */
  caseId?: string;
  sections: TrainingSections;
}
