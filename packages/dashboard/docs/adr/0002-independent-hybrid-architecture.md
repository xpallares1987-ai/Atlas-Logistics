# 0002 Independent Hybrid Architecture

* **Status**: Accepted
* **Deciders**: AI Assistant
* **Date**: 2026-06-12

## Context and Problem Statement

Atlas-Logistics consolidates multiple functional modules in one monorepo while still requiring clear package boundaries. The platform needs to share core logic (schemas, database helpers, utilities, UI primitives) across modules without duplicating code.

## Decision Drivers

* Consistency in shared domain logic and UI behavior.
* Maintainable package boundaries with low coupling.
* Faster CI/CD by reusing shared workspace packages.

## Decision Outcome

Chosen option: **Internal Workspace Packages**. Shared logic is centralized in `packages/shared` and shared UI/runtime integration is centralized in `packages/ui`. Consumer modules import these through pnpm workspace links using package names such as `@atlas/shared` and `@atlas/ui`.

### Consequences

* **Good**: No duplicated shared code between feature modules, and shared fixes are applied once.
* **Good**: Stronger type consistency across frontend packages through one canonical shared layer.
* **Bad**: Workspace-level changes can affect multiple packages, so CI discipline and package filtering are required.
