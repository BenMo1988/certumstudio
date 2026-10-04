import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js regelt "server-only" zelf; in tests is het een lege module.
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // De opt-in test tegen de echte database draait alleen via `npm run test:db` (vitest.db.config.mts).
    exclude: [...configDefaults.exclude, "src/**/*.supabase.test.ts"],
    environment: "node",
  },
});
