import type { BcOnlineBlockPlan } from "@/modules/block-plan/schema";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2/schema";
import {
  ASSET_TYPE_BY_BLOCK,
  BLOCK_CONTENT_VERSION,
  TRAINING_CONTENT_PACKAGE_VERSION,
  isMediaBlock,
  type BlockContentResult,
  type BlockPayload,
  type EndContent,
  type Readiness,
  type StartContent,
  type TrainingContentPackage,
  type UnresolvedRequirement,
} from "./schema";
import type { BlockTarget } from "./target";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Trusted velden van de inhoud: het bloktype, (bij AI Feedback) de aantoonbare en niet-aangetoonde context en (bij
 * Productie) het minimum aantal woorden.
 */
type TrustedPayloadField = "catalogBlockId" | "availableContext" | "unavailableContext" | "minimumWords";
export type BlockPayloadDesign = DistributiveOmit<BlockPayload, TrustedPayloadField>;

export interface BlockAccreditationDesign {
  learningGoalContribution: string;
  assessmentRole: BlockContentResult["accreditation"]["assessmentRole"];
  estimatedMinutes: number | null;
  sourceNeedRefs: string[];
}

/**
 * Wat een Block Content-provider ontwerpt: de status, de inhoud of de behoefte, en de accreditatiemetadata. Ids,
 * volgorde, fase, bloktype, werkvorm, routebeleid, assettype, AI-context en reviewstatus voegt de server toe.
 */
export type BlockContentDesign = { accreditation: BlockAccreditationDesign } & (
  | { status: "generated"; content: BlockPayloadDesign }
  | { status: "needs_source"; whatToValidate: string; generatableAfterValidation: string }
  | { status: "needs_asset"; assetRequirement: { why: string; desiredContent: string; captionIntent: string | null } }
  | { status: "blocked_by_capability"; missingCapability: string; why: string }
);

/**
 * Stelt een blokresultaat samen uit het ontwerp en het doelblok. Trusted, server-side en als laatste gezet:
 * versie, `plannedBlockId`, `sequence`, `certumPhase`, `catalogBlockId` (ook in de inhoud: een provider kan het
 * bloktype niet wijzigen), `routePolicy` (uit de Blueprint), werkvorm (catalogus), `reviewStatus: "draft"`, het
 * assettype van een mediablok, de AI Feedback-context en `minimumWords: null` bij een Productie (V1: er is geen trusted
 * bron voor een lengte-eis). Daarna volgen Zod en `checkBlockContentInvariants`.
 */
export function composeBlockContent(design: BlockContentDesign, target: BlockTarget): BlockContentResult {
  const { block } = target;
  return {
    version: BLOCK_CONTENT_VERSION,
    plannedBlockId: block.id,
    sequence: block.sequence,
    certumPhase: block.certumPhase,
    catalogBlockId: block.catalogBlockId,
    routePolicy: target.routePolicy,
    reviewStatus: "draft",
    accreditation: { ...design.accreditation, workform: target.workform },
    body: composeBody(design, target),
  };
}

function composeBody(design: BlockContentDesign, target: BlockTarget): BlockContentResult["body"] {
  switch (design.status) {
    case "generated":
      return {
        status: "generated",
        content: {
          ...design.content,
          catalogBlockId: target.block.catalogBlockId,
          ...(target.block.catalogBlockId === "certum.bco.ai-feedback" && {
            availableContext: target.provenContextBlockIds,
            unavailableContext: target.unprovenContextBlockIds,
          }),
          ...(target.block.catalogBlockId === "certum.bco.productie" && { minimumWords: null }),
        } as BlockPayload,
      };
    case "needs_source":
      return { status: "needs_source", whatToValidate: design.whatToValidate, generatableAfterValidation: design.generatableAfterValidation };
    case "needs_asset": {
      const id = target.block.catalogBlockId;
      // Een niet-mediablok kan geen assettype hebben; de validatie wijst de status daar af.
      const assetType = isMediaBlock(id) ? ASSET_TYPE_BY_BLOCK[id] : "document";
      return { status: "needs_asset", assetRequirement: { ...design.assetRequirement, assetType } };
    }
    case "blocked_by_capability":
      return { status: "blocked_by_capability", missingCapability: design.missingCapability, why: design.why };
  }
}

/** Wat een provider voor Vaste Start en Vast Einde ontwerpt. Titel, leerdoel, tijdsduur en vervolg zijn trusted. */
export interface FrameDesign {
  introduction: string;
  closingText: string;
  summary: string | null;
}

export interface FrameContent {
  start: Omit<StartContent, "estimatedDurationMinutes">;
  end: EndContent;
}

export function composeFrame(design: FrameDesign, blueprint: Pick<TrainingBlueprintV2, "title" | "learningGoal">): FrameContent {
  return {
    start: { title: blueprint.title, introduction: design.introduction, learningGoals: [blueprint.learningGoal] },
    end: { closingText: design.closingText, summary: design.summary, followUpRecommendation: null },
  };
}

/** Openstaande behoeften, structureel afgeleid uit de blokstatussen en de AI Feedback-context. */
export function deriveUnresolvedRequirements(plan: BcOnlineBlockPlan, blocks: BlockContentResult[]): UnresolvedRequirement[] {
  const byId = new Map(blocks.map((b) => [b.plannedBlockId, b]));
  const ordered = [...plan.plannedBlocks].sort((a, b) => a.sequence - b.sequence);
  return ordered.flatMap((planned): UnresolvedRequirement[] => {
    const result = byId.get(planned.id);
    if (!result) return [{ plannedBlockId: planned.id, kind: "not_generated", refs: [] }];
    const body = result.body;
    switch (body.status) {
      case "needs_source":
        return [{ plannedBlockId: planned.id, kind: "source", refs: result.accreditation.sourceNeedRefs }];
      case "needs_asset":
        return [{ plannedBlockId: planned.id, kind: "asset", refs: [] }];
      case "blocked_by_capability":
        return [{ plannedBlockId: planned.id, kind: "capability", refs: [] }];
      case "generated":
        return body.content.catalogBlockId === "certum.bco.ai-feedback" && body.content.unavailableContext.length > 0
          ? [{ plannedBlockId: planned.id, kind: "ai_context", refs: body.content.unavailableContext }]
          : [];
    }
  });
}

/**
 * - `incomplete`: niet ieder gepland blok heeft gegenereerde inhoud (ontbrekend, needs_source, needs_asset,
 *   blocked_by_capability);
 * - `in_review`: alles gegenereerd, nog niet ieder blok goedgekeurd;
 * - `approved`: ieder blok gegenereerd en goedgekeurd.
 * Een niet-aangetoonde AI-context blijft zichtbaar als unresolved requirement, maar blokkeert de readiness niet: de
 * instructies vertrouwen er al niet op.
 */
export function deriveReadiness(plan: BcOnlineBlockPlan, blocks: BlockContentResult[]): Readiness {
  const complete = plan.plannedBlocks.every((p) => blocks.some((b) => b.plannedBlockId === p.id && b.body.status === "generated"));
  if (!complete) return "incomplete";
  return blocks.every((b) => b.reviewStatus === "approved") ? "approved" : "in_review";
}

/** Totale duur alleen als ieder gepland blok een schatting heeft; anders `null` (niets verzinnen). */
export function deriveDuration(plan: BcOnlineBlockPlan, blocks: BlockContentResult[]): number | null {
  const minutes = plan.plannedBlocks.map((p) => blocks.find((b) => b.plannedBlockId === p.id)?.accreditation.estimatedMinutes ?? null);
  return minutes.every((m): m is number => m !== null) ? minutes.reduce((a, b) => a + b, 0) : null;
}

/** Het Training Content Package: Certum-eigen, geen BC Online-payload. Alle afgeleide velden zijn trusted. */
export function composeContentPackage(input: {
  blueprint: TrainingBlueprintV2;
  blockPlan: BcOnlineBlockPlan;
  frame: FrameContent;
  blocks: BlockContentResult[];
}): TrainingContentPackage {
  const { blueprint, blockPlan, frame } = input;
  const order = new Map(blockPlan.plannedBlocks.map((b) => [b.id, b.sequence]));
  const blocks = [...input.blocks].sort((a, b) => (order.get(a.plannedBlockId) ?? 0) - (order.get(b.plannedBlockId) ?? 0));
  return {
    version: TRAINING_CONTENT_PACKAGE_VERSION,
    contentContractVersion: BLOCK_CONTENT_VERSION,
    blueprintVersion: blueprint.version,
    blockPlanVersion: blockPlan.version,
    title: blueprint.title,
    learningGoal: blueprint.learningGoal,
    start: { ...frame.start, title: blueprint.title, learningGoals: [blueprint.learningGoal], estimatedDurationMinutes: deriveDuration(blockPlan, blocks) },
    blocks,
    end: { ...frame.end, followUpRecommendation: null },
    unresolvedRequirements: deriveUnresolvedRequirements(blockPlan, blocks),
    readiness: deriveReadiness(blockPlan, blocks),
  };
}
