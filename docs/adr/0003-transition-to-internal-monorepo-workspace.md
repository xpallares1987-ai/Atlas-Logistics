# 0003 Transition to Internal Monorepo Workspace

* **Status**: Accepted
* **Deciders**: User & AI Assistant
* **Date**: 2026-06-20

## Context and Problem Statement

The `Atlas-Logistics` SCM MVP grew to include multiple distinct frontend sub-components, shared libraries, UI elements, and a Fastify backend. Managing all these components in a flat single-package layout was causing build tool conflicts (e.g., Next.js vs. Vite vs. raw TypeScript node servers) and linter resolution issues.

## Decision Drivers

* Need for clean separation of concerns between Next.js frontend, legacy frontend, UI design components, and shared logic.
* Need to share core packages (`@torre/shared` and `@torre/ui`) locally within the project without code duplication.
* Consistent and isolated build configurations for each sub-system.

## Decision Outcome

Chosen option: **pnpm-workspace Monorepo**. We refactored `Atlas-Logistics` to use a workspace layout:
- Root level contains the Fastify backend server.
- `packages/frontend` contains the Next.js client.
- `packages/frontend-legacy` contains the legacy Vite/bpmn-js application.
- `packages/shared` and `packages/ui` contain shared logic and components respectively, published internally as workspace packages.

This structure is declared in a root `pnpm-workspace.yaml` file.

### Consequences

* **Good**:
  - Independent dependency scopes and packages.
  - Resolved build and TypeScript resolution issues.
  - Modularized `@torre/shared` and `@torre/ui` can be easily imported using workspace links (`workspace:*`).
* **Bad**:
  - Slightly more complex local script orchestration (requires pnpm `--filter` flags or `turbo` configurations).
  - Climbed Vitest/Vite configs need local overrides (e.g., custom `vitest.config.ts`) to avoid inheriting root configurations.
