/**
 * @file types.ts
 * @description Type definitions for Zero-Trust B2B Vendor Portal UI components (ADR 0035).
 * Enforces sanitized CQRS PO projections, Zero-Leak contracts, and decentralized factory milestone events.
 * @module @atlas/frontend/components/Portal/Vendor/types
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

export interface PortalLineItem {
  id: string;
  skuCode: string;
  description: string;
  quantity: string;
  allocatedQuantity?: string;
  remainingQuantity?: string;
  htsCode?: string;
}

export interface PortalMilestone {
  milestoneCode: string;
  milestoneCategory?: string;
  status: string;
  actualTimestamp?: string;
  delayHours?: number;
  notes?: string;
}

export interface PortalException {
  id: string;
  exceptionCode: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  status: "OPEN" | "RESOLVED" | "ACKNOWLEDGED" | string;
  title: string;
  description: string;
  delayEstimateHours?: number;
  createdAt?: string;
}

export interface PortalPoProjectionDto {
  id: string;
  poId: string;
  tenantId: string;
  vendorCompanyId: string;
  buyerCompanyId: string;
  poNumber: string;
  buyerName: string;
  supplierName: string;
  incoterm: string;
  expectedCargoReadyDate: string;
  promisedCargoReadyDate: string | null;
  poStatus: string;
  supplierConfirmationStatus: "PENDING" | "CONFIRMED" | "REJECTED";
  confirmedAt: string | null;
  confirmationNotes: string | null;
  lineItemsSummaryJson: PortalLineItem[];
  milestonesSummaryJson: PortalMilestone[];
  exceptionsSummaryJson: PortalException[];
  lastProjectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmPoPayload {
  promisedCargoReadyDate: string;
  confirmationNotes?: string;
}

export interface RecordMilestonePayload {
  milestoneCode: string;
  actualDate: string;
  notes?: string;
}

export interface VendorPortalStats {
  totalOrders: number;
  pendingConfirmation: number;
  confirmed: number;
  withExceptions: number;
}
