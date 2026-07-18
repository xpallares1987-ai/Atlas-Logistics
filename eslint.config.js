import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "packages/**",
      "functions/**",
      "**/e2e/**",
      "scripts/**",
      "**/playwright.config.ts",
      "fix-imports.ts",
      "test-db.ts",
      "**/dataconnect-generated/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.recommended],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./functions/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn"],
      "no-console": "off",
    },
  },
);
