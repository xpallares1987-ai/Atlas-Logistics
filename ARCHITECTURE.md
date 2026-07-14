# Atlas Logistics Architecture

This document details the current architectural structure and design of **Atlas Logistics**.

## 1. Overview: Frontend-First and Super-App

The project has moved away from traditional heavy backend API architectures (independent Node.js servers, Fastify, Drizzle, Zeebe backend) in favor of a unified **Frontend-First** model.
The entire application runs and renders directly in the browser as a Super-App powered by **Vite** and **React Router**.

## 2. Turborepo and Package Management

The ecosystem is built on a Monorepo managed by `Turborepo` and `pnpm` (version 10+). Dependencies are linked using local *symlinks* (`workspace:*`) ensuring maximum code reuse and parallel compilation times.

### Main Structure

- **`packages/frontend` (Host App)**: This is the heart of the application. It acts as the main orchestrator that consolidates routing (React Router) and the general layout. It is the only frontend that runs to start the entire ecosystem.
- **Integrated Modules (in `packages/`)**:
  - **`packages/bpmn-modeler`**: BPMN 2.0 modeler that runs natively in the browser.
  - **`packages/dashboard`**: Main panel for shipments, logistics telemetry, and container visibility.
  - **`packages/rate-comparer`**: Module dedicated to the ingestion (using `exceljs` safely to avoid vulnerabilities of older libraries), comparison, and analytics of freight rates.
- **`packages/shared` and `packages/ui`**: Contain shared utilities and UI components consumed by the main application.

## 3. Data Layer (Firebase Data Connect)

All persistent state and database queries for the Super-App are performed using **Firebase Data Connect**.

1. **PostgreSQL on Cloud SQL**: The single source of truth.
2. **Declarative Schema**: Defined in the `/dataconnect` directory via GraphQL.
3. **End-to-End Typed SDKs**: By running `firebase dataconnect:sdk:generate`, Firebase generates TypeScript functions that strictly type-expose Postgres *Queries* and *Mutations* directly to our React components. There is no Node.js intermediary.

## 4. CI/CD Pipeline and Continuous Integration

The repository is configured for ultra-efficient continuous integration automated with **GitHub Actions**:
- **Multi-environment Deployments**: The frontend is compiled and deployed concurrently to **Firebase Hosting** (production/preview) and **GitHub Pages**.
- **Zero-Trust Authentication (WIF)**: **Google Cloud Workload Identity Federation** (pool `github-pool`, provider `github-provider`) is used to securely authenticate workflows against Firebase without exchanging static Service Account Keys.
- **Build and Testing**: The official build command is `pnpm run build` at the root, which uses Turbo to package in parallel using remote/local caches. Additionally, an automated **End-to-End (E2E)** test suite is run with Playwright.
- **Code Scanning and Security**: Constant code analysis in CI with CodeQL and `njsscan` to prevent vulnerability regressions (e.g., timing attacks, modulo biases).

## 5. Security and Access Control (RBAC)

Primary authentication is managed with **Firebase Authentication**. Roles and hierarchies (e.g., `ADMIN`, `MANAGER`, `USER`) are handled using **Custom Claims**:
- A Cloud Function (`assignUserRole`) securely updates the user's claims in Firebase Auth.
- The frontend consumes the updated JWT token to show or hide routes and interfaces (using components like `<RoleGate>`).
- All critical database queries in **Data Connect** implement direct GraphQL directives like `@auth(level: USER)` to de facto reject unauthenticated public requests.

## 6. Asynchronous Integration with Cloud Tasks (ERP)

Heavy workflows or integrations with legacy third-party systems (like the corporate ERP) are decoupled from the frontend's main thread using **Google Cloud Tasks**:
- The client invokes `onCall` functions (e.g., `startErpSimulation`) synchronously, providing immediate validation.
- These functions enqueue asynchronous tasks with programmable delays (`scheduleDelaySeconds`).
- `onTaskDispatched` functions (e.g., `simulateErpCallback`) react to queues, ensuring retries and fault tolerance.

## 7. Artificial Intelligence (AI Layer)

Atlas Logistics is strongly powered by Foundational Models (*Gemini 2.5 and 3.1 Pro*) executed natively in Google Cloud Functions.
The AI ecosystem provides functionalities such as:
- **Data Analyst Chat (`chatWithData`)**: Text-to-SQL interface that directly queries the standardized schema (Data Connect) and returns insights based on the `Shipments` table and global catalogs (`DictionaryTerm`).
- **Logistics OCR (`documentOCR`)**: Automated JSON extraction from physical documents (Bill of Lading).
- **Predictive ETA (`predictETA`)**: Risk assessment of delays using live web searches to obtain real-world conditions.
- **Bin Packing (`optimizeLCL`)**: Use of `code_execution` to solve NP-Hard algorithms in 3D using Python on demand.