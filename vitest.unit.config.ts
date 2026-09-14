import { defineConfig } from "vitest/config";
import path from "node:path";

// B25: Unit test configuration.
// Strictly DOES NOT load .env to prevent secret leakage or live database reachability.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 15000,
    setupFiles: ["tests/setup/unit.ts"],
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/config/env.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
