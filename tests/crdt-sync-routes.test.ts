/**
 * @file crdt-sync-routes.test.ts
 * @description Integration tests for Fastify REST routes for Distributed CRDT Replication,
 * Peer Reconciliation, and Regulatory Hold Precedence Invariant Enforcement (ADR 0039 / T-61).
 * @module @atlas/tests/crdt-sync-routes
 * @see {@link docs/adr/0039-hybrid-persistence-and-crdt-synchronization.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { crdtSyncRoutes } from "../src/routes/crdt-sync.routes.js";
import { db } from "../src/db/index.js";
import {
  crdtEntityStates,
  crdtMutationAudit,
  crdtStationPeers,
} from "../src/db/schema/crdt_sync.js";
import { eq, inArray } from "drizzle-orm";

describe("CRDT Multi-Station Synchronization REST Routes (ADR 0039 / T-61)", () => {
  let app: FastifyInstance;
  const testTenantId = "tenant-crdt-test-01";
  const testEntityId = "sh_crdt_test_sync_01";
  const testNodeA = "STATION-BCN-01";
  const testNodeB = "STATION-RTM-02";

  beforeAll(async () => {
    // 1. Clean previous test records
    await db
      .delete(crdtEntityStates)
      .where(eq(crdtEntityStates.tenantId, testTenantId));
    await db
      .delete(crdtMutationAudit)
      .where(eq(crdtMutationAudit.tenantId, testTenantId));
    await db
      .delete(crdtStationPeers)
      .where(inArray(crdtStationPeers.nodeId, [testNodeA, testNodeB]));

    // 2. Initialize Fastify test app
    app = Fastify({ logger: false });
    await app.register(crdtSyncRoutes, { prefix: "/api/sync" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await db
      .delete(crdtEntityStates)
      .where(eq(crdtEntityStates.tenantId, testTenantId));
    await db
      .delete(crdtMutationAudit)
      .where(eq(crdtMutationAudit.tenantId, testTenantId));
    await db
      .delete(crdtStationPeers)
      .where(inArray(crdtStationPeers.nodeId, [testNodeA, testNodeB]));
  });

  it("registers a distributed station peer via POST /api/sync/peers", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/sync/peers",
      payload: {
        nodeId: testNodeA,
        stationCode: "BCN-EDGE-01",
        stationName: "Barcelona Port Forwarding Edge Desk",
        role: "EDGE_STATION",
        endpointUrl: "https://bcn-edge.internal.atlas/api/sync",
        syncStatus: "ONLINE_SYNCED",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });

  it("lists registered station peers via GET /api/sync/peers", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/sync/peers",
    });

    expect(res.statusCode).toBe(200);
    const peers = JSON.parse(res.payload);
    const found = peers.find((p: any) => p.nodeId === testNodeA);
    expect(found).toBeDefined();
    expect(found.stationCode).toBe("BCN-EDGE-01");
  });

  it("pushes a clean initial CRDT delta via POST /api/sync/push", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/sync/push",
      payload: {
        tenantId: testTenantId,
        delta: {
          id: testEntityId,
          entityType: "SHIPMENT",
          patch: {
            status: "IN_TRANSIT",
            containerNumber: "MSKU1234567",
            sealNumber: "SL-998811",
          },
          vectorClock: { [testNodeA]: 1 },
          updatedAt: "2026-11-23T20:00:00.000Z",
          nodeId: testNodeA,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.applied).toBe(true);
    expect(body.resolvedState.data.status).toBe("IN_TRANSIT");
    expect(body.resolvedState.data.sealNumber).toBe("SL-998811");
    expect(body.resolvedState.vectorClock[testNodeA]).toBe(1);
  });

  it("retrieves the active CRDT aggregate state via GET /api/sync/states/:entityType/:id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/sync/states/SHIPMENT/${testEntityId}?tenantId=${testTenantId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(testEntityId);
    expect(body.data.containerNumber).toBe("MSKU1234567");
    expect(body.vectorClock[testNodeA]).toBe(1);
  });

  it("pulls deltas newer than client vector clock via POST /api/sync/pull", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/sync/pull",
      payload: {
        tenantId: testTenantId,
        clientNodeId: testNodeB,
        clientVectorClock: { [testNodeA]: 0 },
        entityTypes: ["SHIPMENT"],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pulledCount).toBeGreaterThanOrEqual(1);
    const delta = body.deltas.find((d: any) => d.id === testEntityId);
    expect(delta).toBeDefined();
    expect(delta.patch.sealNumber).toBe("SL-998811");
  });

  it("enforces Regulatory Hold Precedence Invariant when concurrent commercial delta attempts overwrite", async () => {
    // 1. Central customs authority imposes a regulatory hold
    const holdRes = await app.inject({
      method: "POST",
      url: "/api/sync/push",
      payload: {
        tenantId: testTenantId,
        delta: {
          id: testEntityId,
          entityType: "SHIPMENT",
          patch: {
            status: "CUSTOMS_HOLD",
          },
          vectorClock: { [testNodeA]: 1, HUB_CUSTOMS: 1 },
          updatedAt: "2026-11-23T20:10:00.000Z",
          nodeId: "HUB_CUSTOMS",
          regulatoryHoldPatch: {
            status: "CUSTOMS_HOLD",
            isActive: true,
            imposedBy: "Agencia Tributaria (AEAT)",
            imposedAt: "2026-11-23T20:10:00.000Z",
            reference: "EXP-AEAT-2026-RED-CHANNEL-881",
          },
        },
      },
    });
    expect(holdRes.statusCode).toBe(200);
    const holdBody = JSON.parse(holdRes.payload);
    expect(holdBody.applied).toBe(true);
    expect(holdBody.resolvedState.regulatoryHold.isActive).toBe(true);

    // 2. Disconnected edge station attempts optimistic commercial movement update without clearance certificate
    const conflictRes = await app.inject({
      method: "POST",
      url: "/api/sync/push",
      payload: {
        tenantId: testTenantId,
        delta: {
          id: testEntityId,
          entityType: "SHIPMENT",
          patch: {
            status: "DELIVERED_TO_CONSIGNEE",
            deliveredAt: "2026-11-23T20:15:00.000Z",
          },
          vectorClock: { [testNodeA]: 2 }, // Concurrent clock branch without customs knowledge
          updatedAt: "2026-11-23T20:15:00.000Z",
          nodeId: testNodeA,
        },
      },
    });

    expect(conflictRes.statusCode).toBe(200);
    const conflictBody = JSON.parse(conflictRes.payload);
    expect(conflictBody.applied).toBe(false); // Rejected!
    expect(conflictBody.resolvedState.data.status).toBe("CUSTOMS_HOLD"); // Hold preserved!
    expect(
      conflictBody.conflicts.some(
        (c: any) => c.resolution === "REGULATORY_HOLD_PREVALENCE",
      ),
    ).toBe(true);
  });

  it("successfully releases regulatory hold when authorized clearance event is provided", async () => {
    const releaseRes = await app.inject({
      method: "POST",
      url: "/api/sync/push",
      payload: {
        tenantId: testTenantId,
        delta: {
          id: testEntityId,
          entityType: "SHIPMENT",
          patch: {
            status: "CUSTOMS_RELEASED",
          },
          vectorClock: { [testNodeA]: 1, HUB_CUSTOMS: 2 },
          updatedAt: "2026-11-23T20:20:00.000Z",
          nodeId: "HUB_CUSTOMS",
          regulatoryHoldPatch: {
            status: "CUSTOMS_RELEASED",
            isActive: false,
            imposedBy: "Agencia Tributaria (AEAT)",
            imposedAt: "2026-11-23T20:10:00.000Z",
            reference: "EXP-AEAT-2026-RED-CHANNEL-881",
            authorizedClearanceEventId: "LEV-2026-991823-AEAT-RELEASE",
          },
        },
      },
    });

    expect(releaseRes.statusCode).toBe(200);
    const releaseBody = JSON.parse(releaseRes.payload);
    expect(releaseBody.applied).toBe(true);
    expect(releaseBody.resolvedState.data.status).toBe("CUSTOMS_RELEASED");
    expect(releaseBody.resolvedState.regulatoryHold.isActive).toBe(false);
  });
});
