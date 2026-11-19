/**
 * @file pdf.service.ts
 * @description Unified facade delegating official logistics, customs, compliance, and financial PDF document generation to domain-specific PDFKit generators.
 * @module @atlas/api/services/pdf
 * @see {@link docs/architecture/atlas-joint-improvement-plan.md}
 */

import { BulkOperationsPdfGenerator } from "./pdf/generators/bulk-operations.pdf.js";
import { CargoInsurancePdfGenerator } from "./pdf/generators/cargo-insurance.pdf.js";
import { DangerousGoodsPdfGenerator } from "./pdf/generators/dangerous-goods.pdf.js";
import { GeneralAveragePdfGenerator } from "./pdf/generators/general-average.pdf.js";
import { CharteringPdfGenerator } from "./pdf/generators/chartering.pdf.js";
import { AeoSecurityPdfGenerator } from "./pdf/generators/aeo-security.pdf.js";
import { TradeFinancePdfGenerator } from "./pdf/generators/trade-finance.pdf.js";
import { FuelEuPdfGenerator } from "./pdf/generators/fueleu.pdf.js";
import { CustomsWarehousePdfGenerator } from "./pdf/generators/customs-warehouse.pdf.js";
import { RailPdfGenerator } from "./pdf/generators/rail.pdf.js";
import { CbamPdfGenerator } from "./pdf/generators/cbam.pdf.js";
import { ColdChainPdfGenerator } from "./pdf/generators/cold-chain.pdf.js";
import { TreasuryPdfGenerator } from "./pdf/generators/treasury.pdf.js";
import { RoadFreightPdfGenerator } from "./pdf/generators/road-freight.pdf.js";
import { ClaimsPdfGenerator } from "./pdf/generators/claims.pdf.js";
import { IncotermsPdfGenerator } from "./pdf/generators/incoterms.pdf.js";
import { AirCargoPdfGenerator } from "./pdf/generators/air-cargo.pdf.js";
import {
  CustomsPdfGenerator,
  type CustomsData,
} from "./pdf/generators/customs.pdf.js";
import {
  CoreOperationsPdfGenerator,
  HBLData,
  InvoiceData,
  AgentSettlementData,
  BookingConfirmationData,
  QuotePdfData,
} from "./pdf/generators/core-operations.pdf.js";

// ============================================================================
// 1. TYPE DEFINITIONS & EXPORTED DTO CONTRACTS
// ============================================================================

export type {
  HBLData,
  InvoiceData,
  AgentSettlementData,
  BookingConfirmationData,
  QuotePdfData,
  CustomsData,
};

/**
 * Structural domain record accepted by modular PDFKit generators whose internal
 * formatters read normalized entity fields from Drizzle rows or DTOs.
 */
export type PdfDomainRecord = Readonly<Record<string, unknown>> | object;

/**
 * Nullable/optional domain record for secondary PDF document context blocks
 * such as company profiles, pools, or open cover policies.
 */
export type PdfOptionalDomainRecord = PdfDomainRecord | null | undefined;

/**
 * Read-only collection of structured domain records passed to tabular PDF sections.
 */
export type PdfDomainRecordList = readonly PdfDomainRecord[];

export type AirWaybillPdfInput = Parameters<
  typeof AirCargoPdfGenerator.generateAirWaybill
>[0];

export type CommercialContractPdfInput = Parameters<
  typeof IncotermsPdfGenerator.generateCommercialContract
>[0];

export type CarrierProtestLetterPdfInput = Parameters<
  typeof ClaimsPdfGenerator.generateCarrierProtestLetter
>[0];

export type SubrogationReceiptPdfInput = Parameters<
  typeof ClaimsPdfGenerator.generateSubrogationReceipt
>[0];

export type EcmrWaybillPdfInput = Parameters<
  typeof RoadFreightPdfGenerator.generateEcmrWaybill
>[0];

export type CartaDePortePdfInput = Parameters<
  typeof RoadFreightPdfGenerator.generateCartaDePorte
>[0];

export interface LclManifestCargoItem {
  id?: string;
  hblNumber?: string;
  shipper?: string;
  consignee?: string;
  description?: string;
  packages?: number;
  weight?: number;
  weightKg?: number;
  volume?: number;
  volumeCbm?: number;
  [key: string]: unknown;
}

export interface LclManifestPdfData {
  containerId: string;
  specId?: string;
  route?: string;
  cargoItems: LclManifestCargoItem[];
  totalWeight: number;
}

export interface TradeCreditPresentationDossierData {
  instrument: PdfDomainRecord;
  documents: PdfDomainRecord[];
  discrepancies?: PdfDomainRecord[];
}

export interface UcpDiscrepancyAuditReportData {
  instrument: PdfDomainRecord;
  discrepancies: PdfDomainRecord[];
}

export interface DemandGuaranteeCertificateData {
  guarantee?: PdfOptionalDomainRecord;
  instrument?: PdfOptionalDomainRecord;
}

export interface AeoCaeAuditReportData {
  audit: PdfDomainRecord;
  sections: PdfDomainRecord[];
}

export interface SevenPointInspectionCertificateData {
  inspection: PdfDomainRecord;
}

export interface Iso17712SealCustodyCertificateData {
  custody?: PdfOptionalDomainRecord;
  seal?: PdfOptionalDomainRecord;
}

export interface BusinessPartnerRiskMatrixData {
  partners: PdfDomainRecord[];
}

// ============================================================================
// 2. PDF SERVICE FACADE
// ============================================================================

export class PDFService {
  /**
   * Generates a generic House Bill of Lading (HBL) PDF in memory.
   */
  public static async generateHBL(data: HBLData): Promise<Buffer> {
    return CoreOperationsPdfGenerator.generateHBL(data);
  }

  /**
   * Generates a commercial/operational invoice PDF.
   */
  public static async generateInvoice(data: InvoiceData): Promise<Buffer> {
    return CoreOperationsPdfGenerator.generateInvoice(data);
  }

  /**
   * Generates an Agent Settlement Statement PDF in memory.
   */
  public static async generateAgentSettlement(
    data: AgentSettlementData,
    invoices: InvoiceData[] = [],
  ): Promise<Buffer> {
    return CoreOperationsPdfGenerator.generateAgentSettlement(data, invoices);
  }

  /**
   * Generates an official Commercial Freight Quotation PDF in memory.
   */
  public static async generateQuote(data: QuotePdfData): Promise<Buffer> {
    return CoreOperationsPdfGenerator.generateQuote(data);
  }

  /**
   * Generates a Booking Confirmation PDF in memory.
   */
  public static async generateBookingConfirmation(
    data: BookingConfirmationData,
  ): Promise<Buffer> {
    return CoreOperationsPdfGenerator.generateBookingConfirmation(data);
  }

  /**
   * Generates an LCL Container Consolidation Manifest PDF.
   */
  public static async generateLclManifest(
    data: LclManifestPdfData,
  ): Promise<Buffer> {
    return CoreOperationsPdfGenerator.generateLclManifest(data);
  }

  /**
   * Generates an official Single Administrative Document (DUA / SAD) PDF in memory.
   */
  public static async generateCustomsDeclaration(
    data: CustomsData,
  ): Promise<Buffer> {
    return CustomsPdfGenerator.generateCustomsDeclaration(data);
  }

  /**
   * Generates an official IATA Air Waybill (AWB) document (neutral / airline standard).
   */
  public static async generateAirWaybill(
    data: AirWaybillPdfInput,
  ): Promise<Buffer> {
    return AirCargoPdfGenerator.generateAirWaybill(data);
  }

  /**
   * Generates an official bilingual commercial freight and sales contract PDF with ICC Incoterms 2020 clauses.
   */
  public static async generateCommercialContract(
    data: CommercialContractPdfInput,
  ): Promise<Buffer> {
    return IncotermsPdfGenerator.generateCommercialContract(data);
  }

  /**
   * Generates a formal Notice of Claim and Carrier Protest Letter.
   */
  public static async generateCarrierProtestLetter(
    claim: CarrierProtestLetterPdfInput,
  ): Promise<Buffer> {
    return ClaimsPdfGenerator.generateCarrierProtestLetter(claim);
  }

  /**
   * Generates an official Subrogation Receipt and Assignment of Rights PDF.
   */
  public static async generateSubrogationReceipt(
    claim: SubrogationReceiptPdfInput,
  ): Promise<Buffer> {
    return ClaimsPdfGenerator.generateSubrogationReceipt(claim);
  }

  /**
   * Generates an official Geneva 24-Box e-CMR Consignment Note (CMR Waybill).
   */
  public static async generateEcmrWaybill(
    consignment: EcmrWaybillPdfInput,
  ): Promise<Buffer> {
    return RoadFreightPdfGenerator.generateEcmrWaybill(consignment);
  }

  /**
   * Generates an official Spanish National Road Consignment Note (LOTT / Law 15/2009).
   */
  public static async generateCartaDePorte(
    consignment: CartaDePortePdfInput,
  ): Promise<Buffer> {
    return RoadFreightPdfGenerator.generateCartaDePorte(consignment);
  }

  /**
   * Generates a Carrier Freight Dispute / Debit Note PDF.
   */
  public static async generateCarrierDisputeLetter(
    invoice: PdfDomainRecord,
    disputedLines: PdfDomainRecord[],
    company?: PdfOptionalDomainRecord,
  ): Promise<Buffer> {
    return TreasuryPdfGenerator.generateCarrierDisputeLetter(
      invoice,
      disputedLines,
      company,
    );
  }

  /**
   * Generates an official Carrier Payment Settlement Statement PDF.
   */
  public static async generateCarrierSettlementStatement(
    batch: PdfDomainRecord,
    invoices: PdfDomainRecord[] = [],
    company?: PdfOptionalDomainRecord,
  ): Promise<Buffer> {
    return TreasuryPdfGenerator.generateCarrierSettlementStatement(
      batch,
      invoices,
      company,
    );
  }

  /**
   * Generates an official Pharma Cold Chain and GDP Release Certificate PDF (EN 12830).
   */
  public static async generateGdpReleaseCertificate(
    shipment: PdfDomainRecord,
    readings: PdfDomainRecord[] = [],
    profile?: PdfOptionalDomainRecord,
    company?: PdfOptionalDomainRecord,
  ): Promise<Buffer> {
    return ColdChainPdfGenerator.generateGdpReleaseCertificate(
      shipment,
      readings,
      profile,
      company,
    );
  }

  /**
   * Generates an official CBAM Embedded Emissions and Carbon Liability Declaration Certificate PDF (EU Reg. 2023/956).
   */
  public static async generateCbamDeclarationCertificate(
    declaration: PdfDomainRecord,
    lines: PdfDomainRecord[] = [],
    company?: PdfOptionalDomainRecord,
  ): Promise<Buffer> {
    return CbamPdfGenerator.generateCbamDeclarationCertificate(
      declaration,
      lines,
      company,
    );
  }

  /**
   * Generates an official International Consignment Note for Rail (CIM / COTIF Appendix B, UIC 992 format).
   */
  public static async generateCimConsignmentNote(
    consignment: PdfDomainRecord,
    allocations: PdfDomainRecord[] = [],
    company?: PdfOptionalDomainRecord,
  ): Promise<Buffer> {
    return RailPdfGenerator.generateCimConsignmentNote(
      consignment,
      allocations,
      company,
    );
  }

  /**
   * Generates an official Train Composition and Braking Sheet (UIC/ERA).
   */
  public static async generateTrainBrakingSheet(
    sheet: PdfDomainRecord,
    allocations: PdfDomainRecord[] = [],
  ): Promise<Buffer> {
    return RailPdfGenerator.generateTrainBrakingSheet(sheet, allocations);
  }

  /**
   * Generates an official Customs Bonding / Discharge Document PDF (DVD / DUA 7100/7600).
   */
  public static async generateCustomsBondingDocumentPdf(
    data: PdfDomainRecord,
  ): Promise<Buffer> {
    return CustomsWarehousePdfGenerator.generateCustomsBondingDocumentPdf(data);
  }

  /**
   * Generates an official Customs Stock and Warranty Liability Audit Certificate PDF.
   */
  public static async generateCustomsStockCertificatePdf(
    data: PdfDomainRecord,
  ): Promise<Buffer> {
    return CustomsWarehousePdfGenerator.generateCustomsStockCertificatePdf(
      data,
    );
  }

  /**
   * Generates an official FuelEU Maritime Compliance and EU ETS Settlement Certificate PDF.
   */
  public static async generateFuelEuComplianceCertificatePdf(
    account: PdfDomainRecord,
    vessel: PdfDomainRecord,
    pool?: PdfOptionalDomainRecord,
  ): Promise<Buffer> {
    return FuelEuPdfGenerator.generateFuelEuComplianceCertificatePdf(
      account,
      vessel,
      pool,
    );
  }

  /**
   * Generates a Bunker Delivery Note and Voyage GHG Emissions Audit Sheet PDF.
   */
  public static async generateBunkerDeliveryNoteAuditPdf(
    voyage: PdfDomainRecord,
    vessel: PdfDomainRecord,
    fuel: PdfDomainRecord,
  ): Promise<Buffer> {
    return FuelEuPdfGenerator.generateBunkerDeliveryNoteAuditPdf(
      voyage,
      vessel,
      fuel,
    );
  }

  /**
   * Generates an official Trade Credit Presentation Dossier and Cover Letter PDF (UCP 600 / URC 522).
   */
  public static async generateTradeCreditPresentationDossierPdf(
    data: TradeCreditPresentationDossierData,
  ): Promise<Buffer> {
    return TradeFinancePdfGenerator.generateTradeCreditPresentationDossierPdf(
      data,
    );
  }

  /**
   * Generates an official UCP 600 Discrepancy Notice and Examination Audit Report PDF.
   */
  public static async generateUcpDiscrepancyAuditReportPdf(
    data: UcpDiscrepancyAuditReportData,
  ): Promise<Buffer> {
    return TradeFinancePdfGenerator.generateUcpDiscrepancyAuditReportPdf(data);
  }

  /**
   * Generates an official Demand Guarantee and Standby LC Undertaking Certificate PDF (URDG 758 / ISP98).
   */
  public static async generateDemandGuaranteeCertificatePdf(
    data: DemandGuaranteeCertificateData,
  ): Promise<Buffer> {
    return TradeFinancePdfGenerator.generateDemandGuaranteeCertificatePdf({
      instrument: data.instrument || data.guarantee,
    });
  }

  /**
   * Generates an official AEO Self-Assessment Audit Report PDF (CAE AEAT / DG TAXUD).
   */
  public static async generateAeoCaeAuditReportPdf(
    data: AeoCaeAuditReportData,
  ): Promise<Buffer> {
    return AeoSecurityPdfGenerator.generateAeoCaeAuditReportPdf(data);
  }

  /**
   * Generates an official 7-Point Container Security Inspection Certificate PDF (WCO SAFE / C-TPAT).
   */
  public static async generateSevenPointInspectionCertificatePdf(
    data: SevenPointInspectionCertificateData,
  ): Promise<Buffer> {
    return AeoSecurityPdfGenerator.generateSevenPointInspectionCertificatePdf(
      data,
    );
  }

  /**
   * Generates an official High-Security ISO 17712 Seal Custody and Verification Certificate PDF.
   */
  public static async generateIso17712SealCustodyCertificatePdf(
    data: Iso17712SealCustodyCertificateData,
  ): Promise<Buffer> {
    return AeoSecurityPdfGenerator.generateIso17712SealCustodyCertificatePdf({
      seal: data.seal || data.custody,
    });
  }

  /**
   * Generates a Business Partner AEO Security Screening and Risk Matrix PDF.
   */
  public static async generateBusinessPartnerRiskMatrixPdf(
    data: BusinessPartnerRiskMatrixData,
  ): Promise<Buffer> {
    return AeoSecurityPdfGenerator.generateBusinessPartnerRiskMatrixPdf(data);
  }

  /**
   * Generates an official Charter Party Fixture Recap PDF (BIMCO Gencon 2022 / NYPE 2015).
   */
  public static async generateCharterPartyPdf(
    charter: PdfDomainRecord,
  ): Promise<Buffer> {
    return CharteringPdfGenerator.generateCharterPartyPdf(charter);
  }

  /**
   * Generates an official Statement of Facts (SOF) PDF.
   */
  public static async generateStatementOfFactsPdf(
    sof: PdfDomainRecord,
    events: PdfDomainRecord[],
  ): Promise<Buffer> {
    return CharteringPdfGenerator.generateStatementOfFactsPdf(sof, events);
  }

  /**
   * Generates an official Laytime Calculation Sheet PDF (Demurrage / Despatch).
   */
  public static async generateLaytimeCalculationSheetPdf(
    calc: PdfDomainRecord,
    charterOrPeriods: PdfDomainRecord | PdfDomainRecordList,
    breakdowns?: PdfDomainRecord[],
  ): Promise<Buffer> {
    return CharteringPdfGenerator.generateLaytimeCalculationSheetPdf(
      calc,
      charterOrPeriods,
      breakdowns || [],
    );
  }

  /**
   * Generates an official Time Charter Hire and Off-Hire Deduction Statement PDF.
   */
  public static async generateTimeCharterHireStatementPdf(
    hire: PdfDomainRecord,
    hireCalc: PdfDomainRecord,
  ): Promise<Buffer> {
    return CharteringPdfGenerator.generateTimeCharterHireStatementPdf(
      hire,
      hireCalc,
    );
  }

  /**
   * Generates an official Master's Declaration of General Average and Sea Protest PDF (YAR 2016).
   */
  public static async generateMasterGeneralAverageDeclarationPdf(
    gaCase: PdfDomainRecord,
  ): Promise<Buffer> {
    return GeneralAveragePdfGenerator.generateMasterGeneralAverageDeclarationPdf(
      gaCase,
    );
  }

  /**
   * Generates an official Lloyd's Average Bond (LAB 77) Form PDF.
   */
  public static async generateLloydsAverageBondPdf(
    bond: PdfDomainRecord,
    gaCase: PdfDomainRecord,
  ): Promise<Buffer> {
    return GeneralAveragePdfGenerator.generateLloydsAverageBondPdf(
      bond,
      gaCase,
    );
  }

  /**
   * Generates an official Underwriters Average Guarantee PDF (Cargo Insurers Security).
   */
  public static async generateUnderwritersAverageGuaranteePdf(
    guarantee: PdfDomainRecord,
    gaCase: PdfDomainRecord,
  ): Promise<Buffer> {
    return GeneralAveragePdfGenerator.generateUnderwritersAverageGuaranteePdf(
      guarantee,
      gaCase,
    );
  }

  /**
   * Generates an official General Average Adjustment and Contribution Statement PDF.
   */
  public static async generateGeneralAverageAdjustmentStatementPdf(
    adjustment: PdfDomainRecord,
    gaCase: PdfDomainRecord,
    items: PdfDomainRecord[],
  ): Promise<Buffer> {
    return GeneralAveragePdfGenerator.generateGeneralAverageAdjustmentStatementPdf(
      adjustment,
      gaCase,
      items,
    );
  }

  /**
   * Generates an official Multimodal Dangerous Goods Declaration Form PDF (IMO IMDG / UNECE ADR).
   */
  public static async generateMultimodalDangerousGoodsDeclarationPdf(
    shipment: PdfDomainRecord,
    items: PdfDomainRecord[],
  ): Promise<Buffer> {
    return DangerousGoodsPdfGenerator.generateMultimodalDangerousGoodsDeclarationPdf(
      shipment,
      items,
    );
  }

  /**
   * Generates an official IATA Shipper's Declaration for Dangerous Goods PDF (Air Cargo DGR).
   */
  public static async generateIataShippersDeclarationPdf(
    shipment: PdfDomainRecord,
    items: PdfDomainRecord[],
  ): Promise<Buffer> {
    return DangerousGoodsPdfGenerator.generateIataShippersDeclarationPdf(
      shipment,
      items,
    );
  }

  /**
   * Generates an official Dangerous Goods Emergency Response Card and Instructions in Writing PDF.
   */
  public static async generateDangerousGoodsEmergencyCardPdf(
    emergencyCard: PdfDomainRecord,
    shipment: PdfDomainRecord,
    items: PdfDomainRecord[],
  ): Promise<Buffer> {
    return DangerousGoodsPdfGenerator.generateDangerousGoodsEmergencyCardPdf(
      emergencyCard,
      shipment,
      items,
    );
  }

  /**
   * Generates an official Container/Vehicle Packing Certificate PDF (IMDG 5.4.2 / ADR 5.4.2).
   */
  public static async generateContainerPackingCertificatePdf(
    packingCert: PdfDomainRecord,
    shipment: PdfDomainRecord,
  ): Promise<Buffer> {
    return DangerousGoodsPdfGenerator.generateContainerPackingCertificatePdf(
      packingCert,
      shipment,
    );
  }

  /**
   * Generates an official Marine/Air/Road Cargo Insurance Certificate PDF (UCP 600 Art. 28 / Incoterms 2020 CIF/CIP).
   */
  public static async generateCargoInsuranceCertificatePdf(
    certificate: PdfDomainRecord,
    openPolicy?: PdfOptionalDomainRecord,
  ): Promise<Buffer> {
    return CargoInsurancePdfGenerator.generateCargoInsuranceCertificatePdf(
      certificate,
      openPolicy,
    );
  }

  /**
   * Generates an Open Cover Policy Schedule PDF.
   */
  public static async generateOpenCoverPolicySchedulePdf(
    openPolicy: PdfDomainRecord,
  ): Promise<Buffer> {
    return CargoInsurancePdfGenerator.generateOpenCoverPolicySchedulePdf(
      openPolicy,
    );
  }

  /**
   * Generates a Monthly Insurance Declaration Bordereau PDF.
   */
  public static async generateInsuranceBordereauPdf(
    bordereau: PdfDomainRecord,
    openPolicy: PdfDomainRecord,
    lines: PdfDomainRecord[],
  ): Promise<Buffer> {
    return CargoInsurancePdfGenerator.generateInsuranceBordereauPdf(
      bordereau,
      openPolicy,
      lines,
    );
  }

  /**
   * Generates an Insurance Claim Adjustment Statement PDF.
   */
  public static async generateInsuranceClaimAdjustmentPdf(
    claim: PdfDomainRecord,
    certificate: PdfDomainRecord,
  ): Promise<Buffer> {
    return CargoInsurancePdfGenerator.generateInsuranceClaimAdjustmentPdf(
      claim,
      certificate,
    );
  }

  /**
   * Generates an official Hydrostatic Draft Survey Report and Displacement Certificate PDF.
   */
  public static async generateDraftSurveyReportPdf(
    survey: PdfDomainRecord,
    vesselOp: PdfDomainRecord,
  ): Promise<Buffer> {
    return BulkOperationsPdfGenerator.generateDraftSurveyReportPdf(
      survey,
      vesselOp,
    );
  }

  /**
   * Generates an IMSBC Code Bulk Cargo Declaration and TML Certificate PDF.
   */
  public static async generateImsbcCargoDeclarationPdf(
    imsbc: PdfDomainRecord,
    vesselOp: PdfDomainRecord,
  ): Promise<Buffer> {
    return BulkOperationsPdfGenerator.generateImsbcCargoDeclarationPdf(
      imsbc,
      vesselOp,
    );
  }

  /**
   * Generates an IMO Grain Code Stability and Loading Plan Certificate PDF.
   */
  public static async generateGrainStabilityPlanPdf(
    grainPlan: PdfDomainRecord,
    vesselOp: PdfDomainRecord,
  ): Promise<Buffer> {
    return BulkOperationsPdfGenerator.generateGrainStabilityPlanPdf(
      grainPlan,
      vesselOp,
    );
  }

  /**
   * Generates a Tanker Liquid Quantity Survey Report PDF (ASTM-IP Table 54).
   */
  public static async generateUllageTankSurveyPdf(
    ullageSurvey: PdfDomainRecord,
    vesselOp: PdfDomainRecord,
  ): Promise<Buffer> {
    return BulkOperationsPdfGenerator.generateUllageTankSurveyPdf(
      ullageSurvey,
      vesselOp,
    );
  }
}
