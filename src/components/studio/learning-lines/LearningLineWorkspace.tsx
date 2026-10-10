"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  approveGate1Action,
  approveGate2Action,
  generateDesignAction,
  prepareModulesAction,
  produceContentAction,
  requestDesignRevisionAction,
} from "@/app/learning-lines/workflow/actions";
import { GATE1_SOURCE_STATEMENT, type LearningLineResult, type LearningLineView, type ProductionIssue } from "@/app/learning-lines/workflow/learning-lines";
import { getCatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import { SYNTHETIC_DATA_ATTESTATION } from "@/modules/governance";
import { learningLineError } from "./messages";

/*
 * Leerlijnwerkplek met Gate Compression V1. Twee menselijke handelingen: Gate 1 (ontwerp, richting, Blueprint, plan,
 * scopes en bronnen) en Gate 2 (alle inhoud, Start/Einde en de pakketten). Daartussen werkt Certum automatisch.
 * Eén kolom, mobiel bruikbaar; details zijn uitklapbaar. React-state is alleen een weergave van de laatste
 * server-snapshot plus de keuzes in het Gate 1-scherm.
 */

type Scope = "professional" | "organisation_specific";
type Extra = { title: string; publisher: string; url: string; relevantContent: string };
const EMPTY_EXTRA: Extra = { title: "", publisher: "", url: "", relevantContent: "" };
const ROUTE_LABEL: Record<string, string> = { open_choice: "Meerdere routes verdedigbaar", prescribed_action: "Eén handelingslijn leidend" };
const BLOCKER_LABEL = {
  input_review: "De module-invoer bevat een gemarkeerd fragment; bevestig dat het fictief is.",
  input_blocked: "De module-invoer bevat een direct herkenbaar gegeven; vraag een revisie van het ontwerp aan.",
  analysis_not_ready: "De Certum Analyse vond geen concreet keuzemoment; vraag een revisie van het ontwerp aan.",
} as const;

const primary =
  "h-12 w-full rounded-md bg-petrol-700 px-4 text-base font-medium text-white hover:bg-petrol-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
const secondary =
  "h-12 w-full rounded-md border border-line bg-canvas px-4 text-base font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
const input = "mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-base text-ink focus:border-petrol-600 focus:outline-none";

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

function issueText(issue: ProductionIssue) {
  return `${issue.moduleId} · ${issue.step}${issue.plannedBlockId ? ` ${issue.plannedBlockId}` : ""}: ${issue.reason}`;
}

export function LearningLineWorkspace({ initial }: { initial: LearningLineView }) {
  const [view, setView] = useState(initial);
  const [issues, setIssues] = useState<ProductionIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [attested, setAttested] = useState(false);
  const [sourcesValidated, setSourcesValidated] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [scopes, setScopes] = useState<Record<string, Record<string, Scope>>>(() =>
    Object.fromEntries(initial.modules.map((m) => [m.moduleId, Object.fromEntries((m.blueprint?.sourceNeeds ?? []).flatMap((n) => (n.scope ? [[n.id, n.scope]] : [])))])),
  );
  /** Per module de gekozen bibliotheekbronnen; zolang de opleider niets wijzigt: het voorstel van de bronselectie. */
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const [extra, setExtra] = useState<Record<string, Extra>>({});
  const [inputAcks, setInputAcks] = useState<Record<string, boolean>>({});

  const run = (action: () => Promise<LearningLineResult>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.status === "ok") {
        setView(result.view);
        setIssues(result.issues ?? []);
        after?.();
      } else {
        setError(learningLineError(result) + (result.moduleId ? `\nModule: ${result.moduleId}` : ""));
      }
    });

  const design = view.design;
  const library = view.library ?? [];
  const selectedFor = (moduleId: string) => chosen[moduleId] ?? view.modules.find((m) => m.moduleId === moduleId)?.proposedSourceIds ?? [];
  const extraFilled = (moduleId: string) => !!extra[moduleId]?.title.trim() && !!extra[moduleId]?.relevantContent.trim();
  const gate1Ready =
    view.status === "gate1" &&
    view.modules.every(
      (m) =>
        !m.blocker &&
        m.blueprint &&
        m.plan &&
        m.blueprint.sourceNeeds.every((n) => scopes[m.moduleId]?.[n.id]) &&
        (m.blueprint.bronRefs.length === 0 || selectedFor(m.moduleId).length > 0 || extraFilled(m.moduleId) || m.validatedSources.length > 0),
    );

  const gate1Payload = () => ({
    revisionId: design!.revisionId,
    syntheticDataAttested: attested,
    sourcesValidated,
    modules: Object.fromEntries(
      view.modules.map((m) => [
        m.moduleId,
        {
          blueprintRevisionId: m.blueprint!.revisionId,
          planHash: m.plan!.hash,
          scopes: scopes[m.moduleId] ?? {},
          librarySourceIds: selectedFor(m.moduleId),
          extraSources: extraFilled(m.moduleId)
            ? [{ title: extra[m.moduleId].title, sourceType: "document", author: null, publisher: extra[m.moduleId].publisher || null, publicationDate: null, url: extra[m.moduleId].url || null, relevantContent: extra[m.moduleId].relevantContent }]
            : [],
        },
      ]),
    ),
  });

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
      {issues.length > 0 && (
        <div className="mt-6 rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-sm text-attention-700">
          <p className="font-medium">Niet alles is gelukt (uitzonderingspad):</p>
          <ul className="mt-1 list-disc pl-5">
            {issues.map((i, n) => (
              <li key={n}>{issueText(i)}</li>
            ))}
          </ul>
        </div>
      )}

      {!design && (
        <Section title="Ontwerp">
          <p className="text-[15px] text-muted">Er is nog geen leerlijnontwerp. Dit start nieuwe AI-aanroepen.</p>
          <button type="button" className={`mt-4 ${primary}`} disabled={pending} onClick={() => run(() => generateDesignAction(view.line.id))}>
            {pending ? "Bezig…" : "Ontwerp maken"}
          </button>
        </Section>
      )}

      {design && (
        <>
          <Section title={`Leerlijnontwerp · versie ${design.revisionNo}${design.source === "mock" ? " (mock)" : ""}`}>
            <Field label="Doelgroep">{design.payload.targetAudience}</Field>
            <Field label="Overkoepelende competentie">{design.payload.overarchingCompetency}</Field>
            <Field label="Belofte">{design.payload.promise}</Field>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-petrol-700">Beroepsprobleem, progressie, toetsopbouw en studielast</summary>
              <Field label="Beroepsprobleem">{design.payload.professionalProblem}</Field>
              <Field label="Progressie M1 → M6">
                {design.payload.progression.rationale}
                <span className="mt-1 block text-muted">{design.payload.progression.difficultyArc}</span>
              </Field>
              <Field label="Overlap voorkomen">{design.payload.overlapPrevention.join(" · ")}</Field>
              <Field label="Toetsopbouw">{design.payload.assessmentArc}</Field>
              <Field label="Studielastvoorstel">{design.plannedMinutes} minuten</Field>
            </details>
          </Section>

          {view.status === "preparing" && (
            <Section title="Voorbereiding">
              <p className="text-[15px] text-muted">
                Certum maakt per module een training, een Certum Analyse, een richting, een Blueprint en een voorlopig Block Plan.
                Is dit onderbroken, hervat dan; wat er al is, blijft.
              </p>
              <button type="button" className={`mt-3 ${primary}`} disabled={pending} onClick={() => run(() => prepareModulesAction(view.line.id, undefined))}>
                {pending ? "Bezig met voorbereiden…" : "Voorbereiding hervatten"}
              </button>
            </Section>
          )}

          <Section title="Zes modules">
            <ol className="space-y-3">
              {view.modules.map((m) => {
                const spec = design.payload.modules.find((s) => s.id === m.moduleId)!;
                return (
                  <li key={m.moduleId} className="rounded-lg border border-line bg-surface px-4 py-3">
                    <p className="text-sm font-medium text-petrol-700">Module {m.sequence}</p>
                    <p className="text-[15px] font-medium text-ink">{m.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {spec.estimatedMinutes} min · {ROUTE_LABEL[spec.routePolicy]}
                      {m.training ? ` · ${m.training.code}: ${m.training.stageLabel}` : ""}
                    </p>

                    {m.blocker && (
                      <div className="mt-3 rounded-md border border-attention/30 bg-attention-50 px-3 py-2 text-sm text-attention-700">
                        <p>{BLOCKER_LABEL[m.blocker]}</p>
                        {m.blocker === "input_review" && m.inputCheck && (
                          <>
                            <ul className="mt-1 list-disc pl-5">
                              {m.inputCheck.findings.map((f) => (
                                <li key={f.id}>
                                  {f.label} ‘{f.text}’
                                </li>
                              ))}
                            </ul>
                            <label className="mt-2 flex items-start gap-3">
                              <input type="checkbox" className="mt-1 size-5 shrink-0" checked={!!inputAcks[m.moduleId]} onChange={(e) => setInputAcks((a) => ({ ...a, [m.moduleId]: e.target.checked }))} />
                              <span>Deze fragmenten zijn fictief en verwijzen niet naar echte personen of instellingen.</span>
                            </label>
                            <button
                              type="button"
                              className={`mt-2 ${secondary}`}
                              disabled={pending || !inputAcks[m.moduleId]}
                              onClick={() => run(() => prepareModulesAction(view.line.id, { [m.moduleId]: m.inputCheck!.findings.filter((f) => f.severity === "review_required").map((f) => f.id) }))}
                            >
                              Module voorbereiden
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-petrol-700">Moduleopdracht</summary>
                      <Field label="Eigen professionele spanning">{spec.uniqueProfessionalTension}</Field>
                      <Field label="Hoofdsimulatie">{spec.primaryScenarioDirection}</Field>
                      <Field label="Transfer">{spec.transferDirection}</Field>
                      <Field label="Toetsing">{spec.assessmentDirection}</Field>
                    </details>

                    {m.direction && (
                      <Field label="Richting (systeemvoorstel)">
                        <span className="font-medium">{m.direction.title}</span> · {m.direction.focus}
                      </Field>
                    )}
                    {m.blueprint && (
                      <Field label={`Blueprint${m.blueprint.approved ? " · goedgekeurd" : ""}`}>
                        <span className="font-medium">{m.blueprint.title}</span>
                        <span className="mt-1 block">{m.blueprint.learningGoal}</span>
                      </Field>
                    )}
                    {m.plan && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-petrol-700">
                          Block Plan{m.plan.approved ? " · goedgekeurd" : " · voorlopig"} ({m.plan.blocks.length} blokken)
                        </summary>
                        <ol className="mt-2 space-y-1 text-sm text-ink">
                          {m.plan.blocks.map((b) => (
                            <li key={b.sequence}>
                              {b.sequence}. {b.certumPhase} · {getCatalogBlock(b.catalogBlockId)?.visibleName ?? b.catalogBlockId}: {b.purpose}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}

                    {view.status === "gate1" && m.blueprint && !m.blueprint.approved && (
                      <div className="mt-3">
                        <p className="text-xs font-medium tracking-wide text-muted uppercase">Kennisbehoeften: kies de scope</p>
                        {m.blueprint.sourceNeeds.map((n) => (
                          <div key={n.id} className="mt-2 text-sm text-ink">
                            <p>
                              {n.id}: {n.question}
                            </p>
                            <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:gap-4">
                              {(["professional", "organisation_specific"] as const).map((scope) => (
                                <label key={scope} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    className="size-5"
                                    name={`${m.moduleId}-${n.id}`}
                                    checked={scopes[m.moduleId]?.[n.id] === scope}
                                    onChange={() => setScopes((s) => ({ ...s, [m.moduleId]: { ...(s[m.moduleId] ?? {}), [n.id]: scope } }))}
                                  />
                                  {scope === "professional" ? "Professionele / algemene kennis" : "Organisatiespecifieke kennis"}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}

                        <p className="mt-4 text-xs font-medium tracking-wide text-muted uppercase">Bronnen voor deze module</p>
                        {library.length > 0 ? (
                          [...library]
                            .sort((a, b) => Number(m.proposedSourceIds.includes(b.libraryId)) - Number(m.proposedSourceIds.includes(a.libraryId)))
                            .map((l) => (
                            <label key={l.libraryId} className="mt-2 flex items-start gap-3 text-sm text-ink">
                              <input
                                type="checkbox"
                                className="mt-1 size-5 shrink-0"
                                checked={selectedFor(m.moduleId).includes(l.libraryId)}
                                onChange={(e) =>
                                  setChosen((c) => {
                                    const current = c[m.moduleId] ?? m.proposedSourceIds;
                                    return { ...c, [m.moduleId]: e.target.checked ? [...current, l.libraryId] : current.filter((x) => x !== l.libraryId) };
                                  })
                                }
                              />
                              <span>
                                {l.fields.title}
                                {m.proposedSourceIds.includes(l.libraryId) && <span className="ml-2 text-xs text-petrol-700">voorgesteld</span>}
                              </span>
                            </label>
                          ))
                        ) : (
                          <ExtraSource value={extra[m.moduleId] ?? EMPTY_EXTRA} onChange={(v) => setExtra((x) => ({ ...x, [m.moduleId]: v }))} />
                        )}
                      </div>
                    )}

                    {m.validatedSources.length > 0 && <Field label="Gevalideerde bronnen">{m.validatedSources.join(" · ")}</Field>}
                    {m.content && (
                      <p className="mt-3 text-sm text-muted">
                        Inhoud: {m.content.generated}/{m.content.total} blokken gegenereerd, {m.content.approved} goedgekeurd{m.content.frame ? ", Start/Einde aanwezig" : ""}.
                      </p>
                    )}
                    {m.training && (
                      <p className="mt-3">
                        <Link href={`/trainings/${m.training.id}`} className="text-sm text-petrol-700 underline underline-offset-2">
                          Open training {m.training.code}
                        </Link>
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </Section>

          {view.status === "gate1" && (
            <Section title="Gate 1 · één GO">
              {library.length > 0 && (
                <details className="mb-4" open>
                  <summary className="cursor-pointer text-sm text-petrol-700">Voorgestelde bronnen en passages (eerder door een mens gevalideerd)</summary>
                  {library.map((l) => (
                    <div key={l.libraryId} className="mt-3 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink">
                      <p className="font-medium">{l.fields.title}</p>
                      <p className="text-muted">{[l.fields.publisher, l.fields.publicationDate, l.fields.url].filter(Boolean).join(" · ")}</p>
                      <p className="mt-2 whitespace-pre-line">{l.fields.relevantContent}</p>
                    </div>
                  ))}
                </details>
              )}
              <p className="text-[15px] text-muted">
                GO keurt in één handeling goed: het leerlijnontwerp, de richting, de scopes, de Blueprint en het Block Plan van iedere
                module, en valideert de aangevinkte bronnen. Daarna start de productie automatisch (nieuwe AI-aanroepen).
              </p>
              <label className="mt-4 flex items-start gap-3 text-sm text-ink">
                <input type="checkbox" checked={sourcesValidated} onChange={(e) => setSourcesValidated(e.target.checked)} className="mt-1 size-5 shrink-0" />
                <span>{GATE1_SOURCE_STATEMENT}</span>
              </label>
              <label className="mt-3 flex items-start gap-3 text-sm text-ink">
                <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1 size-5 shrink-0" />
                <span>{SYNTHETIC_DATA_ATTESTATION}</span>
              </label>
              <button type="button" className={`mt-4 ${primary}`} disabled={pending || !gate1Ready || !attested || !sourcesValidated} onClick={() => run(() => approveGate1Action(view.line.id, gate1Payload()))}>
                {pending ? "Goedkeuren en produceren…" : "GO · Gate 1"}
              </button>
              {!gate1Ready && <p className="mt-2 text-xs text-muted">Kies voor iedere kennisbehoefte een scope en zorg per module voor minstens één bron.</p>}

              <label htmlFor="revision-feedback" className="mt-8 block text-sm font-medium text-ink">
                Of: wat moet er in de volgende versie van het hele ontwerp anders?
              </label>
              <textarea id="revision-feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={3000} rows={4} className={input} />
              <p className="mt-1 text-xs text-muted">Dit start nieuwe AI-aanroepen: een nieuw ontwerp en een nieuwe voorbereiding van de modules.</p>
              <button type="button" className={`mt-3 ${secondary}`} disabled={pending || !feedback.trim()} onClick={() => run(() => requestDesignRevisionAction(view.line.id, design.revisionId, feedback), () => setFeedback(""))}>
                Revisie aanvragen
              </button>
            </Section>
          )}

          {view.status === "producing" && (
            <Section title="Productie">
              <p className="text-[15px] text-muted">
                Certum maakt de inhoud van alle blokken en Start/Einde, meerdere tegelijk. Mislukt er iets, dan blijft alleen dat open;
                hervatten start nieuwe AI-aanroepen voor wat nog ontbreekt.
              </p>
              <button type="button" className={`mt-3 ${primary}`} disabled={pending} onClick={() => run(() => produceContentAction(view.line.id))}>
                {pending ? "Bezig met produceren…" : "Productie hervatten"}
              </button>
            </Section>
          )}

          {view.status === "gate2" && view.gate2 && (
            <Section title="Gate 2 · één GO">
              <p className="text-[15px] text-muted">
                Bekijk per module de inhoud (link naar de training) en de pakketten hieronder. GO keurt alle blokken, Start en Einde van
                de zes modules goed en daarna het eindpakket.
              </p>
              <button type="button" className={`mt-4 ${primary}`} disabled={pending} onClick={() => run(() => approveGate2Action(view.line.id, view.gate2!.fingerprint))}>
                GO · Gate 2
              </button>
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
                {view.packages.approved ? "Eindpakket goedgekeurd." : "Afgeleid van de huidige stand; compleet na Gate 2."}
              </p>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function ExtraSource({ value, onChange }: { value: Extra; onChange: (v: Extra) => void }) {
  const set = (k: keyof Extra) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="mt-2 rounded-md border border-attention/30 bg-attention-50 px-3 py-2 text-sm text-ink">
      <p>Er is nog geen gevalideerde bron in de bibliotheek. Voeg één echte bron toe (uitzonderingspad).</p>
      <label className="mt-2 block">
        Titel
        <input className={input} value={value.title} onChange={set("title")} />
      </label>
      <label className="mt-2 block">
        Uitgever / organisatie
        <input className={input} value={value.publisher} onChange={set("publisher")} />
      </label>
      <label className="mt-2 block">
        URL
        <input className={input} value={value.url} onChange={set("url")} inputMode="url" />
      </label>
      <label className="mt-2 block">
        Letterlijke passage
        <textarea className={input} rows={5} value={value.relevantContent} onChange={set("relevantContent")} />
      </label>
    </div>
  );
}

