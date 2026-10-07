"use client";

import { useState, type ReactNode } from "react";
import { METHODOLOGY_STEPS } from "@/knowledge";
import type { EvaluationBasis, RoutePolicy, SourceNeedScope, TrainingBlueprintV2 as TrainingBlueprint } from "@/modules/training-blueprint/v2";
import { Button } from "./Button";
import { Icon } from "./Icon";
import type { ActResult } from "./review/ReviewWorkspace";

const AMBIGUITY_LABEL: Record<TrainingBlueprint["ambiguity"], string> = {
  single_best_action: "Eén beste handelwijze",
  multiple_defensible_actions: "Meerdere verdedigbare handelwijzen",
};

const PERFORMANCE_LABEL: Record<TrainingBlueprint["learningArc"]["actie"]["performanceType"], string> = {
  gesprek_voeren: "Een gesprek voeren",
  keuze_maken_en_onderbouwen: "Een keuze maken en onderbouwen",
  informatie_wegen: "Informatie wegen",
  schriftelijk_formuleren: "Schriftelijk formuleren",
};

const ROUTE_POLICY_LABEL: Record<RoutePolicy, string> = {
  open_choice: "Open keuze: meerdere verdedigbare routes",
  prescribed_action: "Eén normatief gewenste handeling",
};

const EVALUATION_BASIS_LABEL: Record<EvaluationBasis, string> = {
  afweging: "afweging",
  aansluiting_op_situatie: "aansluiting op de situatie",
  onderbouwing: "onderbouwing",
  proportionaliteit: "proportionaliteit",
  consequenties: "consequenties",
  uitvoering: "uitvoering",
  voorgeschreven_handeling: "voorgeschreven handeling",
};

const bases = (items: EvaluationBasis[]) => items.map((b) => EVALUATION_BASIS_LABEL[b]).join(" · ");

interface BlueprintReviewProps {
  blueprint: TrainingBlueprint;
  pending: boolean;
  /** Al goedgekeurd (opgeslagen): de knop gaat dan naar de volgende stap. */
  approved?: boolean;
  onApprove: () => void;
  onBack: () => void;
  /** SourceNeed Scope Review: de classificatie opslaan (nieuwe Blueprint-versie). */
  onSaveScopes: (scopes: Record<string, SourceNeedScope>) => Promise<ActResult>;
  /** Gerichte revisie: de openstaande menselijke toelichting op deze versie, of `null`. */
  revisionFeedback?: string | null;
  /** "Laten aanpassen": de toelichting opslaan (genereert zelf niets). */
  onRequestRevision?: (feedback: string) => Promise<ActResult>;
  /** De nieuwe Blueprint-versie genereren met de opgeslagen toelichting (een nieuwe AI-aanroep). */
  onGenerateRevision?: () => void;
}

/**
 * Review van de Training Blueprint (Blueprint Contract V2): het didactisch ontwerp. Alleen de scope van de
 * kennisbehoeften is bewerkbaar (SourceNeed Scope Review); de Blueprint kan pas worden goedgekeurd als iedere
 * kennisbehoefte geclassificeerd en opgeslagen is.
 */
export function BlueprintReview({
  blueprint,
  pending,
  approved = false,
  onApprove,
  onBack,
  onSaveScopes,
  revisionFeedback = null,
  onRequestRevision,
  onGenerateRevision,
}: BlueprintReviewProps) {
  const unclassified = blueprint.sourceNeeds.some((n) => n.scope === undefined);
  const arc = blueprint.learningArc;
  const phaseContent: Record<string, ReactNode> = {
    context: (
      <>
        <Line label="Wat de deelnemer weet">{arc.context.participantKnows}</Line>
        <Line label="Bewust onbekend">{arc.context.deliberatelyUnknown}</Line>
        <Line label="Waar spanning ontstaat">{arc.context.tensionArises}</Line>
      </>
    ),
    actie: (
      <>
        <Line label="De deelnemer moet">{arc.actie.participantMust}</Line>
        <Line label="Routes">{ROUTE_POLICY_LABEL[arc.actie.routePolicy]}</Line>
        <Line label="Soort prestatie">{PERFORMANCE_LABEL[arc.actie.performanceType]}</Line>
      </>
    ),
    reflectie: (
      <>
        <Line label="Terugkijken op">{arc.reflectie.looksBackOn}</Line>
        <Line label="Expliciete afweging">{arc.reflectie.explicitTradeOff}</Line>
      </>
    ),
    feedback: (
      <>
        <Line label="Reageert op">{arc.feedback.respondsTo}</Line>
        <Line label="Dimensies">{arc.feedback.dimensions.join(" · ")}</Line>
        <Line label="Beoordeelt">{bases(arc.feedback.evaluationBasis)}</Line>
        {arc.feedback.multipleDefensibleHandling && (
          <Line label="Meerdere verdedigbare keuzes">{arc.feedback.multipleDefensibleHandling}</Line>
        )}
      </>
    ),
    bron: (
      <>
        <Line label="Leerintentie">{arc.bron.learningIntent}</Line>
        <Line label="Gebruikt kennisbehoeften">
          {arc.bron.sourceNeedRefs.length > 0 ? arc.bron.sourceNeedRefs.join(", ") : "Geen"}
        </Line>
      </>
    ),
    toets: (
      <>
        <Line label="Opnieuw aantonen">{arc.toets.demonstrate}</Line>
        <Line label="Transfer zichtbaar door">{arc.toets.transferEvidence}</Line>
        <Line label="Nieuw keuzemoment">{arc.toets.newDecisionPoint}</Line>
        <Line label="Beoordeelt">{bases(arc.toets.evaluationBasis)}</Line>
      </>
    ),
  };

  return (
    <div className="mt-10" data-testid="blueprint-review">
      <dl className="divide-y divide-line border-y border-line">
        <Fact label="Titel">{blueprint.title}</Fact>
        <Fact label="Doelgroep">
          {blueprint.targetAudience ?? <span className="text-muted italic">Niet af te leiden uit de invoer</span>}
        </Fact>
        <Fact label="Leerdoel">{blueprint.learningGoal}</Fact>
        <Fact label="Professioneel dilemma">{blueprint.professionalDilemma}</Fact>
        <Fact label="Hoofdkeuzemoment">
          {blueprint.decisionPoint.task}
          <span className="mt-1 block text-sm text-muted" data-testid="route-policy" data-value={blueprint.decisionPoint.routePolicy}>
            {ROUTE_POLICY_LABEL[blueprint.decisionPoint.routePolicy]}
          </span>
        </Fact>
        <Fact label="Ambiguïteit">
          <span data-testid="ambiguity" data-value={blueprint.ambiguity}>
            {AMBIGUITY_LABEL[blueprint.ambiguity]}
          </span>
        </Fact>
        <Fact label="Succescriteria">
          <List items={blueprint.successCriteria} />
        </Fact>
        <Fact label="Ontwerpaannames">
          {blueprint.assumptions.length > 0 ? (
            <List items={blueprint.assumptions.map((a) => `${a.assumption} ${a.reason}`)} />
          ) : (
            "Geen"
          )}
        </Fact>
      </dl>

      {blueprint.sourceNeeds.length > 0 && <ScopeReview blueprint={blueprint} pending={pending} onSaveScopes={onSaveScopes} />}

      <section className="mt-14" aria-labelledby="arc-heading">
        <h2 id="arc-heading" className="text-lg font-semibold tracking-tight text-ink">
          Leerroute volgens de Certum-methodiek
        </h2>
        <p className="mt-1 text-sm text-muted">Ontwerpintenties per fase; nog geen uitgeschreven content.</p>
        <ol className="mt-5 space-y-3" data-testid="learning-arc">
          {METHODOLOGY_STEPS.map((step, i) => (
            <li key={step.id} className="grid grid-cols-[2rem_1fr] gap-4 rounded-lg border border-line p-5">
              <span className="grid size-8 place-items-center rounded-full bg-petrol-700 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-ink">{step.label}</p>
                <dl className="mt-2 space-y-2 text-sm">{phaseContent[step.id]}</dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {!approved && onRequestRevision && onGenerateRevision && (
        <RevisionRequest pending={pending} revisionFeedback={revisionFeedback} onRequestRevision={onRequestRevision} onGenerateRevision={onGenerateRevision} />
      )}

      <div className="mt-10 flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={onBack} disabled={pending}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar analyse
        </Button>
        <div className="flex flex-col items-end gap-2">
          {!approved && unclassified && (
            <p className="text-sm text-attention-700" data-testid="approve-blocked">
              Classificeer eerst alle kennisbehoeften.
            </p>
          )}
          <Button onClick={onApprove} disabled={pending || (!approved && unclassified)}>
            {pending ? "Block Plan wordt gemaakt…" : approved ? "Goedgekeurd · verder naar Block Plan" : "Blueprint goedkeuren"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * "Laten aanpassen" met een gerichte toelichting. Eerst opslaan (het besluit), daarna bewust de nieuwe versie laten
 * genereren: dat is een nieuwe AI-aanroep. Geen editor; de reviewer beschrijft wat er anders moet.
 */
function RevisionRequest({
  pending,
  revisionFeedback,
  onRequestRevision,
  onGenerateRevision,
}: {
  pending: boolean;
  revisionFeedback: string | null;
  onRequestRevision: (feedback: string) => Promise<ActResult>;
  onGenerateRevision: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (revisionFeedback) {
    return (
      <section className="mt-10 rounded-lg border border-attention/30 bg-attention-50 px-5 py-4" data-testid="blueprint-revision-pending">
        <p className="text-sm font-medium text-attention-700">Laten aanpassen: toelichting opgeslagen</p>
        <p className="mt-2 text-sm whitespace-pre-wrap text-ink" data-testid="blueprint-revision-feedback">
          {revisionFeedback}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={onGenerateRevision} disabled={pending}>
            {pending ? "Nieuwe versie wordt gemaakt…" : "Nieuwe Blueprint-versie genereren"}
          </Button>
          <span className="text-sm text-attention-700">Dit start een nieuwe AI-aanroep.</span>
        </div>
      </section>
    );
  }

  if (!open) {
    return (
      <div className="mt-10">
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={pending}>
          Laten aanpassen
        </Button>
      </div>
    );
  }

  return (
    <section className="mt-10 rounded-lg border border-line px-5 py-4" data-testid="blueprint-revision-form">
      <label htmlFor="blueprint-revision" className="text-sm font-medium text-ink">
        Wat moet in de volgende versie worden aangepast?
      </label>
      <p className="mt-1 text-sm text-muted">Deze toelichting wordt gebruikt bij het genereren van de volgende Blueprint-versie.</p>
      <textarea
        id="blueprint-revision"
        className="mt-3 min-h-32 w-full rounded-md border border-line bg-canvas px-3 py-2 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-petrol-600"
        value={text}
        maxLength={3000}
        onChange={(e) => setText(e.target.value)}
        data-testid="blueprint-revision-input"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          disabled={pending || saving || !text.trim()}
          onClick={async () => {
            setSaving(true);
            setError(null);
            const result = await onRequestRevision(text);
            setSaving(false);
            if (!result.ok) setError(result.message);
          }}
        >
          Toelichting opslaan
        </Button>
        <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>
          Annuleren
        </Button>
      </div>
    </section>
  );
}

const SCOPE_LABEL: Record<SourceNeedScope, string> = {
  professional: "Professionele / algemene kennis",
  organisation_specific: "Organisatiespecifieke kennis",
};

const SCOPE_EXPLANATION: Record<SourceNeedScope, string> = {
  professional: "Kan worden onderbouwd met algemene vakinhoud, beroepscodes, wetgeving, richtlijnen of andere gevalideerde professionele bronnen.",
  organisation_specific: "Hangt af van het beleid, protocol, de werkwijze of afspraken van de betreffende organisatie.",
};

const SCOPE_CONSEQUENCE: Record<SourceNeedScope, string> = {
  professional: "Professioneel: vereist een gevalideerde bron; zonder bron blijft de Bron-fase open.",
  organisation_specific:
    "Organisatiespecifiek: blijft zichtbaar als aandachtspunt, maar blokkeert een generieke training niet wanneer geen organisatiebron beschikbaar is. Certum vult dit nooit zelf in.",
};

/**
 * SourceNeed Scope Review (15B): de opleider classificeert iedere kennisbehoefte. Geen voorselectie: zonder
 * classificatie geen goedkeuring. Opslaan maakt een nieuwe Blueprint-versie; alleen de scope verandert.
 */
function ScopeReview({
  blueprint,
  pending,
  onSaveScopes,
}: {
  blueprint: TrainingBlueprint;
  pending: boolean;
  onSaveScopes: (scopes: Record<string, SourceNeedScope>) => Promise<ActResult>;
}) {
  const saved = Object.fromEntries(blueprint.sourceNeeds.filter((n) => n.scope).map((n) => [n.id, n.scope!])) as Record<string, SourceNeedScope>;
  const [choice, setChoice] = useState<Record<string, SourceNeedScope>>(saved);
  const [error, setError] = useState<{ message: string; issues?: string[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const complete = blueprint.sourceNeeds.every((n) => choice[n.id]);
  const changed = blueprint.sourceNeeds.some((n) => choice[n.id] !== n.scope);

  return (
    <section className="mt-10 rounded-lg border border-line p-5" aria-labelledby="scope-heading" data-testid="scope-review">
      <h2 id="scope-heading" className="text-lg font-semibold tracking-tight text-ink">
        Kennisbehoeften
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Certum formuleert de kennisbehoefte; jij bepaalt per kennisbehoefte welk soort kennis het is.
      </p>
      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[16rem_1fr]">
        {(Object.keys(SCOPE_LABEL) as SourceNeedScope[]).map((s) => (
          <div key={s} className="contents">
            <dt className="font-medium text-ink">{SCOPE_LABEL[s]}</dt>
            <dd className="text-muted">{SCOPE_EXPLANATION[s]}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {blueprint.sourceNeeds.map((n) => (
          <li key={n.id} className="py-4" data-testid={`scope-${n.id}`} data-scope={n.scope ?? "unclassified"}>
            <p className="text-[15px] text-ink">
              <span className="font-semibold">{n.id}</span> · {n.question}
            </p>
            <fieldset className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              <legend className="sr-only">Soort kennis voor {n.id}</legend>
              {(Object.keys(SCOPE_LABEL) as SourceNeedScope[]).map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={`scope-${n.id}`}
                    value={s}
                    checked={choice[n.id] === s}
                    onChange={() => {
                      setNotice(null);
                      setChoice((prev) => ({ ...prev, [n.id]: s }));
                    }}
                  />
                  {SCOPE_LABEL[s]}
                </label>
              ))}
            </fieldset>
            {choice[n.id] && (
              <p className="mt-2 text-xs text-muted" data-testid={`scope-consequence-${n.id}`}>
                {SCOPE_CONSEQUENCE[choice[n.id]]}
              </p>
            )}
          </li>
        ))}
      </ul>
      {notice && (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-petrol-800" data-testid="scope-notice">
          <Icon name="check" className="size-4" />
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger">
          <p>{error.message}</p>
          {error.issues && error.issues.length > 0 && <p className="mt-1 text-xs">Controleer: {error.issues.join(", ")}</p>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={pending || !complete || !changed}
          onClick={async () => {
            setError(null);
            const result = await onSaveScopes(choice);
            if (result.ok) setNotice("Classificatie opgeslagen als nieuwe Blueprint-versie. Keur de Blueprint nu goed.");
            else setError(result);
          }}
        >
          Classificatie opslaan
        </Button>
        {!complete && <p className="text-sm text-attention-700">Classificeer eerst alle kennisbehoeften.</p>}
        {complete && changed && <p className="text-sm text-attention-700">Sla de classificatie op voordat je goedkeurt.</p>}
      </div>
    </section>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 marker:text-petrol-600">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="text-[15px] leading-relaxed text-ink">{children}</dd>
    </div>
  );
}
