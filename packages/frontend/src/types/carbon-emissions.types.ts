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

export interface CarbonHeaderProps {
  summary: any;
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
  calculations: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCalculation: any;
  onSelectCalculation: (calc: any) => void;
  calcDetails: any;
  onNavigateCertificates: () => void;
  onOpenOffsetForCalc: (calc: any) => void;
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
  onLegChange: (index: number, field: keyof LegInput, value: any) => void;
  onRunCalculation: () => void;
  calcResult: any;
  greenAlternatives: any[];
}

export interface MarketplaceTabProps {
  projects: any[];
  onSelectProjectForOffset: (projectId: string) => void;
}

export interface CertificatesTabProps {
  certificates: any[];
}

export interface OffsetPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculations: any[];
  selectedCalculation: any;
  setSelectedCalculation: (calc: any) => void;
  projects: any[];
  offsetSelectedProjectId: string;
  setOffsetSelectedProjectId: (id: string) => void;
  beneficiaryInput: string;
  setBeneficiaryInput: (v: string) => void;
  onConfirmOffset: () => void;
}
