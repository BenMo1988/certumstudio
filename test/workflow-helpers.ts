import { saveSourceNeedScopes } from "@/app/trainings/workflow/editing";
import { decideRevision, type WorkflowDeps, type WorkflowResult } from "@/app/trainings/workflow/persisted-workflow";
import type { SourceNeedScope } from "@/modules/training-blueprint/v2";
import { loadTrainingWorkspace } from "@/services/storage/workspace";

/**
 * Alleen voor tests: de SourceNeed Scope Review (15B) zoals een opleider die doet, gevolgd door de goedkeuring van de
 * Blueprint. Zonder opgegeven scope classificeert de "opleider" een kennisbehoefte als professionele kennis.
 */
export async function approveBlueprint(deps: WorkflowDeps, trainingId: string, scopes: Record<string, SourceNeedScope> = {}): Promise<WorkflowResult> {
  const view = await loadTrainingWorkspace(deps.db, trainingId);
  const blueprint = view?.blueprint;
  if (!blueprint) throw new Error("geen Blueprint");
  const all = Object.fromEntries(blueprint.payload.sourceNeeds.map((n) => [n.id, scopes[n.id] ?? n.scope ?? "professional"]));
  const scoped = await saveSourceNeedScopes(deps, trainingId, blueprint.revisionId, all);
  if (scoped.status !== "ok") return scoped;
  return decideRevision(deps, trainingId, scoped.workspace.blueprint!.revisionId, "approved");
}
