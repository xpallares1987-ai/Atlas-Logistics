# 0003 Transition to Internal Monorepo Workspace

- **Status**: Accepted
- **Deciders**: User & AI Assistant
- **Date**: 2026-06-20

## Context and Problem Statement

The `Atlas-Logistics` SCM MVP grew to include multiple distinct frontend sub-components, shared libraries, UI elements, and a Fastify backend. Managing all these components in a flat single-package layout was causing build tool conflicts (e.g., Next.js vs. Vite vs. raw TypeScript node servers) and linter resolution issues.

## Decision Drivers

- Need for clean separation of concerns between the Vite host frontend, feature packages, UI design components, and shared logic.
- Need to share core packages (`@atlas/shared` and `@atlas/ui`) locally within the project without code duplication.
- Consistent and isolated build configurations for each sub-system.

## Decision Outcome

Chosen option: **pnpm-workspace Monorepo (Internal Only)**. We refactored `Atlas-Logistics` to use a workspace layout:

- Root level contains the Fastify backend server.
- `packages/frontend` contains the Vite host shell that mounts feature modules.
- `packages/dashboard`, `packages/freight-comparer`, and `packages/bpmn-modeler` contain feature modules.
- `packages/shared` and `packages/ui` contain shared logic and components, published internally as workspace packages.

This structure is declared in a root `pnpm-workspace.yaml` file _inside_ the `Atlas-Logistics` repository.
**Clarification:** This decision applies to the full Atlas Logistics codebase and all its in-repo feature modules.

### Consequences

- **Good**:
  - Independent dependency scopes and packages.
  - Resolved build and TypeScript resolution issues.
  - Modularized `@atlas/shared` and `@atlas/ui` can be easily imported using workspace links (`workspace:*`).
- **Bad**:
  - Slightly more complex local script orchestration (requires pnpm `--filter` flags or `turbo` configurations).
  - Climbed Vitest/Vite configs need local overrides (e.g., custom `vitest.config.ts`) to avoid inheriting root configurations.
