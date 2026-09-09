import js from "@eslint/js";
import tsPlugin from "typescript-eslint";

export default tsPlugin.config(
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
    ],
  }
);
