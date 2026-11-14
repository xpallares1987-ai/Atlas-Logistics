# Station Context & Multi-Station Cockpit Guide

This How-To guide explains how operating freight forwarding station context is selected in the UI cockpit, propagated across API requests, and governed by role-based access control (RBAC) in Atlas-Logistics.

---

## 1. Architectural Overview

Atlas-Logistics operates as an enterprise freight forwarding platform with multi-station operational segregation. Each station represents an operating branch office, ocean gateway, air cargo hub, or intermodal rail terminal.

```
+-------------------------------------------------------------------------+
| TopNavbar                                                               |
|   [ ⚓ BCN-OCEAN (ESBCN) ▾ ]  [ 🛡️ Station ]  [ 🔔 ]  [ 👤 Admin ]      |
+-------------------------------------------------------------------------+
                                    |
                  Zustand Store (useOrganizationStore)
                  - activeStationId: "stn_esbcn_01"
                  - activeStationCode: "BCN-OCEAN"
                  - localStorage: "atlas_station_context"
                                    |
                             authFetch()
                  Header: "X-Station-Context: BCN-OCEAN"
                                    |
                           Fastify Backend
                  - verifyStationAuthorization Hook
                  - Validates user_station_assignments
```

---

## 2. Context Propagation & API Headers

### Client-Side Header Injection

Whenever an authenticated API request is dispatched via `authFetch()` (`packages/frontend/src/lib/api.ts`), the active station code stored in `localStorage` (`atlas_station_context`) is automatically attached:

```http
GET /api/shipments HTTP/1.1
Authorization: Bearer <jwt-token>
X-Station-Context: BCN-OCEAN
```

If the active context is set to `"ALL"` (available only to administrative roles), the header is omitted, allowing global query aggregation.

---

## 3. Role-Based Access Control (RBAC) in the UI

The station selector pill (`StationSelectorPill.tsx`) enforces strict visual and functional boundaries:

### Operational Roles (`FORWARDER`, `OPERATOR`, `DISPATCHER`)
- **Restricted Selection**: Only branch stations assigned to the user (`user_station_assignments`) appear in the selector dropdown.
- **No Global Bypass**: The "Global Network View" option is hidden.
- **Badge Indicator**: Displays a `[ 🛡️ Station ]` pill badge in the top bar to remind operators of active branch isolation.

### Administrative Roles (`COMPANY_ADMIN`, `SYSTEM_ADMIN`)
- **Tenant Scope**: Can switch between all operating stations belonging to their enterprise tenant.
- **Global Network View**: Can select `Global Network` (`ALL`) for consolidated oversight.

---

## 4. Automatic Fallback on `403 Forbidden`

If a user's context becomes invalid, or if an unauthorized station header is transmitted, the backend responds with `403 Forbidden` (`FORBIDDEN_STATION_ACCESS` or `CROSS_COMPANY_ACCESS_DENIED`).

### Client-Side Defense Routine
1. `authFetch()` detects `403 Forbidden` on an API request containing `X-Station-Context`.
2. A custom browser event `atlas-station-forbidden` is broadcast.
3. `StationSelectorPill` listens to the event and triggers `fallbackToPrimaryStation()`:
   - Resets active station to the user's primary assigned station.
   - Updates `localStorage`.
   - Displays a non-intrusive warning notification:
     ```
     Station Authorization Enforced: Access to station 'XXX' is restricted. Switched automatically to your authorized station.
     ```
   - Automatically dismisses after 6 seconds.

---

## 5. Verification & Testing

### Unit Tests
Unit tests verify the Zustand store, local storage persistence, RBAC filtering, and fallback mechanisms:

```bash
pnpm vitest run packages/frontend/src/store/__tests__/useOrganizationStore.test.ts
```

### E2E Tests (Playwright)
End-to-end tests verify DOM rendering, dropdown interactions, and header propagation:

```bash
pnpm playwright test tests/e2e/station-context.spec.ts
```
