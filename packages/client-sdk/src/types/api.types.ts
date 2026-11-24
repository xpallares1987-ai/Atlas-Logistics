/**
 * @file api.types.ts
 * @description Domain entity contracts and request payloads for Atlas-Logistics resources.
 * @module @atlas/client-sdk/types/api
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

export type { PaginationParams, PaginatedResult } from "./client.types.js";

// ============================================================================
// 1. SHIPMENTS DOMAIN CONTRACTS
// ============================================================================

export type ShipmentStatus =
  | "DRAFT"
  | "BOOKED"
  | "CONFIRMED"
  | "IN_TRANSIT"
  | "CUSTOMS_HOLD"
  | "CUSTOMS_CLEARED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type TransportMode = "OCEAN" | "AIR" | "ROAD" | "RAIL" | "MULTIMODAL";

export interface ShipmentSummary {
  readonly id: string;
  readonly trackingNumber: string;
  readonly status: ShipmentStatus;
  readonly mode: TransportMode;
  readonly originUnlocode: string;
  readonly destinationUnlocode: string;
  readonly shipperName: string;
  readonly consigneeName: string;
  readonly totalPieces: number;
  readonly totalWeightKg: number;
  readonly totalVolumeCbm: number;
  readonly estimatedDeparture?: string;
  readonly estimatedArrival?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ShipmentMilestone {
  readonly id: string;
  readonly shipmentId: string;
  readonly code: string;
  readonly description: string;
  readonly locationUnlocode?: string;
  readonly occurredAt: string;
  readonly isCompleted: boolean;
}

export interface ShipmentDetail extends ShipmentSummary {
  readonly carrierCode?: string;
  readonly carrierName?: string;
  readonly vesselName?: string;
  readonly voyageFlightNumber?: string;
  readonly houseBillOfLading?: string;
  readonly masterBillOfLading?: string;
  readonly containerNumbers: readonly string[];
  readonly milestones: readonly ShipmentMilestone[];
  readonly specialInstructions?: string;
}

export interface CreateShipmentPayload {
  readonly mode: TransportMode;
  readonly originUnlocode: string;
  readonly destinationUnlocode: string;
  readonly shipperName: string;
  readonly consigneeName: string;
  readonly totalPieces: number;
  readonly totalWeightKg: number;
  readonly totalVolumeCbm: number;
  readonly estimatedDeparture?: string;
  readonly estimatedArrival?: string;
  readonly carrierCode?: string;
  readonly specialInstructions?: string;
}

export interface UpdateShipmentStatusPayload {
  readonly status: ShipmentStatus;
  readonly locationUnlocode?: string;
  readonly remarks?: string;
  readonly occurredAt?: string;
}

// ============================================================================
// 2. BOOKINGS DOMAIN CONTRACTS
// ============================================================================

export type BookingStatus =
  | "REQUESTED"
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "CONTAINER_ALLOCATED"
  | "CANCELLED"
  | "REJECTED";

export interface BookingSummary {
  readonly id: string;
  readonly bookingReference: string;
  readonly carrierCode: string;
  readonly status: BookingStatus;
  readonly originUnlocode: string;
  readonly destinationUnlocode: string;
  readonly cargoCutOffDate?: string;
  readonly docCutOffDate?: string;
  readonly departureDate?: string;
  readonly arrivalDate?: string;
  readonly allocatedContainersCount: number;
  readonly createdAt: string;
}

export interface BookingDetail extends BookingSummary {
  readonly vesselName?: string;
  readonly voyageNumber?: string;
  readonly equipmentType?: string;
  readonly remarks?: string;
  readonly containerAllocations: readonly {
    readonly containerNumber: string;
    readonly isoType: string;
    readonly sealNumber?: string;
  }[];
}

export interface CreateBookingPayload {
  readonly carrierCode: string;
  readonly originUnlocode: string;
  readonly destinationUnlocode: string;
  readonly departureDate: string;
  readonly arrivalDate?: string;
  readonly equipmentType: string;
  readonly equipmentQuantity: number;
  readonly remarks?: string;
}

// ============================================================================
// 3. FINANCIAL DOMAIN CONTRACTS
// ============================================================================

export type InvoiceType =
  "AR_CUSTOMER" | "AP_VENDOR" | "INTERCOMPANY" | "AGENT_CLEARING";
export type InvoiceStatus =
  "DRAFT" | "ISSUED" | "POSTED" | "PAID" | "DISPUTED" | "CANCELLED";

export interface InvoiceSummary {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly invoiceType: InvoiceType;
  readonly status: InvoiceStatus;
  readonly partyName: string;
  readonly currency: string;
  readonly subtotalAmount: number;
  readonly taxAmount: number;
  readonly totalAmount: number;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly paidAt?: string;
}

export interface JobCostingAccrual {
  readonly id: string;
  readonly shipmentId: string;
  readonly chargeCode: string;
  readonly chargeDescription: string;
  readonly currency: string;
  readonly estimatedCost: number;
  readonly actualCost?: number;
  readonly variance: number;
  readonly isReconciled: boolean;
}

// ============================================================================
// 4. CUSTOMS & CBAM DOMAIN CONTRACTS
// ============================================================================

export type CbamQuarter = "Q1" | "Q2" | "Q3" | "Q4";

export interface CbamDeclarationSummary {
  readonly id: string;
  readonly declarationNumber: string;
  readonly reportingYear: number;
  readonly quarter: CbamQuarter;
  readonly declarantVat: string;
  readonly totalDirectEmissionsTonnes: number;
  readonly totalIndirectEmissionsTonnes: number;
  readonly totalEmbeddedEmissionsTonnes: number;
  readonly status:
    "DRAFT" | "VALIDATED" | "TRANSMITTED" | "ACCEPTED" | "REJECTED";
  readonly submittedAt?: string;
}

export interface DutyEstimationRequest {
  readonly hsCode: string;
  readonly originCountryCode: string;
  readonly destinationCountryCode: string;
  readonly customsValue: number;
  readonly currency: string;
}

export interface DutyEstimationResult {
  readonly hsCode: string;
  readonly generalDutyRatePercent: number;
  readonly preferentialDutyRatePercent?: number;
  readonly estimatedDutyAmount: number;
  readonly vatRatePercent: number;
  readonly estimatedVatAmount: number;
  readonly totalCustomsPayable: number;
  readonly applicableFreeTradeAgreement?: string;
}

// ============================================================================
// 5. WAREHOUSE & CFS DOMAIN CONTRACTS
// ============================================================================

export interface InventoryItemSummary {
  readonly id: string;
  readonly facilityCode: string;
  readonly sku: string;
  readonly description: string;
  readonly quantityOnHand: number;
  readonly quantityAllocated: number;
  readonly quantityAvailable: number;
  readonly unitOfMeasure: string;
  readonly zoneCode?: string;
  readonly aisle?: string;
  readonly binLocation?: string;
  readonly lotNumber?: string;
  readonly expiryDate?: string;
}

export interface StockMovementPayload {
  readonly facilityCode: string;
  readonly sku: string;
  readonly quantity: number;
  readonly movementType:
    | "INBOUND_RECEIVE"
    | "OUTBOUND_DISPATCH"
    | "BIN_TRANSFER"
    | "CYCLE_COUNT_ADJUST";
  readonly fromLocation?: string;
  readonly toLocation?: string;
  readonly referenceDocument?: string;
  readonly notes?: string;
}

// ============================================================================
// 6. TELEMETRY & OBSERVABILITY CONTRACTS
// ============================================================================

export interface SystemHealthStatus {
  readonly status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  readonly uptimeSeconds: number;
  readonly version: string;
  readonly databaseConnected: boolean;
  readonly redisConnected?: boolean;
  readonly timestamp: string;
}

export interface MetricSnapshot {
  readonly timestamp: string;
  readonly activeJobsCount: number;
  readonly pendingOutboxMessagesCount: number;
  readonly httpRequestsPerMinute: number;
  readonly averageResponseTimeMs: number;
}
