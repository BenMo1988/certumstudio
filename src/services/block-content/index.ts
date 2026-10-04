import "server-only";
import { createBlockContentService } from "./factory";
import type { BlockContentService } from "./services";

export type { BlockContentRequest, BlockContentService, FrameContentRequest } from "./services";
export { generateBlockContent, generateTrainingContentPackage, type ContentGenerationFailure } from "./orchestrator";

/** Block Content: mock of Claude volgens CERTUM_BLOCK_CONTENT_PROVIDER; standaard mock. De UI kent geen provider. */
export function getBlockContentService(): BlockContentService {
  return createBlockContentService();
}
