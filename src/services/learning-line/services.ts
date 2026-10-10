import type { LearningLineDesign } from "@/modules/learning-lines";

/** Eén leerlijnontwerp uit de prompt; bij een revisie met de vorige versie en de ene menselijke aanwijzing. */
export interface LearningLineArchitectRequest {
  prompt: string;
  revision?: { previous: LearningLineDesign; feedback: string };
}

export interface LearningLineArchitectService {
  generate(request: LearningLineArchitectRequest): Promise<LearningLineDesign>;
}
