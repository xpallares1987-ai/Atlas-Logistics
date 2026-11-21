/**
 * @file purchase-orders.service.ts
 * @description Service for Supply Chain Purchase Order (PO) lifecycle, manufacturing milestone tracking,
 * and atomic booking allocations (ADR 0032).
 * @module @atlas/api/services/purchase-orders
 * @see {@link docs/adr/0032-supply-chain-purchase-order-and-booking-allocation-engine.md}
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  purchaseOrders,
  poLineItems,
  productionMilestones,
  PurchaseOrder,
  PoLineItem,
  ProductionMilestone,
  ProductionMilestoneCode,
  PoStatus,
} from "../db/schema/po.js";
import { companies } from "../db/schema/core.js";
import { bookings } from "../db/schema/operations.js";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
} from "../scm/kernel/primitives.js";
import {
  calculateRemainingQuantity,
  validateAllocationRequest,
  calculateSplitAllocations,
  derivePoStatus,
  formatQty,
  parseQty,
} from "../scm/engines/po-allocation.engine.js";

// ============================================================================
// 1. INPUT INTERFACES
// ============================================================================

export interface CreatePoLineItemInput {
  skuCode: string;
  description: string;
  quantity: string | number;
  uom?: string;
  hsCode?: string;
  packageCount?: number;
  grossWeightKg?: string | number;
  volumeCbm?: string | number;
  originalUnitPrice?: string | number;
  originalCurrency?: string;
}

export interface CreatePurchaseOrderInput {
  buyerId: string;
  supplierId: string;
  poNumber: string;
  incoterm: string;
  expectedCargoReadyDate: string;
  notes?: string;
  lineItems: CreatePoLineItemInput[];
}

export interface RecordMilestoneInput {
  milestoneCode: ProductionMilestoneCode;
  plannedDate?: string;
  actualDate?: string;
  notes?: string;
}

export interface SkuAllocationRequest {
  lineItemId: string;
  quantityToAllocate: number;
}

export interface AllocatePoBookingInput {
  poId: string;
  bookingId: string;
  allocations: SkuAllocationRequest[];
}

export interface ListPurchaseOrdersOptions {
  tenantId?: string;
  status?: string;
  buyerId?: string;
  supplierId?: string;
  limit?: number;
}

// ============================================================================
// 2. QUERY METHODS
// ============================================================================

export async function listPurchaseOrders(
  options: ListPurchaseOrdersOptions = {},
) {
  const tenantId = options.tenantId || "tenant_default";
  const conditions = [eq(purchaseOrders.tenantId, tenantId)];

  if (options.status) {
    conditions.push(eq(purchaseOrders.status, options.status as PoStatus));
  }
  if (options.buyerId) {
    conditions.push(eq(purchaseOrders.buyerId, options.buyerId));
  }
  if (options.supplierId) {
    conditions.push(eq(purchaseOrders.supplierId, options.supplierId));
  }

  const limit = options.limit || 50;

  const query = db
    .select({
      po: purchaseOrders,
      buyerName: sql<string>`(SELECT name FROM companies WHERE companies.id = "purchase_orders"."buyer_id")`,
      supplierName: sql<string>`(SELECT name FROM companies WHERE companies.id = "purchase_orders"."supplier_id")`,
      totalItemsCount: sql<number>`(SELECT COUNT(*) FROM po_line_items WHERE po_line_items.po_id = "purchase_orders"."id")`,
      totalQuantity: sql<string>`(SELECT COALESCE(SUM(CAST(quantity AS REAL)), 0) FROM po_line_items WHERE po_line_items.po_id = "purchase_orders"."id")`,
      totalAllocatedQuantity: sql<string>`(SELECT COALESCE(SUM(CAST(allocated_quantity AS REAL)), 0) FROM po_line_items WHERE po_line_items.po_id = "purchase_orders"."id")`,
    })
    .from(purchaseOrders)
    .where(and(...conditions))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(limit);

  const rows = await query;

  return rows.map((r) => ({
    ...r.po,
    buyerName: r.buyerName || "Unknown Buyer",
    supplierName: r.supplierName || "Unknown Supplier",
    totalItemsCount: Number(r.totalItemsCount || 0),
    totalQuantity: formatQty(Number(r.totalQuantity || 0)),
    totalAllocatedQuantity: formatQty(Number(r.totalAllocatedQuantity || 0)),
    remainingQuantity: formatQty(
      Math.max(
        0,
        Number(r.totalQuantity || 0) - Number(r.totalAllocatedQuantity || 0),
      ),
    ),
  }));
}

export async function getPurchaseOrderById(
  id: string,
  tenantId = "tenant_default",
) {
  const poResults = await db
    .select({
      po: purchaseOrders,
      buyerName: sql<string>`(SELECT name FROM companies WHERE companies.id = ${purchaseOrders.buyerId})`,
      supplierName: sql<string>`(SELECT name FROM companies WHERE companies.id = ${purchaseOrders.supplierId})`,
    })
    .from(purchaseOrders)
    .where(
      and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)),
    )
    .limit(1);

  if (!poResults.length) {
    return null;
  }

  const po = poResults[0].po;

  // Fetch line items
  const items = await db
    .select()
    .from(poLineItems)
    .where(and(eq(poLineItems.poId, id), eq(poLineItems.tenantId, tenantId)));

  // Fetch milestones
  const milestones = await db
    .select()
    .from(productionMilestones)
    .where(
      and(
        eq(productionMilestones.poId, id),
        eq(productionMilestones.tenantId, tenantId),
      ),
    )
    .orderBy(desc(productionMilestones.createdAt));

  const enrichedItems = items.map((it) => {
    const remaining = calculateRemainingQuantity(
      it.quantity,
      it.allocatedQuantity,
    );
    return {
      ...it,
      remainingQuantity: formatQty(remaining),
      isFullyAllocated: remaining === 0,
    };
  });

  return {
    ...po,
    buyerName: poResults[0].buyerName || "Unknown Buyer",
    supplierName: poResults[0].supplierName || "Unknown Supplier",
    lineItems: enrichedItems,
    milestones,
  };
}

// ============================================================================
// 3. MUTATION METHODS
// ============================================================================

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
  tenantId = "tenant_default",
) {
  const poId = `po_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
  const now = new Date();

  // Validate buyer and supplier existence
  const buyer = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, input.buyerId))
    .limit(1);
  if (!buyer.length) {
    throw new Error(`Buyer company not found: ${input.buyerId}`);
  }

  const supplier = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, input.supplierId))
    .limit(1);
  if (!supplier.length) {
    throw new Error(`Supplier company not found: ${input.supplierId}`);
  }

  // Database transaction for PO header and Line Items
  await db.transaction(async (tx) => {
    await tx.insert(purchaseOrders).values({
      id: poId,
      tenantId,
      buyerId: input.buyerId,
      supplierId: input.supplierId,
      poNumber: input.poNumber,
      incoterm: input.incoterm,
      expectedCargoReadyDate: input.expectedCargoReadyDate,
      status: "ISSUED",
      notes: input.notes || null,
      createdAt: now,
      updatedAt: now,
    });

    if (input.lineItems && input.lineItems.length > 0) {
      for (const item of input.lineItems) {
        const itemId = `poi_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
        const qtyFormatted = formatQty(parseQty(item.quantity));
        await tx.insert(poLineItems).values({
          id: itemId,
          tenantId,
          poId,
          skuCode: item.skuCode,
          description: item.description,
          quantity: qtyFormatted,
          allocatedQuantity: "0.000",
          uom: item.uom || "PCS",
          hsCode: item.hsCode || null,
          packageCount: item.packageCount || null,
          grossWeightKg: item.grossWeightKg
            ? formatQty(parseQty(item.grossWeightKg))
            : null,
          volumeCbm: item.volumeCbm
            ? formatQty(parseQty(item.volumeCbm))
            : null,
          originalUnitPrice: item.originalUnitPrice
            ? String(item.originalUnitPrice)
            : null,
          originalCurrency: item.originalCurrency || "USD",
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  });

  return getPurchaseOrderById(poId, tenantId);
}

export async function recordProductionMilestone(
  poId: string,
  input: RecordMilestoneInput,
  tenantId = "tenant_default",
) {
  const po = await getPurchaseOrderById(poId, tenantId);
  if (!po) {
    throw new Error(`Purchase Order ${poId} not found.`);
  }

  const milestoneId = `mil_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    await tx.insert(productionMilestones).values({
      id: milestoneId,
      tenantId,
      poId,
      milestoneCode: input.milestoneCode,
      plannedDate: input.plannedDate || todayStr,
      actualDate: input.actualDate || todayStr,
      notes: input.notes || null,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch all current milestones for this PO
    const currentMilestones = await tx
      .select()
      .from(productionMilestones)
      .where(
        and(
          eq(productionMilestones.poId, poId),
          eq(productionMilestones.tenantId, tenantId),
        ),
      );

    // Derive new PO Status
    const newStatus = derivePoStatus(
      po.lineItems,
      currentMilestones,
      po.status as PoStatus,
    );

    if (newStatus !== po.status) {
      await tx
        .update(purchaseOrders)
        .set({ status: newStatus, updatedAt: now })
        .where(
          and(
            eq(purchaseOrders.id, poId),
            eq(purchaseOrders.tenantId, tenantId),
          ),
        );
    }
  });

  return getPurchaseOrderById(poId, tenantId);
}

export async function allocatePoItemsToBooking(
  input: AllocatePoBookingInput,
  actorContext: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  tenantId = "tenant_default",
) {
  const { poId, bookingId, allocations } = input;

  const po = await getPurchaseOrderById(poId, tenantId);
  if (!po) {
    throw new Error(`Purchase Order ${poId} not found.`);
  }

  // Verify booking exists
  const booking = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking.length) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  if (!allocations || allocations.length === 0) {
    throw new Error("No SKU allocations specified.");
  }

  const now = new Date();
  const allocationEvents: Array<{
    skuCode: string;
    allocatedQty: number;
    newTotalAllocated: string;
  }> = [];

  await db.transaction(async (tx) => {
    for (const alloc of allocations) {
      const item = po.lineItems.find((i) => i.id === alloc.lineItemId);
      if (!item) {
        throw new Error(
          `Line item ${alloc.lineItemId} not found on PO ${poId}.`,
        );
      }

      // Pure engine validation and calculation
      const splitResult = calculateSplitAllocations(
        item,
        alloc.quantityToAllocate,
      );

      await tx
        .update(poLineItems)
        .set({
          allocatedQuantity: splitResult.newAllocatedQuantity,
          bookingId: bookingId,
          updatedAt: now,
        })
        .where(
          and(eq(poLineItems.id, item.id), eq(poLineItems.tenantId, tenantId)),
        );

      allocationEvents.push({
        skuCode: item.skuCode,
        allocatedQty: alloc.quantityToAllocate,
        newTotalAllocated: splitResult.newAllocatedQuantity,
      });
    }

    // Refresh items to derive overall status
    const updatedItems = await tx
      .select()
      .from(poLineItems)
      .where(
        and(eq(poLineItems.poId, poId), eq(poLineItems.tenantId, tenantId)),
      );

    const currentMilestones = await tx
      .select()
      .from(productionMilestones)
      .where(
        and(
          eq(productionMilestones.poId, poId),
          eq(productionMilestones.tenantId, tenantId),
        ),
      );

    const newStatus = derivePoStatus(
      updatedItems,
      currentMilestones,
      po.status as PoStatus,
    );

    await tx
      .update(purchaseOrders)
      .set({ status: newStatus, updatedAt: now })
      .where(
        and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId)),
      );

    // Outbox Event
    await outboxBus.publish(
      {
        eventType: "scm.po.allocated",
        aggregateType: "PurchaseOrder",
        aggregateId: poId,
        actor: actorContext,
        payload: {
          poId,
          poNumber: po.poNumber,
          bookingId,
          allocations: allocationEvents,
          newStatus,
          timestamp: now.toISOString(),
        },
      },
      tx,
    );
  });

  return getPurchaseOrderById(poId, tenantId);
}
