import type { ReactNode } from "react";
import { METHODOLOGY_STEPS } from "@/knowledge";
import type { EvaluationBasis, RoutePolicy, TrainingBlueprintV2 as TrainingBlueprint } from "@/modules/training-blueprint/v2";
import { Button } from "./Button";
import { Icon } from "./Icon";

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
}

/** Review van de Training Blueprint (Blueprint Contract V2): het didactisch ontwerp. Geen edit-interface. */
export function BlueprintReview({ blueprint, pending, approved = false, onApprove, onBack }: BlueprintReviewProps) {
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
        <Fact label="Te valideren kennis (source needs)">
          {blueprint.sourceNeeds.length > 0 ? (
            <List items={blueprint.sourceNeeds.map((n) => `${n.id} · ${n.question}`)} />
          ) : (
            "Geen"
          )}
        </Fact>
      </dl>

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

      <div className="mt-10 flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={onBack} disabled={pending}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar analyse
        </Button>
        <Button onClick={onApprove} disabled={pending}>
          {pending ? "Block Plan wordt gemaakt…" : approved ? "Goedgekeurd · verder naar Block Plan" : "Blueprint goedkeuren"}
        </Button>
      </div>
    </div>
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
