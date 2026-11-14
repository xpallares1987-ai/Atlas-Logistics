/**
 * @file index.ts
 * @description Types and contracts for Incoterms 2020 commercial contract management and simulator.
 * @module @atlas/frontend/components/IncotermsContracts/types
 */

export type IncotermsTabKey = "CONTRACTS" | "MATRIX";

export interface IncotermRule {
  code: string;
  name: string;
  transportCategory: "ANY_MODE" | "SEA_INLAND_WATERWAY";
  riskTransferPoint: string;
  insuranceRequirement:
    "MANDATORY_CLAUSE_A" | "MANDATORY_CLAUSE_C" | "OPTIONAL";
  customsExportBy: "SELLER" | "BUYER";
  customsImportBy: "SELLER" | "BUYER";
}

export interface CommercialContract {
  id: string;
  contractNumber: string;
  incotermCode: string;
  title: string;
  namedPlace: string;
  goodsValue: number;
  currency: string;
  transportMode: string;
  status: string;
  sellerData?: {
    name: string;
    address: string;
    taxId: string;
    contact: string;
  };
  buyerData?: {
    name: string;
    address: string;
    taxId: string;
    contact: string;
  };
  forwarderData?: {
    name: string;
  };
  disputeJurisdiction?: string;
  governingLaw?: string;
  freightEstimatedCost?: number;
  insuranceEstimatedCost?: number;
  customsEstimatedDuty?: number;
  milestonesData?: Array<{
    name: string;
    date: string;
    status: string;
  }>;
}

export interface SimulatorFormState {
  simIncoterm: string;
  simMode: string;
  simContainerized: boolean;
  simGoodsValue: number;
  simFreight: number;
  simInsurance: number;
  simPreCarriage: number;
  simExportCosts: number;
  simImportDuty: number;
  simImportVat: number;
  simDestTransport: number;
}
