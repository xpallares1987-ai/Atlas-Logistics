/**
 * @file portal-projection.engine.ts
 * @description Pure domain engine for Zero-Trust B2B Customer & Vendor Portal CQRS projections.
 * Enforces strict financial data masking (stripping buy rates, profit margins, and liability damages),
 * compiles clean JSON summaries, and generates cryptographic Magic Access Tokens (ADR 0035).
 * @module @atlas/scm/engines/portal-projection-engine
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type {
  PortalType,
  NewPortalPoProjection,
} from "../../db/schema/portal_projections.js";

// ============================================================================
// 1. DATA CONTRACTS & SANITIZED INTERFACES
// ============================================================================

export interface MaskedPortalLineItem {
  id: string;
  skuCode: string;
  description: string;
  quantity: string;
  allocatedQuantity: string;
  remainingQuantity: string;
  isFullyAllocated: boolean;
  uom: string;
  hsCode?: string | null;
  grossWeightKg?: string | null;
  volumeCbm?: string | null;
  bookingId?: string | null;
}

export interface MaskedPortalMilestone {
  milestoneCode: string;
  milestoneCategory: string;
  status: string;
  plannedTimestamp: string;
  estimatedTimestamp?: string | null;
  actualTimestamp?: string | null;
  delayHours: number;
  locationCode?: string | null;
  notes?: string | null;
}

export interface MaskedPortalException {
  id: string;
  exceptionCode: string;
  exceptionCategory: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  delayEstimateHours: number;
}

// ============================================================================
// 2. MASKING & SANITIZATION UTILITIES
// ============================================================================

/**
 * Strips internal financial fields (unit prices, currencies, buy rates, margins) from line items.
 */
export function maskLineItems(rawItems: unknown[]): MaskedPortalLineItem[] {
  if (!Array.isArray(rawItems)) return [];

  return rawItems.map((raw) => {
    const item = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
      string,
      unknown
    >;

    const quantity = String(item.quantity ?? "0");
    const allocated = String(item.allocatedQuantity ?? "0");
    const remaining = String(item.remainingQuantity ?? quantity);
    const qNum = parseFloat(quantity) || 0;
    const aNum = parseFloat(allocated) || 0;

    return {
      id: String(item.id || uuidv4()),
      skuCode: String(item.skuCode || "UNKNOWN_SKU"),
      description: String(item.description || ""),
      quantity,
      allocatedQuantity: allocated,
      remainingQuantity: remaining,
      isFullyAllocated:
        typeof item.isFullyAllocated === "boolean"
          ? item.isFullyAllocated
          : qNum > 0 && aNum >= qNum,
      uom: String(item.uom || "PCS"),
      hsCode: typeof item.hsCode === "string" ? item.hsCode : null,
      grossWeightKg:
        typeof item.grossWeightKg === "string" ? item.grossWeightKg : null,
      volumeCbm: typeof item.volumeCbm === "string" ? item.volumeCbm : null,
      bookingId: typeof item.bookingId === "string" ? item.bookingId : null,
    };
  });
}

/**
 * Normalizes milestone items for public external visibility.
 */
export function maskMilestones(
  rawMilestones: unknown[],
): MaskedPortalMilestone[] {
  if (!Array.isArray(rawMilestones)) return [];

  return rawMilestones.map((raw) => {
    const m = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
      string,
      unknown
    >;

    return {
      milestoneCode: String(m.milestoneCode || "UNKNOWN"),
      milestoneCategory: String(m.milestoneCategory || "SUPPLIER_PRODUCTION"),
      status: String(m.status || "PLANNED"),
      plannedTimestamp: String(
        m.plannedTimestamp || m.plannedDate || new Date().toISOString(),
      ),
      estimatedTimestamp:
        typeof m.estimatedTimestamp === "string" ? m.estimatedTimestamp : null,
      actualTimestamp:
        typeof m.actualTimestamp === "string"
          ? m.actualTimestamp
          : typeof m.actualDate === "string"
            ? m.actualDate
            : null,
      delayHours: typeof m.delayHours === "number" ? m.delayHours : 0,
      locationCode: typeof m.locationCode === "string" ? m.locationCode : null,
      notes: typeof m.notes === "string" ? m.notes : null,
    };
  });
}

/**
 * Strips internal financial risk amounts (financialRiskAmount, financialRiskCurrency, AI damages) from exceptions.
 */
export function maskExceptions(
  rawExceptions: unknown[],
): MaskedPortalException[] {
  if (!Array.isArray(rawExceptions)) return [];

  return rawExceptions.map((raw) => {
    const exc = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
      string,
      unknown
    >;

    return {
      id: String(exc.id || uuidv4()),
      exceptionCode: String(exc.exceptionCode || "EXC_GENERAL"),
      exceptionCategory: String(exc.exceptionCategory || "CARRIER_DELAY"),
      severity: String(exc.severity || "MEDIUM"),
      status: String(exc.status || "OPEN"),
      title: String(exc.title || "Operational Alert"),
      description: String(exc.description || ""),
      delayEstimateHours:
        typeof exc.delayEstimateHours === "number" ? exc.delayEstimateHours : 0,
    };
  });
}

// ============================================================================
// 3. CRYPTOGRAPHIC MAGIC ACCESS TOKENS
// ============================================================================

/**
 * Computes a SHA-256 hash string for a bearer token.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * Generates a high-entropy 256-bit Magic Access Token and its SHA-256 hash for secure database storage.
 */
export function generateMagicToken(
  poId: string,
  companyId: string,
  portalType: PortalType = "VENDOR",
  ttlHours: number = 72,
): {
  rawToken: string;
  tokenHash: string;
  expiresAt: number;
} {
  const entropy = crypto.randomBytes(32).toString("hex");
  const rawToken = `atk_${portalType.toLowerCase()}_${entropy}`;
  const tokenHash = hashToken(rawToken);
  const expiresAt = Math.floor(Date.now() / 1000) + ttlHours * 3600;

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Verifies a raw bearer token against a stored SHA-256 hash using constant-time comparison.
 */
export function verifyMagicToken(
  rawToken: string,
  storedHash: string,
  expiresAtSec: number,
  isRevoked: boolean = false,
): boolean {
  if (isRevoked) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec > expiresAtSec) return false;

  const candidateHash = hashToken(rawToken);
  if (candidateHash.length !== storedHash.length) return false;

  const candidateBuf = Buffer.from(candidateHash, "utf8");
  const storedBuf = Buffer.from(storedHash, "utf8");

  return crypto.timingSafeEqual(candidateBuf, storedBuf);
}

// ============================================================================
// 4. CQRS PROJECTION BUILDER
// ============================================================================

export interface RawPoHeaderInput {
  id: string;
  tenantId?: string;
  supplierId: string;
  buyerId?: string;
  poNumber: string;
  buyerName: string;
  supplierName: string;
  incoterm: string;
  expectedCargoReadyDate: string;
  promisedCargoReadyDate?: string | null;
  status: string;
  supplierConfirmationStatus?: "PENDING" | "CONFIRMED" | "REJECTED";
  confirmedAt?: string | null;
  confirmationNotes?: string | null;
  [key: string]: unknown;
}

export function buildPortalPoProjection(
  po: RawPoHeaderInput,
  lineItems: unknown[],
  milestones: unknown[],
  exceptions: unknown[],
): NewPortalPoProjection {
  const maskedLines = maskLineItems(lineItems);
  const maskedMilestones = maskMilestones(milestones);
  const maskedExceptions = maskExceptions(exceptions);

  const nowIso = new Date().toISOString();

  return {
    id: `proj_po_${po.id}`,
    poId: po.id,
    tenantId: po.tenantId || "tenant_default",
    vendorCompanyId: po.supplierId,
    buyerCompanyId: po.buyerId || "BUYER_DEFAULT",
    poNumber: po.poNumber,
    buyerName: po.buyerName,
    supplierName: po.supplierName,
    incoterm: po.incoterm,
    expectedCargoReadyDate: po.expectedCargoReadyDate,
    promisedCargoReadyDate: po.promisedCargoReadyDate || null,
    poStatus: po.status,
    supplierConfirmationStatus: po.supplierConfirmationStatus || "PENDING",
    confirmedAt: po.confirmedAt || null,
    confirmationNotes: po.confirmationNotes || null,
    lineItemsSummaryJson: maskedLines,
    milestonesSummaryJson: maskedMilestones,
    exceptionsSummaryJson: maskedExceptions,
    lastProjectedAt: nowIso,
  };
}
