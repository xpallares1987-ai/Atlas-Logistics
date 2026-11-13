/**
 * @file rail-freight.types.ts
 * @description Domain types and status literals for the Intermodal Rail Freight & TEN-T Corridors module.
 * @module @atlas/frontend/types/rail-freight
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

export type RailFreightTab = "CONSIGNMENTS" | "TRAIN_CONSIST" | "AXLE_AUDIT";

export type RailLineCategory = "A" | "B" | "C" | "D";

export type RailConsignmentStatus =
  "PLANNED" | "TRAIN_FORMED" | "IN_TRANSIT" | "GAUGE_TRANSFERRED" | "DELIVERED";

export interface RailCorridor {
  id: string;
  name: string;
  code?: string;
}

export interface RailTerminal {
  id: string;
  name: string;
  countryCode?: string;
}

export interface RailWagon {
  id: string;
  uicWagonNumber: string;
  wagonSeries: string;
  tareWeightTonnes: number;
  numberOfAxles: number;
  maxPayloadCategoryD: number;
  isP400Certified?: boolean;
}

export interface RailTrainConsist {
  id: string;
  trainRunNumber: string;
  status: string;
  locomotiveSeries: string;
  tractionOperator: string;
  totalTrainLengthMeters: number;
  totalGrossMassTonnes: number;
  calculatedBrakePercentage: number;
}

export interface RailConsignment {
  id: string;
  cimNumber: string;
  status: RailConsignmentStatus;
  senderName: string;
  consigneeName: string;
  railwayUndertakingRu: string;
  totalGrossMassTonnes: number;
  totalTeu: number;
  nhmCommodityCode: string;
  customsStatus?: string;
  originTerminalId: string;
  destinationTerminalId: string;
  gaugeTransferTerminalId?: string;
  departureDate?: string;
  estimatedArrivalDate?: string;
  remarks?: string;
  responsibleRailwayOfficer?: string;
  allocations?: any[];
}

export interface TrainPhysicsResult {
  totalTrainLengthMeters: number;
  totalGrossMassTonnes: number;
  calculatedBrakePercentage: number;
  isLengthCompliant: boolean;
  isBrakeCompliant: boolean;
  notes: string;
}

export interface AxleLoadResult {
  grossWagonMassTonnes: number;
  calculatedAxleLoadTonnes: number;
  maxAllowedAxleLoadTonnes: number;
  isCompliant: boolean;
  notes: string;
}
