import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import workspacesPlugin from "eslint-plugin-workspaces";

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
      "test-pw.ts",
      "**/dataconnect-generated/**",
      "**/dataconnect-admin-generated/**",
      "test-prune/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.recommended],
    plugins: {
      react: reactPlugin,
      workspaces: workspacesPlugin,
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
      "workspaces/no-relative-imports": "off",
      "workspaces/require-dependency": "off",
    },
  },
);
