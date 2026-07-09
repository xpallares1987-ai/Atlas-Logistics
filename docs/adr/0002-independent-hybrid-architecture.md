# 0002 Independent Hybrid Architecture

* **Status**: Superseded by [0003 Transition to Internal Monorepo Workspace](./0003-transition-to-internal-monorepo-workspace.md)
* **Deciders**: AI Assistant
* **Date**: 2026-06-12

## Context and Problem Statement

The project mandate at the time required active repositories to remain independent to avoid deployment coupling and complex dependency graphs. At the same time, there was a need to share core logic (schemas, database definitions, utilities) across projects.

## Decision Drivers

* Strict independence mandate.
* Need for shared domain logic consistency.
* Deployment speed and reliability.

## Decision Outcome

Chosen option at the time: **Local Shared Copies**. Each repository maintained its own local copy of shared logic in `src/shared` and `src/ui-shared` folders, aliased through build tools (Vite aliases or TypeScript paths).

### Consequences

* **Good**: Repositories could be built and deployed in complete isolation.
* **Bad**: Code redundancy and manual synchronization across repositories.
