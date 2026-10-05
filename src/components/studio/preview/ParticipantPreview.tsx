"use client";

import { useState, useTransition, type ReactNode } from "react";
import { previewChatTurnAction, previewFeedbackAction } from "@/app/trainings/preview/actions";
import type { PreviewRejection } from "@/app/trainings/preview/preview-runtime";
import type { PreviewModel, PreviewStep } from "@/modules/preview";
import type { PreviewChatTurn } from "@/services/preview/services";
import { Button } from "../Button";
import { Icon } from "../Icon";

/*
 * Participant Preview V1: de trainer doorloopt een goedgekeurde training als deelnemer. Eén rustige kolom, in de echte
 * volgorde. Alle staat (antwoorden, gesprekken, feedback) leeft alleen in deze browsersessie: niets wordt opgeslagen,
 * verversen of "Preview opnieuw starten" wist alles. Navigeren en renderen doen nooit een runtime-call; alleen
 * "Versturen" (chat) en "Feedback ophalen" roepen de server aan.
 */

const SYNTHETIC_STATEMENT = "Ik gebruik in deze preview uitsluitend synthetische testantwoorden en voer geen echte cliënt- of persoonsgegevens in.";

const MESSAGES: Record<PreviewRejection, string> = {
  not_found: "Dit onderdeel bestaat niet (meer) in de goedgekeurde training.",
  not_ready: "Deze training is niet (meer) gereed. Open de Studio om de stand te bekijken.",
  invalid_input: "Dit kon niet worden verwerkt. Controleer je tekst (maximaal 2.000 tekens).",
  attestation_required: "Bevestig eerst dat je uitsluitend synthetische testantwoorden gebruikt.",
  privacy_blocked: "Je tekst bevat mogelijk persoonsgegevens. Er is niets verstuurd; pas je tekst aan.",
  turn_limit: "Het maximale aantal beurten voor deze preview is bereikt. Rond het gesprek af.",
  output_truncated: "Het antwoord kon niet volledig worden gegenereerd en wordt daarom niet getoond. Je kunt het opnieuw proberen.",
  provider_error: "Er kwam nu geen antwoord. Probeer het opnieuw.",
};

interface ChatState {
  /** Beurten ná het eerste bericht van de persona. */
  turns: PreviewChatTurn[];
  closed: boolean;
  goalMessage: string | null;
}

interface State {
  confirmed: boolean;
  index: number;
  reached: number;
  answers: Record<string, string>;
  submitted: Record<string, boolean>;
  chats: Record<string, ChatState>;
  feedback: Record<string, { text: string; usedContext: string[] }>;
}

const initial: State = { confirmed: false, index: 0, reached: 0, answers: {}, submitted: {}, chats: {}, feedback: {} };

export function ParticipantPreview({ trainingId, code, preview }: { trainingId: string; code: string; preview: PreviewModel }) {
  const [state, setState] = useState<State>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const step = preview.steps[state.index];
  const total = preview.steps.length;
  const completed = isComplete(step, state);
  const readOnly = state.index < state.reached;

  const go = (index: number) => {
    setError(null);
    setState((s) => ({ ...s, index, reached: Math.max(s.reached, index) }));
    window.scrollTo({ top: 0 });
  };
  const reset = () => {
    if (!window.confirm("Preview opnieuw starten? Alle antwoorden, gesprekken en feedback van deze sessie worden gewist.")) return;
    setError(null);
    setState(initial);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="mx-auto max-w-2xl" data-testid="participant-preview" data-step={state.index} data-kind={step.kind}>
      <p className="sticky top-0 z-10 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-attention/30 bg-attention-50 px-4 py-2 text-sm font-medium text-attention-700" data-testid="preview-banner">
        <span>Trainer preview — niet voor deelnemers</span>
        <span className="text-xs font-normal">{code}</span>
      </p>

      {!state.confirmed ? (
        <section className="rounded-lg border border-line p-6" data-testid="preview-attestation">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{preview.title}</h1>
          <p className="mt-3 text-[15px] text-ink">
            Je doorloopt deze training zoals een deelnemer. Antwoorden en gesprekken blijven alleen in deze previewsessie en
            worden niet opgeslagen.
          </p>
          <p className="mt-3 rounded-md bg-attention-50 px-3 py-2 text-sm text-attention-700">
            Gebruik uitsluitend synthetische testantwoorden. Voer geen echte cliënt- of persoonsgegevens in.
          </p>
          <ConfirmStart onStart={() => setState((s) => ({ ...s, confirmed: true }))} />
          {preview.hasCapabilityBlockers && (
            <p className="mt-4 text-sm text-muted">Let op: deze training bevat onderdelen die Preview V1 nog niet kan tonen; die worden als zodanig gemarkeerd.</p>
          )}
        </section>
      ) : (
        <>
          <div className="mb-6" data-testid="preview-progress">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                Onderdeel {state.index + 1} van {total}
              </span>
              <button type="button" className="underline-offset-2 hover:text-petrol-700 hover:underline" onClick={reset} data-testid="preview-reset">
                Preview opnieuw starten
              </button>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface">
              <div className="h-1.5 rounded-full bg-petrol-600 transition-all" style={{ width: `${((state.index + 1) / total) * 100}%` }} />
            </div>
          </div>

          <StepView
            step={step}
            state={state}
            readOnly={readOnly}
            pending={pending}
            setAnswer={(id, v) => setState((s) => ({ ...s, answers: { ...s.answers, [id]: v } }))}
            submitAnswer={(id) => setState((s) => ({ ...s, submitted: { ...s.submitted, [id]: true } }))}
            sendChat={(id, message) =>
              startTransition(async () => {
                setError(null);
                const chat = state.chats[id] ?? { turns: [], closed: false, goalMessage: null };
                const result = await previewChatTurnAction(trainingId, id, chat.turns, message, state.confirmed);
                if (result.status !== "ok") {
                  setError(MESSAGES[result.reason] + (result.categories?.length ? ` (${result.categories.join(", ")})` : ""));
                  return;
                }
                setState((s) => {
                  const current = s.chats[id] ?? { turns: [], closed: false, goalMessage: null };
                  return {
                    ...s,
                    chats: {
                      ...s.chats,
                      [id]: {
                        ...current,
                        turns: [...current.turns, { role: "participant", text: message.trim() }, { role: "persona", text: result.reply }],
                        goalMessage: result.goalMessage ?? current.goalMessage,
                      },
                    },
                  };
                });
              })
            }
            closeChat={(id) => setState((s) => ({ ...s, chats: { ...s.chats, [id]: { ...(s.chats[id] ?? { turns: [], goalMessage: null }), closed: true } } }))}
            requestFeedback={(id) =>
              startTransition(async () => {
                setError(null);
                // De server bepaalt welke antwoorden als context zijn toegestaan; de client stuurt alleen de eigen antwoorden.
                const submittedAnswers = Object.fromEntries(Object.entries(state.answers).filter(([k]) => state.submitted[k]));
                const result = await previewFeedbackAction(trainingId, id, submittedAnswers, state.confirmed);
                if (result.status !== "ok") {
                  setError(MESSAGES[result.reason] + (result.categories?.length ? ` (${result.categories.join(", ")})` : ""));
                  return;
                }
                setState((s) => ({ ...s, feedback: { ...s.feedback, [id]: { text: result.feedback, usedContext: result.usedContext } } }));
              })
            }
          />

          {error && (
            <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger" data-testid="preview-error">
              {error}
            </p>
          )}

          <nav className="mt-10 flex items-center justify-between border-t border-line pt-6">
            {state.index > 0 ? (
              <Button variant="secondary" disabled={pending} onClick={() => go(state.index - 1)}>
                <Icon name="arrowLeft" className="size-4" />
                Vorige
              </Button>
            ) : (
              <span />
            )}
            {state.index < total - 1 ? (
              <Button disabled={pending || !completed} onClick={() => go(state.index + 1)}>
                Verder
                <Icon name="arrowRight" className="size-4" />
              </Button>
            ) : (
              <p className="text-sm text-muted" data-testid="preview-finished">
                Einde van de training (preview).
              </p>
            )}
          </nav>
        </>
      )}
    </div>
  );
}

function ConfirmStart({ onStart }: { onStart: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="mt-5">
      <label className="flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} data-testid="preview-attest" />
        {SYNTHETIC_STATEMENT}
      </label>
      <div className="mt-4">
        <Button disabled={!checked} onClick={onStart}>
          Preview starten
        </Button>
      </div>
    </div>
  );
}

function isComplete(step: PreviewStep, state: State): boolean {
  switch (step.kind) {
    case "chat":
      return !!state.chats[step.plannedBlockId]?.closed;
    case "open-vraag":
      return !!state.submitted[step.plannedBlockId];
    case "ai-feedback":
      return !!state.feedback[step.plannedBlockId];
    default:
      return true;
  }
}

function Header({ eyebrow, title, minutes }: { eyebrow: string; title: string; minutes?: number | null }) {
  return (
    <header>
      <p className="text-xs font-semibold tracking-wider text-petrol-700 uppercase">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {minutes ? <p className="mt-1 text-xs text-muted">Ongeveer {minutes} minuten</p> : null}
    </header>
  );
}

const Paragraphs = ({ text }: { text: string }) => (
  <div className="mt-5 space-y-3 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
    {text.split(/\n{2,}/).map((p, i) => (
      <p key={i}>{p}</p>
    ))}
  </div>
);

function StepView({
  step,
  state,
  readOnly,
  pending,
  setAnswer,
  submitAnswer,
  sendChat,
  closeChat,
  requestFeedback,
}: {
  step: PreviewStep;
  state: State;
  readOnly: boolean;
  pending: boolean;
  setAnswer: (id: string, value: string) => void;
  submitAnswer: (id: string) => void;
  sendChat: (id: string, message: string) => void;
  closeChat: (id: string) => void;
  requestFeedback: (id: string) => void;
}): ReactNode {
  switch (step.kind) {
    case "start":
      return (
        <article data-testid="step-start">
          <Header eyebrow="Start" title={step.title} minutes={step.estimatedDurationMinutes} />
          <Paragraphs text={step.introduction} />
          <section className="mt-6 rounded-md bg-surface px-4 py-3">
            <p className="text-sm font-medium text-ink">Leerdoel</p>
            {step.learningGoals.map((g, i) => (
              <p key={i} className="mt-1 text-sm text-ink">
                {g}
              </p>
            ))}
          </section>
        </article>
      );
    case "end":
      return (
        <article data-testid="step-end">
          <Header eyebrow="Afsluiting" title="Afronding" />
          <Paragraphs text={step.closingText} />
          {step.summary && (
            <section className="mt-6 rounded-md bg-surface px-4 py-3">
              <p className="text-sm font-medium text-ink">Samenvatting</p>
              <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{step.summary}</p>
            </section>
          )}
        </article>
      );
    case "tekst":
      return (
        <article data-testid="step-tekst" data-block={step.plannedBlockId}>
          <Header eyebrow={step.phase} title={step.title} minutes={step.estimatedMinutes} />
          <Paragraphs text={step.text} />
        </article>
      );
    case "open-vraag": {
      const answer = state.answers[step.plannedBlockId] ?? "";
      const done = !!state.submitted[step.plannedBlockId];
      return (
        <article data-testid="step-open-vraag" data-block={step.plannedBlockId}>
          <Header eyebrow={step.phase} title={step.title} minutes={step.estimatedMinutes} />
          <Paragraphs text={step.question} />
          <textarea
            className="mt-5 min-h-40 w-full rounded-md border border-line bg-canvas px-3 py-2 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-petrol-600 disabled:bg-surface"
            value={answer}
            disabled={done || readOnly}
            maxLength={4000}
            onChange={(e) => setAnswer(step.plannedBlockId, e.target.value)}
            aria-label="Jouw antwoord"
            data-testid="answer-input"
          />
          {!done ? (
            <div className="mt-3">
              <Button disabled={!answer.trim() || readOnly} onClick={() => submitAnswer(step.plannedBlockId)}>
                Antwoord bevestigen
              </Button>
            </div>
          ) : (
            (step.feedback || step.exampleAnswer) && (
              <section className="mt-5 space-y-3 rounded-md bg-surface px-4 py-3 text-sm text-ink" data-testid="open-vraag-toelichting">
                {step.feedback && <p className="whitespace-pre-wrap">{step.feedback}</p>}
                {step.exampleAnswer && (
                  <p className="whitespace-pre-wrap">
                    <span className="font-medium">Voorbeeldantwoord: </span>
                    {step.exampleAnswer}
                  </p>
                )}
              </section>
            )
          )}
        </article>
      );
    }
    case "chat":
      return <ChatStep step={step} chat={state.chats[step.plannedBlockId]} readOnly={readOnly} pending={pending} send={sendChat} close={closeChat} />;
    case "ai-feedback": {
      const result = state.feedback[step.plannedBlockId];
      return (
        <article data-testid="step-ai-feedback" data-block={step.plannedBlockId}>
          <Header eyebrow={step.phase} title={step.title} minutes={step.estimatedMinutes} />
          <p className="mt-4 text-sm text-muted">
            Deze feedback is gebaseerd op je antwoorden bij: {step.basedOn.length ? step.basedOn.map((b) => b.title).join(", ") : "geen eerdere vragen"}.
          </p>
          {result ? (
            <div className="mt-5 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-4 text-[15px] leading-relaxed whitespace-pre-wrap text-ink" data-testid="feedback-text" data-used={result.usedContext.join(",")}>
              {result.text}
            </div>
          ) : (
            <div className="mt-5">
              <Button disabled={pending || readOnly} onClick={() => requestFeedback(step.plannedBlockId)}>
                {pending ? "Feedback wordt gemaakt…" : "Feedback ophalen"}
              </Button>
            </div>
          )}
        </article>
      );
    }
    case "unsupported":
      return (
        <article data-testid="step-unsupported" data-block={step.plannedBlockId}>
          <Header eyebrow={step.phase} title={step.title} />
          <p className="mt-5 rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-sm text-attention-700" data-testid="capability-blocker">
            Preview-beperking: {step.reason} Dit onderdeel wordt hier niet nagebootst.
          </p>
        </article>
      );
  }
}

function ChatStep({
  step,
  chat,
  readOnly,
  pending,
  send,
  close,
}: {
  step: Extract<PreviewStep, { kind: "chat" }>;
  chat: ChatState | undefined;
  readOnly: boolean;
  pending: boolean;
  send: (id: string, message: string) => void;
  close: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const turns = chat?.turns ?? [];
  const closed = !!chat?.closed || readOnly;
  const participantTurns = turns.filter((t) => t.role === "participant").length;

  return (
    <article data-testid="step-chat" data-block={step.plannedBlockId} data-turns={participantTurns} data-closed={!!chat?.closed}>
      <Header eyebrow={step.phase} title={step.title} minutes={step.estimatedMinutes} />
      {step.scenarioContext && <Paragraphs text={step.scenarioContext} />}
      {step.timeLimitMinutes ? <p className="mt-3 text-xs text-muted">Indicatie: ongeveer {step.timeLimitMinutes} minuten (geen timer).</p> : null}

      <section className="mt-6 space-y-3 rounded-lg border border-line bg-surface p-4" aria-label="Gesprek" data-testid="chat-transcript">
        <Bubble who={step.personaName} text={step.firstMessage} side="persona" />
        {turns.map((t, i) => (
          <Bubble key={i} who={t.role === "persona" ? step.personaName : "Jij"} text={t.text} side={t.role} />
        ))}
        {pending && !closed && <p className="text-xs text-muted">{step.personaName} typt…</p>}
      </section>
      {chat?.goalMessage && (
        <p className="mt-3 rounded-md bg-petrol-50 px-3 py-2 text-sm text-petrol-800" data-testid="chat-goal">
          {chat.goalMessage}
        </p>
      )}

      {closed ? (
        <p className="mt-4 text-sm text-muted" data-testid="chat-closed">
          Het gesprek is afgerond.
        </p>
      ) : (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            send(step.plannedBlockId, draft);
            setDraft("");
          }}
        >
          <textarea
            className="min-h-24 w-full rounded-md border border-line bg-canvas px-3 py-2 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-petrol-600"
            value={draft}
            maxLength={2000}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Jouw reactie"
            placeholder="Typ je reactie…"
            data-testid="chat-input"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-petrol-700 px-4 text-sm font-medium text-white transition-colors hover:bg-petrol-800 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="chat-send"
            >
              Versturen
            </button>
            <Button variant="secondary" disabled={pending || participantTurns === 0} onClick={() => close(step.plannedBlockId)}>
              Gesprek afronden
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}

function Bubble({ who, text, side }: { who: string; text: string; side: "persona" | "participant" }) {
  const mine = side === "participant";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`} data-role={side}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[15px] leading-relaxed ${mine ? "bg-petrol-700 text-white" : "border border-line bg-canvas text-ink"}`}>
        <p className={`text-xs font-medium ${mine ? "text-petrol-100" : "text-muted"}`}>{who}</p>
        <p className="mt-0.5 whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
