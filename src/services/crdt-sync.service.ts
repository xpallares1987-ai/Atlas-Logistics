/**
 * @file crdt-sync.service.ts
 * @description Database Service for Distributed CRDT Synchronization, Logical Vector Clocks,
 * Multi-Station Reconciliation, and Regulatory Hold Precedence Invariant Enforcement (ADR 0039 / T-61).
 * @module @atlas/services/crdt-sync
 * @see {@link docs/adr/0039-hybrid-persistence-and-crdt-synchronization.md}
 */

import { randomUUID } from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  crdtEntityStates,
  crdtMutationAudit,
  crdtStationPeers,
} from "../db/schema/crdt_sync.js";
import {
  compareClocks,
  incrementClock,
  mergeClocks,
  resolveCrdtConflict,
  type VectorClock,
  type CrdtDelta,
  type CrdtState,
  type CrdtEntityType,
  type CrdtResolutionResult,
  type RegulatoryHold,
} from "../scm/engines/crdt-sync.engine.js";

// ============================================================================
// 1. DATA CONTRACTS & INTERFACES
// ============================================================================

export interface PullDeltasInput {
  clientNodeId: string;
  clientVectorClock: VectorClock;
  entityTypes?: CrdtEntityType[];
  tenantId?: string;
}

export interface PullDeltasResponse {
  serverNodeId: string;
  serverVectorClock: VectorClock;
  deltas: CrdtDelta[];
  pulledCount: number;
}

export interface PushDeltaInput {
  delta: CrdtDelta;
  appliedNodeId?: string;
  tenantId?: string;
}

export interface StationPeerInput {
  nodeId: string;
  stationCode: string;
  stationName: string;
  role?: "EDGE_STATION" | "REGIONAL_HUB" | "CENTRAL_CONSOLIDATOR";
  endpointUrl?: string;
  lastKnownVectorClock?: VectorClock;
  syncStatus?:
    "ONLINE_SYNCED" | "OFFLINE_DIRTY" | "SYNCING" | "CONFLICT_LOCKED";
}

// ============================================================================
// 2. CRDT SYNCHRONIZATION SERVICE CLASS
// ============================================================================

export class CrdtSyncService {
  private readonly defaultNodeId: string;

  constructor(defaultNodeId = "HUB-CENTRAL-01") {
    this.defaultNodeId = defaultNodeId;
  }

  /**
   * Pulls mutations newer than the client's vector clock.
   */
  async pullDeltas(input: PullDeltasInput): Promise<PullDeltasResponse> {
    const tenant = input.tenantId || "tenant-default";

    // Query existing states
    const states = await db
      .select()
      .from(crdtEntityStates)
      .where(eq(crdtEntityStates.tenantId, tenant));

    const serverClock: VectorClock = { [this.defaultNodeId]: 1 };
    const eligibleDeltas: CrdtDelta[] = [];

    for (const record of states) {
      const stateClock = (record.vectorClock || {}) as VectorClock;

      // Merge into aggregated server clock
      Object.assign(serverClock, mergeClocks(serverClock, stateClock));

      // Filter by entityType if requested
      if (
        input.entityTypes &&
        input.entityTypes.length > 0 &&
        !input.entityTypes.includes(record.entityType as CrdtEntityType)
      ) {
        continue;
      }

      // Check causal order against client clock
      const comparison = compareClocks(stateClock, input.clientVectorClock);

      // Return state as delta if server state is AFTER or CONCURRENT to client
      if (comparison === "AFTER" || comparison === "CONCURRENT") {
        eligibleDeltas.push({
          id: record.entityId,
          entityType: record.entityType as CrdtEntityType,
          patch: (record.statePayload || {}) as Record<string, unknown>,
          vectorClock: stateClock,
          updatedAt: record.lastHlcTimestamp,
          nodeId: record.lastModifiedNodeId,
          regulatoryHoldPatch: record.hasActiveHold
            ? ((record.holdMetadata || undefined) as RegulatoryHold | undefined)
            : undefined,
        });
      }
    }

    return {
      serverNodeId: this.defaultNodeId,
      serverVectorClock: serverClock,
      deltas: eligibleDeltas,
      pulledCount: eligibleDeltas.length,
    };
  }

  /**
   * Pushes a client delta and reconciles state with Regulatory Hold Precedence Invariant.
   */
  async pushDelta(input: PushDeltaInput): Promise<CrdtResolutionResult> {
    const tenant = input.tenantId || "tenant-default";
    const serverNode = input.appliedNodeId || this.defaultNodeId;
    const { delta } = input;

    // 1. Fetch current local state for this entity
    const existing = await db
      .select()
      .from(crdtEntityStates)
      .where(
        and(
          eq(crdtEntityStates.tenantId, tenant),
          eq(crdtEntityStates.entityType, delta.entityType),
          eq(crdtEntityStates.entityId, delta.id),
        ),
      )
      .limit(1);

    const currentState: CrdtState =
      existing.length > 0
        ? {
            id: existing[0].entityId,
            entityType: existing[0].entityType as CrdtEntityType,
            data: (existing[0].statePayload || {}) as Record<string, unknown>,
            vectorClock: (existing[0].vectorClock || {}) as VectorClock,
            updatedAt: existing[0].lastHlcTimestamp,
            nodeId: existing[0].lastModifiedNodeId,
            regulatoryHold: existing[0].hasActiveHold
              ? ((existing[0].holdMetadata || undefined) as
                  RegulatoryHold | undefined)
              : undefined,
          }
        : {
            id: delta.id,
            entityType: delta.entityType,
            data: {},
            vectorClock: {},
            updatedAt: new Date(0).toISOString(),
            nodeId: "INITIAL",
          };

    // 2. Resolve using pure CRDT Engine
    const resolution = resolveCrdtConflict(currentState, delta);

    // 3. Classify resolution outcome
    let outcome:
      | "APPLIED_CLEAN"
      | "APPLIED_WITH_CONFLICTS"
      | "REJECTED_STALE"
      | "REJECTED_REGULATORY_HOLD";

    if (resolution.applied) {
      outcome =
        resolution.conflicts.length > 0
          ? "APPLIED_WITH_CONFLICTS"
          : "APPLIED_CLEAN";
    } else {
      const holdConflict = resolution.conflicts.find(
        (c) => c.resolution === "REGULATORY_HOLD_PREVALENCE",
      );
      outcome = holdConflict ? "REJECTED_REGULATORY_HOLD" : "REJECTED_STALE";
    }

    // 4. Atomic SQLite WAL persistence
    const stateId = `${delta.entityType}_${delta.id}`;
    const nowIso = new Date().toISOString();

    if (resolution.applied) {
      await db
        .insert(crdtEntityStates)
        .values({
          id: stateId,
          tenantId: tenant,
          entityType: delta.entityType,
          entityId: delta.id,
          vectorClock: resolution.resolvedState.vectorClock,
          statePayload: resolution.resolvedState.data,
          lastModifiedNodeId: resolution.resolvedState.nodeId,
          lastHlcTimestamp: resolution.resolvedState.updatedAt,
          hasActiveHold: Boolean(
            resolution.resolvedState.regulatoryHold?.isActive,
          ),
          holdMetadata: resolution.resolvedState.regulatoryHold || null,
          updatedAt: nowIso,
        })
        .onConflictDoUpdate({
          target: crdtEntityStates.id,
          set: {
            vectorClock: resolution.resolvedState.vectorClock,
            statePayload: resolution.resolvedState.data,
            lastModifiedNodeId: resolution.resolvedState.nodeId,
            lastHlcTimestamp: resolution.resolvedState.updatedAt,
            hasActiveHold: Boolean(
              resolution.resolvedState.regulatoryHold?.isActive,
            ),
            holdMetadata: resolution.resolvedState.regulatoryHold || null,
            updatedAt: nowIso,
          },
        });
    }

    // 5. Append-only mutation audit log
    await db.insert(crdtMutationAudit).values({
      id: `audit_${randomUUID()}`,
      tenantId: tenant,
      entityType: delta.entityType,
      entityId: delta.id,
      originNodeId: delta.nodeId,
      appliedNodeId: serverNode,
      mutationVectorClock: delta.vectorClock,
      deltaPayload: delta.patch,
      resolutionOutcome: outcome,
      conflictsDetected:
        resolution.conflicts.length > 0 ? resolution.conflicts : null,
      hlcTimestamp: delta.updatedAt,
      appliedAt: nowIso,
    });

    // 6. Update station peer vector clock if known
    await db
      .insert(crdtStationPeers)
      .values({
        nodeId: delta.nodeId,
        stationCode: delta.nodeId,
        stationName: `Station ${delta.nodeId}`,
        lastSyncAt: nowIso,
        lastKnownVectorClock: delta.vectorClock,
        syncStatus: "ONLINE_SYNCED",
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: crdtStationPeers.nodeId,
        set: {
          lastSyncAt: nowIso,
          lastKnownVectorClock: delta.vectorClock,
          syncStatus: "ONLINE_SYNCED",
          updatedAt: nowIso,
        },
      });

    return resolution;
  }

  /**
   * Registers or updates a station peer.
   */
  async registerPeer(input: StationPeerInput): Promise<void> {
    const nowIso = new Date().toISOString();
    await db
      .insert(crdtStationPeers)
      .values({
        nodeId: input.nodeId,
        stationCode: input.stationCode,
        stationName: input.stationName,
        role: input.role || "EDGE_STATION",
        endpointUrl: input.endpointUrl || null,
        lastKnownVectorClock: input.lastKnownVectorClock || null,
        syncStatus: input.syncStatus || "ONLINE_SYNCED",
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: crdtStationPeers.nodeId,
        set: {
          stationCode: input.stationCode,
          stationName: input.stationName,
          role: input.role || "EDGE_STATION",
          endpointUrl: input.endpointUrl || null,
          lastKnownVectorClock: input.lastKnownVectorClock || null,
          syncStatus: input.syncStatus || "ONLINE_SYNCED",
          updatedAt: nowIso,
        },
      });
  }

  /**
   * Lists all registered station peers.
   */
  async listPeers() {
    return db.select().from(crdtStationPeers);
  }

  /**
   * Retrieves current CRDT aggregate state for an entity.
   */
  async getState(
    entityType: CrdtEntityType,
    entityId: string,
    tenantId = "tenant-default",
  ) {
    const results = await db
      .select()
      .from(crdtEntityStates)
      .where(
        and(
          eq(crdtEntityStates.tenantId, tenantId),
          eq(crdtEntityStates.entityType, entityType),
          eq(crdtEntityStates.entityId, entityId),
        ),
      )
      .limit(1);

    if (results.length === 0) return null;

    const r = results[0];
    return {
      id: r.entityId,
      entityType: r.entityType as CrdtEntityType,
      data: (r.statePayload || {}) as Record<string, unknown>,
      vectorClock: (r.vectorClock || {}) as VectorClock,
      updatedAt: r.lastHlcTimestamp,
      nodeId: r.lastModifiedNodeId,
      regulatoryHold: r.hasActiveHold
        ? (r.holdMetadata as RegulatoryHold)
        : undefined,
    };
  }
}

export const crdtSyncService = new CrdtSyncService();
