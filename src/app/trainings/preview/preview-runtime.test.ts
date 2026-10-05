import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BcOnlineBlockPlan } from "@/modules/block-plan";
import type { BlockContentResult, TrainingContentPackage } from "@/modules/block-content";
import { buildPreview } from "@/modules/preview";
import { hashPreflightText } from "@/modules/privacy";
import type { TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import { createTrainingAnalysisServiceV21 } from "@/services/analysis/factory";
import { createBlockContentService } from "@/services/block-content/factory";
import { createBlockPlanService } from "@/services/block-plan/factory";
import { createTrainingBlueprintServiceV21 } from "@/services/blueprint/factory";
import { MOCK_ORGANISATION_SPECIFIC } from "@/services/blueprint/v2/mock-blueprint-service-v2";
import { MOCK_TRUNCATE_MARKER, MockPreviewRuntimeService } from "@/services/preview/mock-preview-runtime";
import type { PreviewChatRequest, PreviewFeedbackRequest, PreviewRuntimeService } from "@/services/preview/services";
import { instrumentDb } from "@/services/storage/instrumented-db";
import { createArtifactRevision } from "@/services/storage/training-record";
import { loadTrainingWorkspace, type TrainingWorkspaceView } from "@/services/storage/workspace";
import tr0014 from "../../../../test/fixtures/tr-0014.json";
import { createTestDb, type TestDb } from "../../../../test/pglite-db";
import { saveBlockEdit, saveSourceNeedScopes } from "../workflow/editing";
import {
  decideRevision,
  generateContent,
  regenerateBlock,
  selectDirection,
  startTraining,
  type WorkflowDeps,
  type WorkflowResult,
} from "../workflow/persisted-workflow";
import { addSource, validateSource } from "../workflow/sources";
import { MAX_PARTICIPANT_TURNS, loadPreview, previewChatTurn, previewFeedback, type PreviewDeps, type PreviewLogEntry } from "./preview-runtime";

/*
 * Step 17A: Participant Preview V1. Tegen PGlite met mock-providers en de mock-runtime: 0 AI-aanroepen.
 * Het Block Plan is TR-0014 met twee Chat simulaties (Actie en Toets), zodat de runtime echte chatblokken heeft.
 */

const TEXT = `Hoe reageer ik als een ouder tijdens een gesprek steeds bozer wordt? ${MOCK_ORGANISATION_SPECIFIC}`;
const mock = { promptVersion: "mock", modelVersion: "mock" };
const SCOPES = { SN1: "professional", SN2: "professional", SN3: "organisation_specific" } as const;
const ACTION_CHAT = "blok-2";
const TOETS_CHAT = "blok-7";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
}, 60_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

function workflowDeps(): WorkflowDeps {
  return {
    db,
    getAnalysisService: () => createTrainingAnalysisServiceV21({}),
    getBlueprintService: () => createTrainingBlueprintServiceV21({}),
    getBlockPlanService: () => createBlockPlanService({}),
    getBlockContentService: () => createBlockContentService({}),
    provenance: { analysis: mock, blueprint: mock, blockPlan: mock, blockContent: mock },
    log: () => {},
  };
}

const ws = (r: WorkflowResult): TrainingWorkspaceView => {
  if (r.status !== "ok") throw new Error(`${r.reason} ${r.issues?.join(",") ?? ""}`);
  return r.workspace;
};

/** Een runtime die iedere aanvraag vastlegt, zodat de tests kunnen zien wat er werkelijk naar de "provider" gaat. */
class SpyRuntime implements PreviewRuntimeService {
  readonly info = { provider: "mock" as const, model: null, chatEffort: null, feedbackEffort: null };
  readonly inner = new MockPreviewRuntimeService();
  chats: PreviewChatRequest[] = [];
  feedbacks: PreviewFeedbackRequest[] = [];
  async chatReply(r: PreviewChatRequest) {
    this.chats.push(structuredClone(r));
    return this.inner.chatReply(r);
  }
  async feedback(r: PreviewFeedbackRequest) {
    this.feedbacks.push(structuredClone(r));
    return this.inner.feedback(r);
  }
}

function previewDeps(runtime = new SpyRuntime()) {
  const logs: PreviewLogEntry[] = [];
  let created = 0;
  const deps: PreviewDeps = {
    db,
    getRuntime: () => {
      created++;
      return runtime;
    },
    log: (e) => logs.push(e),
  };
  return { deps, runtime, logs, created: () => created };
}

function planWithChats(): BcOnlineBlockPlan {
  const plan = structuredClone(tr0014.blockPlan) as unknown as BcOnlineBlockPlan;
  for (const b of plan.plannedBlocks) if (b.id === ACTION_CHAT || b.id === TOETS_CHAT) b.catalogBlockId = "certum.bco.chat-simulatie";
  return plan;
}

/** Een training in de stand "Training gereed" (alles current en goedgekeurd), via de echte workflow en mocks. */
async function readyTraining() {
  const d = workflowDeps();
  const started = await startTraining(d, {
    kind: "praktijkvraag",
    text: TEXT,
    acknowledgement: { textHash: await hashPreflightText(TEXT), acknowledgedFindingIds: [], syntheticDataAttested: true },
  });
  if (started.status !== "created") throw new Error(started.reason);
  const id = started.trainingId;
  const analysis = ws(started.analysis).analysis!;
  const blueprint = structuredClone(tr0014.blueprint) as unknown as TrainingBlueprintV2;
  const direction = analysis.outcome.outcome === "ready" ? analysis.outcome.trainingDirections[0].id : "";
  ws(await selectDirection(d, id, analysis.revisionId, direction));
  blueprint.selectedDirectionId = direction;
  const bp = await createArtifactRevision(db, {
    trainingId: id,
    artifactType: "blueprint",
    contractVersion: blueprint.version,
    promptVersion: "fixture",
    modelVersion: "fixture TR-0014",
    payload: blueprint,
    basedOnRevisionIds: [analysis.revisionId],
    expectedCurrentRevisionId: null,
  });
  const scoped = ws(await saveSourceNeedScopes(d, id, bp.id, SCOPES));
  ws(await decideRevision(d, id, scoped.blueprint!.revisionId, "approved"));
  const plan = await createArtifactRevision(db, {
    trainingId: id,
    artifactType: "block_plan",
    contractVersion: "bc-online-block-plan/v1",
    promptVersion: "fixture",
    modelVersion: "fixture TR-0014 + chats",
    payload: planWithChats(),
    basedOnRevisionIds: [scoped.blueprint!.revisionId],
    expectedCurrentRevisionId: null,
  });
  ws(await decideRevision(d, id, plan.id, "approved"));
  let current = ws(await generateContent(d, id));
  for (const s of tr0014.sources) {
    const added = ws(await addSource(d, id, s));
    current = ws(await validateSource(d, id, added.sources!.items.at(-1)!.revisionId, true));
  }
  const bronId = current.content!.package.blocks.find((b) => b.certumPhase === "bron")!.plannedBlockId;
  current = ws(await regenerateBlock(d, id, bronId, current.content!.blockRevisions[bronId].revisionId));
  for (const b of current.content!.package.blocks) {
    current = ws(await decideRevision(d, id, current.content!.blockRevisions[b.plannedBlockId].revisionId, "approved"));
  }
  current = ws(await decideRevision(d, id, current.content!.frame.start.revisionId, "approved"));
  current = ws(await decideRevision(d, id, current.content!.frame.end.revisionId, "approved"));
  expect(current.progress.stage).toBe("training_ready");
  return { d, id, workspace: current };
}

let ready: Awaited<ReturnType<typeof readyTraining>>;
beforeAll(async () => {
  ready = await readyTraining();
}, 120_000);

const feedbackBlock = (pkg: TrainingContentPackage, phase: string) =>
  pkg.blocks.find((b) => b.certumPhase === phase && b.catalogBlockId === "certum.bco.ai-feedback")!;

describe("Participant Preview V1: toegang", () => {
  it("een gereede training levert de deelnemersweergave in volgorde, met 4 queries", async () => {
    const counted = instrumentDb(db);
    const result = await loadPreview(counted.db, ready.id);
    expect(counted.stats.count).toBe(4);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const kinds = result.preview.steps.map((s) => s.kind);
    expect(kinds[0]).toBe("start");
    expect(kinds.at(-1)).toBe("end");
    const sequences = result.preview.steps.flatMap((s) => ("sequence" in s ? [s.sequence] : []));
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    expect(kinds.filter((k) => k === "chat")).toHaveLength(2);
    expect(result.preview.hasCapabilityBlockers).toBe(false);
  });

  it("de weergave bevat geen trusted runtime-configuratie of revision-ids", async () => {
    const result = await loadPreview(db, ready.id);
    if (result.status !== "ok") throw new Error(result.status);
    const json = JSON.stringify(result.preview);
    for (const b of ready.workspace.content!.package.blocks) {
      if (b.body.status !== "generated") continue;
      const c = b.body.content;
      if (c.catalogBlockId === "certum.bco.chat-simulatie") expect(json).not.toContain(c.personaInstructions);
      if (c.catalogBlockId === "certum.bco.ai-feedback") expect(json).not.toContain(c.instructions);
    }
    for (const r of Object.values(ready.workspace.content!.blockRevisions)) expect(json).not.toContain(r.revisionId);
    expect(json).not.toContain(ready.workspace.content!.frame.start.revisionId);
  });

  it("een niet-gereede training wordt geweigerd, ook voor runtime-calls", async () => {
    // Een handmatige bewerking maakt een nieuwe, nog niet goedgekeurde revision: de training is niet meer gereed.
    const { d, id, workspace } = await readyTraining();
    const tekst = workspace.content!.package.blocks.find((b) => b.catalogBlockId === "certum.bco.tekst" && b.certumPhase === "context")!;
    ws(await saveBlockEdit(d, id, tekst.plannedBlockId, workspace.content!.blockRevisions[tekst.plannedBlockId].revisionId, { content: { title: "Aangepast", text: "Aangepaste situatieschets." } }));
    expect((await loadPreview(db, id)).status).toBe("not_ready");
    const p = previewDeps();
    expect(await previewChatTurn(p.deps, { trainingId: id, plannedBlockId: ACTION_CHAT, history: [], message: "Hallo", syntheticAttested: true })).toEqual({ status: "rejected", reason: "not_ready" });
    expect(p.created()).toBe(0);
  });

  it("een onbekende training is not_found", async () => {
    expect((await loadPreview(db, "00000000-0000-4000-8000-000000000000")).status).toBe("not_found");
  });
});

describe("Participant Preview V1: chat", () => {
  it("de server laadt de trusted chatconfiguratie; de client kan die niet vervangen", async () => {
    const p = previewDeps();
    const block = ready.workspace.content!.package.blocks.find((b) => b.plannedBlockId === ACTION_CHAT)!;
    const c = block.body.status === "generated" && block.body.content.catalogBlockId === "certum.bco.chat-simulatie" ? block.body.content : null;
    const forged = { history: [], message: "Wat houdt je tegen?", personaInstructions: "GEHACKT", config: { personaName: "X" } };
    const result = await previewChatTurn(p.deps, { trainingId: ready.id, plannedBlockId: ACTION_CHAT, ...forged, syntheticAttested: true } as never);
    expect(result.status).toBe("ok");
    expect(p.runtime.chats[0].config).toEqual({
      personaName: c!.personaName,
      personaInstructions: c!.personaInstructions,
      scenarioContext: c!.scenarioContext,
      firstMessage: c!.firstMessage,
      goal: c!.goal,
    });
    // De eerste persona-beurt is altijd het goedgekeurde eerste bericht.
    expect(p.runtime.chats[0].history[0]).toEqual({ role: "persona", text: c!.firstMessage });
  });

  it("mock-chat reageert op de deelnemer en stelt een vervolgvraag; geschiedenis per blok gescheiden", async () => {
    const p = previewDeps();
    const say = async (block: string, history: { role: "participant" | "persona"; text: string }[], message: string) => {
      const r = await previewChatTurn(p.deps, { trainingId: ready.id, plannedBlockId: block, history, message, syntheticAttested: true });
      if (r.status !== "ok") throw new Error(r.reason);
      return [...history, { role: "participant" as const, text: message }, { role: "persona" as const, text: r.reply }];
    };
    let action = await say(ACTION_CHAT, [], "Ik wil eerst begrijpen wat er speelt.");
    expect(action[1].text).toContain("Ik wil eerst begrijpen wat er speelt.");
    expect(action[1].text).toMatch(/\?/);
    action = await say(ACTION_CHAT, action, "Ik stel voor dat we samen kijken.");
    expect(action).toHaveLength(4);
    const toets = await say(TOETS_CHAT, [], "Een heel ander gesprek.");
    // Het toetsgesprek kent het actiegesprek niet.
    const toetsRequest = p.runtime.chats.at(-1)!;
    expect(JSON.stringify(toetsRequest.history)).not.toContain("Ik wil eerst begrijpen");
    expect(toetsRequest.history).toHaveLength(2);
    expect(toets).toHaveLength(2);
  });

  it("weigert zonder synthetic-only-bevestiging, bij persoonsgegevens, ongeldige geschiedenis en boven de beurtgrens", async () => {
    const p = previewDeps();
    const base = { trainingId: ready.id, plannedBlockId: ACTION_CHAT, history: [] };
    expect(await previewChatTurn(p.deps, { ...base, message: "Hallo", syntheticAttested: false })).toEqual({ status: "rejected", reason: "attestation_required" });
    const privacy = await previewChatTurn(p.deps, { ...base, message: "Mail me op test@example.nl", syntheticAttested: true });
    expect(privacy).toMatchObject({ status: "rejected", reason: "privacy_blocked" });
    expect(JSON.stringify(privacy)).not.toContain("test@example.nl");
    expect(await previewChatTurn(p.deps, { ...base, history: [{ role: "persona", text: "x" }], message: "Hallo", syntheticAttested: true })).toEqual({ status: "rejected", reason: "invalid_input" });
    const long = Array.from({ length: MAX_PARTICIPANT_TURNS }, (_, i) => [
      { role: "participant" as const, text: `beurt ${i}` },
      { role: "persona" as const, text: "ok" },
    ]).flat();
    expect(await previewChatTurn(p.deps, { ...base, history: long, message: "nog een", syntheticAttested: true })).toEqual({ status: "rejected", reason: "turn_limit" });
    // Een chatcall op een niet-chatblok bestaat niet.
    expect(await previewChatTurn(p.deps, { ...base, plannedBlockId: "blok-3", message: "Hallo", syntheticAttested: true })).toEqual({ status: "rejected", reason: "not_found" });
    expect(p.runtime.chats).toHaveLength(0);
  });

  it("runtime-calls laden de goedgekeurde stand met 4 queries", async () => {
    const counted = instrumentDb(db);
    const p = previewDeps();
    await previewChatTurn({ ...p.deps, db: counted.db }, { trainingId: ready.id, plannedBlockId: ACTION_CHAT, history: [], message: "Hallo", syntheticAttested: true });
    expect(counted.stats.count).toBe(4);
  });
});

describe("Participant Preview V1: open vraag en AI Feedback", () => {
  it("feedback krijgt alleen antwoorden uit availableContext; geen chattranscripten, geen door de client verzonnen ids", async () => {
    const p = previewDeps();
    const pkg = ready.workspace.content!.package;
    const fb = feedbackBlock(pkg, "feedback");
    const c = fb.body.status === "generated" && fb.body.content.catalogBlockId === "certum.bco.ai-feedback" ? fb.body.content : null;
    expect(c!.availableContext).not.toContain(ACTION_CHAT);
    const answers: Record<string, string> = { "blok-3": "Antwoord op blok 3.", "blok-4": "Reflectie op blok 4.", "blok-8": "Toetsantwoord blok 8." };
    answers[ACTION_CHAT] = "CHATTRANSCRIPT dat niet mee mag";
    answers["verzonnen-blok"] = "VERZONNEN context";
    const result = await previewFeedback(p.deps, { trainingId: ready.id, plannedBlockId: fb.plannedBlockId, answers, syntheticAttested: true });
    expect(result.status).toBe("ok");
    const request = p.runtime.feedbacks[0];
    expect(request.instructions).toBe(c!.instructions);
    expect(request.context.map((x) => x.plannedBlockId)).toEqual(c!.availableContext.filter((id) => answers[id]));
    const sent = JSON.stringify(request);
    expect(sent).not.toContain("CHATTRANSCRIPT");
    expect(sent).not.toContain("VERZONNEN");
    expect(sent).not.toContain("Toetsantwoord blok 8");
    if (result.status === "ok") expect(result.usedContext).toEqual(request.context.map((x) => x.plannedBlockId));
  });

  it("toetsfeedback gebruikt alleen haar eigen beschikbare context", async () => {
    const p = previewDeps();
    const fb = feedbackBlock(ready.workspace.content!.package, "toets");
    const c = fb.body.status === "generated" && fb.body.content.catalogBlockId === "certum.bco.ai-feedback" ? fb.body.content : null;
    await previewFeedback(p.deps, { trainingId: ready.id, plannedBlockId: fb.plannedBlockId, answers: { "blok-3": "A3", "blok-8": "A8", [TOETS_CHAT]: "CHAT" }, syntheticAttested: true });
    expect(p.runtime.feedbacks[0].context.map((x) => x.plannedBlockId)).toEqual(c!.availableContext.filter((id) => ["blok-3", "blok-8"].includes(id)));
    expect(JSON.stringify(p.runtime.feedbacks[0])).not.toContain("CHAT\"");
  });

  it("open antwoorden zijn ephemeral: een previewcall wijzigt de training niet", async () => {
    const before = await loadTrainingWorkspace(db, ready.id);
    const p = previewDeps();
    const fb = feedbackBlock(ready.workspace.content!.package, "feedback");
    await previewFeedback(p.deps, { trainingId: ready.id, plannedBlockId: fb.plannedBlockId, answers: { "blok-3": "Tijdelijk antwoord." }, syntheticAttested: true });
    await previewChatTurn(p.deps, { trainingId: ready.id, plannedBlockId: ACTION_CHAT, history: [], message: "Tijdelijk bericht.", syntheticAttested: true });
    const after = await loadTrainingWorkspace(db, ready.id);
    expect(after).toEqual(before);
    const rows = (await db.query("select count(*)::int as n from artifact_revision where payload::text like '%Tijdelijk%'")) as unknown as { n: number }[];
    expect(rows[0].n).toBe(0);
  });

  it("feedback weigert persoonsgegevens in antwoorden, zonder de waarde terug te geven", async () => {
    const p = previewDeps();
    const fb = feedbackBlock(ready.workspace.content!.package, "feedback");
    const r = await previewFeedback(p.deps, { trainingId: ready.id, plannedBlockId: fb.plannedBlockId, answers: { "blok-3": "Bel 0612345678" }, syntheticAttested: true });
    expect(r).toMatchObject({ status: "rejected", reason: "privacy_blocked" });
    expect(JSON.stringify(r)).not.toContain("0612345678");
    expect(p.runtime.feedbacks).toHaveLength(0);
  });
});

describe("Participant Preview V1: logging", () => {
  it("logt alleen metadata: geen berichten, antwoorden, replies, feedback of instructies", async () => {
    const runtime = new SpyRuntime();
    const p = previewDeps(runtime);
    const consoleSpy = vi.spyOn(console, "info");
    const secret = "GEHEIM-DEELNEMERSBERICHT";
    const chat = await previewChatTurn(p.deps, { trainingId: ready.id, plannedBlockId: ACTION_CHAT, history: [], message: secret, syntheticAttested: true });
    const fb = feedbackBlock(ready.workspace.content!.package, "feedback");
    const feedback = await previewFeedback(p.deps, { trainingId: ready.id, plannedBlockId: fb.plannedBlockId, answers: { "blok-3": `${secret}-ANTWOORD` }, syntheticAttested: true });
    const runtimeLogs = p.logs.filter((l) => l.event === "certum.preview_runtime");
    expect(runtimeLogs).toHaveLength(2);
    // Ieder privacybesluit wordt gelogd, alleen met aantallen en de beslissing.
    expect(p.logs.filter((l) => l.event === "certum.preview_privacy")).toEqual([
      { event: "certum.preview_privacy", kind: "chat", trainingId: ready.id, plannedBlockId: ACTION_CHAT, preflightVersion: "privacy-preflight/v1", status: "safe", findings: 0, trustedExempted: 0, remainingCategories: [], outcome: "allowed" },
      { event: "certum.preview_privacy", kind: "feedback", trainingId: ready.id, plannedBlockId: fb.plannedBlockId, preflightVersion: "privacy-preflight/v1", status: "safe", findings: 0, trustedExempted: 0, remainingCategories: [], outcome: "allowed" },
    ]);
    const logged = JSON.stringify(p.logs) + JSON.stringify(consoleSpy.mock.calls);
    expect(logged).not.toContain(secret);
    if (chat.status === "ok") expect(logged).not.toContain(chat.reply);
    if (feedback.status === "ok") expect(logged).not.toContain(feedback.feedback);
    for (const b of ready.workspace.content!.package.blocks) {
      if (b.body.status !== "generated") continue;
      const c = b.body.content;
      if (c.catalogBlockId === "certum.bco.chat-simulatie") {
        expect(logged).not.toContain(c.personaInstructions);
        expect(logged).not.toContain(c.firstMessage);
      }
      if (c.catalogBlockId === "certum.bco.ai-feedback") expect(logged).not.toContain(c.instructions);
    }
    expect(Object.keys(runtimeLogs[0]).sort()).toEqual(
      ["catalogBlockId", "durationMs", "effort", "event", "kind", "model", "outcome", "participantTurns", "plannedBlockId", "promptVersion", "provider", "stopReason", "trainingId"].sort(),
    );
    expect(runtimeLogs[1]).toMatchObject({ event: "certum.preview_runtime", kind: "feedback", promptVersion: "participant-feedback/v1.1", outcome: "success", contextItems: 1 });
  });

  it("laden en renderen van de preview doen geen runtime-call", async () => {
    const p = previewDeps();
    await loadPreview(db, ready.id);
    await loadPreview(db, ready.id);
    expect(p.created()).toBe(0);
    expect(p.logs).toHaveLength(0);
  });
});

/** De bewerkbare velden van een gegenereerd blok (zoals de editor ze aanlevert). */
function editable(block: BlockContentResult): Record<string, unknown> {
  if (block.body.status !== "generated") throw new Error("niet gegenereerd");
  const { catalogBlockId, ...rest } = block.body.content as Record<string, unknown>;
  void catalogBlockId;
  delete rest.availableContext;
  delete rest.unavailableContext;
  delete rest.minimumWords;
  return rest;
}

/**
 * Een gereede training waarin de opleider (bewerkt en goedgekeurd) synthetische namen heeft gezet: "Noor" zichtbaar in
 * het scenario van de Toets-chat, "Gerrit" alleen in de verborgen persona-instructies van de Actie-chat.
 */
async function readyTrainingWithNames() {
  const t = await readyTraining();
  let current = t.workspace;
  const editAndApprove = async (id: string, change: (c: Record<string, unknown>) => void) => {
    const content = editable(current.content!.package.blocks.find((b) => b.plannedBlockId === id)!);
    change(content);
    current = ws(await saveBlockEdit(t.d, t.id, id, current.content!.blockRevisions[id].revisionId, { content }));
    current = ws(await decideRevision(t.d, t.id, current.content!.blockRevisions[id].revisionId, "approved"));
  };
  await editAndApprove(TOETS_CHAT, (c) => {
    c.scenarioContext = `${c.scenarioContext ?? ""} Het gesprek gaat over de leerling Noor.`.trim();
  });
  await editAndApprove(ACTION_CHAT, (c) => {
    c.personaInstructions = `${c.personaInstructions} Je overlegt achter de schermen met je collega Gerrit.`;
  });
  expect(current.progress.stage).toBe("training_ready");
  return { ...t, workspace: current };
}

describe("Participant Preview: trusted synthetic context (Step 17C)", () => {
  let named: Awaited<ReturnType<typeof readyTrainingWithNames>>;
  beforeAll(async () => {
    named = await readyTrainingWithNames();
  }, 120_000);
  const chat = (p: ReturnType<typeof previewDeps>, plannedBlockId: string, message: string) =>
    previewChatTurn(p.deps, { trainingId: named.id, plannedBlockId, history: [], message, syntheticAttested: true });

  it("naam uit de huidige zichtbare, goedgekeurde stap mag door; de vrijstelling wordt alleen als aantal gelogd", async () => {
    const p = previewDeps();
    expect(await chat(p, TOETS_CHAT, "Ik begrijp dat Noor dit lastig vindt.")).toMatchObject({ status: "ok" });
    expect(p.runtime.chats).toHaveLength(1);
    expect(p.logs[0]).toEqual({
      event: "certum.preview_privacy",
      kind: "chat",
      trainingId: named.id,
      plannedBlockId: TOETS_CHAT,
      preflightVersion: "privacy-preflight/v1",
      status: "review_required",
      findings: 1,
      trustedExempted: 1,
      remainingCategories: [],
      outcome: "allowed",
    });
    expect(JSON.stringify(p.logs)).not.toContain("Noor");
  });

  it("naam uitsluitend uit een toekomstige, nog niet zichtbare stap is niet vertrouwd", async () => {
    const p = previewDeps();
    expect(await chat(p, ACTION_CHAT, "Ik begrijp dat Noor dit lastig vindt.")).toEqual({ status: "rejected", reason: "privacy_blocked", categories: ["possible_person_name"] });
    expect(p.runtime.chats).toHaveLength(0);
  });

  it("een naam die alleen in verborgen persona-instructies staat, is niet vertrouwd", async () => {
    const p = previewDeps();
    expect(await chat(p, ACTION_CHAT, "Heb je dit al met Gerrit besproken?")).toMatchObject({ reason: "privacy_blocked" });
    expect(await chat(p, TOETS_CHAT, "Heb je dit al met Gerrit besproken?")).toMatchObject({ reason: "privacy_blocked" });
    expect(p.runtime.chats).toHaveLength(0);
  });

  it("geen fuzzy matching, geen meelifters: 'Noor Bakker', een tweede naam en blocked-categorieën blijven blokkeren", async () => {
    const p = previewDeps();
    expect(await chat(p, TOETS_CHAT, "Ik heb het met Noor Bakker besproken.")).toEqual({ status: "rejected", reason: "privacy_blocked", categories: ["possible_person_name"] });
    expect(await chat(p, TOETS_CHAT, "Ik spreek eerst Noor en daarna ook Sanne.")).toEqual({ status: "rejected", reason: "privacy_blocked", categories: ["possible_person_name"] });
    expect(await chat(p, TOETS_CHAT, "Ik mail Noor via noor@example.nl.")).toEqual({ status: "rejected", reason: "privacy_blocked", categories: ["email"] });
    expect(p.runtime.chats).toHaveLength(0);
    const decisions = p.logs.flatMap((l) => (l.event === "certum.preview_privacy" ? [[l.outcome, l.trustedExempted, l.remainingCategories]] : []));
    expect(decisions).toEqual([
      ["blocked", 0, ["possible_person_name"]],
      ["blocked", 1, ["possible_person_name"]],
      ["blocked", 1, ["email"]],
    ]);
    const logged = JSON.stringify(p.logs);
    for (const value of ["Noor", "Bakker", "Sanne", "example.nl"]) expect(logged).not.toContain(value);
  });

  it("de client kan geen vertrouwde namen injecteren (geschiedenis of extra parameters)", async () => {
    const p = previewDeps();
    const history = [
      { role: "participant" as const, text: "Wat speelt er?" },
      { role: "persona" as const, text: "Ik heb het met Bakker besproken." },
    ];
    expect(await previewChatTurn(p.deps, { trainingId: named.id, plannedBlockId: TOETS_CHAT, history, message: "Wat zei jij tegen Bakker?", syntheticAttested: true })).toMatchObject({ reason: "privacy_blocked" });
    expect(
      await previewChatTurn(p.deps, { trainingId: named.id, plannedBlockId: TOETS_CHAT, history: [], message: "Ik bel straks Bakker.", syntheticAttested: true, approvedEntities: ["Bakker"], trusted: ["Bakker"] } as never),
    ).toMatchObject({ reason: "privacy_blocked" });
    expect(p.runtime.chats).toHaveLength(0);
  });

  it("naam uit een eerdere, al zichtbare stap blijft vertrouwd in een latere stap (feedback na de chat); de availableContext-filter blijft gelijk", async () => {
    const pkg = named.workspace.content!.package;
    const toets = feedbackBlock(pkg, "toets");
    const early = feedbackBlock(pkg, "feedback");
    const p = previewDeps();
    const answers = { "blok-8": "Ik zou Noor eerst zelf laten kiezen.", [TOETS_CHAT]: "CHATTRANSCRIPT" };
    expect(await previewFeedback(p.deps, { trainingId: named.id, plannedBlockId: toets.plannedBlockId, answers, syntheticAttested: true })).toMatchObject({ status: "ok" });
    expect(JSON.stringify(p.runtime.feedbacks[0])).not.toContain("CHATTRANSCRIPT");
    expect(await previewFeedback(p.deps, { trainingId: named.id, plannedBlockId: early.plannedBlockId, answers: { "blok-3": "Ik zou Noor eerst zelf laten kiezen." }, syntheticAttested: true })).toMatchObject({
      reason: "privacy_blocked",
    });
  });

  it("niet-goedgekeurde inhoud levert geen vertrouwde naam: de training is dan niet gereed en er volgt geen call", async () => {
    const t = await readyTrainingWithNames();
    const content = editable(t.workspace.content!.package.blocks.find((b) => b.plannedBlockId === TOETS_CHAT)!);
    content.scenarioContext = `${content.scenarioContext} Ook mentor Pieter is erbij.`;
    ws(await saveBlockEdit(t.d, t.id, TOETS_CHAT, t.workspace.content!.blockRevisions[TOETS_CHAT].revisionId, { content }));
    const p = previewDeps();
    expect(await previewChatTurn(p.deps, { trainingId: t.id, plannedBlockId: TOETS_CHAT, history: [], message: "Ik spreek ook met Pieter.", syntheticAttested: true })).toEqual({
      status: "rejected",
      reason: "not_ready",
    });
    expect(p.created()).toBe(0);
    expect(p.logs).toHaveLength(0);
  }, 120_000);
});

describe("Participant Preview: afgekapte output (Step 17C)", () => {
  it("normale stop: succes, met de stop reason als metadata", async () => {
    const p = previewDeps();
    const fb = feedbackBlock(ready.workspace.content!.package, "feedback");
    expect(await previewFeedback(p.deps, { trainingId: ready.id, plannedBlockId: fb.plannedBlockId, answers: { "blok-3": "Antwoord." }, syntheticAttested: true })).toMatchObject({ status: "ok" });
    expect(p.logs.find((l) => l.event === "certum.preview_runtime")).toMatchObject({ outcome: "success", stopReason: "end_turn", promptVersion: "participant-feedback/v1.1" });
  });

  it("max_tokens: geen succes, geen gedeeltelijke tekst naar de client, geen retry; alleen metadata gelogd", async () => {
    const p = previewDeps();
    const fb = feedbackBlock(ready.workspace.content!.package, "feedback");
    const feedback = await previewFeedback(p.deps, { trainingId: ready.id, plannedBlockId: fb.plannedBlockId, answers: { "blok-3": `Mijn antwoord. ${MOCK_TRUNCATE_MARKER}` }, syntheticAttested: true });
    expect(feedback).toEqual({ status: "rejected", reason: "output_truncated" });
    const reply = await previewChatTurn(p.deps, { trainingId: ready.id, plannedBlockId: ACTION_CHAT, history: [], message: `Hallo ${MOCK_TRUNCATE_MARKER}`, syntheticAttested: true });
    expect(reply).toEqual({ status: "rejected", reason: "output_truncated" });
    expect(p.runtime.feedbacks).toHaveLength(1);
    expect(p.runtime.chats).toHaveLength(1);
    expect(p.logs.filter((l) => l.event === "certum.preview_runtime")).toEqual([
      expect.objectContaining({ kind: "feedback", promptVersion: "participant-feedback/v1.1", outcome: "error", errorKind: "output_truncated", stopReason: "max_tokens" }),
      expect.objectContaining({ kind: "chat", outcome: "error", errorKind: "output_truncated", stopReason: "max_tokens" }),
    ]);
    const logged = JSON.stringify(p.logs);
    expect(logged).not.toContain("halverwege");
    expect(logged).not.toContain("Mijn antwoord");
  });
});

describe("Participant Preview V1: capability blocker", () => {
  it("een niet-ondersteund bloktype wordt een expliciete blokkade, geen nagebootste inhoud", () => {
    const pkg = structuredClone(ready.workspace.content!.package);
    const block = pkg.blocks.find((b) => b.plannedBlockId === "blok-3")!;
    block.catalogBlockId = "certum.bco.meerkeuze" as never;
    if (block.body.status === "generated") block.body.content = { catalogBlockId: "certum.bco.meerkeuze", title: "Kies", question: "?", options: [] } as never;
    const pending = pkg.blocks.find((b) => b.plannedBlockId === "blok-4")!;
    pending.body = { status: "needs_asset" } as never;
    const model = buildPreview(pkg);
    expect(model.hasCapabilityBlockers).toBe(true);
    const steps = model.steps.filter((s) => s.kind === "unsupported");
    expect(steps.map((s) => ("plannedBlockId" in s ? s.plannedBlockId : ""))).toEqual(["blok-3", "blok-4"]);
    expect(JSON.stringify(steps)).not.toContain("options");
  });
});
