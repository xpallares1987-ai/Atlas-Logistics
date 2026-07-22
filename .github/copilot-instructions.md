# Copilot Instructions for Atlas-Logistics

## Repository Scope

This repository root is `C:\Users\xpall\Source\Atlas-Logistics`. It is an SCM Super-App organized as a `pnpm` workspace monorepo powered by Turborepo.

## Build, Test, Lint, and Install Commands

Run these from the repository root:

```bash
pnpm install
pnpm run build
pnpm run test
pnpm run lint
```

For focused testing and package-level tasks:

```bash
# Unit tests in shared package
pnpm --filter @atlas/shared test

# Build frontend host app
pnpm --filter @atlas/frontend build

# Playwright E2E test suite
npx playwright test
```

## High-Level Architecture

- **Host App (`packages/frontend`)**: The primary Vite PWA application composed of modular sub-packages.
- **Sub-packages**:
  - `@atlas/dashboard`: Logistics operations dashboard.
  - `@atlas/rate-comparer`: Freight rate engine and comparer.
  - `@atlas/bpmn-modeler`: Integrated visual BPMN process modeler.
  - `@atlas/ui`: Design system, shared components, and themes.
  - `@atlas/shared`: Zod validation schemas, TypeScript interfaces, DTOs, and core helpers.
- **Backend API & Zeebe Workers (`src/`)**:
  - `src/bpm/workers/`: Camunda 8 (Zeebe) job workers organized by domain (`booking`, `customs`, `docs`, `finance`, `rates`, `tracking`, `warehouse`, `claims`).
  - `src/pubsub-workers/`: Asynchronous GCP PubSub background event handlers.
- **Camunda Config (`camunda-config/`)**:
  - Contains domain-organized `.bpmn`, `.dmn`, and `.form` resources deployed recursively via `npx tsx scripts/deploy-bpmn.ts`.

## Key Conventions

- Node.js >= 20, `pnpm` v10+, TypeScript 5.7+ bundler resolution (paths in `tsconfig` use `./src/*`).
- Always validate critical data boundaries using Zod schemas from `@atlas/shared`.
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- Follow domain-driven organization across both Camunda definitions and Zeebe workers.
