import { defineConfig } from "vitest/config";
import path from "node:path";

// B25: Integration test configuration.
// Strictly requires TEST_DATABASE_URL and validates permitted test host/database names.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    setupFiles: ["tests/setup/integration.ts"],
    include: ["tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
