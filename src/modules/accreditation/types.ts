import type { LearningLineState } from "@/modules/learning-lines/packages";

/*
 * Accreditatielaag. Een register (SKJ, later andere beroepsverenigingen) is een profiel dat een indieningspakket
 * afleidt uit de registeronafhankelijke leerlijnstand. De leerlijn en de modulecontent kennen geen registervelden; een
 * nieuw register is een nieuw profiel, geen nieuwe leerlijn.
 *
 * Wat menselijk of organisatorisch nog moet worden aangeleverd, wordt nooit verzonnen: het veld is `HUMAN_REQUIRED`.
 */

export interface HumanRequired {
  status: "HUMAN_REQUIRED";
  /** Waarom een mens dit moet aanleveren of controleren. */
  reason: string;
}

export const humanRequired = (reason: string): HumanRequired => ({ status: "HUMAN_REQUIRED", reason });

export const isHumanRequired = (value: unknown): value is HumanRequired =>
  typeof value === "object" && value !== null && (value as { status?: unknown }).status === "HUMAN_REQUIRED";

export interface AccreditationProfile<P> {
  id: string;
  label: string;
  version: string;
  build(state: LearningLineState): P;
}
