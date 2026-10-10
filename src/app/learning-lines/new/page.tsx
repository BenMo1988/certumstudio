import type { Metadata } from "next";
import { LearningLineIntake } from "@/components/studio/learning-lines/LearningLineIntake";

export const metadata: Metadata = { title: "Nieuwe leerlijn · Certum Studio" };

/** Eén prompt → een leerlijn van exact zes modules. Na indienen bestaat de leerlijn in de database. */
export default function NewLearningLinePage() {
  return <LearningLineIntake />;
}
