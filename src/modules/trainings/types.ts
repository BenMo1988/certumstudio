import type { MethodologyStepId } from "@/knowledge";

export type TrainingStatus = "concept" | "in-ontwikkeling" | "gereed";

/** Een trainingsproject in Certum Studio. */
export interface Training {
  id: string;
  title: string;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  /** Optionele koppeling met de casus waarop de training is gebaseerd. */
  caseId?: string;
  /** Inhoud per onderdeel van de methodiek; leeg zolang nog niet uitgewerkt. */
  sections: Partial<Record<MethodologyStepId, string>>;
}
