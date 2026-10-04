import { z } from "zod";
import {
  BLOCK_CONTENT_VERSION,
  BlockContentResultSchema,
  checkBlockContentInvariants,
  getBlockContentGenerationBlocker,
  type BlockContentResult,
} from "@/modules/block-content";
import { BcOnlineBlockPlanSchema, checkBlockPlanInvariants, type BcOnlineBlockPlan } from "@/modules/block-plan";
import { TrainingBlueprintSchema, type ApprovalState } from "@/modules/training-blueprint";
import { TrainingBlueprintV2Schema, routePolicyFor, type TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { AnalysisError, type AnalysisErrorKind } from "@/services/analysis/errors";
import type { BlockContentService } from "@/services/block-content/services";
import { generateBlockContent } from "@/services/block-content/orchestrator";
import type { ValidatedSource } from "@/modules/sources/schema";

/** Waarom er geen Block Content mag ontstaan. Bevat geen inhoud. */
export type ContentFlowRejection =
  | "blueprint_not_approved"
  | "block_plan_not_approved"
  | "invalid_blueprint"
  | "incompatible_blueprint"
  | "invalid_block_plan"
  | "unknown_block"
  | "invalid_earlier_content"
  | "provider_error"
  | "invalid_block_content";

export type BlockRegenerationResult =
  | { status: "block_content"; block: BlockContentResult }
  | { status: "rejected"; reason: ContentFlowRejection };

/** Privacyveilige metadata; nooit inhoud. Per blok staat de generatie in `certum.block_content_generation`. */
export interface ContentFlowLogEntry {
  event: "certum.block_content";
  version: string;
  operation: "package" | "regenerate";
  outcome: "success" | "rejected";
  reason?: ContentFlowRejection;
  errorKind?: AnalysisErrorKind | "unknown";
  blocks?: number;
  generated?: number;
  unresolved?: number;
  /** Blokken die de server zonder provider bepaalde (needs_source, needs_asset, blocked_by_capability). */
  deterministic?: number;
  failedBlockId?: string;
}

const defaultLog = (entry: ContentFlowLogEntry) => console.info(JSON.stringify(entry));

interface Deps {
  getService: () => BlockContentService;
  log?: (entry: ContentFlowLogEntry) => void;
}

type GateResult =
  | { ok: true; blueprint: TrainingBlueprintV2; blockPlan: BcOnlineBlockPlan }
  | { ok: false; reason: ContentFlowRejection };

/**
 * De gedeelde poorten. Block Content ontstaat alleen uit:
 * 1. een door een mens goedgekeurde Blueprint én een door een mens goedgekeurd Block Plan;
 * 2. een geldige Blueprint V2 (V1 heeft geen sourceNeed-ids: `incompatible_blueprint`) met consistent routebeleid;
 * 3. een geldig Block Plan dat bij deze Blueprint hoort (versie, schema en Block Plan-invarianten).
 *
 * Bekende blocker `approval_integrity_required_before_export` (zie CLAUDE.md) geldt hier evengoed: zonder opslag komen
 * goedkeuringen, Blueprint, plan en eerdere inhoud terug van de client. De server controleert vorm en regels opnieuw,
 * maar kan inhoudelijke wijzigingen door een client niet uitsluiten.
 */
function gate(blueprintCandidate: unknown, blueprintApproval: ApprovalState, planCandidate: unknown, planApproval: ApprovalState): GateResult {
  const blocker = getBlockContentGenerationBlocker(blueprintApproval, planApproval);
  if (blocker) return { ok: false, reason: blocker };

  const v2 = TrainingBlueprintV2Schema.safeParse(blueprintCandidate);
  if (!v2.success) {
    return { ok: false, reason: TrainingBlueprintSchema.safeParse(blueprintCandidate).success ? "incompatible_blueprint" : "invalid_blueprint" };
  }
  const blueprint = v2.data;
  const policy = routePolicyFor(blueprint.ambiguity);
  if (blueprint.decisionPoint.routePolicy !== policy || blueprint.learningArc.actie.routePolicy !== policy) {
    return { ok: false, reason: "invalid_blueprint" };
  }

  const plan = BcOnlineBlockPlanSchema.safeParse(planCandidate);
  if (!plan.success || plan.data.blueprintVersion !== blueprint.version) return { ok: false, reason: "invalid_block_plan" };
  if (checkBlockPlanInvariants(plan.data, blueprint).length > 0) return { ok: false, reason: "invalid_block_plan" };
  return { ok: true, blueprint, blockPlan: plan.data };
}

/**
 * Eén blok (opnieuw) genereren. Dezelfde poorten; daarnaast gaat alleen eerdere, goedgekeurde en geldige blokinhoud
 * mee. Ongeldige eerdere inhoud wordt geweigerd, niet stil weggelaten. Kan het blok niet gegenereerd worden, dan
 * bepaalt de server het resultaat zonder provider. Vaste Start en Vast Einde worden hier nooit opnieuw gemaakt.
 */
export async function runBlockRegenerationFlow(
  blueprintCandidate: unknown,
  blueprintApproval: ApprovalState,
  planCandidate: unknown,
  planApproval: ApprovalState,
  plannedBlockId: unknown,
  earlierContentCandidate: unknown,
  deps: Deps,
  /** Server-side bepaalde current gevalideerde bronnen (alleen relevant voor Bron-blokken). */
  validatedSources: ValidatedSource[] = [],
): Promise<BlockRegenerationResult> {
  const log = deps.log ?? defaultLog;
  const reject = (reason: ContentFlowRejection, errorKind?: AnalysisErrorKind | "unknown"): BlockRegenerationResult => {
    log({ event: "certum.block_content", version: BLOCK_CONTENT_VERSION, operation: "regenerate", outcome: "rejected", reason, ...(errorKind && { errorKind }) });
    return { status: "rejected", reason };
  };

  const gated = gate(blueprintCandidate, blueprintApproval, planCandidate, planApproval);
  if (!gated.ok) return reject(gated.reason);
  const target = gated.blockPlan.plannedBlocks.find((b) => b.id === plannedBlockId);
  if (!target) return reject("unknown_block");

  const earlier = z.array(BlockContentResultSchema).max(20).safeParse(earlierContentCandidate ?? []);
  if (!earlier.success) return reject("invalid_earlier_content");
  const approvedEarlier = earlier.data.filter((b) => b.sequence < target.sequence && b.reviewStatus === "approved");
  for (const block of approvedEarlier) {
    const context = { ...gated, approvedEarlierContent: approvedEarlier.filter((b) => b.sequence < block.sequence) };
    if (checkBlockContentInvariants(block, context).length > 0) return reject("invalid_earlier_content");
  }

  let block: BlockContentResult;
  let deterministic: boolean;
  try {
    ({ block, deterministic } = await generateBlockContent(deps.getService, {
      validatedSources,
      ...gated,
      plannedBlockId: target.id,
      approvedEarlierContent: approvedEarlier,
    }));
  } catch (error) {
    if (error instanceof AnalysisError && error.kind === "invalid-output") return reject("invalid_block_content", error.kind);
    return reject("provider_error", error instanceof AnalysisError ? error.kind : "unknown");
  }
  if (block.plannedBlockId !== target.id || checkBlockContentInvariants(block, { ...gated, approvedEarlierContent: approvedEarlier, validatedSources }).length > 0) {
    return reject("invalid_block_content");
  }

  log({ event: "certum.block_content", version: BLOCK_CONTENT_VERSION, operation: "regenerate", outcome: "success", blocks: 1, generated: block.body.status === "generated" ? 1 : 0, deterministic: deterministic ? 1 : 0 });
  return { status: "block_content", block };
}
