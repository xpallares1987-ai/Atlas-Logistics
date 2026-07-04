# 0002 Independent Hybrid Architecture

* **Status**: Accepted
* **Deciders**: AI Assistant
* **Date**: 2026-06-12

## Context and Problem Statement

The project mandate requires active repositories to be 100% independent to avoid deployment coupling and complex dependency graphs. However, there is a need to share core logic (schemas, database definitions, utilities) across projects.

## Decision Drivers

* Strict independence mandate.
* Need for shared domain logic consistency.
* Deployment speed and reliability.

## Decision Outcome

Chosen option: **Local Shared Copies**. Each repository maintains its own local copy of shared logic in `src/shared` and `src/ui-shared` folders. These are aliased via build tools (Vite aliases or TypeScript paths) to allow standard imports like `@torre/shared`.

### Consequences

* **Good**: Repositories can be built and deployed in complete isolation. No versioning overhead between internal packages.
* **Bad**: Code redundancy. Changes to shared logic must be manually synchronized across repositories.
