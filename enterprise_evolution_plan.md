# Enterprise Evolution Plan

This document outlines the implementation strategy for the next four major enterprise features for the Atlas Logistics ERP. We will integrate these step-by-step, ensuring high quality and cohesion with the existing glassmorphism aesthetic.

## 1. Authentication & Role-Based Access Control (RBAC) [DONE]

**Objective**: Secure the application with real logins and ensure users can only access modules relevant to their role.

- **Backend (`src/routes/auth.routes.ts`)**:
  - Create login endpoint using `fastify-jwt`.
  - Validate credentials against the existing SQLite `users` table.
- **Frontend (`packages/frontend/src/...`)**:
  - Create a beautiful glassmorphism `Login.tsx` page.
  - Implement an `AuthProvider` context to manage JWT tokens.
  - Implement a `ProtectedRoute` wrapper component.
  - Update the Sidebar to dynamically show/hide routes based on the user's role (e.g., Finance Manager sees "Agent Settlements", Warehouse Staff sees "Warehouse Ops").

## 2. Real-Time Notification Center [DONE]

**Objective**: Surface critical alerts directly to the user in real-time.

- **Backend (`src/server.ts` & Event Hooks)**:
  - Extend the existing Fastify WebSocket server to broadcast specific events (e.g., `CUSTOMS_HOLD`, `DEMURRAGE_WARNING`).
- **Frontend (`packages/frontend/src/components/layout/Header.tsx`)**:
  - Add a Notification Bell icon with a badge counter.
  - Implement an animated dropdown (using Framer Motion) that lists recent WebSocket alerts.
  - Toast notifications for high-priority alerts when they arrive.

## 3. Micro-Frontend (MFE) Extraction [DONE]

**Objective**: Demonstrate enterprise scalability by federating the Warehouse module.

- **Extraction (`packages/mfe-warehouse`)**:
  - Create a new Vite React app in the `packages` directory.
  - Move the newly created `WarehouseOpsModule.tsx` and its isometric map into this standalone package.
  - Configure `@originjs/vite-plugin-federation` to expose it as `warehouseRemote`.
- **Host Integration (`packages/frontend/vite.config.ts`)**:
  - Configure the host to consume the `warehouseRemote`.
  - Update the main router to lazily load the MFE.

## 4. End-to-End (E2E) Testing [DONE]

**Objective**: Prevent regressions by automating critical user flows.

- **Setup**:
  - Install `@playwright/test` into the workspace root.
  - Create `playwright.config.ts`.
- **Test Cases (`tests/e2e/...`)**:
  - `auth.spec.ts`: Verify successful login and RBAC role restrictions.
  - `customs.spec.ts`: Verify customs declaration filtering and AI trigger mocks.
  - `warehouse.spec.ts`: Verify the federated Warehouse module loads correctly.

---

### Execution Complete

All steps outlined above have been successfully implemented and merged into the main workspace.

Once you are satisfied with this plan, simply reply **Proceed** or click the button below!
