/**
 * @file po-allocation.engine.ts
 * @description Pure domain calculation engine for Supply Chain Purchase Order (PO) allocations,
 * split shipments, SKU remaining quantities, and production milestone status derivations.
 * Strictly decoupled from Drizzle ORM, libSQL, and Fastify HTTP (ADR 0032).
 * @module @atlas/scm/engines/po-allocation
 * @see {@link docs/adr/0032-supply-chain-purchase-order-and-booking-allocation-engine.md}
 */

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export interface AllocationCandidateItem {
  id?: string;
  skuCode: string;
  quantity: string | number;
  allocatedQuantity: string | number;
  grossWeightKg?: string | number | null;
  volumeCbm?: string | number | null;
}

export interface AllocationValidationResult {
  valid: boolean;
  remainingQty: number;
  requestedQty: number;
  error?: string;
}

export interface SplitAllocationResult {
  newAllocatedQuantity: string;
  remainingQuantity: string;
  isFullyAllocated: boolean;
}

export interface DimensionalMetrics {
  totalWeightKg: number;
  totalVolumeCbm: number;
}

export interface ProductionMilestoneInput {
  milestoneCode: string;
  actualDate?: string | null;
}

export type DerivedPoStatus =
  | "ISSUED"
  | "ACKNOWLEDGED"
  | "IN_PRODUCTION"
  | "CARGO_READY"
  | "PARTIALLY_BOOKED"
  | "BOOKED"
  | "SHIPPED"
  | "CANCELLED";

// ============================================================================
// 2. DECIMAL HELPER UTILITIES (3 Decimal Precision)
// ============================================================================

/**
 * Parses numeric input or decimal strings safely into rounded floating-point with 3 decimal precision.
 */
export function parseQty(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 1000) / 1000;
}

/**
 * Formats a number to an exact 3-decimal string (e.g. 150 -> "150.000").
 */
export function formatQty(val: number): string {
  const safe = Math.round(val * 1000) / 1000;
  return safe.toFixed(3);
}

// ============================================================================
// 3. ENGINE LOGIC
// ============================================================================

/**
 * Calculates remaining unallocated quantity for a line item.
 */
export function calculateRemainingQuantity(
  totalQty: string | number,
  allocatedQty: string | number,
): number {
  const total = parseQty(totalQty);
  const allocated = parseQty(allocatedQty);
  const remaining = total - allocated;
  return Math.max(0, Math.round(remaining * 1000) / 1000);
}

/**
 * Validates whether a requested allocation quantity can be fulfilled by the line item.
 */
export function validateAllocationRequest(
  item: AllocationCandidateItem,
  requestedQty: number,
): AllocationValidationResult {
  const req = Math.round(requestedQty * 1000) / 1000;
  if (req <= 0) {
    return {
      valid: false,
      remainingQty: calculateRemainingQuantity(
        item.quantity,
        item.allocatedQuantity,
      ),
      requestedQty: req,
      error: `Allocation quantity must be greater than zero (received ${req}).`,
    };
  }

  const remaining = calculateRemainingQuantity(
    item.quantity,
    item.allocatedQuantity,
  );
  if (req > remaining) {
    return {
      valid: false,
      remainingQty: remaining,
      requestedQty: req,
      error: `Requested allocation (${req}) exceeds remaining unallocated quantity (${remaining}) for SKU ${item.skuCode}.`,
    };
  }

  return {
    valid: true,
    remainingQty: remaining,
    requestedQty: req,
  };
}

/**
 * Computes updated allocated quantity and remaining quantity after a valid allocation.
 */
export function calculateSplitAllocations(
  item: AllocationCandidateItem,
  requestedQty: number,
): SplitAllocationResult {
  const validation = validateAllocationRequest(item, requestedQty);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid allocation request");
  }

  const total = parseQty(item.quantity);
  const currentAllocated = parseQty(item.allocatedQuantity);
  const newAllocated =
    Math.round((currentAllocated + validation.requestedQty) * 1000) / 1000;
  const remaining = Math.max(
    0,
    Math.round((total - newAllocated) * 1000) / 1000,
  );

  return {
    newAllocatedQuantity: formatQty(newAllocated),
    remainingQuantity: formatQty(remaining),
    isFullyAllocated: remaining === 0,
  };
}

/**
 * Aggregates gross weight and volume for allocated line items.
 */
export function calculateTotalCbmAndWeight(
  items: Array<{
    quantity: number;
    grossWeightKg?: string | number | null;
    volumeCbm?: string | number | null;
  }>,
): DimensionalMetrics {
  let totalWeightKg = 0;
  let totalVolumeCbm = 0;

  for (const item of items) {
    const qty = parseQty(item.quantity);
    if (qty <= 0) continue;

    const unitWeight = parseQty(item.grossWeightKg);
    const unitVolume = parseQty(item.volumeCbm);

    totalWeightKg += Math.round(qty * unitWeight * 1000) / 1000;
    totalVolumeCbm += Math.round(qty * unitVolume * 1000) / 1000;
  }

  return {
    totalWeightKg: Math.round(totalWeightKg * 1000) / 1000,
    totalVolumeCbm: Math.round(totalVolumeCbm * 1000) / 1000,
  };
}

/**
 * Derives current PO status based on manufacturing milestones and line item booking allocations.
 */
export function derivePoStatus(
  items: AllocationCandidateItem[],
  milestones?: ProductionMilestoneInput[],
  currentStatus?: DerivedPoStatus,
): DerivedPoStatus {
  // Terminal or override statuses
  if (currentStatus === "CANCELLED" || currentStatus === "SHIPPED") {
    return currentStatus;
  }

  if (!items || items.length === 0) {
    return currentStatus || "ISSUED";
  }

  // 1. Check allocations
  let totalAllocated = 0;
  let totalRequired = 0;

  for (const item of items) {
    totalRequired += parseQty(item.quantity);
    totalAllocated += parseQty(item.allocatedQuantity);
  }

  if (totalRequired > 0 && totalAllocated >= totalRequired) {
    return "BOOKED";
  }

  if (totalAllocated > 0) {
    return "PARTIALLY_BOOKED";
  }

  // 2. Check production milestones if no bookings allocated yet
  if (milestones && milestones.length > 0) {
    const completedMilestones = new Set(
      milestones
        .filter((m) => m.actualDate && m.actualDate.trim().length > 0)
        .map((m) => m.milestoneCode),
    );

    if (
      completedMilestones.has("QC_PASSED") ||
      completedMilestones.has("PACKED")
    ) {
      return "CARGO_READY";
    }

    if (
      completedMilestones.has("ASSEMBLY_STARTED") ||
      completedMilestones.has("RAW_MATERIALS_READY")
    ) {
      return "IN_PRODUCTION";
    }

    if (completedMilestones.has("ORDER_RECEIVED")) {
      return "ACKNOWLEDGED";
    }
  }

  return currentStatus || "ISSUED";
}
