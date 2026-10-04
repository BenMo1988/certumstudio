import nextEnv from "@next/env";
import { afterAll, beforeAll, expect, it } from "vitest";
import { hashPreflightText, runPrivacyPreflight } from "@/modules/privacy";
import { ANALYSIS_CONTRACT_V21_VERSION } from "@/modules/training-agent/v2-1";
import { fixtureCase } from "../../../test/block-content-fixtures";
import analyses from "../../../test/fixtures/v21-ready-analyses.json";
import { contentHash } from "./canonical-json";
import { createPostgresDb, type PostgresDb } from "./postgres-db";
import {
  appendWorkflowEvent,
  createArtifactRevision,
  createTraining,
  getCurrentArtifactRevision,
  getSelectedDirectionId,
  isRevisionApproved,
  saveTrainingInput,
} from "./training-record";

/*
 * Opt-in (`npm run test:db`): dezelfde gecontroleerde persistence flow als in de PGlite-test, maar tegen de echte
 * database in DATABASE_URL. Schrijft synthetische testdata (titel met "[integratietest]"); revisions en events zijn
 * append-only en blijven dus staan in de development-database. Logt niets.
 */

nextEnv.loadEnvConfig(process.cwd());
const CA006 = (analyses.cases as unknown as Record<string, { input: string; analysis: unknown }>)["CA-006"];
const { blueprint: BLUEPRINT } = fixtureCase("BLP-001");

let writer: PostgresDb;
beforeAll(() => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL ontbreekt in .env.local.");
  writer = createPostgresDb(url);
});
afterAll(async () => {
  await writer?.close();
});

it("Supabase: training → invoer → analyse → richting → Blueprint → approve → herladen via een nieuwe verbinding", async () => {
  const training = await createTraining(writer, { title: "[integratietest] persistence flow" });
  const preflight = runPrivacyPreflight(CA006.input.trim());
  await saveTrainingInput(writer, {
    trainingId: training.id,
    inputType: "casus",
    text: CA006.input,
    acknowledgement: {
      textHash: await hashPreflightText(CA006.input),
      acknowledgedFindingIds: preflight.findings.filter((f) => f.severity === "review_required").map((f) => f.id),
      syntheticDataAttested: true,
    },
  });
  const analysis = await createArtifactRevision(writer, {
    trainingId: training.id,
    artifactType: "analysis",
    contractVersion: ANALYSIS_CONTRACT_V21_VERSION,
    payload: CA006.analysis,
    basedOnRevisionIds: [],
  });
  await appendWorkflowEvent(writer, { trainingId: training.id, artifactRevisionId: analysis.id, eventType: "direction_selected", trainingDirectionId: BLUEPRINT.selectedDirectionId });
  const blueprint = await createArtifactRevision(writer, {
    trainingId: training.id,
    artifactType: "blueprint",
    contractVersion: BLUEPRINT.version,
    payload: BLUEPRINT,
    basedOnRevisionIds: [analysis.id],
  });
  await appendWorkflowEvent(writer, { trainingId: training.id, artifactRevisionId: blueprint.id, eventType: "approved" });

  const reader = createPostgresDb(process.env.DATABASE_URL!.trim());
  try {
    const current = await getCurrentArtifactRevision(reader, training.id, "blueprint");
    expect(current?.id).toBe(blueprint.id);
    expect(current?.payload).toEqual(BLUEPRINT);
    expect(current?.contentHash).toBe(contentHash(BLUEPRINT));
    expect(await isRevisionApproved(reader, blueprint.id)).toBe(true);
    expect(await getSelectedDirectionId(reader, analysis.id)).toBe(BLUEPRINT.selectedDirectionId);
  } finally {
    await reader.close();
  }
});
