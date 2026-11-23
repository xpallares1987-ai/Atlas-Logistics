import storybook from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import workspacesPlugin from "eslint-plugin-workspaces";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dev-dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      ".worktrees/**",
      "backups-test/**",
      "packages/bpmn-modeler/**",
      "packages/mfe-dashboard/**",
      "packages/mfe-warehouse/**",
      "packages/rate-comparer/**",
      "packages/shared/**",
      "packages/ui/**",
      "packages/frontend/dist/**",
      "packages/frontend/dev-dist/**",
      "functions/**",
      ".turbo/**",
      "**/e2e/**",
      "scripts/**",
      "**/playwright.config.ts",
      "**/vite.config.ts",
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
        project: ["./tsconfig.json", "./packages/frontend/tsconfig.json"],
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
    // Issue #9 Phase 1 & P1.4 Architectural Boundaries: Strict typing and framework isolation for SCM domain
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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "fastify",
              message:
                "Domain layer (src/scm) must not depend on HTTP framework (fastify).",
            },
            {
              name: "vite",
              message:
                "Domain layer (src/scm) must not depend on frontend bundler (vite).",
            },
            {
              name: "react",
              message:
                "Domain layer (src/scm) must not depend on UI library (react).",
            },
            {
              name: "react-dom",
              message:
                "Domain layer (src/scm) must not depend on UI library (react-dom).",
            },
          ],
          patterns: [
            {
              group: ["@atlas/frontend*", "@atlas/ui*", "packages/frontend*"],
              message:
                "Domain layer (src/scm) must never import from frontend or UI presentation packages.",
            },
          ],
        },
      ],
    },
  },
  {
    // P1.4 Pure Domain Engines: Zero ORM or database driver coupling inside pure calculation/validation engines
    files: ["src/scm/engines/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "drizzle-orm",
              message:
                "Pure SCM domain engines (src/scm/engines) must remain decoupled from Drizzle ORM.",
            },
            {
              name: "@libsql/client",
              message:
                "Pure SCM domain engines (src/scm/engines) must remain decoupled from libSQL database driver.",
            },
            {
              name: "fastify",
              message:
                "Pure SCM domain engines (src/scm/engines) must remain decoupled from Fastify HTTP.",
            },
            {
              name: "better-sqlite3",
              message:
                "Pure SCM domain engines (src/scm/engines) must remain decoupled from better-sqlite3 driver.",
            },
            {
              name: "fs",
              message:
                "Pure SCM domain engines (src/scm/engines) must not perform direct filesystem I/O.",
            },
            {
              name: "node:fs",
              message:
                "Pure SCM domain engines (src/scm/engines) must not perform direct filesystem I/O.",
            },
          ],
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
  {
    // Issue #9 Phase 4: Progressive strict typing for Frontend Component Boundaries & Monorepo Package Boundaries
    files: ["packages/frontend/src/**/*.{ts,tsx}"],
    ignores: [
      "packages/frontend/src/**/__tests__/**",
      "packages/frontend/src/**/*.test.{ts,tsx}",
    ],
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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "drizzle-orm",
              message: "Frontend must not import Drizzle ORM directly.",
            },
            {
              name: "better-sqlite3",
              message: "Frontend must not import SQLite database driver.",
            },
            {
              name: "fastify",
              message: "Frontend must not import backend Fastify framework.",
            },
          ],
          patterns: [
            {
              group: ["**/src/db/**", "**/src/services/**", "**/src/routes/**"],
              message:
                "Frontend must interact with backend via HTTP/REST contracts, never direct internal backend paths.",
            },
          ],
        },
      ],
    },
  },
  storybook.configs["flat/recommended"],
);
