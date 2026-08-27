# 0007. Adopting Micro-Frontends (MFE) and E2E Testing

Date: 2026-08-08

## Status

Accepted

## Context

As the Super-App scales to support extensive supply chain and ERP features, the monolithic frontend host (`packages/frontend`) is growing too large, creating potential bottlenecks for independent team scaling and deployment. Additionally, ensuring system stability across hundreds of complex glassmorphism UI components and asynchronous data flows requires robust, automated browser validation.

## Decision

1. **Module Federation**: We have adopted `@originjs/vite-plugin-federation` to decouple large, domain-specific features (such as Warehouse Operations) into independent federated Micro-Frontends (`packages/mfe-warehouse`). These federated remote applications are lazily loaded by the host application at runtime.
2. **Playwright E2E**: We have implemented Playwright in the root of the workspace to simulate complex User journeys (e.g. JWT Auth flow, Customs AI validations, and remote MFE rendering) against the local Vite dev server before PRs are merged.

## Consequences

**Positive:**

- Individual modules can be built, served, and deployed completely independently of the host app.
- Faster cold start and HMR compilation times for developers working on specific domains.
- Total confidence in UI integrations thanks to fully automated Playwright checks.

**Negative:**

- Increased tooling complexity: Devs must ensure the remote MFE development servers are running (or built) for the host to consume them locally.
- Shared state management and contexts (like `AuthContext` or `QueryClient`) require careful architecture to ensure they are inherited properly across the federated boundary.
