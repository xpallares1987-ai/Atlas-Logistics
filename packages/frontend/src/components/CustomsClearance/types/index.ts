/**
 * @file index.ts
 * @description Type definitions and contracts for customs clearance declarations, TARIC calculations, and risk channels.
 * @module @atlas/frontend/components/CustomsClearance/types
 */

import { LucideIcon } from "lucide-react";

export type DeclarationFilter = "All" | "Hold" | "Pending" | "Cleared";

export interface CustomsDeclaration {
  id: string;
  shipmentId?: string;
  duaNumber?: string;
  blNumber?: string;
  hsCode?: string;
  hsDescription?: string;
  type?: string;
  status: string;
  customsValue?: number;
  dutiesAmount?: number;
  taxesAmount?: number;
  totalPayable?: number;
  eoriNumber?: string;
  originCountry?: string;
  destinationCountry?: string;
  riskScore?: number;
  riskFlags?: string | string[];
  isDualUse?: boolean | number;
  hasSanctionWarning?: boolean;
  adValoremDuty?: number;
  specificDutyPerKg?: number;
  vatRate?: number;
  consigneeName?: string;
  exporterName?: string;
  grossWeightKg?: number;
  hasPreferentialOriginCert?: boolean;
  createdAt?: string | number;
  [key: string]: any;
}

export interface StatusVisuals {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  glow: string;
  label: string;
}

export interface TariffCalcParams {
  hsCode: string;
  fobValue: number;
  freightCost: number;
  insuranceCost: number;
  grossWeightKg: number;
  originCountry: string;
  hasPreferentialOriginCert: boolean;
}

export interface TariffCalcResult {
  cifValue?: number;
  adValoremAmount?: number;
  specificAmount?: number;
  totalDuty?: number;
  vatBase?: number;
  vatAmount?: number;
  totalPayable?: number;
  dutyRateFormatted?: string;
  vatRateFormatted?: string;
  isDualUse?: boolean;
  sanctionFlag?: boolean;
  [key: string]: any;
}
