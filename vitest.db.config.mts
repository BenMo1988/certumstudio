import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Opt-in integratietest tegen de echte database in DATABASE_URL (Supabase Frankfurt). Alleen via `npm run test:db`;
 * `npm test` raakt nooit een externe database. Aliassen gelijk aan vitest.config.mts.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.supabase.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
