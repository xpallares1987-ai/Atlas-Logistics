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

export interface FuelEuHeaderProps {
  currentAccount: any;
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
  voyages: any[];
  loadingVoyages: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeScopeFilter: string;
  setActiveScopeFilter: (scope: string) => void;
  selectedVoyage: any;
  onSelectVoyage: (v: any) => void;
  currentVoyage: any;
  onOpenVerifyModal: (voyage: any) => void;
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
  etsSimResult: any;
  onRunEtsCalc: () => void;
}

export interface PoolingFuelsTabProps {
  fuels: any[];
  simFuelCode: string;
  setSimFuelCode: (code: string) => void;
  simFuelTonnes: number;
  setSimFuelTonnes: (v: number) => void;
  simOpsKwh: number;
  setSimOpsKwh: (v: number) => void;
  fuelSimResult: any;
  onRunFuelSim: () => void;
  pools: any[];
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
