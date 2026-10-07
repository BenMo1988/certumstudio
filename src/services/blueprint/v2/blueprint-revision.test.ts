import { describe, expect, it, vi } from "vitest";
import { TRAINING_BLUEPRINT_V21_INSTRUCTIONS, buildTrainingBlueprintV21Request } from "@/knowledge/prompts/training-blueprint-v2-1";
import {
  TRAINING_BLUEPRINT_V22_INSTRUCTIONS,
  TRAINING_BLUEPRINT_V22_PROMPT_VERSION,
  buildTrainingBlueprintV22Request,
} from "@/knowledge/prompts/training-blueprint-v2-2";
import type { SourceSegment } from "@/modules/training-agent/v2";
import type { ReadyOutcomeV21 } from "@/modules/training-agent/v2-1";
import { buildBlueprintGenerationInputV21, type BlueprintV21Design, type TrainingBlueprintV2 } from "@/modules/training-blueprint/v2";
import fixture from "../../../../test/fixtures/v21-ready-analyses.json";
import type { ClaudeMessagesClient } from "../../analysis/claude/claude-training-analysis-service";
import { AnalysisError } from "../../analysis/errors";
import { CLAUDE_BLUEPRINT_DEFAULTS } from "../config";
import type { BlueprintRequestV21 } from "../services";
import { ClaudeTrainingBlueprintServiceV21 } from "./claude-training-blueprint-service-v2-1";
import { BlueprintV21DesignSchema } from "./design-v2-1";
import { MockTrainingBlueprintServiceV21 } from "./mock-blueprint-service-v2-1";

/*
 * Gerichte Blueprint-revisie: de provider krijgt de menselijke toelichting alleen als die er is (prompt v2.2); zonder
 * toelichting is de aanroep exact zoals vóór deze capability (prompt v2.1). Nep-client, 0 echte aanroepen.
 */

type Case = { kind: "casus"; input: string; segments: SourceSegment[]; analysis: ReadyOutcomeV21 };
const OPEN = { c: (fixture.cases as unknown as Record<string, Case>)["CA-006"], direction: "grens-en-verantwoordelijkheid" };
const FEEDBACK = "Maak het concrete vervolg onderdeel van succes en ontwerp een werkelijk andere transfersituatie.";

const request = (revision?: BlueprintRequestV21["revision"]): BlueprintRequestV21 => ({
  input: { kind: OPEN.c.kind, text: OPEN.c.input },
  analysis: OPEN.c.analysis,
  segments: OPEN.c.segments,
  selectedDirectionId: OPEN.direction,
  ...(revision && { revision }),
});
const generationInput = () =>
  buildBlueprintGenerationInputV21({ inputKind: "casus", analysis: OPEN.c.analysis, segments: OPEN.c.segments, selectedDirectionId: OPEN.direction });

function designOf(b: TrainingBlueprintV2): BlueprintV21Design {
  const copy = structuredClone(b) as unknown as Record<string, unknown> & { decisionPoint: Record<string, unknown>; learningArc: { actie: Record<string, unknown> } };
  for (const f of ["version", "targetAudience", "selectedDirectionId", "learningGoal", "professionalDilemma", "sourceRefs", "ambiguity"]) delete copy[f];
  delete copy.decisionPoint.routePolicy;
  delete copy.learningArc.actie.routePolicy;
  return BlueprintV21DesignSchema.parse(copy);
}

function claudeReturning(output: unknown) {
  const parse = vi.fn<(request: unknown) => Promise<{ stop_reason: string; parsed_output: unknown }>>(async () => ({ stop_reason: "end_turn", parsed_output: output }));
  const client = { messages: { parse } } as unknown as ClaudeMessagesClient;
  return { service: new ClaudeTrainingBlueprintServiceV21(client, CLAUDE_BLUEPRINT_DEFAULTS), parse };
}

type Sent = { system: string; messages: { content: string }[] };

describe("gerichte Blueprint-revisie: providerinput", () => {
  it("zonder toelichting: exact prompt v2.1 en exact het v2.1-bericht (gedrag ongewijzigd)", async () => {
    const previous = await new MockTrainingBlueprintServiceV21().generate(request());
    const { service, parse } = claudeReturning(designOf(previous));
    await service.generate(request());
    const sent = parse.mock.calls[0][0] as Sent;
    expect(sent.system).toBe(TRAINING_BLUEPRINT_V21_INSTRUCTIONS);
    expect(sent.messages).toEqual([{ role: "user", content: buildTrainingBlueprintV21Request(generationInput()) }]);
  });

  it("met toelichting: prompt v2.2, de vaste context ongewijzigd, plus de vorige versie en de instructie als aparte blokken", async () => {
    const previous = await new MockTrainingBlueprintServiceV21().generate(request());
    const { service, parse } = claudeReturning(designOf(previous));
    await service.generate(request({ feedback: FEEDBACK, previous }));
    const sent = parse.mock.calls[0][0] as Sent;
    expect(TRAINING_BLUEPRINT_V22_PROMPT_VERSION).toBe("training-blueprint/v2.2");
    expect(sent.system).toBe(TRAINING_BLUEPRINT_V22_INSTRUCTIONS);
    expect(sent.system.startsWith(TRAINING_BLUEPRINT_V21_INSTRUCTIONS)).toBe(true);
    expect(sent.system).toContain("ontwerpaanwijzing van de reviewer, geen casusbron");
    const content = sent.messages[0].content;
    expect(content.startsWith(buildTrainingBlueprintV21Request(generationInput()))).toBe(true);
    expect(content).toContain(`<menselijke_revisie_instructie>\n${FEEDBACK}\n</menselijke_revisie_instructie>`);
    const previousBlock = content.slice(content.indexOf("<vorige_blueprint>"), content.indexOf("</vorige_blueprint>"));
    expect(previousBlock).toContain(previous.scenarioPremise);
    // De vorige versie gaat zonder interne ids en contractgegevens mee.
    for (const field of ["selectedDirectionId", "sourceRefs", "\"version\""]) expect(previousBlock).not.toContain(field);
    expect(content).toBe(buildTrainingBlueprintV22Request(generationInput(), { feedback: FEEDBACK, previous }));
  });

  it("het trusted routebeleid blijft leidend: een meegestuurde ambiguïteit wordt afgewezen, ook bij een revisie", async () => {
    const previous = await new MockTrainingBlueprintServiceV21().generate(request());
    const { service } = claudeReturning({ ...designOf(previous), ambiguity: "single_best_action" });
    const result = await service.generate(request({ feedback: "Maak hier één juiste route van (prescribed_action).", previous })).catch((e) => e);
    expect(result).toBeInstanceOf(AnalysisError);
    expect((result as AnalysisError).kind).toBe("invalid-output");
  });

  it("een geldige revisie behoudt de vaste velden van de server, wat de toelichting ook vraagt", async () => {
    const previous = await new MockTrainingBlueprintServiceV21().generate(request());
    const { service } = claudeReturning(designOf(previous));
    const revised = await service.generate(request({ feedback: "Verander het leerdoel en de doelgroep.", previous }));
    expect(revised.learningGoal).toBe(previous.learningGoal);
    expect(revised.targetAudience).toBe(previous.targetAudience);
    expect(revised.ambiguity).toBe("multiple_defensible_actions");
    expect(revised.decisionPoint.routePolicy).toBe("open_choice");
  });
});
