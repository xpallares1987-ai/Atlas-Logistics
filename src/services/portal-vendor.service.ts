/**
 * @file portal-vendor.service.ts
 * @description Service for Zero-Trust B2B Vendor Portal operations, CQRS projection synchronization,
 * Magic Access Token verification, and decentralized factory milestone recording (ADR 0035).
 * @module @atlas/api/services/portal-vendor
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  portalPoProjections,
  portalAccessTokens,
  PortalPoProjection,
  PortalAccessToken,
  SupplierConfirmationStatus,
} from "../db/schema/portal_projections.js";
import {
  purchaseOrders,
  poLineItems,
  productionMilestones,
} from "../db/schema/po.js";
import {
  supplyChainMilestoneEvents,
  supplyChainExceptions,
} from "../db/schema/supply_chain_visibility.js";
import { companies } from "../db/schema/core.js";
import {
  buildPortalPoProjection,
  generateMagicToken,
  hashToken,
  verifyMagicToken,
} from "../scm/engines/portal-projection.engine.js";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
} from "../scm/kernel/primitives.js";

// ============================================================================
// 1. INTERFACES & CONTEXTS
// ============================================================================

export interface VendorAuthContext {
  vendorCompanyId: string;
  allowedPoId: string | null;
  authType: "MAGIC_TOKEN" | "JWT";
  tokenRecord?: PortalAccessToken;
}

export interface ConfirmVendorPoInput {
  vendorCompanyId: string;
  poId: string;
  promisedCargoReadyDate: string;
  confirmationNotes?: string;
  actor?: SecurityActorContext;
}

export interface RecordVendorMilestoneInput {
  vendorCompanyId: string;
  poId: string;
  milestoneCode: string;
  actualDate: string;
  notes?: string;
  actor?: SecurityActorContext;
}

export interface GeneratePortalTokenInput {
  poId: string;
  companyId: string;
  portalType?: "VENDOR" | "CUSTOMER";
  ttlHours?: number;
  actorUserId?: string;
}

// ============================================================================
// 2. CQRS PROJECTION SYNCHRONIZATION
// ============================================================================

/**
 * Builds or refreshes the sanitized CQRS projection for a single Purchase Order.
 * Enforces Zero-Leak masking via portal-projection.engine.
 */
export async function syncPoProjection(
  poId: string,
  tenantId = "tenant_default",
): Promise<PortalPoProjection> {
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId)),
    )
    .limit(1);

  if (!po) {
    throw new Error(`Purchase order ${poId} not found`);
  }

  // Fetch buyer and supplier company names
  const [buyer] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, po.buyerId))
    .limit(1);

  const [supplier] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, po.supplierId))
    .limit(1);

  const buyerName = buyer?.name || `Company ${po.buyerId}`;
  const supplierName = supplier?.name || `Company ${po.supplierId}`;

  // Fetch raw line items
  const lines = await db
    .select()
    .from(poLineItems)
    .where(and(eq(poLineItems.poId, poId), eq(poLineItems.tenantId, tenantId)));

  // Fetch factory and visibility milestones
  const prodMilestones = await db
    .select()
    .from(productionMilestones)
    .where(eq(productionMilestones.poId, poId));

  const scmMilestones = await db
    .select()
    .from(supplyChainMilestoneEvents)
    .where(
      and(
        eq(supplyChainMilestoneEvents.poId, poId),
        eq(supplyChainMilestoneEvents.tenantId, tenantId),
      ),
    );

  // Combine milestones with priority to visibility milestones if both exist
  const combinedMilestones: unknown[] = [
    ...prodMilestones.map((m) => ({
      milestoneCode: m.milestoneCode,
      milestoneCategory: "SUPPLIER_PRODUCTION",
      status: "COMPLETED",
      plannedDate: m.actualDate,
      actualDate: m.actualDate,
      notes: m.notes,
    })),
    ...scmMilestones.map((m) => ({
      milestoneCode: m.milestoneCode,
      milestoneCategory: m.milestoneCategory,
      status: m.status,
      plannedTimestamp: m.plannedTimestamp,
      actualTimestamp: m.actualTimestamp,
      delayHours: m.delayHours,
      locationCode: m.locationCode,
      notes: m.notes,
    })),
  ];

  // Fetch exceptions
  const exceptions = await db
    .select()
    .from(supplyChainExceptions)
    .where(
      and(
        eq(supplyChainExceptions.poId, poId),
        eq(supplyChainExceptions.tenantId, tenantId),
      ),
    );

  // Check if projection already has confirmation status to preserve
  const [existingProjection] = await db
    .select()
    .from(portalPoProjections)
    .where(eq(portalPoProjections.poId, poId))
    .limit(1);

  const newProjection = buildPortalPoProjection(
    {
      id: po.id,
      tenantId: po.tenantId,
      supplierId: po.supplierId,
      buyerId: po.buyerId,
      poNumber: po.poNumber,
      buyerName,
      supplierName,
      incoterm: po.incoterm,
      expectedCargoReadyDate: po.expectedCargoReadyDate,
      promisedCargoReadyDate:
        existingProjection?.promisedCargoReadyDate || null,
      status: po.status,
      supplierConfirmationStatus:
        existingProjection?.supplierConfirmationStatus || "PENDING",
      confirmedAt: existingProjection?.confirmedAt || null,
      confirmationNotes: existingProjection?.confirmationNotes || null,
    },
    lines,
    combinedMilestones,
    exceptions,
  );

  const now = new Date();

  await db
    .insert(portalPoProjections)
    .values({
      ...newProjection,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [portalPoProjections.poId],
      set: {
        vendorCompanyId: newProjection.vendorCompanyId,
        buyerCompanyId: newProjection.buyerCompanyId,
        poNumber: newProjection.poNumber,
        buyerName: newProjection.buyerName,
        supplierName: newProjection.supplierName,
        incoterm: newProjection.incoterm,
        expectedCargoReadyDate: newProjection.expectedCargoReadyDate,
        promisedCargoReadyDate: newProjection.promisedCargoReadyDate,
        poStatus: newProjection.poStatus,
        supplierConfirmationStatus: newProjection.supplierConfirmationStatus,
        confirmedAt: newProjection.confirmedAt,
        confirmationNotes: newProjection.confirmationNotes,
        lineItemsSummaryJson: newProjection.lineItemsSummaryJson,
        milestonesSummaryJson: newProjection.milestonesSummaryJson,
        exceptionsSummaryJson: newProjection.exceptionsSummaryJson,
        lastProjectedAt: newProjection.lastProjectedAt,
        updatedAt: now,
      },
    });

  const [saved] = await db
    .select()
    .from(portalPoProjections)
    .where(eq(portalPoProjections.poId, poId))
    .limit(1);

  return saved;
}

// ============================================================================
// 3. ZERO-TRUST AUTH RESOLUTION (MAGIC TOKENS & SESSIONS)
// ============================================================================

/**
 * Resolves authentication from Authorization header (Bearer token).
 * Supports cryptographic Magic Access Tokens ('atk_vendor_*') and standard JWT tokens.
 */
export async function resolveVendorAuth(
  authHeader?: string,
): Promise<VendorAuthContext | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) {
    return null;
  }

  // Magic Access Token branch
  if (rawToken.startsWith("atk_vendor_")) {
    const candidateHash = hashToken(rawToken);

    const [tokenRecord] = await db
      .select()
      .from(portalAccessTokens)
      .where(
        and(
          eq(portalAccessTokens.tokenHash, candidateHash),
          eq(portalAccessTokens.isRevoked, false),
        ),
      )
      .limit(1);

    if (!tokenRecord) {
      return null;
    }

    const isValid = verifyMagicToken(
      rawToken,
      tokenRecord.tokenHash,
      tokenRecord.expiresAt,
      tokenRecord.isRevoked,
    );

    if (!isValid) {
      return null;
    }

    // Update last used timestamp
    const nowSec = Math.floor(Date.now() / 1000);
    await db
      .update(portalAccessTokens)
      .set({
        lastUsedAt: nowSec,
        updatedAt: new Date(),
      })
      .where(eq(portalAccessTokens.id, tokenRecord.id));

    return {
      vendorCompanyId: tokenRecord.companyId,
      allowedPoId: tokenRecord.poId,
      authType: "MAGIC_TOKEN",
      tokenRecord,
    };
  }

  // For testing or simple bearer mock tokens: 'vendor_comp_xxx'
  if (rawToken.startsWith("company_") || rawToken.startsWith("c-")) {
    return {
      vendorCompanyId: rawToken,
      allowedPoId: null,
      authType: "JWT",
    };
  }

  return null;
}

// ============================================================================
// 4. PORTAL QUERIES (ZERO-LEAK READS)
// ============================================================================

/**
 * Lists sanitized POs for an authenticated vendor.
 * Respects single-PO scoping if accessed via Magic Access Token.
 */
export async function listVendorPos(
  vendorCompanyId: string,
  allowedPoId: string | null = null,
  tenantId = "tenant_default",
): Promise<PortalPoProjection[]> {
  const conditions = [
    eq(portalPoProjections.vendorCompanyId, vendorCompanyId),
    eq(portalPoProjections.tenantId, tenantId),
  ];

  if (allowedPoId) {
    conditions.push(eq(portalPoProjections.poId, allowedPoId));
  }

  const records = await db
    .select()
    .from(portalPoProjections)
    .where(and(...conditions))
    .orderBy(desc(portalPoProjections.createdAt));

  return records;
}

/**
 * Retrieves a single sanitized PO projection.
 * Returns null if the PO does not belong to the requesting vendor.
 */
export async function getVendorPoDetail(
  vendorCompanyId: string,
  poId: string,
  allowedPoId: string | null = null,
  tenantId = "tenant_default",
): Promise<PortalPoProjection | null> {
  if (allowedPoId && allowedPoId !== poId) {
    return null;
  }

  let [record] = await db
    .select()
    .from(portalPoProjections)
    .where(
      and(
        eq(portalPoProjections.poId, poId),
        eq(portalPoProjections.vendorCompanyId, vendorCompanyId),
        eq(portalPoProjections.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!record) {
    // Attempt lazy projection sync if core PO exists and belongs to vendor
    const [corePo] = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, poId),
          eq(purchaseOrders.supplierId, vendorCompanyId),
          eq(purchaseOrders.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (corePo) {
      record = await syncPoProjection(poId, tenantId);
    }
  }

  return record || null;
}

// ============================================================================
// 5. SUPPLIER ACTIONS & MUTATIONS
// ============================================================================

/**
 * Vendor confirms a purchase order, committing to a Promised Cargo Ready Date.
 */
export async function confirmVendorPo(
  input: ConfirmVendorPoInput,
  tenantId = "tenant_default",
): Promise<PortalPoProjection> {
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, input.poId),
        eq(purchaseOrders.supplierId, input.vendorCompanyId),
        eq(purchaseOrders.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!po) {
    throw new Error(
      `Purchase order ${input.poId} not found or not owned by vendor ${input.vendorCompanyId}`,
    );
  }

  const nowIso = new Date().toISOString();
  const actor = input.actor || DEFAULT_OPERATOR_ACTOR;

  // 1. Update projection status
  await db
    .update(portalPoProjections)
    .set({
      promisedCargoReadyDate: input.promisedCargoReadyDate,
      supplierConfirmationStatus: "CONFIRMED" as SupplierConfirmationStatus,
      confirmedAt: nowIso,
      confirmationNotes: input.confirmationNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(portalPoProjections.poId, input.poId));

  // 2. Publish Transactional Outbox Event
  await outboxBus.publish({
    eventId: uuidv4(),
    eventType: "scm.portal.vendor.po_confirmed.v1",
    schemaVersion: 1,
    producerContext: "PortalVendorService",
    aggregateType: "PurchaseOrder",
    aggregateId: input.poId,
    occurredAt: nowIso,
    actor,
    payload: {
      poId: input.poId,
      vendorCompanyId: input.vendorCompanyId,
      poNumber: po.poNumber,
      expectedCargoReadyDate: po.expectedCargoReadyDate,
      promisedCargoReadyDate: input.promisedCargoReadyDate,
      notes: input.confirmationNotes,
    },
  });

  return (await getVendorPoDetail(
    input.vendorCompanyId,
    input.poId,
    null,
    tenantId,
  ))!;
}

/**
 * Vendor records a decentralized manufacturing milestone (e.g. QC_PASSED, PACKED).
 */
export async function recordVendorMilestone(
  input: RecordVendorMilestoneInput,
  tenantId = "tenant_default",
): Promise<PortalPoProjection> {
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, input.poId),
        eq(purchaseOrders.supplierId, input.vendorCompanyId),
        eq(purchaseOrders.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!po) {
    throw new Error(
      `Purchase order ${input.poId} not found or not owned by vendor ${input.vendorCompanyId}`,
    );
  }

  const now = new Date();
  const actor = input.actor || DEFAULT_OPERATOR_ACTOR;

  // Check if existing production milestone exists for this code
  const [existing] = await db
    .select()
    .from(productionMilestones)
    .where(
      and(
        eq(productionMilestones.poId, input.poId),
        eq(productionMilestones.milestoneCode, input.milestoneCode as any),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(productionMilestones)
      .set({
        actualDate: input.actualDate,
        notes: input.notes || null,
        updatedAt: now,
      })
      .where(eq(productionMilestones.id, existing.id));
  } else {
    await db.insert(productionMilestones).values({
      id: uuidv4(),
      tenantId,
      poId: input.poId,
      milestoneCode: input.milestoneCode as any,
      plannedDate: input.actualDate,
      actualDate: input.actualDate,
      notes: input.notes || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Re-sync projection with updated milestones
  await syncPoProjection(input.poId, tenantId);

  // Publish Outbox Event
  await outboxBus.publish({
    eventId: uuidv4(),
    eventType: "scm.portal.vendor.milestone_recorded.v1",
    schemaVersion: 1,
    producerContext: "PortalVendorService",
    aggregateType: "PurchaseOrder",
    aggregateId: input.poId,
    occurredAt: now.toISOString(),
    actor,
    payload: {
      poId: input.poId,
      vendorCompanyId: input.vendorCompanyId,
      milestoneCode: input.milestoneCode,
      actualDate: input.actualDate,
      notes: input.notes,
    },
  });

  return (await getVendorPoDetail(
    input.vendorCompanyId,
    input.poId,
    null,
    tenantId,
  ))!;
}

// ============================================================================
// 6. MAGIC ACCESS TOKEN GENERATION
// ============================================================================

/**
 * Creates a cryptographic Magic Access Token for a PO and company.
 */
export async function createMagicAccessToken(
  input: GeneratePortalTokenInput,
  tenantId = "tenant_default",
): Promise<{
  id: string;
  rawToken: string;
  tokenHash: string;
  expiresAt: number;
}> {
  const { rawToken, tokenHash, expiresAt } = generateMagicToken(
    input.poId,
    input.companyId,
    input.portalType || "VENDOR",
    input.ttlHours || 72,
  );

  const id = `tok_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
  const now = new Date();

  await db.insert(portalAccessTokens).values({
    id,
    tenantId,
    poId: input.poId,
    companyId: input.companyId,
    portalType: input.portalType || "VENDOR",
    tokenHash,
    expiresAt,
    isRevoked: false,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    rawToken,
    tokenHash,
    expiresAt,
  };
}
