/**
 * @file index.ts
 * @description Types and domain contracts for Scope 3 carbon insetting, book-and-claim ledger, and FuelEU pooling.
 * @module @atlas/frontend/components/CarbonInsetting/types
 */

import { FuelType, TransportMode } from "@atlas/shared";

export type InsettingTabKey =
  | "TOKENS_LEDGER"
  | "ALLOCATION_STUDIO"
  | "FUELEU_POOLING"
  | "SUSTAINABILITY_AUDIT";

export interface AllocFormState {
  fuelType: FuelType;
  fuelVolumeMT: number;
  bunkerLocation: string;
  bdnReference: string;
  sustainabilityCertificateNumber: string;
  allocatedShipmentRef: string;
  beneficiaryCompany: string;
  transportMode: TransportMode;
}

export interface AvailableShipmentOption {
  id: string;
  bookingReference?: string;
  shipmentNumber?: string;
  referenceNumber?: string;
}
