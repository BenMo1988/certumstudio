import "server-only";
import { TRAINING_ANALYSIS_V211_PROMPT_VERSION } from "@/knowledge/prompts/training-analysis-v2-1-1";
import { TRAINING_BLOCK_CONTENT_V1_3_PROMPT_VERSION } from "@/knowledge/prompts/training-block-content-v1-3";
import { TRAINING_BLOCK_PLAN_PROMPT_VERSION } from "@/knowledge/prompts/training-block-plan-v1";
import { TRAINING_BLUEPRINT_V21_PROMPT_VERSION } from "@/knowledge/prompts/training-blueprint-v2-1";
import { TRAINING_BLUEPRINT_V22_PROMPT_VERSION } from "@/knowledge/prompts/training-blueprint-v2-2";
import { getTrainingAnalysisService } from "@/services/analysis";
import { readAnalysisConfig } from "@/services/analysis/config";
import { getBlockContentService } from "@/services/block-content";
import { readBlockContentConfig } from "@/services/block-content/config";
import { readBlockPlanConfig } from "@/services/block-plan/config";
import { getBlockPlanService, getTrainingBlueprintService } from "@/services/blueprint";
import { readBlueprintConfig } from "@/services/blueprint/config";
import { getDb } from "@/services/storage";
import type { Provenance, WorkflowDeps } from "./persisted-workflow";

/*
 * De productie-dependencies van de persisted workflow (Training Engine). Eén plek, gedeeld door de Server Actions van
 * trainingen en leerlijnen, zodat een leerlijnmodule exact dezelfde providers en herkomst gebruikt als een losse training.
 */

type ProviderConfig = { provider: string; claude?: { model: string; effort: string } };

function provenance(read: () => unknown, promptVersion: string): Provenance {
  try {
    const config = read() as ProviderConfig;
    if (config.provider === "claude" && config.claude) return { promptVersion, modelVersion: `${config.claude.model} · ${config.claude.effort}` };
    return { promptVersion: "mock", modelVersion: "mock" };
  } catch {
    // Onvolledige configuratie: de service-getter faalt dan zelf met een config-fout.
    return { promptVersion: null, modelVersion: null };
  }
}

export function workflowDeps(): WorkflowDeps {
  return {
    db: getDb(),
    getAnalysisService: getTrainingAnalysisService,
    getBlueprintService: getTrainingBlueprintService,
    getBlockPlanService: getBlockPlanService,
    getBlockContentService: getBlockContentService,
    provenance: {
      analysis: provenance(readAnalysisConfig, TRAINING_ANALYSIS_V211_PROMPT_VERSION),
      blueprint: provenance(readBlueprintConfig, TRAINING_BLUEPRINT_V21_PROMPT_VERSION),
      blueprintRevision: provenance(readBlueprintConfig, TRAINING_BLUEPRINT_V22_PROMPT_VERSION),
      blockPlan: provenance(readBlockPlanConfig, TRAINING_BLOCK_PLAN_PROMPT_VERSION),
      blockContent: provenance(readBlockContentConfig, TRAINING_BLOCK_CONTENT_V1_3_PROMPT_VERSION),
    },
  };
}
