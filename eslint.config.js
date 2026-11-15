import storybook from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import workspacesPlugin from "eslint-plugin-workspaces";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      ".worktrees/**",
      "backups-test/**",
      "packages/**",
      "functions/**",
      ".turbo/**",
      "**/e2e/**",
      "scripts/**",
      "**/playwright.config.ts",
      "fix-imports.ts",
      "test-db.ts",
      "test-pw.ts",
      "test-prune/**",
      "create-admin.ts",
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
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "workspaces/no-relative-imports": "off",
      "workspaces/require-dependency": "off",
    },
  },
  {
    // Scoped rules for CLI, Database Seeders, Migration scripts, Background Jobs, BPM Engine, and Test Suites
    files: [
      "src/db/seeds/**/*.ts",
      "src/db/migrate*.ts",
      "src/admin/**/*.ts",
      "src/jobs/**/*.ts",
      "src/scripts/**/*.ts",
      "src/bpm/**/*.ts",
      "tests/**/*.ts",
      "**/*.test.ts",
      "**/*.spec.ts",
    ],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Issue #9 Phase 1: Progressive strict typing for SCM domain
    files: ["src/scm/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Issue #9 Phase 2: Progressive strict typing for Security & Identity Layer
    files: ["src/middleware/**/*.ts", "src/config/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Issue #9 Phase 3: Progressive strict typing for Operational Controllers & Route Handlers
    files: ["src/routes/**/*.ts"],
    ignores: ["src/routes/**/*.test.ts", "src/routes/**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  storybook.configs["flat/recommended"],
);
