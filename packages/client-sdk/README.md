# @atlas/client-sdk

Isomorphic, strongly-typed TypeScript Client SDK for the **Atlas-Logistics** platform.

Provides typed access to Atlas-Logistics REST APIs across Browser, Node.js (v22+), and Edge worker runtimes.

---

## Features

- **Strict Type Safety**: Fully typed entities and query contracts (Zero `any`).
- **Isomorphic**: Runs identically in Browser (`fetch`) and Node.js runtimes.
- **Station & Tenant Scoping**: Seamless `X-Station-Context` and `X-Tenant-Id` header handling.
- **Dynamic Authentication**: Accepts static Bearer tokens or dynamic token-provider functions.
- **Automatic Resilience**: Built-in timeout controls and jittered exponential retry on retryable HTTP errors (429, 502, 503, 504).
- **Encrypted Payload Support**: Seamless integration with `@atlas/shared` AES-GCM transaction envelopes.
- **Domain Resource Partitioning**:
  - `client.shipments` — Shipment tracking, lifecycle state machine, and milestones.
  - `client.bookings` — Ocean/air bookings and container allocations.
  - `client.financial` — Invoices, job costing, and accruals reconciliation.
  - `client.customs` — EU CBAM carbon declarations and import duty estimations.
  - `client.warehouse` — CFS inventory and stock movement logging.
  - `client.telemetry` — Server health and operational queue metrics.

---

## Installation & Setup

```bash
pnpm add @atlas/client-sdk
```

---

## Quickstart

```typescript
import { createAtlasClient } from '@atlas/client-sdk';

const client = createAtlasClient({
  baseUrl: 'https://api.atlas-logistics.io/api',
  token: () => localStorage.getItem('atlas_token'),
  stationContext: 'FRA', // Scoped to Frankfurt station
  timeoutMs: 10000,
});

// 1. Check system health
const health = await client.telemetry.checkHealth();
console.log('API Status:', health.status);

// 2. Query shipments
const shipments = await client.shipments.list({
  page: 1,
  limit: 25,
  search: 'HAM-FRA',
});

// 3. Estimate import duties
const duty = await client.customs.estimateDuties({
  hsCode: '8504.40.90',
  originCountryCode: 'CN',
  destinationCountryCode: 'DE',
  customsValue: 50000,
  currency: 'EUR',
});
console.log('Estimated duty:', duty.estimatedDutyAmount);
```

---

## Error Handling

All failed API requests throw an `AtlasApiError`:

```typescript
import { AtlasApiError } from '@atlas/client-sdk';

try {
  await client.shipments.getById('non-existent-id');
} catch (error) {
  if (error instanceof AtlasApiError) {
    console.error(`Error ${error.statusCode} (${error.code}): ${error.message}`);
    if (error.isAuthError()) {
      // Redirect to login or refresh token
    }
  }
}
```
