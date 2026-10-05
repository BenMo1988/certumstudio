import { PARTICIPANT_CHAT_V1_PROMPT_VERSION } from "@/knowledge/prompts/participant-chat-v1";
import { PARTICIPANT_FEEDBACK_V1_1_PROMPT_VERSION } from "@/knowledge/prompts/participant-feedback-v1-1";
import type { BlockContentResult, TrainingContentPackage } from "@/modules/block-content";
import { approvedVisibleEntities, buildPreview, evaluatePreviewPrivacy, type PreviewModel } from "@/modules/preview";
import { PRIVACY_PREFLIGHT_VERSION, type PreflightCategory, type PreflightStatus } from "@/modules/privacy/types";
import { AnalysisError } from "@/services/analysis/errors";
import type { Db } from "@/services/storage/db";
import { loadTrainingWorkspace, type WorkflowStage } from "@/services/storage/workspace";
import type { PreviewChatConfig, PreviewChatTurn, PreviewFeedbackContextItem, PreviewRuntimeResult, PreviewRuntimeService } from "@/services/preview/services";

/*
 * Participant Preview V1 (Step 17A), server-side. De trainer doorloopt een goedgekeurde training als deelnemer.
 *
 * - Alleen een training in de stand "Training gereed" (current, goedgekeurd) kan worden bekeken; iedere runtime-call
 *   controleert dat opnieuw. Alle trusted configuratie (persona, scenario, eerste bericht, gespreksdoel, feedback-
 *   instructies, beschikbare context) komt uit de goedgekeurde blokrevisions in de database, nooit uit de browser.
 * - Ephemeral: antwoorden en gesprekken bestaan alleen in de previewsessie van de browser; niets wordt opgeslagen en
 *   een deelnemersantwoord is nooit een trainingswijziging. Attempt-persistence wordt later een aparte productlaag.
 * - Iedere runtime-call vereist de synthetic-only-bevestiging van de trainer en een geslaagde lokale Privacy Preflight
 *   op de nieuwe deelnemerstekst; anders geen call. Enige vrijstelling: een `possible_person_name` die exact een naam is
 *   die de deelnemer tot en met deze stap in de goedgekeurde training heeft kunnen zien (`modules/preview/privacy.ts`).
 * - Logging: alleen metadata (training, blok, bloktype, promptversie, provider/model, duur, tokens, uitkomst). Nooit
 *   deelnemerstekst, chatberichten, AI-antwoorden, feedbacktekst, broninhoud of prompts.
 */

/** Veiligheidsgrens tegen eindeloze previewcalls; geen didactische regel. */
export const MAX_PARTICIPANT_TURNS = 12;
export const MAX_MESSAGE_CHARS = 2_000;
const MAX_PERSONA_CHARS = 4_000;

export type PreviewLogEntry = PreviewRuntimeLogEntry | PreviewPrivacyLogEntry;

/** Privacybesluit vóór een runtime-call. Alleen aantallen en de beslissing; nooit waarden, posities of tekst. */
export interface PreviewPrivacyLogEntry {
  event: "certum.preview_privacy";
  kind: "chat" | "feedback";
  trainingId: string;
  plannedBlockId: string;
  preflightVersion: string;
  status: PreflightStatus;
  categories: Partial<Record<PreflightCategory, number>>;
  approvedEntityMatches: number;
  decision: "allowed" | "blocked";
}

export interface PreviewRuntimeLogEntry {
  event: "certum.preview_runtime";
  kind: "chat" | "feedback";
  trainingId: string;
  plannedBlockId: string;
  catalogBlockId: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  effort: string | null;
  durationMs: number;
  outcome: "success" | "error";
  errorKind?: string;
  inputTokens?: number;
  outputTokens?: number;
  participantTurns?: number;
  contextItems?: number;
}

export interface PreviewDeps {
  db: Db;
  getRuntime: () => PreviewRuntimeService;
  log?: (entry: PreviewLogEntry) => void;
  now?: () => number;
}

export type PreviewRejection =
  | "not_found"
  | "not_ready"
  | "invalid_input"
  | "attestation_required"
  | "privacy_blocked"
  | "turn_limit"
  /** De provider leverde een afgekapt antwoord (tokenlimiet); dat wordt nooit als compleet getoond. */
  | "incomplete_output"
  | "provider_error";

export type PreviewLoadResult =
  | { status: "ok"; training: { id: string; code: string; title: string }; preview: PreviewModel }
  | { status: "not_found" }
  | { status: "not_ready"; training: { id: string; code: string; title: string }; stage: WorkflowStage };

export type PreviewChatResult =
  | { status: "ok"; reply: string; goalReached: boolean; goalMessage: string | null }
  | { status: "rejected"; reason: PreviewRejection; categories?: string[] };

export type PreviewFeedbackResult =
  | { status: "ok"; feedback: string; usedContext: string[] }
  | { status: "rejected"; reason: PreviewRejection; categories?: string[] };

const defaultLog = (entry: PreviewLogEntry) => console.info(JSON.stringify(entry));

/** De current goedgekeurde trainingsstand, of waarom die er niet is. Bulk-snapshot: 4 queries. */
async function approvedPackage(db: Db, trainingId: string) {
  const ws = await loadTrainingWorkspace(db, trainingId);
  if (!ws) return { status: "not_found" as const };
  const training = { id: ws.training.id, code: ws.training.code, title: ws.training.title };
  if (ws.progress.stage !== "training_ready" || !ws.content || ws.content.package.readiness !== "approved") {
    return { status: "not_ready" as const, training, stage: ws.progress.stage };
  }
  return { status: "ok" as const, training, pkg: ws.content.package };
}

/** De deelnemersweergave van een goedgekeurde training (geen runtime-call). */
export async function loadPreview(db: Db, trainingId: string): Promise<PreviewLoadResult> {
  const approved = await approvedPackage(db, trainingId);
  if (approved.status !== "ok") return approved;
  return { status: "ok", training: approved.training, preview: buildPreview(approved.pkg) };
}

const generatedBlock = (pkg: TrainingContentPackage, plannedBlockId: string): BlockContentResult | null =>
  pkg.blocks.find((b) => b.plannedBlockId === plannedBlockId && b.body.status === "generated") ?? null;

/**
 * Het privacybesluit over de deelnemersteksten, met de vertrouwde set uit wat de deelnemer tot en met dit blok van de
 * goedgekeurde training kon zien. Altijd gelogd (alleen metadata). `null` = toegestaan.
 */
function privacyGate(deps: PreviewDeps, pkg: TrainingContentPackage, kind: "chat" | "feedback", trainingId: string, plannedBlockId: string, texts: string[]) {
  const result = evaluatePreviewPrivacy(texts, approvedVisibleEntities(buildPreview(pkg), plannedBlockId));
  (deps.log ?? defaultLog)({
    event: "certum.preview_privacy",
    kind,
    trainingId,
    plannedBlockId,
    preflightVersion: PRIVACY_PREFLIGHT_VERSION,
    status: result.preflightStatus,
    categories: result.categories,
    approvedEntityMatches: result.approvedEntityMatches,
    decision: result.decision,
  });
  return result.decision === "allowed" ? null : { status: "rejected" as const, reason: "privacy_blocked" as const, categories: result.blockingCategories };
}

const failureReason = (error: unknown): PreviewRejection => (error instanceof AnalysisError && error.kind === "incomplete" ? "incomplete_output" : "provider_error");

const isTurns = (value: unknown): value is PreviewChatTurn[] =>
  Array.isArray(value) &&
  value.every(
    (t) =>
      typeof t === "object" &&
      t !== null &&
      ((t as PreviewChatTurn).role === "participant" || (t as PreviewChatTurn).role === "persona") &&
      typeof (t as PreviewChatTurn).text === "string",
  );

function logRuntime(deps: PreviewDeps, entry: PreviewRuntimeLogEntry) {
  (deps.log ?? defaultLog)(entry);
}

function usageOf(result: PreviewRuntimeResult | null) {
  return result?.usage ? { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens } : {};
}

/**
 * Eén gespreksbeurt van de fictieve persoon in een Chat simulatie.
 * `history` is de eigen geschiedenis van dít blok ná het eerste bericht van de persona (dat zet de server zelf
 * vooraan); `message` is de nieuwe beurt van de deelnemer. Iedere Chat simulatie heeft een eigen geschiedenis.
 */
export async function previewChatTurn(
  deps: PreviewDeps,
  input: { trainingId: string; plannedBlockId: string; history: unknown; message: unknown; syntheticAttested: unknown },
): Promise<PreviewChatResult> {
  if (input.syntheticAttested !== true) return { status: "rejected", reason: "attestation_required" };
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_CHARS || !isTurns(input.history)) return { status: "rejected", reason: "invalid_input" };
  const history = input.history;
  // Strikt afwisselend: deelnemer, persona, deelnemer, ... en eindigend met een persona-beurt (of leeg).
  if (history.some((t, i) => t.role !== (i % 2 === 0 ? "participant" : "persona") || !t.text.trim() || t.text.length > (t.role === "participant" ? MAX_MESSAGE_CHARS : MAX_PERSONA_CHARS))) {
    return { status: "rejected", reason: "invalid_input" };
  }
  if (history.length % 2 !== 0) return { status: "rejected", reason: "invalid_input" };
  const participantTurns = history.length / 2 + 1;
  if (participantTurns > MAX_PARTICIPANT_TURNS) return { status: "rejected", reason: "turn_limit" };

  const approved = await approvedPackage(deps.db, input.trainingId);
  if (approved.status === "not_found") return { status: "rejected", reason: "not_found" };
  if (approved.status === "not_ready") return { status: "rejected", reason: "not_ready" };
  const block = generatedBlock(approved.pkg, input.plannedBlockId);
  if (!block || block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.chat-simulatie") return { status: "rejected", reason: "not_found" };
  const blocked = privacyGate(deps, approved.pkg, "chat", input.trainingId, input.plannedBlockId, [message]);
  if (blocked) return blocked;
  const c = block.body.content;
  const config: PreviewChatConfig = {
    personaName: c.personaName,
    personaInstructions: c.personaInstructions,
    scenarioContext: c.scenarioContext,
    firstMessage: c.firstMessage,
    goal: c.goal,
  };

  // Gespreksdoel zoals in BC Online: sleutelwoorden in de beurten van de deelnemer (alleen als het blok een doel heeft).
  const participantTexts = [...history.filter((t) => t.role === "participant").map((t) => t.text), message];
  const hits = (texts: string[]) => !!config.goal && texts.some((text) => config.goal!.keywords.some((k) => k.trim() && text.toLowerCase().includes(k.trim().toLowerCase())));
  const goalReached = hits(participantTexts);
  const newlyReached = goalReached && !hits(participantTexts.slice(0, -1));

  const fullHistory: PreviewChatTurn[] = [{ role: "persona", text: config.firstMessage }, ...history, { role: "participant", text: message }];
  const runtime = deps.getRuntime();
  const started = (deps.now ?? Date.now)();
  const meta = {
    event: "certum.preview_runtime" as const,
    kind: "chat" as const,
    trainingId: input.trainingId,
    plannedBlockId: input.plannedBlockId,
    catalogBlockId: c.catalogBlockId,
    promptVersion: PARTICIPANT_CHAT_V1_PROMPT_VERSION,
    provider: runtime.info.provider,
    model: runtime.info.model,
    effort: runtime.info.chatEffort,
    participantTurns,
  };
  let result: PreviewRuntimeResult;
  try {
    result = await runtime.chatReply({ config, history: fullHistory, goalReached });
  } catch (error) {
    logRuntime(deps, { ...meta, durationMs: (deps.now ?? Date.now)() - started, outcome: "error", errorKind: error instanceof AnalysisError ? error.kind : "unknown" });
    return { status: "rejected", reason: failureReason(error) };
  }
  logRuntime(deps, { ...meta, durationMs: (deps.now ?? Date.now)() - started, outcome: "success", ...usageOf(result) });
  return { status: "ok", reply: result.text, goalReached, goalMessage: newlyReached ? config.goal!.messageOnGoal : null };
}

/**
 * AI Feedback op uitsluitend de server-goedgekeurde context: de `availableContext` van het goedgekeurde blok,
 * beperkt tot vraagblokken met een antwoord in deze previewsessie. Chatgeschiedenis gaat nooit mee (de catalogus toont
 * niet aan dat AI Feedback die krijgt); context-ids van de client worden genegeerd.
 */
export async function previewFeedback(
  deps: PreviewDeps,
  input: { trainingId: string; plannedBlockId: string; answers: unknown; syntheticAttested: unknown },
): Promise<PreviewFeedbackResult> {
  if (input.syntheticAttested !== true) return { status: "rejected", reason: "attestation_required" };
  if (typeof input.answers !== "object" || input.answers === null || Array.isArray(input.answers)) return { status: "rejected", reason: "invalid_input" };
  const answers = input.answers as Record<string, unknown>;

  const approved = await approvedPackage(deps.db, input.trainingId);
  if (approved.status === "not_found") return { status: "rejected", reason: "not_found" };
  if (approved.status === "not_ready") return { status: "rejected", reason: "not_ready" };
  const block = generatedBlock(approved.pkg, input.plannedBlockId);
  if (!block || block.body.status !== "generated" || block.body.content.catalogBlockId !== "certum.bco.ai-feedback") return { status: "rejected", reason: "not_found" };
  const c = block.body.content;

  const context: PreviewFeedbackContextItem[] = [];
  for (const id of c.availableContext) {
    const source = generatedBlock(approved.pkg, id);
    const answer = answers[id];
    if (!source || source.body.status !== "generated" || source.body.content.catalogBlockId !== "certum.bco.open-vraag") continue;
    if (typeof answer !== "string" || !answer.trim()) continue;
    if (answer.length > MAX_MESSAGE_CHARS * 2) return { status: "rejected", reason: "invalid_input" };
    context.push({ plannedBlockId: id, blockTitle: source.body.content.title, question: source.body.content.question, answer: answer.trim() });
  }
  const blocked = privacyGate(deps, approved.pkg, "feedback", input.trainingId, input.plannedBlockId, context.map((x) => x.answer));
  if (blocked) return blocked;

  const runtime = deps.getRuntime();
  const started = (deps.now ?? Date.now)();
  const meta = {
    event: "certum.preview_runtime" as const,
    kind: "feedback" as const,
    trainingId: input.trainingId,
    plannedBlockId: input.plannedBlockId,
    catalogBlockId: c.catalogBlockId,
    promptVersion: PARTICIPANT_FEEDBACK_V1_1_PROMPT_VERSION,
    provider: runtime.info.provider,
    model: runtime.info.model,
    effort: runtime.info.feedbackEffort,
    contextItems: context.length,
  };
  let result: PreviewRuntimeResult;
  try {
    result = await runtime.feedback({ instructions: c.instructions, context });
  } catch (error) {
    logRuntime(deps, { ...meta, durationMs: (deps.now ?? Date.now)() - started, outcome: "error", errorKind: error instanceof AnalysisError ? error.kind : "unknown" });
    return { status: "rejected", reason: failureReason(error) };
  }
  logRuntime(deps, { ...meta, durationMs: (deps.now ?? Date.now)() - started, outcome: "success", ...usageOf(result) });
  return { status: "ok", feedback: result.text, usedContext: context.map((x) => x.plannedBlockId) };
}
