# 0004. Zero-Cost Local Architecture (SQLite/libSQL + Drizzle)

- **Status**: Accepted
- **Deciders**: Tech Lead, Core Team
- **Date**: 2026-08-03

## Context and Problem Statement

The previous local development setup relied on expensive or complex cloud-based databases that incurred costs even during development and testing phases. Additionally, setting up a local database required complex Docker configurations and native C++ compilation (node-gyp) when using `better-sqlite3`, leading to friction on Windows environments. We need a zero-cost local architecture that is easy to set up across all OS environments and provides strong type safety.

## Decision Drivers

- Zero operational cost for local development and testing.
- Cross-platform compatibility (especially Windows and Node 24) without native build tools (node-gyp).
- Strict type safety and edge compatibility for the ORM.

## Considered Options

1. **better-sqlite3 + Prisma**: Powerful, but `better-sqlite3` requires native C++ compilation which often fails on Windows, and Prisma can be heavy and lacks some edge-native features.
2. **PostgreSQL via Docker + Drizzle**: Standard approach, but requires developers to run Docker locally, increasing the barrier to entry and resource consumption.
3. **libSQL + Drizzle ORM**: Uses `@libsql/client` (WASM/JS) which works flawlessly on Windows/Node 24 without compilation. Drizzle provides excellent strict TypeScript schemas and edge compatibility.

## Decision Outcome

Chosen option: **libSQL + Drizzle ORM**, because it fulfills all decision drivers. It provides a true Zero-Cost Architecture ($0) for local development, eliminates node-gyp issues on Windows, and Drizzle offers top-tier type safety.

### Consequences

- **Good**: Instant local environment setup without Docker. No cloud costs during development. Excellent developer experience with TypeScript.
- **Bad**: SQLite/libSQL lacks some advanced PostgreSQL features (e.g., certain JSONB indexing or advanced concurrency controls), which means production deployments might need careful migration strategies if we switch to Postgres later.
