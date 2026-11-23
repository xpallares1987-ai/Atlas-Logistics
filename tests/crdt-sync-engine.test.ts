/**
 * @file crdt-sync-engine.test.ts
 * @description Unit and invariant verification tests for Pure CRDT Sync Engine (T-60 / ADR 0039).
 */

import { describe, it, expect } from "vitest";
import {
  createVectorClock,
  incrementClock,
  compareClocks,
  mergeClocks,
  evaluateRegulatoryPrecedence,
  resolveCrdtConflict,
  generateCrdtDelta,
  applyCrdtDeltas,
  type CrdtState,
  type CrdtDelta,
} from "../src/scm/engines/crdt-sync.engine.js";

describe("CRDT Sync Engine (T-60 / ADR 0039)", () => {
  describe("Logical Vector Clocks", () => {
    it("should initialize and increment node vector clocks correctly", () => {
      const clockA = createVectorClock("station-bcn", 1);
      expect(clockA).toEqual({ "station-bcn": 1 });

      const incremented = incrementClock(clockA, "station-bcn");
      expect(incremented["station-bcn"]).toBe(2);

      const addedNode = incrementClock(incremented, "station-rot");
      expect(addedNode).toEqual({ "station-bcn": 2, "station-rot": 1 });
    });

    it("should compare clock causal relationships accurately", () => {
      const clock1 = { "station-a": 1, "station-b": 1 };
      const clock2 = { "station-a": 1, "station-b": 2 };
      const clock3 = { "station-a": 2, "station-b": 1 };

      expect(compareClocks(clock1, clock2)).toBe("BEFORE");
      expect(compareClocks(clock2, clock1)).toBe("AFTER");
      expect(compareClocks(clock1, { ...clock1 })).toBe("IDENTICAL");
      expect(compareClocks(clock2, clock3)).toBe("CONCURRENT");
    });

    it("should merge clocks taking maximum counter for each node", () => {
      const clockA = { "station-a": 3, "station-b": 1, "station-c": 4 };
      const clockB = { "station-a": 1, "station-b": 5, "station-d": 2 };

      const merged = mergeClocks(clockA, clockB);
      expect(merged).toEqual({
        "station-a": 3,
        "station-b": 5,
        "station-c": 4,
        "station-d": 2,
      });
    });
  });

  describe("Regulatory Hold Precedence Invariant", () => {
    it("should reject optimistic clearing of an active customs hold", () => {
      const currentHold = {
        status: "CUSTOMS_HOLD",
        isActive: true,
        imposedBy: "ES-AEAT-VALENCIA",
        imposedAt: "2026-11-23T10:00:00Z",
        reference: "SANCTION-INSPECTION-001",
      };

      // Edge station attempts to clear hold without clearance event
      const incomingHold = {
        status: "CLEARED",
        isActive: false,
        imposedBy: "STATION_DISPATCHER",
        imposedAt: "2026-11-23T11:00:00Z",
        reference: "MANUAL_OVERRIDE",
      };

      const evalResult = evaluateRegulatoryPrecedence(
        currentHold,
        incomingHold,
      );
      expect(evalResult.allowed).toBe(false);
      expect(evalResult.reason).toContain("REGULATORY_HOLD_PREVALENCE");
    });

    it("should permit clearing of regulatory hold when authorized clearance event is provided", () => {
      const currentHold = {
        status: "CUSTOMS_HOLD",
        isActive: true,
        imposedBy: "ES-AEAT-VALENCIA",
        imposedAt: "2026-11-23T10:00:00Z",
        reference: "SANCTION-INSPECTION-001",
      };

      const incomingAuthorizedClearance = {
        status: "RELEASED",
        isActive: false,
        imposedBy: "ES-AEAT-GATEWAY",
        imposedAt: "2026-11-23T12:00:00Z",
        reference: "SANCTION-INSPECTION-001",
        authorizedClearanceEventId: "CUSRES-MSG-2026-99882",
      };

      const evalResult = evaluateRegulatoryPrecedence(
        currentHold,
        incomingAuthorizedClearance,
      );
      expect(evalResult.allowed).toBe(true);
      expect(evalResult.reason).toContain("REGULATORY_RELEASE_AUTHORIZED");
    });
  });

  describe("CRDT Delta Resolution & LWW Reconciliation", () => {
    const baseState: CrdtState<{
      status: string;
      destination: string;
      eta: string;
    }> = {
      id: "SHP-2026-001",
      entityType: "SHIPMENT",
      data: {
        status: "BOOKED",
        destination: "ESVLC",
        eta: "2026-12-01T08:00:00Z",
      },
      vectorClock: { "station-a": 1 },
      updatedAt: "2026-11-23T08:00:00Z",
      nodeId: "station-a",
    };

    it("should accept causal successor delta (AFTER relationship)", () => {
      const incomingDelta: CrdtDelta<{
        status: string;
        destination: string;
        eta: string;
      }> = {
        id: "SHP-2026-001",
        entityType: "SHIPMENT",
        patch: { status: "IN_TRANSIT" },
        vectorClock: { "station-a": 2 },
        updatedAt: "2026-11-23T09:00:00Z",
        nodeId: "station-a",
      };

      const res = resolveCrdtConflict(baseState, incomingDelta);
      expect(res.applied).toBe(true);
      expect(res.resolvedState.data.status).toBe("IN_TRANSIT");
      expect(res.resolvedState.data.destination).toBe("ESVLC");
      expect(res.resolvedState.vectorClock).toEqual({ "station-a": 2 });
    });

    it("should ignore obsolete delta (BEFORE relationship)", () => {
      const stateAdvanced = {
        ...baseState,
        vectorClock: { "station-a": 3 },
      };

      const obsoleteDelta: CrdtDelta<{
        status: string;
        destination: string;
        eta: string;
      }> = {
        id: "SHP-2026-001",
        entityType: "SHIPMENT",
        patch: { destination: "ESBCN" },
        vectorClock: { "station-a": 1 },
        updatedAt: "2026-11-23T07:00:00Z",
        nodeId: "station-a",
      };

      const res = resolveCrdtConflict(stateAdvanced, obsoleteDelta);
      expect(res.applied).toBe(false);
      expect(res.resolvedState.data.destination).toBe("ESVLC");
      expect(res.conflicts[0]?.reason).toBe("OBSOLETE_OR_DUPLICATE_DELTA");
    });

    it("should resolve concurrent updates via deterministic LWW and tie-breaking", () => {
      const stateNodeA: CrdtState<{
        status: string;
        destination: string;
        eta: string;
      }> = {
        ...baseState,
        vectorClock: { "station-a": 2 },
        updatedAt: "2026-11-23T10:00:00Z",
        nodeId: "station-a",
      };

      const deltaNodeB: CrdtDelta<{
        status: string;
        destination: string;
        eta: string;
      }> = {
        id: "SHP-2026-001",
        entityType: "SHIPMENT",
        patch: { destination: "NLRTM" },
        vectorClock: { "station-b": 1 },
        updatedAt: "2026-11-23T10:05:00Z", // Later timestamp -> should win
        nodeId: "station-b",
      };

      const res = resolveCrdtConflict(stateNodeA, deltaNodeB);
      expect(res.applied).toBe(true);
      expect(res.resolvedState.data.destination).toBe("NLRTM");
      expect(res.resolvedState.vectorClock).toEqual({
        "station-a": 2,
        "station-b": 1,
      });
    });

    it("should enforce Regulatory Hold Precedence over concurrent optimistic deltas", () => {
      const stateWithCustomsHold: CrdtState<{
        status: string;
        destination: string;
        eta: string;
      }> = {
        ...baseState,
        regulatoryHold: {
          status: "CUSTOMS_HOLD",
          isActive: true,
          imposedBy: "ES-AEAT",
          imposedAt: "2026-11-23T10:00:00Z",
          reference: "DOC-INSP-44",
        },
      };

      const optimisticClearDelta: CrdtDelta<{
        status: string;
        destination: string;
        eta: string;
      }> = {
        id: "SHP-2026-001",
        entityType: "SHIPMENT",
        patch: { status: "DISPATCHED" },
        vectorClock: { "station-b": 2 },
        updatedAt: "2026-11-23T10:30:00Z",
        nodeId: "station-b",
        regulatoryHoldPatch: undefined, // no authorized clearance
      };

      const res = resolveCrdtConflict(
        stateWithCustomsHold,
        optimisticClearDelta,
      );
      expect(res.applied).toBe(false);
      expect(res.resolvedState.regulatoryHold?.isActive).toBe(true);
      expect(res.conflicts[0]?.resolution).toBe("REGULATORY_HOLD_PREVALENCE");
    });
  });

  describe("Batch Delta Application & Reconciliation", () => {
    it("should process a series of mixed deltas and compute reconciliation metrics", () => {
      const initial: CrdtState<{ count: number }> = {
        id: "CTR-100",
        entityType: "CONTAINER",
        data: { count: 0 },
        vectorClock: { "node-1": 1 },
        updatedAt: "2026-11-23T10:00:00Z",
        nodeId: "node-1",
      };

      const deltas: CrdtDelta<{ count: number }>[] = [
        // Valid forward delta
        {
          id: "CTR-100",
          entityType: "CONTAINER",
          patch: { count: 10 },
          vectorClock: { "node-1": 2 },
          updatedAt: "2026-11-23T10:01:00Z",
          nodeId: "node-1",
        },
        // Duplicate/obsolete delta
        {
          id: "CTR-100",
          entityType: "CONTAINER",
          patch: { count: 5 },
          vectorClock: { "node-1": 1 },
          updatedAt: "2026-11-23T09:59:00Z",
          nodeId: "node-1",
        },
        // Further valid delta
        {
          id: "CTR-100",
          entityType: "CONTAINER",
          patch: { count: 25 },
          vectorClock: { "node-1": 3 },
          updatedAt: "2026-11-23T10:02:00Z",
          nodeId: "node-1",
        },
      ];

      const batchRes = applyCrdtDeltas(initial, deltas);
      expect(batchRes.appliedCount).toBe(2);
      expect(batchRes.rejectedCount).toBe(1);
      expect(batchRes.resolvedState.data.count).toBe(25);
    });
  });
});
