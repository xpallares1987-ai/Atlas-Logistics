/**
 * @file cold-chain.types.ts
 * @description Domain types for Cold Chain & Pharma GDP / Reefer telemetry (EN 12830, Arrhenius MKT, UN 1845 Dry Ice, and Reefer Genset).
 * @module @atlas/frontend/types/cold-chain
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export type ColdChainTabId = "MONITOR" | "CALCULATOR" | "AUDIT_GDP";

export type GdpReleaseVerdict =
  | "RELEASED_FOR_DISTRIBUTION"
  | "QUARANTINE_INVESTIGATION"
  | "REJECTED_DISPOSAL";

export interface ColdChainProfile {
  id: string;
  name: string;
  minTempCelsius: number;
  maxTempCelsius: number;
}

export interface ColdChainReading {
  id: string;
  recordedAt: string;
  probeTemperatureCelsius: number;
  ambientTemperatureCelsius?: number;
  relativeHumidityPct?: number;
  powerSupplyMode?: string;
  isExcursion?: boolean;
}

export interface ColdChainShipment {
  id: string;
  trackingNumber: string;
  productDescription: string;
  batchNumber: string;
  loggerSerialNumber: string;
  pharmaClassification: string;
  setpointTempCelsius: number;
  mktCalculatedCelsius?: number;
  excursionDurationMinutes?: number;
  excursionStatus?: string;
  gdpReleaseVerdict: GdpReleaseVerdict;
  qualityAuditNotes?: string;
  responsiblePersonName?: string;
  currentDryIceWeightKg?: number;
  readings?: ColdChainReading[];
}

export interface MktEvaluationResult {
  mktCelsius: number;
  mktKelvin: number;
  avgRecordedCelsius: number;
  totalExcursionMinutes: number;
  stabilityAuditNotes: string;
}

export interface DryIceSimResult {
  holdoverHoursRemaining: number;
  projectedWeightAtArrivalKg: number;
  notes: string;
}

export interface ReeferPowerSimResult {
  deltaTCelsius: number;
  fuelBurnRateLitersPerHr: number;
  totalFuelConsumedLiters: number;
  notes: string;
}
