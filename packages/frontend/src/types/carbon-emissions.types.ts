/**
 * @file carbon-emissions.types.ts
 * @description Types and interfaces for Scope 3 Carbon Footprint Calculator (ISO 14083 & GLEC Framework v3).
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export type CarbonTab =
  "JOURNEYS" | "CALCULATOR" | "MARKETPLACE" | "CERTIFICATES";

export interface LegInput {
  originName: string;
  destinationName: string;
  mode: string;
  distanceKm: number;
  weightKg: number;
}

export interface CarbonLeg {
  id?: string;
  originName: string;
  destinationName: string;
  mode: string;
  distanceKm: number;
  weightKg: number;
  tco2eWtw?: number;
  legTco2eWtw?: number;
  tco2eTtw?: number;
  tco2eWtt?: number;
  legOrder?: number;
  emissionFactorWtw?: number;
}

export interface CarbonCalculation {
  id: string;
  referenceCode: string;
  originCity: string;
  destinationCity: string;
  totalDistanceKm: number;
  totalWeightKg?: number;
  totalTco2eWtw: number;
  totalTco2eTtw: number;
  totalTco2eWtt: number;
  carbonIntensityGco2ePerTkm?: number;
  status: string;
  createdAt: string;
  offsetCostEur?: number | null;
  offsetProjectId?: string | null;
  legs?: CarbonLeg[];
}

export interface CarbonSummary {
  totalCalculations: number;
  totalTco2eWtw: number;
  totalTco2eTtw: number;
  totalTco2eWtt: number;
  totalDistanceKm: number;
  totalTco2eOffset: number;
  totalOffsetInvestmentEur: number;
  offsetPercentage: number;
  activeProjectsCount?: number;
  totalCertificatesIssued?: number;
  issuedCertificatesCount?: number;
  averageIntensityGCo2PerTkm?: number;
  avgCarbonIntensity?: number;
  totalEmissionsByMode?: Record<string, number>;
}

export interface CarbonProject {
  id: string;
  name: string;
  projectType: string;
  standard: string;
  registryUrl?: string | null;
  verificationRegistryUrl?: string | null;
  location: string;
  pricePerTco2eEur: number;
  availableCreditsTco2e: number;
  description?: string | null;
  imageUrl?: string | null;
  category?: string;
  country?: string;
}

export interface CarbonCertificate {
  id: string;
  certificateNumber: string;
  calculationId: string;
  projectId: string;
  projectName?: string;
  projectStandard?: string;
  tco2eRetired: number;
  offsetTco2e?: number;
  amountPaidEur?: number;
  beneficiaryName: string;
  issuedAt: string;
  registrySerial: string;
  pdfUrl?: string | null;
}

export interface GreenAlternative {
  mode: string;
  modeName?: string;
  description: string;
  estimatedTco2e: number;
  simulatedTco2eWtw?: number;
  savedTco2e?: number;
  savingsPercentage: number;
  reductionPercentage?: number;
}

export interface CarbonHeaderProps {
  summary: CarbonSummary | null;
  onOpenCalculator: () => void;
}

export interface CarbonNavigationProps {
  activeTab: CarbonTab;
  onSelectTab: (tab: CarbonTab) => void;
  calculationsCount: number;
  projectsCount: number;
  certificatesCount: number;
}

export interface JourneysTabProps {
  calculations: CarbonCalculation[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCalculation: CarbonCalculation | null;
  onSelectCalculation: (calc: CarbonCalculation) => void;
  calcDetails: CarbonCalculation | null;
  onNavigateCertificates: () => void;
  onOpenOffsetForCalc: (calc: CarbonCalculation) => void;
}

export interface CalculatorTabProps {
  calcRefCode: string;
  setCalcRefCode: (v: string) => void;
  calcOriginCity: string;
  setCalcOriginCity: (v: string) => void;
  calcDestinationCity: string;
  setCalcDestinationCity: (v: string) => void;
  calcLegs: LegInput[];
  onAddLeg: () => void;
  onRemoveLeg: (index: number) => void;
  onLegChange: (
    index: number,
    field: keyof LegInput,
    value: string | number,
  ) => void;
  onRunCalculation: () => void;
  calcResult: CarbonCalculation | null;
  greenAlternatives: GreenAlternative[];
}

export interface MarketplaceTabProps {
  projects: CarbonProject[];
  onSelectProjectForOffset: (projectId: string) => void;
}

export interface CertificatesTabProps {
  certificates: CarbonCertificate[];
}

export interface OffsetPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculations: CarbonCalculation[];
  selectedCalculation: CarbonCalculation | null;
  setSelectedCalculation: (calc: CarbonCalculation | null) => void;
  projects: CarbonProject[];
  offsetSelectedProjectId: string;
  setOffsetSelectedProjectId: (id: string) => void;
  beneficiaryInput: string;
  setBeneficiaryInput: (v: string) => void;
  onConfirmOffset: () => void;
}
