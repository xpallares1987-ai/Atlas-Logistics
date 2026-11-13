/**
 * @file trade-finance.types.ts
 * @description Domain types for International Trade Finance & Documentary Credits (UCP 600, URDG 758, ISBP 745, and SWIFT MT700/MT734).
 * @module @atlas/frontend/types/trade-finance
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export type TradeFinanceTabId =
  "INSTRUMENTS_DOCS" | "UCP_DISCREPANCIES" | "FEE_SIMULATOR";

export interface TradeDocument {
  id: string;
  documentType: string;
  documentReferenceNumber: string;
  issuerName: string;
  documentDate: string;
  originalCopiesPresented: number;
  originalCopiesRequired: number;
  complianceStatus: "COMPLIANT" | "DISCREPANT" | string;
}

export interface UcpDiscrepancy {
  id?: string;
  articleReference: string;
  severity: "CRITICAL_REFUSAL" | "MINOR_WARNING" | string;
  status: string;
  description: string;
  suggestedRemedy: string;
}

export interface TradeInstrument {
  id: string;
  instrumentReference: string;
  instrumentType: string;
  applicableRules: string;
  beneficiaryName: string;
  applicantName: string;
  issuingBankName: string;
  issuingBankBic: string;
  confirmingBankName?: string;
  creditAmount: number;
  currency: string;
  tolerancePercentage: number;
  latestShipmentDate: string;
  expiryDate: string;
  presentationPeriodDays: number;
  portOfLoading: string;
  portOfDischarge: string;
  paymentTerms: string;
  tenorDays: number;
  goodsDescriptionSummary: string;
  status: string;
  documents?: TradeDocument[];
  discrepancies?: UcpDiscrepancy[];
}

export interface GeminiUcpAuditResult {
  instrumentReference: string;
  audit: {
    instrumentReference: string;
    compliantWithUcp600: boolean;
    presentationRiskLevel: string;
    discrepanciesFound: Array<{
      article: string;
      field: string;
      status: string;
      detail: string;
    }>;
    recommendedActions: string[];
  };
  source: string;
  model: string;
  latencyMs: number;
  quotaRemainingRpm: number;
}

export interface UcpValidationResult {
  complianceStatus: string;
  totalDiscrepanciesCount: number;
  presentationDaysElapsed: number;
  maxAllowedPresentationDays: number;
}

export interface BankFeeCalculationResult {
  calculatedOpeningFeeEur: number;
  quarterPeriods: number;
  openingFeeRatePct: number;
  calculatedConfirmationFeeEur: number;
  confirmationFeeRatePct: number;
  totalBankFeesEur: number;
  effectiveBankCostPct: number;
  calculatedDiscrepancyFeeEur: number;
  calculatedAmendmentFeeEur: number;
  calculatedPaymentFeeEur: number;
}
