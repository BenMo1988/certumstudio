import { METHODOLOGY_STEPS } from "@/knowledge";
import { getCatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import type { BlockContentResult, TrainingContentPackage } from "@/modules/block-content";

/*
 * Participant Preview V1: wat de deelnemer van een goedgekeurde training te zien krijgt, in de echte volgorde
 * (Vaste Start → blokken op sequence → Vast Einde). Puur afgeleid uit het goedgekeurde Training Content Package.
 *
 * Bewust NIET in deze weergave (blijft server-side): persona-instructies en het gespreksdoel van een Chat simulatie, de
 * instructies van AI Feedback en alle revision-ids. De deelnemer ziet wat hij in BC Online ook zou zien.
 *
 * V1 ondersteunt Tekst, Chat simulatie, Open vraag en AI Feedback (plus Start en Einde). Andere bloktypes worden niet
 * nagebootst: die worden een expliciete capability blocker.
 */

export const PREVIEW_SUPPORTED_BLOCKS = ["certum.bco.tekst", "certum.bco.chat-simulatie", "certum.bco.open-vraag", "certum.bco.ai-feedback"] as const;

interface StepBase {
  plannedBlockId: string;
  sequence: number;
  phase: string;
  title: string;
}

export type PreviewStep =
  | { kind: "start"; title: string; introduction: string; learningGoals: string[]; estimatedDurationMinutes: number | null }
  | (StepBase & { kind: "tekst"; text: string; estimatedMinutes: number | null })
  | (StepBase & {
      kind: "chat";
      personaName: string;
      scenarioContext: string | null;
      firstMessage: string;
      /** Indicatie uit het contract; geen harde timer. */
      timeLimitMinutes: number | null;
      estimatedMinutes: number | null;
    })
  | (StepBase & { kind: "open-vraag"; question: string; exampleAnswer: string | null; feedback: string | null; estimatedMinutes: number | null })
  | (StepBase & { kind: "ai-feedback"; basedOn: { plannedBlockId: string; title: string }[]; estimatedMinutes: number | null })
  | (StepBase & { kind: "unsupported"; workform: string; reason: string })
  | { kind: "end"; closingText: string; summary: string | null };

export interface PreviewModel {
  title: string;
  steps: PreviewStep[];
  /** Er is minstens één blok dat V1 niet kan tonen; de preview toont dat expliciet. */
  hasCapabilityBlockers: boolean;
}

const phaseLabel = (id: string) => METHODOLOGY_STEPS.find((s) => s.id === id)?.label ?? id;

function stepFor(block: BlockContentResult, titleOf: (id: string) => string): PreviewStep {
  const base = { plannedBlockId: block.plannedBlockId, sequence: block.sequence, phase: phaseLabel(block.certumPhase) };
  const workform = getCatalogBlock(block.catalogBlockId)?.visibleName ?? block.catalogBlockId;
  if (block.body.status !== "generated") {
    return { ...base, kind: "unsupported", title: workform, workform, reason: "Dit blok heeft geen goedgekeurde inhoud." };
  }
  const c = block.body.content;
  const minutes = block.accreditation.estimatedMinutes;
  switch (c.catalogBlockId) {
    case "certum.bco.tekst":
      return { ...base, kind: "tekst", title: c.title, text: c.text, estimatedMinutes: minutes };
    case "certum.bco.chat-simulatie":
      return {
        ...base,
        kind: "chat",
        title: c.title,
        personaName: c.personaName,
        scenarioContext: c.scenarioContext,
        firstMessage: c.firstMessage,
        timeLimitMinutes: c.timeLimitMinutes,
        estimatedMinutes: minutes,
      };
    case "certum.bco.open-vraag":
      return { ...base, kind: "open-vraag", title: c.title, question: c.question, exampleAnswer: c.exampleAnswer, feedback: c.feedback, estimatedMinutes: minutes };
    case "certum.bco.ai-feedback":
      return { ...base, kind: "ai-feedback", title: c.title, basedOn: c.availableContext.map((id) => ({ plannedBlockId: id, title: titleOf(id) })), estimatedMinutes: minutes };
    default:
      return { ...base, kind: "unsupported", title: "title" in c ? String(c.title) : workform, workform, reason: `${workform} wordt in Participant Preview V1 nog niet ondersteund.` };
  }
}

/** De deelnemersweergave van een goedgekeurd pakket. */
export function buildPreview(pkg: TrainingContentPackage): PreviewModel {
  const blocks = [...pkg.blocks].sort((a, b) => a.sequence - b.sequence);
  const titleOf = (id: string) => {
    const b = blocks.find((x) => x.plannedBlockId === id);
    return b && b.body.status === "generated" && "title" in b.body.content ? String(b.body.content.title) : id;
  };
  const steps: PreviewStep[] = [
    {
      kind: "start",
      title: pkg.start.title,
      introduction: pkg.start.introduction,
      learningGoals: pkg.start.learningGoals,
      estimatedDurationMinutes: pkg.start.estimatedDurationMinutes,
    },
    ...blocks.map((b) => stepFor(b, titleOf)),
    { kind: "end", closingText: pkg.end.closingText, summary: pkg.end.summary },
  ];
  return { title: pkg.title, steps, hasCapabilityBlockers: steps.some((s) => s.kind === "unsupported") };
}
