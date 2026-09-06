import { EventEmitter } from "events";
import { logger } from "../../config/logger.js";
import { getCurrentTenant } from "../tenancy/index.js";

export interface BaseDomainEvent<
  TName extends string = string,
  TPayload = any,
> {
  id: string;
  eventName: TName;
  aggregateId: string;
  occurredAt: string;
  organizationId?: string;
  payload: TPayload;
}

// ── Strongly-Typed Core Financial & Regulatory Domain Event Types ──

export interface InvoiceReconciledPayload {
  invoiceId: string;
  carrierId: string;
  discrepancyStatus:
    "EXACT_MATCH" | "UNDER_BILLED" | "OVER_BILLED" | "TOLERANCE_ACCEPTED";
  amountEur: number;
}

export interface TradeFinanceInstrumentIssuedPayload {
  instrumentId: string;
  instrumentType:
    "LETTER_OF_CREDIT" | "BANK_GUARANTEE" | "DOCUMENTARY_COLLECTION";
  amount: number;
  currency: string;
  applicantCompanyId: string;
  beneficiaryCompanyId: string;
}

export interface CargoClaimFiledPayload {
  claimId: string;
  shipmentId: string;
  claimedAmount: number;
  liabilityLimitEur: number;
  transportMode: "ROAD" | "AIR" | "MARITIME" | "RAIL";
}

export interface CustomsClearedPayload {
  declarationId: string;
  channel: "GREEN" | "ORANGE" | "RED";
  duaReference: string;
  totalDutyPayable: number;
}

export interface CustomsWarehouseStockDischargedPayload {
  declarationId: string;
  facilityId: string;
  dischargeType: "DEFINITIVE_IMPORT" | "RE_EXPORT" | "TRANSIT_T1" | "INTERNAL_PROCESSING";
  packagesCount: number;
  grossMassKg: number;
}

export interface CbamDeclarationSubmittedPayload {
  declarationId: string;
  reportingPeriod: string;
  importerEori: string;
  totalDirectEmissionsTco2: number;
  totalIndirectEmissionsTco2: number;
  totalCertificatesRequired: number;
}

export interface FuelEuComplianceAssessedPayload {
  shipId: string;
  reportingYear: number;
  cbBalanceGco2eq: number;
  complianceState: "COMPLIANT" | "DEFICIT";
  penaltyAmountEur: number;
}

export interface DangerousGoodsValidatedPayload {
  documentId: string;
  unNumber: string;
  hazardClass: string;
  isCompliant: boolean;
  emergencyGuideNumber: string;
}

export interface ConsignmentDispatchedPayload {
  consignmentId: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  transportMode: "ROAD" | "RAIL" | "AIR" | "MARITIME";
  adrPoints?: number;
}

export interface ColdChainExcursionPayload {
  shipmentId: string;
  sensorId: string;
  temperatureCelsius: number;
  thresholdMaxCelsius: number;
  durationMinutes: number;
  meanKineticTempCelsius: number;
}

export interface LaytimeCalculatedPayload {
  fixtureId: string;
  vesselName: string;
  demurrageDueEur: number;
  despatchDueEur: number;
  netSettlementEur: number;
}

export interface DomainEventRegistry {
  "treasury:invoice-reconciled": BaseDomainEvent<
    "treasury:invoice-reconciled",
    InvoiceReconciledPayload
  >;
  "trade-finance:instrument-issued": BaseDomainEvent<
    "trade-finance:instrument-issued",
    TradeFinanceInstrumentIssuedPayload
  >;
  "claims:claim-filed": BaseDomainEvent<
    "claims:claim-filed",
    CargoClaimFiledPayload
  >;
  "customs:cleared": BaseDomainEvent<"customs:cleared", CustomsClearedPayload>;
  "customs-warehouse:stock-discharged": BaseDomainEvent<
    "customs-warehouse:stock-discharged",
    CustomsWarehouseStockDischargedPayload
  >;
  "cbam:declaration-submitted": BaseDomainEvent<
    "cbam:declaration-submitted",
    CbamDeclarationSubmittedPayload
  >;
  "fueleu:compliance-assessed": BaseDomainEvent<
    "fueleu:compliance-assessed",
    FuelEuComplianceAssessedPayload
  >;
  "dangerous-goods:declaration-validated": BaseDomainEvent<
    "dangerous-goods:declaration-validated",
    DangerousGoodsValidatedPayload
  >;
  "freight:consignment-dispatched": BaseDomainEvent<
    "freight:consignment-dispatched",
    ConsignmentDispatchedPayload
  >;
  "cold-chain:excursion-detected": BaseDomainEvent<
    "cold-chain:excursion-detected",
    ColdChainExcursionPayload
  >;
  "chartering:laytime-calculated": BaseDomainEvent<
    "chartering:laytime-calculated",
    LaytimeCalculatedPayload
  >;
}

export type EventKey = keyof DomainEventRegistry;
export type EventHandler<E extends BaseDomainEvent> = (
  event: E,
) => Promise<void> | void;

/**
 * In-Process Typed Domain Event Bus
 * Dispatches domain events asynchronously with per-listener error boundaries,
 * ensuring failure in side-effect handlers does not break the primary transactional flow.
 */
export class DomainEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
  }

  /**
   * Subscribe to a strongly-typed domain event
   */
  subscribe<K extends EventKey>(
    eventName: K,
    handler: EventHandler<DomainEventRegistry[K]>,
  ): () => void {
    const safeListener = async (event: DomainEventRegistry[K]) => {
      try {
        await handler(event);
      } catch (err) {
        logger.error(
          { eventName: event.eventName, eventId: event.id, err },
          "DomainEventBus: Unhandled error in event listener",
        );
      }
    };

    this.emitter.on(eventName, safeListener);
    return () => {
      this.emitter.off(eventName, safeListener);
    };
  }

  /**
   * Publish a strongly-typed domain event
   */
  async publish<K extends EventKey>(
    eventName: K,
    aggregateId: string,
    payload: DomainEventRegistry[K]["payload"],
    explicitOrgId?: string,
  ): Promise<DomainEventRegistry[K]> {
    const tenant = getCurrentTenant();
    const event: BaseDomainEvent<K, typeof payload> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      eventName,
      aggregateId,
      occurredAt: new Date().toISOString(),
      organizationId: explicitOrgId ?? tenant?.organizationId ?? "org_default",
      payload,
    };

    logger.info(
      {
        eventName,
        aggregateId,
        eventId: event.id,
        orgId: event.organizationId,
      },
      "DomainEventBus: Dispatched event",
    );

    // Emit asynchronously to not block the calling stack
    setImmediate(() => {
      this.emitter.emit(eventName, event);
    });

    return event as DomainEventRegistry[K];
  }

  /**
   * Remove all listeners (useful for test teardown)
   */
  clear(): void {
    this.emitter.removeAllListeners();
  }
}

/** Global default Domain Event Bus instance */
export const domainEventBus = new DomainEventBus();
