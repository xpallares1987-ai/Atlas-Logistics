/**
 * @file cbam.types.ts
 * @description Domain types for Carbon Border Adjustment Mechanism (CBAM - Regulation EU 2023/956 & EU ETS Article 9).
 * @module @atlas/frontend/types/cbam
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export type CbamTabId = "DECLARATIONS" | "CALCULATOR" | "FINANCE_ETS";

export type CbamDeclarationStatus =
  "VALIDATED" | "SUBMITTED_REGISTRY" | "AMENDED" | "DRAFT";

export interface CbamDeclarationLine {
  id: string;
  duaBox33HsCode: string;
  duaNumber?: string;
  goodDescription: string;
  originCountry: string;
  netWeightTonnes: number;
  totalLineEmissionsTco2e: number;
  effectiveForeignPricePaidEur: number;
  lineNetLiabilityEur: number;
}

export interface CbamDeclaration {
  id: string;
  declarationNumber: string;
  importerName: string;
  importerVat: string;
  reportingPeriod: string;
  status: CbamDeclarationStatus;
  totalNetMassTonnes: number;
  totalDirectEmissionsTco2e: number;
  totalIndirectEmissionsTco2e: number;
  totalEmbeddedEmissionsTco2e: number;
  netCarbonLiabilityEur: number;
  remarks?: string;
  responsibleDeclarant?: string;
  lines?: CbamDeclarationLine[];
}

export interface CbamCatalogItem {
  id: string;
  cnCode: string;
  sector: string;
  description: string;
  defaultDirectEmissionFactor: number;
  defaultIndirectEmissionFactor: number;
}

export interface CbamInstallation {
  id: string;
  installationName: string;
  countryCode: string;
  operatorName: string;
  verifierName: string;
}

export interface CbamEmissionsResult {
  totalEmbeddedEmissionsTco2e: number;
  totalSpecificFactor: number;
  comparisonWithEuDefaults?: {
    percentageSavingsVsDefault: number;
    deltaTco2e: number;
  };
}

export interface CbamLiabilityResult {
  grossCarbonLiabilityEur: number;
  foreignCarbonPricePaidEur: number;
  netCarbonLiabilityEur: number;
  notes: string;
}
