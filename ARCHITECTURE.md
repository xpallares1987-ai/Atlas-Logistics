# Atlas Logistics Architecture

This document details the current architectural structure and design of **Atlas Logistics**.

## 1. Overview: Frontend-First and Super-App

The project has moved away from traditional heavy backend API architectures (independent Node.js servers, Fastify, Motores de workflow externos) in favor of a unified **Frontend-First** model.
The entire application runs and renders directly in the browser as a Super-App powered by **Vite** and **React Router**.

## 2. Turborepo and Package Management

The ecosystem is built on a Monorepo managed by `Turborepo` and `pnpm` (version 10+). Dependencies are linked using local *symlinks* (`workspace:*`) ensuring maximum code reuse and parallel compilation times.

### Main Structure

- **`packages/frontend` (Host App)**: This is the heart of the application. It acts as the main orchestrator that consolidates routing (React Router) and the general layout. It is the only frontend that runs to start the entire ecosystem.
- **Integrated Modules (in `packages/`)**:
  - **`packages/dashboard`**: Main panel for shipments, logistics telemetry, and container visibility.
  - **`packages/rate-comparer`**: Module dedicated to the ingestion, comparison, and analytics of freight rates.
  - **`packages/bpmn-modeler`**: Module dedicated to BPMN workflow orchestration.
- **`packages/shared` and `packages/ui`**: Contain shared utilities and UI components consumed by the main application.

*(Note: Legacy external `apps`, `functions`, and `data` directories have been removed in favor of strict Monorepo packing.)*

## 3. Data Layer (SQLite & Drizzle)

All persistent state and database queries for the Super-App are performed using **Local SQLite** and **Drizzle ORM**.

1. **Local SQLite (`atlas.db`)**: The single source of truth for the local environment, achieving $0 operational costs.
2. **libSQL Driver**: We use `@libsql/client` (WASM/JS) rather than `better-sqlite3` to ensure the project runs seamlessly on Windows and Node 24 without native C++ compilation (node-gyp) errors.
3. **Drizzle ORM**: Used for strict TypeScript schemas and migrations, executed locally via `pnpm run db:push`.

## 4. CI/CD Pipeline and Continuous Integration

The repository is configured for ultra-efficient continuous integration automated with **GitHub Actions**:
- **Build and Testing**: The official build command is `pnpm run build` at the root, which uses Turbo to package in parallel using remote/local caches.
- **Code Scanning and Security**: Constant code analysis in CI with CodeQL and `njsscan` to prevent vulnerability regressions.

## 5. Security and Access Control (RBAC)

Authentication and multi-tenant authorization have been simplified for the local environment to support local testing without incurring cloud authentication costs. A mock AuthProvider ensures the application can be explored fully offline.

## 6. Asynchronous Tasks (BullMQ)

Heavy workflows or background processing are decoupled from the main thread using **BullMQ** with Redis (AtlasEngine Workers) rather than relying on external Cloud Tasks, keeping the stack fully self-hosted.