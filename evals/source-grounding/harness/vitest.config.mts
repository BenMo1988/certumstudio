import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Opt-in eval-harness Source Grounding (SG). Nooit onderdeel van `npm test`. Aliassen gelijk aan vitest.config.mts.
 * Gebruik: zie ../README.md.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../../../src", import.meta.url)),
      "server-only": fileURLToPath(new URL("../../../test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    root: fileURLToPath(new URL("../../..", import.meta.url)),
    include: ["evals/source-grounding/harness/*.eval.ts"],
    environment: "node",
    testTimeout: 300_000,
    hookTimeout: 60_000,
  },
});
