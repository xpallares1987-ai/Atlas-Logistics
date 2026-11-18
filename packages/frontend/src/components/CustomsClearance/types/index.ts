/**
 * @file index.ts
 * @description Type definitions and contracts for customs clearance declarations, TARIC calculations, and risk channels.
 * @module @atlas/frontend/components/CustomsClearance/types
 */

import { LucideIcon } from "lucide-react";

export type DeclarationFilter = "All" | "Hold" | "Pending" | "Cleared";

export interface EfirmaStamp {
  id: string;
  certificateSerial: string;
  rfcTitular: string;
  razonSocial: string;
  selloDigital?: string;
  tamperSealHash: string;
  status: string;
  verifiedAt: string;
  csvCode?: string;
}

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
  aiRiskScore?: number;
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
  efirma?: EfirmaStamp | null;
  [key: string]: unknown;
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
  customsValueCif?: number;
  adValoremAmount?: number;
  specificAmount?: number;
  totalDuty?: number;
  importDuty?: number;
  vatBase?: number;
  vatAmount?: number;
  totalPayable?: number;
  totalCustomsPayable?: number;
  dutyRateFormatted?: string;
  vatRateFormatted?: string;
  dutyRateApplied?: number | null;
  vatRateApplied?: number | null;
  isDualUse?: boolean;
  sanctionFlag?: boolean;
  [key: string]: unknown;
}
