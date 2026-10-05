import "server-only";
import { createClaudeClient } from "../analysis/claude/claude-training-analysis-service";
import { ClaudePreviewRuntimeService } from "./claude-preview-runtime";
import { readPreviewConfig } from "./config";
import { MockPreviewRuntimeService } from "./mock-preview-runtime";
import type { PreviewRuntimeService } from "./services";

export type { PreviewRuntimeService } from "./services";

/** De Participant Preview-runtime volgens `CERTUM_PREVIEW_PROVIDER` (standaard mock). Geen terugval naar mock. */
export function createPreviewRuntimeService(env?: Record<string, string | undefined>): PreviewRuntimeService {
  const config = readPreviewConfig(env);
  if (config.provider === "mock") return new MockPreviewRuntimeService();
  const { apiKey, ...settings } = config.claude;
  return new ClaudePreviewRuntimeService(createClaudeClient({ apiKey, ...settings }), settings);
}
