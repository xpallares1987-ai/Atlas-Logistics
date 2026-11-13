/**
 * @file customs-warehouse.types.ts
 * @description Domain types and interfaces for Customs Warehouse (DA 7100, DDA 7600, ADT), AEAT Stock Ledger, and Bank Guarantees.
 * @module @atlas/frontend/types/customs-warehouse
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export type CustomsWarehouseTab =
  "LOTS_LEDGER" | "GUARANTEES_TAX" | "FACILITIES_HANDLING";

export type DischargeRegimeCode =
  "4071" | "3171" | "7171" | "5171" | "DOMESTIC_COMMERCE_DDA";

export type UsualHandlingType =
  | "LABELING_MARKING"
  | "REPACKING_SORTING"
  | "VENTILATION_DRYING"
  | "TESTING_SAMPLING"
  | "PRESERVATION_CLEANING"
  | "ALTERATION_MANUFACTURING";

export type CustomsLotStatus =
  "ACTIVE" | "PARTIALLY_DISCHARGED" | "CLOSED_DISCHARGED" | "EXPIRED_ALERT";

export interface CustomsStockLedgerEntry {
  id: string;
  entrySequentialNumber: number;
  movementType: string;
  documentReference: string;
  packagesDelta: number;
  packagesBalanceAfter: number;
  releasedSuspendedDebtEur: number;
}

export interface CustomsInventoryLot {
  id: string;
  lotNumber: string;
  status: CustomsLotStatus;
  customsRegimeCode: string;
  ownerCompanyName: string;
  taricCommodityCode: string;
  goodsDescription?: string;
  originCountryCode?: string;
  inclusionDvdNumber?: string;
  inclusionDuaMrn?: string;
  initialPackageCount: number;
  currentPackageCount: number;
  currentNetMassKg?: number;
  currentGrossMassKg?: number;
  warehouseLocationRack?: string;
  customsValueEur: number;
  dutyTariffRatePercent?: number;
  suspendedDutyAmountEur: number;
  importVatRatePercent?: number;
  suspendedVatAmountEur: number;
  totalSuspendedDebtEur: number;
  remarks?: string;
  responsibleCustomsAgent?: string;
  entries?: CustomsStockLedgerEntry[];
}

export interface CustomsBankGuarantee {
  id: string;
  guaranteeReferenceNumber: string;
  status: string;
  guarantorFinancialInstitution: string;
  customsOfficeCode: string;
  totalGuaranteeAmountEur: number;
  committedSuspendedDebtEur: number;
  availableCreditEur: number;
}

export interface CustomsFacility {
  id: string;
  name: string;
  facilityType: string;
  customsAuthorityAuthorizationRef: string;
  city: string;
  totalPalletCapacity: number;
  totalVolumeM3: number;
  maxStayDaysLimit?: number | null;
}

export interface DischargeSimulationResult {
  settledDutyAmountEur: number;
  settledVatAmountEur: number;
  totalSettledTaxesEur: number;
  releasedGuaranteeCreditEur: number;
  taxExemptionRationale: string;
}
