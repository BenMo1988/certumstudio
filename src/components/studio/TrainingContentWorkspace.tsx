import type { ReactNode } from "react";
import { METHODOLOGY_STEPS } from "@/knowledge";
import { getCatalogBlock } from "@/knowledge/platform/bc-online-block-catalog";
import {
  getBlockApprovalBlocker,
  type BlockContentResult,
  type ReviewStatus,
  type TrainingContentPackage,
  type UnresolvedRequirement,
} from "@/modules/block-content";
import type { BcOnlineBlockPlan, PlannedBlock } from "@/modules/block-plan/schema";
import { Button } from "./Button";
import { Icon } from "./Icon";

const phaseLabel = (id: string) => METHODOLOGY_STEPS.find((s) => s.id === id)?.label ?? id;
const blockName = (id: string) => getCatalogBlock(id)?.visibleName ?? id;

const STATUS_LABEL: Record<BlockContentResult["body"]["status"] | "not_generated", string> = {
  not_generated: "Niet gegenereerd",
  generated: "Gegenereerd",
  needs_source: "Bron nodig",
  needs_asset: "Asset nodig",
  blocked_by_capability: "Geblokkeerd (capability)",
};

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  draft: "Concept",
  approved: "Goedgekeurd",
  needs_revision: "Herzien",
};

const READINESS_LABEL: Record<TrainingContentPackage["readiness"], string> = {
  incomplete: "Onvolledig: niet ieder blok heeft inhoud",
  in_review: "In review: nog niet ieder blok is goedgekeurd",
  approved: "Alle blokken goedgekeurd",
};

const ASSESSMENT_LABEL: Record<BlockContentResult["accreditation"]["assessmentRole"], string> = {
  none: "Geen beoordeling",
  formative: "Formatief",
  summative: "Summatief",
  transfer: "Transfer",
};

const UNRESOLVED_LABEL: Record<UnresolvedRequirement["kind"], string> = {
  source: "Gevalideerde bron nodig",
  asset: "Asset nodig",
  capability: "Niet aantoonbaar mogelijk in BC Online",
  ai_context: "AI Feedback krijgt deze blokken niet aantoonbaar als context",
  not_generated: "Nog niet gegenereerd",
};

/** Leesbare labels voor de inhoudsvelden; de velden zelf komen uit de catalogus. */
const FIELD_LABEL: Record<string, string> = {
  title: "Bloktitel",
  text: "Tekst",
  messageType: "Type berichten",
  messages: "Berichten",
  question: "Vraag",
  options: "Opties",
  correctOptionIndex: "Juist antwoord (optie, vanaf 0)",
  correctAnswer: "Juist antwoord",
  type: "Soort",
  sender: "Afzender",
  time: "Tijd",
  body: "Berichtinhoud",
  keywords: "Sleutelwoorden",
  messageOnGoal: "Bericht bij doelbehaling",
  instructionAfterGoal: "AI-instructie na doelbehaling",
  content: "Inhoud",
  feedback: "Feedback",
  exampleAnswer: "Voorbeeldantwoord",
  personaName: "Naam fictieve persoon",
  personaInstructions: "Instructies voor fictieve persoon",
  scenarioContext: "Scenario/context",
  firstMessage: "Eerste bericht",
  goal: "Gespreksdoel",
  timeLimitMinutes: "Tijdslimiet (minuten)",
  instruction: "Instructie",
  items: "Informatie-items",
  instructions: "Instructies",
  availableContext: "Aantoonbare context (eerdere vraagblokken)",
  unavailableContext: "Niet aantoonbaar als context",
  sourceBlockId: "Eerder antwoord/blok",
  condition: "Voorwaarde",
  value: "Waarde",
  textIfTrue: "Tekst als voorwaarde is vervuld",
  textIfFalse: "Tekst als voorwaarde niet is vervuld",
  productType: "Type product",
  template: "Sjabloon/starttekst",
  minimumWords: "Minimum aantal woorden",
  questionOrder: "Vraagvolgorde",
  passPercentage: "Slagingspercentage",
  questions: "Toetsvragen",
};

interface WorkspaceProps {
  pkg: TrainingContentPackage;
  blockPlan: BcOnlineBlockPlan;
  failedBlockId: string | null;
  openBlockId: string | null;
  pending: boolean;
  onOpen: (plannedBlockId: string | null) => void;
  onReview: (plannedBlockId: string, status: ReviewStatus) => void;
  onRegenerate: (plannedBlockId: string) => void;
  onBack: () => void;
}

/**
 * Training Content: per gepland blok de inhoud en de status, met per blok openen, goedkeuren, laten herzien en
 * opnieuw genereren. Geen rich editor; er wordt niets opgeslagen.
 */
export function TrainingContentWorkspace(props: WorkspaceProps) {
  const { pkg, blockPlan, openBlockId } = props;
  const planned = [...blockPlan.plannedBlocks].sort((a, b) => a.sequence - b.sequence);
  const open = planned.find((b) => b.id === openBlockId);
  if (open) return <BlockDetail {...props} planned={open} />;

  return (
    <div className="mt-10" data-testid="content-workspace">
      <dl className="divide-y divide-line border-y border-line">
        <Fact label="Titel">{pkg.title}</Fact>
        <Fact label="Leerdoel">{pkg.learningGoal}</Fact>
        <Fact label="Status">
          <span data-testid="readiness" data-readiness={pkg.readiness}>
            {READINESS_LABEL[pkg.readiness]}
          </span>
        </Fact>
        <Fact label="Geschatte tijdsduur">
          {pkg.start.estimatedDurationMinutes !== null ? (
            `${pkg.start.estimatedDurationMinutes} minuten`
          ) : (
            <span className="text-muted italic">Nog niet te bepalen: niet ieder blok heeft een schatting</span>
          )}
        </Fact>
      </dl>

      {props.failedBlockId && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Het genereren stopte bij {props.failedBlockId}. De volgende blokken zijn nog niet gegenereerd.
        </p>
      )}

      <section className="mt-12" aria-labelledby="blocks-heading">
        <h2 id="blocks-heading" className="text-lg font-semibold tracking-tight text-ink">
          Blokken
        </h2>
        <ol className="mt-5 divide-y divide-line rounded-lg border border-line">
          <FrameRow label="Vaste Start" text={pkg.start.introduction} />
          {planned.map((block) => {
            const result = pkg.blocks.find((b) => b.plannedBlockId === block.id);
            const status = result?.body.status ?? "not_generated";
            return (
              <li key={block.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center" data-testid={`content-${block.id}`} data-status={status}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {block.sequence}. {phaseLabel(block.certumPhase)} · {blockName(block.catalogBlockId)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span className={status === "generated" ? "text-petrol-700" : status === "not_generated" ? "" : "text-attention-700"}>
                      {STATUS_LABEL[status]}
                    </span>
                    <span>{result?.accreditation.estimatedMinutes != null ? `${result.accreditation.estimatedMinutes} min` : "– min"}</span>
                    {result && <span data-review={result.reviewStatus}>{REVIEW_LABEL[result.reviewStatus]}</span>}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => props.onOpen(block.id)}>
                  Openen
                </Button>
              </li>
            );
          })}
          <FrameRow label="Vast Einde" text={pkg.end.closingText} />
        </ol>
      </section>

      {pkg.unresolvedRequirements.length > 0 && (
        <section className="mt-10" aria-labelledby="unresolved-heading" data-testid="unresolved">
          <h2 id="unresolved-heading" className="text-lg font-semibold tracking-tight text-ink">
            Openstaande behoeften
          </h2>
          <ul className="mt-4 space-y-2">
            {pkg.unresolvedRequirements.map((u) => (
              <li key={`${u.plannedBlockId}-${u.kind}`} className="rounded-md border border-attention/30 bg-attention-50 px-4 py-2.5 text-sm text-ink">
                <span className="font-medium">{u.plannedBlockId}: </span>
                {UNRESOLVED_LABEL[u.kind]}
                {u.refs.length > 0 && <span className="text-muted"> ({u.refs.join(", ")})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 border-t border-line pt-6">
        <Button variant="secondary" onClick={props.onBack}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar Block Plan
        </Button>
      </div>
    </div>
  );
}

function FrameRow({ label, text }: { label: string; text: string }) {
  return (
    <li className="px-5 py-4">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-sm text-muted">{text}</p>
    </li>
  );
}

function BlockDetail(props: WorkspaceProps & { planned: PlannedBlock }) {
  const { planned, pkg, pending } = props;
  const result = pkg.blocks.find((b) => b.plannedBlockId === planned.id);
  const canApprove = result !== undefined && getBlockApprovalBlocker(result) === null && result.reviewStatus !== "approved";

  return (
    <div className="mt-10" data-testid="content-detail" data-block={planned.id}>
      <dl className="divide-y divide-line border-y border-line">
        <Fact label="Blok">
          {planned.sequence}. {phaseLabel(planned.certumPhase)} · {blockName(planned.catalogBlockId)}
        </Fact>
        <Fact label="Doel (Block Plan)">{planned.purpose}</Fact>
        <Fact label="Status">
          <span data-testid="detail-status">{STATUS_LABEL[result?.body.status ?? "not_generated"]}</span>
          {result && <span className="text-muted"> · {REVIEW_LABEL[result.reviewStatus]}</span>}
        </Fact>
        {result && (
          <>
            <Fact label="Bijdrage aan leerdoel">{result.accreditation.learningGoalContribution}</Fact>
            <Fact label="Toetsfunctie">{ASSESSMENT_LABEL[result.accreditation.assessmentRole]}</Fact>
            <Fact label="Geschatte minuten">{result.accreditation.estimatedMinutes ?? <span className="text-muted italic">Onbekend</span>}</Fact>
            {result.accreditation.sourceNeedRefs.length > 0 && <Fact label="Bronbehoeften">{result.accreditation.sourceNeedRefs.join(", ")}</Fact>}
          </>
        )}
      </dl>

      {result && <BodyView body={result.body} />}

      <div className="mt-10 flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={() => props.onOpen(null)}>
          <Icon name="arrowLeft" className="size-4" />
          Terug naar overzicht
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" disabled={pending} onClick={() => props.onRegenerate(planned.id)}>
            {pending ? "Bezig…" : "Opnieuw genereren"}
          </Button>
          {result && (
            <Button variant="secondary" disabled={pending || result.reviewStatus === "needs_revision"} onClick={() => props.onReview(planned.id, "needs_revision")}>
              Laten herzien
            </Button>
          )}
          <Button
            disabled={pending || !canApprove}
            title={result && getBlockApprovalBlocker(result) ? "Alleen gegenereerde inhoud kan worden goedgekeurd." : undefined}
            onClick={() => props.onReview(planned.id, "approved")}
          >
            {result?.reviewStatus === "approved" ? "Goedgekeurd" : "Goedkeuren"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BodyView({ body }: { body: BlockContentResult["body"] }) {
  switch (body.status) {
    case "generated": {
      const { catalogBlockId, ...fields } = body.content;
      void catalogBlockId;
      return (
        <section className="mt-10" aria-label="Inhoud" data-testid="content-fields">
          <dl className="divide-y divide-line rounded-lg border border-line px-5">
            {Object.entries(fields).map(([key, value]) => (
              <Fact key={key} label={FIELD_LABEL[key] ?? key}>
                <FieldValue value={value} />
              </Fact>
            ))}
          </dl>
        </section>
      );
    }
    case "needs_source":
      return (
        <Notice title="Gevalideerde bron nodig">
          <p>{body.whatToValidate}</p>
          <p className="mt-1">
            <span className="font-medium">Daarna mogelijk: </span>
            {body.generatableAfterValidation}
          </p>
        </Notice>
      );
    case "needs_asset":
      return (
        <Notice title={`Asset nodig: ${body.assetRequirement.assetType}`}>
          <p>{body.assetRequirement.why}</p>
          <p className="mt-1">
            <span className="font-medium">Gewenste inhoud: </span>
            {body.assetRequirement.desiredContent}
          </p>
          {body.assetRequirement.captionIntent && (
            <p className="mt-1">
              <span className="font-medium">Onderschrift: </span>
              {body.assetRequirement.captionIntent}
            </p>
          )}
        </Notice>
      );
    case "blocked_by_capability":
      return (
        <Notice title="Niet aantoonbaar mogelijk in BC Online">
          <p>{body.missingCapability}</p>
          <p className="mt-1">{body.why}</p>
        </Notice>
      );
  }
}

function FieldValue({ value }: { value: unknown }): ReactNode {
  if (value === null) return <span className="text-muted italic">Geen</span>;
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  if (typeof value === "string" || typeof value === "number") return <span className="whitespace-pre-line">{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted italic">Geen</span>;
    return (
      <ul className="space-y-1.5">
        {value.map((item, i) => (
          <li key={i} className="border-l-2 border-petrol-100 pl-3">
            <FieldValue value={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <dl className="space-y-1">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k}>
          <dt className="inline text-sm font-medium text-muted">{FIELD_LABEL[k] ?? k}: </dt>
          <dd className="inline">
            <FieldValue value={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-sm text-ink" data-testid="content-notice">
      <p className="font-semibold text-attention-700">{title}</p>
      <div className="mt-1">{children}</div>
    </section>
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
