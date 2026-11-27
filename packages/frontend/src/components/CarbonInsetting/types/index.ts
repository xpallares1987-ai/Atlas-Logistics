/**
 * @file index.ts
 * @description Types and domain contracts for Scope 3 carbon insetting, book-and-claim ledger, and FuelEU pooling.
 * @module @atlas/frontend/components/CarbonInsetting/types
 */

import { FuelType, TransportMode } from "@atlas/shared";

export type InsettingTabKey =
  | "TOKENS_LEDGER"
  | "ALLOCATION_STUDIO"
  | "BLOCKCHAIN_LEDGER"
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

export interface InsettingAllocationRecord {
  id: string;
  allocationReference: string;
  tokenId: string;
  shipmentId: string | null;
  beneficiaryCompanyId: string | null;
  beneficiaryName: string;
  transportMode: string;
  allocatedEnergyMj: number;
  equivalentFuelVolumeTonnes: number;
  abatedGhgTco2eq: number;
  costEur: number;
  certificateCode: string;
  verificationQrUrl: string;
  previousBlockHash: string;
  blockHashSha256: string;
  status: string;
  leadAuditorVerifier: string;
  allocatedAt: string;
}

export interface BlockchainVerificationReport {
  isValid: boolean;
  totalAllocationsChecked: number;
  genesisBlockHash: string;
  latestBlockHash: string | null;
  tamperedAllocationId?: string;
  verificationTimestamp: string;
}

export interface AvailableShipmentOption {
  id: string;
  bookingReference?: string;
  shipmentNumber?: string;
  referenceNumber?: string;
}
