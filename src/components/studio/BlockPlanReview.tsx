import type { ReactNode } from "react";
import { METHODOLOGY_STEPS } from "@/knowledge";
import { getCatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface BlockPlanReviewProps {
  blockPlan: BcOnlineBlockPlan;
  approved: boolean;
  onApprove: () => void;
  onBack: () => void;
  /** Na goedkeuring: Training Content maken (Block Content per blok). */
  onCreateContent: () => void;
  pending: boolean;
}

/** Review van het BC Online Block Plan: per Certum-fase de voorgestelde bestaande blokken. Geen edit-interface. */
export function BlockPlanReview({ blockPlan, approved, onApprove, onBack, onCreateContent, pending }: BlockPlanReviewProps) {
  const blocks = [...blockPlan.plannedBlocks].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="mt-10" data-testid="block-plan-review">
      <dl className="divide-y divide-line border-y border-line">
        <Fact label="Titel">{blockPlan.courseShell.title}</Fact>
        <Fact label="Status in BC Online">Concept</Fact>
        <Fact label="Geschatte tijdsduur">
          {blockPlan.courseShell.estimatedDurationMinutes ?? <span className="text-muted italic">Nog niet bepaald</span>}
        </Fact>
        <Fact label="SKJ-punten">
          <span className="text-muted italic" data-testid="skj">
            Niet ingevuld: alleen een daadwerkelijk geaccrediteerde waarde
          </span>
        </Fact>
        <Fact label="Vaste Start">{blockPlan.startIntent.explanationIntent}</Fact>
      </dl>

      <section className="mt-14" aria-labelledby="plan-heading">
        <h2 id="plan-heading" className="text-lg font-semibold tracking-tight text-ink">
          Voorgestelde BC Online-blokken per Certum-fase
        </h2>
        <p className="mt-1 text-sm text-muted">
          Uitvoeringsvoorstel met bestaande blokken. De Certum-fase is de didactische functie; het blok is het middel.
        </p>
        <ol className="mt-5 space-y-3">
          {METHODOLOGY_STEPS.map((step) => {
            const phaseBlocks = blocks.filter((b) => b.certumPhase === step.id);
            return (
              <li key={step.id} className="rounded-lg border border-line p-5" data-testid={`phase-${step.id}`}>
                <p className="font-semibold text-ink">{step.label}</p>
                {phaseBlocks.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">Geen blok; zie capability gaps.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {phaseBlocks.map((block) => (
                      <li key={block.id} className="border-l-2 border-petrol-100 pl-3" data-block={block.catalogBlockId}>
                        <p className="text-sm font-medium text-petrol-700">
                          {block.sequence}. {getCatalogBlock(block.catalogBlockId)?.visibleName ?? block.catalogBlockId}
                        </p>
                        <p className="mt-0.5 text-sm text-ink">{block.purpose}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          <span className="font-medium">Waarom: </span>
                          {block.whyThisBlock}
                        </p>
                        {block.configurationIntent.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted">
                            <span className="font-medium">Configuratie-intentie: </span>
                            {block.configurationIntent.map((c) => `${c.setting}: ${c.intent}`).join(" · ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-10" aria-labelledby="gaps-heading" data-testid="capability-gaps">
        <h2 id="gaps-heading" className="text-lg font-semibold tracking-tight text-ink">
          Capability gaps
        </h2>
        {blockPlan.capabilityGaps.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Geen: alles kan met bestaande BC Online-blokken.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {blockPlan.capabilityGaps.map((gap, i) => (
              <li key={i} className="rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-sm">
                <p className="font-semibold text-attention-700">{gap.need}</p>
                <p className="mt-0.5 text-ink">{gap.whyNeeded}</p>
                {gap.workaround && (
                  <>
                    <p className="mt-0.5 text-ink" data-workaround={gap.workaround.type}>
                      <span className="font-medium">Beperkt alternatief (het gat blijft bestaan): </span>
                      {gap.workaround.description}
                    </p>
                    <p className="mt-0.5 text-ink">
                      <span className="font-medium">Beperking: </span>
                      {gap.workaround.limitation}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {approved && (
        <p role="status" className="mt-8 flex items-start gap-2.5 rounded-md border border-petrol-100 bg-petrol-50 px-4 py-3 text-sm text-petrol-800">
          <Icon name="check" className="mt-px size-4 shrink-0" />
          <span>
            Block Plan goedgekeurd. Je kunt nu de inhoud per blok laten maken. Het aanmaken van een concepttraining in BC
            Online volgt later, zodra de koppeling (adapter) met BC Online bestaat.
          </span>
        </p>
      )}

      <div className="mt-10 flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={onBack}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar Blueprint
        </Button>
        {approved ? (
          <Button onClick={onCreateContent} disabled={pending}>
            {pending ? "Inhoud wordt gemaakt…" : "Training Content maken"}
            {!pending && <Icon name="arrowRight" className="size-4" />}
          </Button>
        ) : (
          <Button onClick={onApprove}>Block Plan goedkeuren</Button>
        )}
      </div>
    </div>
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
