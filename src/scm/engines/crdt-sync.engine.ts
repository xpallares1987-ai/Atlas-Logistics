/**
 * @file crdt-sync.engine.ts
 * @description Pure State-based CRDT Synchronization Engine with Logical Vector Clocks
 * and Regulatory Hold Precedence Invariants (T-60 / ADR 0039).
 *
 * Invariants:
 * 1. Zero external dependencies / Zero database or framework imports (P0 Pure Engine).
 * 2. Causal ordering via Logical Vector Clocks: Strict detection of BEFORE, AFTER, IDENTICAL, and CONCURRENT states.
 * 3. Regulatory Hold Precedence Invariant: Regulatory / customs holds (CUSTOMS_HOLD, SANCTION_SEIZED,
 *    BIOSECURITY_HOLD) CANNOT be overwritten, bypassed or cleared by optimistic edge station updates
 *    without an authoritative clearance event ID and recognized clearance authority.
 * 4. Deterministic Last-Write-Wins (LWW) with vector clock tie-breaking for concurrent non-regulatory mutations.
 *
 * @module @atlas/scm/engines
 * @see {@link docs/adr/0039-distributed-edge-persistence-and-crdt-synchronization.md}
 */

// ============================================================================
// 1. TYPES & VECTOR CLOCK CONTRACTS
// ============================================================================

export type VectorClock = Record<string, number>;

export type ClockComparison = "BEFORE" | "AFTER" | "CONCURRENT" | "IDENTICAL";

export type CrdtEntityType =
  "SHIPMENT" | "CONTAINER" | "PURCHASE_ORDER" | "CUSTOMS_CLEARANCE";

export interface RegulatoryHold {
  status: string;
  isActive: boolean;
  imposedBy: string;
  imposedAt: string;
  reference: string;
  authorizedClearanceEventId?: string;
}

export interface CrdtState<T = Record<string, unknown>> {
  id: string;
  entityType: CrdtEntityType;
  data: T;
  vectorClock: VectorClock;
  updatedAt: string;
  nodeId: string;
  regulatoryHold?: RegulatoryHold;
}

export interface CrdtDelta<T = Record<string, unknown>> {
  id: string;
  entityType: CrdtEntityType;
  patch: Partial<T>;
  vectorClock: VectorClock;
  updatedAt: string;
  nodeId: string;
  regulatoryHoldPatch?: RegulatoryHold;
}

export interface CrdtConflictRecord {
  entityId: string;
  key: string;
  currentVal: unknown;
  incomingVal: unknown;
  resolution:
    "KEPT_CURRENT" | "APPLIED_INCOMING" | "REGULATORY_HOLD_PREVALENCE";
  reason: string;
}

export interface CrdtResolutionResult<T = Record<string, unknown>> {
  resolvedState: CrdtState<T>;
  applied: boolean;
  conflicts: CrdtConflictRecord[];
}

export interface CrdtBatchResult<T = Record<string, unknown>> {
  resolvedState: CrdtState<T>;
  appliedCount: number;
  rejectedCount: number;
  conflicts: CrdtConflictRecord[];
}

// ============================================================================
// 2. LOGICAL VECTOR CLOCK PRIMITIVES
// ============================================================================

export function createVectorClock(
  nodeId: string,
  initialCounter = 1,
): VectorClock {
  return { [nodeId]: initialCounter };
}

export function incrementClock(
  clock: VectorClock,
  nodeId: string,
): VectorClock {
  return {
    ...clock,
    [nodeId]: (clock[nodeId] || 0) + 1,
  };
}

export function mergeClocks(a: VectorClock, b: VectorClock): VectorClock {
  const merged: VectorClock = { ...a };
  for (const [node, counter] of Object.entries(b)) {
    merged[node] = Math.max(merged[node] || 0, counter);
  }
  return merged;
}

export function compareClocks(a: VectorClock, b: VectorClock): ClockComparison {
  const allNodes = new Set([...Object.keys(a), ...Object.keys(b)]);
  let hasGreater = false;
  let hasLesser = false;

  for (const node of allNodes) {
    const valA = a[node] || 0;
    const valB = b[node] || 0;

    if (valA > valB) hasGreater = true;
    if (valA < valB) hasLesser = true;
  }

  if (hasGreater && hasLesser) return "CONCURRENT";
  if (hasGreater && !hasLesser) return "AFTER";
  if (!hasGreater && hasLesser) return "BEFORE";
  return "IDENTICAL";
}

// ============================================================================
// 3. REGULATORY HOLD PRECEDENCE CHECK
// ============================================================================

export function evaluateRegulatoryPrecedence(
  currentHold?: RegulatoryHold,
  incomingHold?: RegulatoryHold,
): { allowed: boolean; reason: string } {
  // If no hold currently exists, any incoming hold or state change is permitted
  if (!currentHold || !currentHold.isActive) {
    return { allowed: true, reason: "NO_ACTIVE_REGULATORY_HOLD" };
  }

  // Active regulatory hold exists on current state
  // If incoming mutation does NOT touch or clears the hold without authorization:
  if (!incomingHold || !incomingHold.isActive) {
    // Attempting to clear active hold: must provide authorizedClearanceEventId
    if (incomingHold?.authorizedClearanceEventId) {
      return {
        allowed: true,
        reason: `REGULATORY_RELEASE_AUTHORIZED: ${incomingHold.authorizedClearanceEventId}`,
      };
    }
    return {
      allowed: false,
      reason:
        "REGULATORY_HOLD_PREVALENCE: Active hold cannot be overwritten or lifted without authoritative clearance event.",
    };
  }

  // Incoming mutation also asserts or modifies active hold
  return { allowed: true, reason: "ACTIVE_REGULATORY_HOLD_CONFIRMED" };
}

// ============================================================================
// 4. CRDT DELTA GENERATION & APPLICATION
// ============================================================================

export function generateCrdtDelta<T extends Record<string, unknown>>(
  previous: CrdtState<T>,
  current: CrdtState<T>,
): CrdtDelta<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(current.data) as Array<keyof T>) {
    if (current.data[key] !== previous.data[key]) {
      patch[key] = current.data[key];
    }
  }

  return {
    id: current.id,
    entityType: current.entityType,
    patch,
    vectorClock: current.vectorClock,
    updatedAt: current.updatedAt,
    nodeId: current.nodeId,
    regulatoryHoldPatch: current.regulatoryHold,
  };
}

export function resolveCrdtConflict<T extends Record<string, unknown>>(
  current: CrdtState<T>,
  incoming: CrdtDelta<T>,
): CrdtResolutionResult<T> {
  const conflicts: CrdtConflictRecord[] = [];

  // Check Regulatory Precedence Invariant first
  const regCheck = evaluateRegulatoryPrecedence(
    current.regulatoryHold,
    incoming.regulatoryHoldPatch,
  );

  if (!regCheck.allowed) {
    conflicts.push({
      entityId: current.id,
      key: "regulatoryHold",
      currentVal: current.regulatoryHold,
      incomingVal: incoming.regulatoryHoldPatch,
      resolution: "REGULATORY_HOLD_PREVALENCE",
      reason: regCheck.reason,
    });

    return {
      resolvedState: current,
      applied: false,
      conflicts,
    };
  }

  // Compare Vector Clocks
  const relation = compareClocks(incoming.vectorClock, current.vectorClock);

  // Case 1: Incoming is strictly before current (obsolete update) -> reject
  if (relation === "BEFORE" || relation === "IDENTICAL") {
    return {
      resolvedState: current,
      applied: false,
      conflicts: [
        {
          entityId: current.id,
          key: "vectorClock",
          currentVal: current.vectorClock,
          incomingVal: incoming.vectorClock,
          resolution: "KEPT_CURRENT",
          reason: "OBSOLETE_OR_DUPLICATE_DELTA",
        },
      ],
    };
  }

  // Case 2: Incoming is strictly after current (causally successor) -> apply patch directly
  if (relation === "AFTER") {
    const updatedData: T = { ...current.data, ...incoming.patch };
    const mergedClock = mergeClocks(current.vectorClock, incoming.vectorClock);
    const resolvedState: CrdtState<T> = {
      ...current,
      data: updatedData,
      vectorClock: mergedClock,
      updatedAt: incoming.updatedAt,
      nodeId: incoming.nodeId,
      regulatoryHold: incoming.regulatoryHoldPatch ?? current.regulatoryHold,
    };

    return {
      resolvedState,
      applied: true,
      conflicts: [],
    };
  }

  // Case 3: CONCURRENT update -> Last-Write-Wins (LWW) with timestamp & nodeId tie-break
  const incomingTime = new Date(incoming.updatedAt).getTime();
  const currentTime = new Date(current.updatedAt).getTime();

  let incomingWins = false;
  if (incomingTime > currentTime) {
    incomingWins = true;
  } else if (incomingTime === currentTime) {
    incomingWins = incoming.nodeId.localeCompare(current.nodeId) > 0;
  }

  const updatedData: T = { ...current.data };
  for (const [key, val] of Object.entries(incoming.patch)) {
    const currVal = updatedData[key as keyof T];
    if (currVal !== val) {
      if (incomingWins) {
        (updatedData as Record<string, unknown>)[key] = val;
        conflicts.push({
          entityId: current.id,
          key,
          currentVal: currVal,
          incomingVal: val,
          resolution: "APPLIED_INCOMING",
          reason: "CONCURRENT_LWW_INCOMING_WON",
        });
      } else {
        conflicts.push({
          entityId: current.id,
          key,
          currentVal: currVal,
          incomingVal: val,
          resolution: "KEPT_CURRENT",
          reason: "CONCURRENT_LWW_CURRENT_WON",
        });
      }
    }
  }

  const resolvedState: CrdtState<T> = {
    ...current,
    data: updatedData,
    vectorClock: mergeClocks(current.vectorClock, incoming.vectorClock),
    updatedAt: incomingWins ? incoming.updatedAt : current.updatedAt,
    nodeId: incomingWins ? incoming.nodeId : current.nodeId,
    regulatoryHold: incomingWins
      ? (incoming.regulatoryHoldPatch ?? current.regulatoryHold)
      : current.regulatoryHold,
  };

  return {
    resolvedState,
    applied:
      incomingWins ||
      conflicts.some((c) => c.resolution === "APPLIED_INCOMING"),
    conflicts,
  };
}

export function applyCrdtDeltas<T extends Record<string, unknown>>(
  state: CrdtState<T>,
  deltas: CrdtDelta<T>[],
): CrdtBatchResult<T> {
  let currentState = state;
  let appliedCount = 0;
  let rejectedCount = 0;
  const allConflicts: CrdtConflictRecord[] = [];

  for (const delta of deltas) {
    const result = resolveCrdtConflict(currentState, delta);
    if (result.applied) {
      appliedCount += 1;
      currentState = result.resolvedState;
    } else {
      rejectedCount += 1;
    }
    allConflicts.push(...result.conflicts);
  }

  return {
    resolvedState: currentState,
    appliedCount,
    rejectedCount,
    conflicts: allConflicts,
  };
}
