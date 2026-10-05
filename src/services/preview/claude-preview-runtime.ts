import { buildParticipantChatSystem } from "@/knowledge/prompts/participant-chat-v1";
import { PARTICIPANT_FEEDBACK_SYSTEM, buildParticipantFeedbackRequest } from "@/knowledge/prompts/participant-feedback-v1";
import { toAnalysisError, type ClaudeMessagesClient } from "../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../analysis/errors";
import type { ClaudePreviewSettings } from "./config";
import type { PreviewChatRequest, PreviewFeedbackRequest, PreviewRuntimeResult, PreviewRuntimeService } from "./services";

type CreateRequest = Parameters<ClaudeMessagesClient["messages"]["create"]>[0];
type Message = { role: "user" | "assistant"; content: string };

/**
 * Participant Preview-runtime via Claude: platte tekst (geen structured output), één call per chatbeurt of
 * feedbackblok, `maxRetries: 0`, geen fallbackmodel. Fouten worden providerneutraal; inhoud wordt nooit doorgegeven.
 */
export class ClaudePreviewRuntimeService implements PreviewRuntimeService {
  readonly info;

  constructor(
    private readonly client: ClaudeMessagesClient,
    private readonly settings: Omit<ClaudePreviewSettings, "apiKey">,
  ) {
    this.info = { provider: "claude" as const, model: settings.model, chatEffort: settings.chatEffort, feedbackEffort: settings.effort };
  }

  async chatReply(request: PreviewChatRequest): Promise<PreviewRuntimeResult> {
    // Het eerste persona-bericht staat in de systeeminstructie; de berichten beginnen bij de eerste deelnemerbeurt.
    const messages: Message[] = request.history.slice(1).map((t) => ({ role: t.role === "participant" ? "user" : "assistant", content: t.text }));
    return this.call(buildParticipantChatSystem(request.config, request.goalReached), messages, this.settings.chatMaxTokens, this.settings.chatEffort);
  }

  async feedback(request: PreviewFeedbackRequest): Promise<PreviewRuntimeResult> {
    return this.call(PARTICIPANT_FEEDBACK_SYSTEM, [{ role: "user", content: buildParticipantFeedbackRequest(request) }], this.settings.feedbackMaxTokens, this.settings.effort);
  }

  private async call(system: string, messages: Message[], maxTokens: number, effort: string): Promise<PreviewRuntimeResult> {
    let response;
    try {
      response = await this.client.messages.create({
        model: this.settings.model,
        max_tokens: maxTokens,
        system,
        messages,
        output_config: { effort },
      } as unknown as CreateRequest);
    } catch (error) {
      throw toAnalysisError(error);
    }
    const message = response as unknown as {
      stop_reason: string | null;
      content: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    if (message.stop_reason === "refusal") throw new AnalysisError("refusal", "Claude weigerde dit antwoord.");
    const text = message.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    if (!text) throw new AnalysisError("empty", "Geen antwoord ontvangen.");
    const usage = message.usage ? { inputTokens: message.usage.input_tokens ?? 0, outputTokens: message.usage.output_tokens ?? 0 } : null;
    return { text, usage };
  }
}
