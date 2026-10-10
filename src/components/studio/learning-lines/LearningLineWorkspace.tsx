"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  approveDesignAction,
  approvePackageAction,
  generateDesignAction,
  requestDesignRevisionAction,
  startProductionAction,
} from "@/app/learning-lines/workflow/actions";
import type { LearningLineResult, LearningLineView } from "@/app/learning-lines/workflow/learning-lines";
import { SYNTHETIC_DATA_ATTESTATION } from "@/modules/governance";
import { learningLineError } from "./messages";

/*
 * Leerlijnwerkplek. Eén kolom, mobiel bruikbaar. Twee menselijke gates: Gate 1 (ontwerp: GO of één revisie-instructie)
 * en Gate 2 (eindpakket). De productie per module loopt in de bestaande trainingwerkplek (/trainings/[id]).
 * React-state is alleen een weergave van de laatste server-snapshot.
 */

const ROUTE_LABEL = { open_choice: "Meerdere routes verdedigbaar", prescribed_action: "Eén handelingslijn leidend" } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <div className="mt-1 text-[15px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

const primary =
  "h-12 w-full rounded-md bg-petrol-700 px-4 text-base font-medium text-white hover:bg-petrol-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
const secondary =
  "h-12 w-full rounded-md border border-line bg-canvas px-4 text-base font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

export function LearningLineWorkspace({ initial }: { initial: LearningLineView }) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [attested, setAttested] = useState(false);
  const [findingsConfirmed, setFindingsConfirmed] = useState(false);
  const [feedback, setFeedback] = useState("");

  const run = (action: () => Promise<LearningLineResult>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.status === "ok") {
        setView(result.view);
        after?.();
      } else {
        setError(learningLineError(result));
      }
    });

  const design = view.design;
  const reviewFindings = view.gate1?.moduleInputs.flatMap((m) => m.findings.filter((f) => f.severity === "review_required").map((f) => ({ ...f, moduleId: m.moduleId }))) ?? [];
  const blockedModules = view.gate1?.moduleInputs.filter((m) => m.status === "blocked") ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-petrol-600">
        {view.line.code} · {view.statusLabel}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{design?.payload.title ?? view.line.title}</h1>
      {view.prompt && <p className="mt-3 text-sm text-muted">Prompt: {view.prompt}</p>}

      {error && (
        <p role="alert" className="mt-6 whitespace-pre-line rounded-md border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {!design && (
        <Section title="Ontwerp">
          <p className="text-[15px] text-muted">Er is nog geen leerlijnontwerp. Dit start een nieuwe AI-aanroep als de Leerlijn Architect op Claude staat.</p>
          <button type="button" className={`mt-4 ${primary}`} disabled={pending} onClick={() => run(() => generateDesignAction(view.line.id))}>
            {pending ? "Bezig…" : "Ontwerp maken"}
          </button>
        </Section>
      )}

      {design && (
        <>
          <Section title={`Leerlijnontwerp · versie ${design.revisionNo}${design.source === "mock" ? " (mock)" : ""}`}>
            <Field label="Doelgroep">{design.payload.targetAudience}</Field>
            <Field label="Beroepsprobleem">{design.payload.professionalProblem}</Field>
            <Field label="Overkoepelende competentie">{design.payload.overarchingCompetency}</Field>
            <Field label="Belofte">{design.payload.promise}</Field>
            <Field label="Progressie M1 → M6">
              {design.payload.progression.rationale}
              <span className="mt-1 block text-muted">{design.payload.progression.difficultyArc}</span>
            </Field>
            <Field label="Toetsopbouw">{design.payload.assessmentArc}</Field>
            <Field label="Overlap voorkomen">
              <ul className="list-disc pl-5">
                {design.payload.overlapPrevention.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </Field>
            <Field label="Studielastvoorstel">{design.plannedMinutes} minuten (som van de zes modules)</Field>
          </Section>

          <Section title="Zes modules">
            <ol className="space-y-3">
              {design.payload.modules.map((m) => {
                const production = view.modules.find((p) => p.moduleId === m.id)?.training;
                return (
                  <li key={m.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                    <details>
                      <summary className="cursor-pointer list-none">
                        <span className="text-sm font-medium text-petrol-700">Module {m.sequence}</span>
                        <span className="block text-[15px] font-medium text-ink">{m.title}</span>
                        <span className="mt-1 block text-sm text-muted">
                          {m.estimatedMinutes} min · {ROUTE_LABEL[m.routePolicy]}
                          {production ? ` · ${production.code}: ${production.stageLabel}` : ""}
                        </span>
                      </summary>
                      <Field label="Eigen professionele spanning">{m.uniqueProfessionalTension}</Field>
                      <Field label="Functie in de leerlijn">{m.learningFunction}</Field>
                      <Field label="Leerdoelen">
                        <ul className="list-disc pl-5">
                          {m.learningGoals.map((g, i) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </Field>
                      <Field label="Succescriteria">
                        <ul className="list-disc pl-5">
                          {m.successCriteria.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </Field>
                      <Field label="Hoofdsimulatie">{m.primaryScenarioDirection}</Field>
                      <Field label="Transfer">{m.transferDirection}</Field>
                      <Field label="Toetsing">{m.assessmentDirection}</Field>
                      {m.sourceNeeds.length > 0 && (
                        <Field label="Kennisbehoeften">
                          <ul className="list-disc pl-5">
                            {m.sourceNeeds.map((s) => (
                              <li key={s.id}>
                                {s.id}: {s.question}
                              </li>
                            ))}
                          </ul>
                        </Field>
                      )}
                      {production && (
                        <p className="mt-3">
                          <Link href={`/trainings/${production.id}`} className="text-sm text-petrol-700 underline underline-offset-2">
                            Open training {production.code}
                          </Link>
                        </p>
                      )}
                    </details>
                  </li>
                );
              })}
            </ol>
          </Section>

          {view.gate1 && (
            <Section title="Gate 1 · ontwerp beoordelen">
              <p className="text-[15px] text-muted">
                GO legt dit ontwerp vast en maakt productie mogelijk. Wil je iets anders, geef dan één aanwijzing voor het hele ontwerp.
              </p>
              {blockedModules.length > 0 && (
                <p className="mt-4 rounded-md border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger">
                  De invoer van {blockedModules.map((m) => m.moduleId).join(", ")} bevat een direct herkenbaar gegeven. Vraag eerst een revisie aan.
                </p>
              )}
              {reviewFindings.length > 0 && (
                <div className="mt-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink">
                  <p className="font-medium">Gemarkeerd in de module-invoer (Privacy Preflight):</p>
                  <ul className="mt-2 list-disc pl-5">
                    {reviewFindings.map((f) => (
                      <li key={`${f.moduleId}-${f.id}`}>
                        {f.moduleId}: {f.label} ‘{f.text}’
                      </li>
                    ))}
                  </ul>
                  <label className="mt-3 flex items-start gap-3">
                    <input type="checkbox" checked={findingsConfirmed} onChange={(e) => setFindingsConfirmed(e.target.checked)} className="mt-1 size-5 shrink-0" />
                    <span>Ik heb deze fragmenten gecontroleerd: ze zijn fictief en verwijzen niet naar echte personen of instellingen.</span>
                  </label>
                </div>
              )}
              <label className="mt-4 flex items-start gap-3 text-sm text-ink">
                <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1 size-5 shrink-0" />
                <span>{SYNTHETIC_DATA_ATTESTATION}</span>
              </label>
              <div className="mt-4">
                <button
                  type="button"
                  className={primary}
                  disabled={pending || !attested || blockedModules.length > 0 || (reviewFindings.length > 0 && !findingsConfirmed)}
                  onClick={() =>
                    run(() =>
                      approveDesignAction(
                        view.line.id,
                        design.revisionId,
                        attested,
                        Object.fromEntries(view.gate1!.moduleInputs.map((m) => [m.moduleId, m.findings.filter((f) => f.severity === "review_required").map((f) => f.id)])),
                      ),
                    )
                  }
                >
                  GO · ontwerp goedkeuren
                </button>
              </div>

              <label htmlFor="revision-feedback" className="mt-8 block text-sm font-medium text-ink">
                Of: wat moet er in de volgende versie anders?
              </label>
              <textarea
                id="revision-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={3000}
                rows={4}
                className="mt-2 w-full rounded-md border border-line bg-canvas px-3 py-3 text-base text-ink focus:border-petrol-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted">Dit start een nieuwe AI-aanroep voor het hele ontwerp.</p>
              <button
                type="button"
                className={`mt-3 ${secondary}`}
                disabled={pending || !feedback.trim()}
                onClick={() => run(() => requestDesignRevisionAction(view.line.id, design.revisionId, feedback), () => setFeedback(""))}
              >
                Revisie aanvragen
              </button>
            </Section>
          )}

          {design.approved && (
            <Section title="Productie">
              <p className="text-[15px] text-muted">
                Iedere module wordt een training in de bestaande Studio: Certum Analyse, richting, Blueprint, Block Plan, bronnen en
                inhoud, met de bestaande menselijke stappen per training. {view.production.started}/{view.production.total} gestart,{" "}
                {view.production.ready}/{view.production.total} Training gereed.
              </p>
              {view.production.started < view.production.total && (
                <>
                  <p className="mt-2 text-xs text-muted">Per nieuwe module start de Certum Analyse (een AI-aanroep als de analyse op Claude staat).</p>
                  <button type="button" className={`mt-3 ${primary}`} disabled={pending} onClick={() => run(() => startProductionAction(view.line.id))}>
                    {pending ? "Trainingen worden aangemaakt…" : "Productie starten"}
                  </button>
                </>
              )}
            </Section>
          )}

          {view.packages && (
            <Section title="Pakketten">
              <ul className="space-y-2 text-[15px]">
                {(["certum", "tom", "skj"] as const).map((kind) => (
                  <li key={kind}>
                    <a href={`/learning-lines/${view.line.id}/packages/${kind}`} target="_blank" rel="noreferrer" className="text-petrol-700 underline underline-offset-2">
                      {kind === "certum" ? "Certum Package" : kind === "tom" ? "Tom Package" : "SKJ Package"} (JSON)
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">
                {view.packages.approved
                  ? "Gate 2: eindpakket goedgekeurd."
                  : view.packages.complete
                    ? "Alle zes modules zijn gereed. Bekijk de pakketten en keur het eindpakket goed (Gate 2)."
                    : "De pakketten zijn een afgeleide van de huidige stand; ze zijn pas compleet als alle zes modules Training gereed zijn."}
              </p>
              {view.packages.complete && !view.packages.approved && (
                <button type="button" className={`mt-3 ${primary}`} disabled={pending} onClick={() => run(() => approvePackageAction(view.line.id, view.packages!.certumHash))}>
                  Gate 2 · eindpakket goedkeuren
                </button>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
