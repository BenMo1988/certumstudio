import type { PreviewChatRequest, PreviewFeedbackRequest, PreviewRuntimeResult, PreviewRuntimeService } from "./services";

/*
 * Mock-runtime voor Participant Preview: deterministisch, zonder netwerk of AI. Bewijst het gedrag dat de preview nodig
 * heeft: de persona reageert op wat de deelnemer zegt, stelt minstens één vervolgvraag voordat ze meebeweegt, en de
 * feedback benoemt alleen de context die de server heeft vrijgegeven.
 */

const excerpt = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
};

export class MockPreviewRuntimeService implements PreviewRuntimeService {
  readonly info = { provider: "mock" as const, model: null, chatEffort: null, feedbackEffort: null };

  async chatReply(request: PreviewChatRequest): Promise<PreviewRuntimeResult> {
    const participantTurns = request.history.filter((t) => t.role === "participant");
    const last = participantTurns.at(-1)?.text ?? "";
    let text: string;
    if (request.goalReached && request.config.goal) {
      text = `Goed, dat is helder. (mock: instructie na doelbehaling wordt gevolgd)`;
    } else if (participantTurns.length <= 1) {
      // Eerste reactie: altijd een geloofwaardige vervolgvraag of tegenpositie.
      text = `Je zegt: "${excerpt(last)}" Maar wat betekent dat concreet? Wat kunnen wij dan wél weten om goed te kunnen ondersteunen?`;
    } else if (participantTurns.length === 2) {
      text = `Oké, ik hoor wat je zegt: "${excerpt(last)}" Ik vind het nog steeds lastig, maar ik wil wel meedenken. Wat stel je voor?`;
    } else {
      text = `Goed. Laten we dan afspreken hoe we verder gaan. (mock-beurt ${participantTurns.length})`;
    }
    return { text, usage: null };
  }

  async feedback(request: PreviewFeedbackRequest): Promise<PreviewRuntimeResult> {
    const used = request.context.map((c) => `${c.plannedBlockId} (${c.blockTitle}, ${c.answer.length} tekens)`);
    const text = request.context.length
      ? `Mock-feedback op basis van ${request.context.length} antwoord(en): ${used.join("; ")}. Je antwoord laat zien welke afweging je maakte; benoem nog explicieter wat voor jou de doorslag gaf.`
      : "Mock-feedback: er zijn geen antwoorden beschikbaar om op te reageren.";
    return { text, usage: null };
  }
}
