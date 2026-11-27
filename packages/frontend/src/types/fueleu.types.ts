/**
 * @file fueleu.types.ts
 * @description Types and interfaces for FuelEU Maritime, EU ETS & Fleet Decarbonization module.
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export type FuelEuTab = "VOYAGES_GHG" | "ETS_GREEN_BAF" | "POOLING_FUELS";

export type FuelEuGeographicScope =
  "INTRA_EU_100" | "EXTRA_EU_50" | "BERTH_PORT_EU_100";

export type VoyageVerificationStatus =
  "PLANNED" | "UNDERWAY" | "COMPLETED_VERIFIED" | "AUDITED_THETIS";

export interface FuelEuVoyage {
  id: string;
  status: VoyageVerificationStatus | string;
  voyageReferenceNumber: string;
  vesselId?: string;
  vessel?: {
    vesselName?: string;
    imoNumber?: string;
    [key: string]: unknown;
  };
  fuelId?: string;
  fuel?: {
    fuelName?: string;
    [key: string]: unknown;
  };
  calculatedGhgIntensityGco2eqPerMj: number;
  totalEnergyConsumedMj: number;
  geographicScope: FuelEuGeographicScope | string;
  etsApplicableScopeEmissionsTco2eq: number;
  carriedTeuCount: number;
  departurePortName: string;
  departurePortLocode: string;
  arrivalPortName: string;
  arrivalPortLocode: string;
  distanceNauticalMiles: number;
  navigationHours: number;
  berthHours: number;
  fuelConsumedTonnes: number;
  opsElectricityConsumedKwh: number;
  leadAuditorVerifier?: string;
  co2EmissionsTonnes: number;
  ch4EmissionsTonnes: number;
  n2oEmissionsTonnes: number;
  [key: string]: unknown;
}

export interface ComplianceAccount {
  id: string;
  vesselId: string;
  reportingYear: number;
  targetGhgIntensityGco2eqPerMj: number;
  actualAttainedGhgIntensityGco2eqPerMj: number;
  totalAnnualEnergyMj: number;
  complianceBalanceGco2eq: number;
  complianceStatus:
    "SURPLUS" | "DEFICIT" | "BALANCED_BY_POOL" | "PENALTY_PAID" | string;
  calculatedFuelEuPenaltyEur: number;
  bankedSurplusTransferredNextYearGco2eq?: number;
  borrowedDeficitFromNextYearGco2eq?: number;
  poolId?: string | null;
  verifierAccreditationNumber?: string;
  accountHolderName?: string;
  currentBalance?: number;
  [key: string]: unknown;
}

export interface FuelRecord {
  id: string;
  fuelCode: string;
  fuelName: string;
  totalWtwFactorGco2eqPerMj?: number;
  emissionFactorGhg?: number;
  lcvMjPerGram?: number;
  [key: string]: unknown;
}

export interface PoolRecord {
  id: string;
  poolReference?: string;
  poolCode?: string;
  poolName?: string;
  complianceBalanceEur?: number;
  status?: string;
  managingOperatorName?: string;
  reportingYear?: number | string;
  consolidatedNetComplianceBalanceGco2eq: number;
  isPoolCompliantZeroPenalty?: boolean;
  totalEnrolledVesselsCount?: number;
  remarks?: string;
  [key: string]: unknown;
}

export interface EtsLiability {
  totalGrossGhgTco2eq: number;
  applicableScopeEmissionsTco2eq: number;
  scopeFactor: number;
  totalEtsFinancialLiabilityEur: number;
  euaPriceEurPerTonne: number;
}

export interface GreenBafResult {
  carriedTeus: number;
  fueleuImpactPerTeuEur: number;
  etsImpactPerTeuEur: number;
  totalGreenBafSurchargePerTeuEur: number;
  totalGreenSurchargeFor40FtContainerEur: number;
}

export interface EtsSimResult {
  scopeEmissions?: number;
  etsCostEur?: number;
  bafSurchargePerTeuEur?: number;
  totalCostImpactEur?: number;
  etsLiability: EtsLiability;
  greenBaf: GreenBafResult;
  [key: string]: unknown;
}

export interface GhgMetrics {
  calculatedGhgIntensityGco2eqPerMj: number;
}

export interface ComplianceMetrics {
  targetGhgIntensityGco2eqPerMj: number;
  isCompliant: boolean;
  complianceStatus: string;
  complianceBalanceTonnesCo2eq: number;
  fuelEuPenaltyEur: number;
}

export interface FuelSimResult {
  ghgIntensity?: number;
  penaltyEur?: number;
  complianceSurplusMj?: number;
  isCompliant?: boolean;
  ghgMetrics: GhgMetrics;
  complianceMetrics: ComplianceMetrics;
  [key: string]: unknown;
}

export interface FuelEuHeaderProps {
  currentAccount: ComplianceAccount | null;
  voyagesCount: number;
  vesselsCount: number;
  totalFuelEnergySum: number;
  avgGhgIntensity: number;
  totalEtsEmissionsSum: number;
  poolsCount: number;
  activeTab: FuelEuTab;
  onSelectTab: (tab: FuelEuTab) => void;
}

export interface VoyagesGhgTabProps {
  voyages: FuelEuVoyage[];
  loadingVoyages: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeScopeFilter: string;
  setActiveScopeFilter: (scope: string) => void;
  selectedVoyage: FuelEuVoyage | null;
  onSelectVoyage: (v: FuelEuVoyage | null) => void;
  currentVoyage: FuelEuVoyage | null;
  onOpenVerifyModal: (voyage: FuelEuVoyage) => void;
}

export interface EtsGreenBafTabProps {
  simScope: FuelEuGeographicScope;
  setSimScope: (scope: FuelEuGeographicScope) => void;
  simCo2Tonnes: number;
  setSimCo2Tonnes: (v: number) => void;
  simCh4Tonnes: number;
  setSimCh4Tonnes: (v: number) => void;
  simN2oTonnes: number;
  setSimN2oTonnes: (v: number) => void;
  simEuaPrice: number;
  setSimEuaPrice: (v: number) => void;
  simCarriedTeus: number;
  setSimCarriedTeus: (v: number) => void;
  simFueleuImpact: number;
  setSimFueleuImpact: (v: number) => void;
  etsSimResult: EtsSimResult | null;
  onRunEtsCalc: () => void;
}

export interface PoolingFuelsTabProps {
  fuels: FuelRecord[];
  simFuelCode: string;
  setSimFuelCode: (code: string) => void;
  simFuelTonnes: number;
  setSimFuelTonnes: (v: number) => void;
  simOpsKwh: number;
  setSimOpsKwh: (v: number) => void;
  fuelSimResult: FuelSimResult | null;
  onRunFuelSim: () => void;
  pools: PoolRecord[];
  accounts?: ComplianceAccount[];
  vessels?: Record<string, unknown>[];
  onSettlePool?: (poolId: string) => Promise<void>;
  onCreatePool?: (input: {
    poolCode: string;
    poolName: string;
    reportingYear: number;
    managingOperatorName: string;
    vesselIds: string[];
    remarks?: string;
  }) => Promise<void>;
  onBankSurplus?: (accountId: string, amountGco2eq?: number) => Promise<void>;
  onBorrowDeficit?: (accountId: string, amountGco2eq?: number) => Promise<void>;
}

export interface StatusVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusInput: VoyageVerificationStatus;
  setStatusInput: (status: VoyageVerificationStatus) => void;
  verifierInput: string;
  setVerifierInput: (v: string) => void;
  onConfirm: () => void;
}
