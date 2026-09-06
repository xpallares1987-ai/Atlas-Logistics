import PDFDocument from "pdfkit";
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
} from "./pdf/generators/core-operations.pdf.js";

export type {
  HBLData,
  InvoiceData,
  AgentSettlementData,
  BookingConfirmationData,
  CustomsData,
};

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
  public static async generateLclManifest(data: {
    containerId: string;
    specId?: string;
    route?: string;
    cargoItems: any[];
    totalWeight: number;
  }): Promise<Buffer> {
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
   * Generates official IATA Air Waybill (AWB) Document (neutral / airline standard)
   */
  public static async generateAirWaybill(data: any): Promise<Buffer> {
    return AirCargoPdfGenerator.generateAirWaybill(data);
  }

  /**
   * Generates official bilingual commercial freight & sales contract PDF with ICC Incoterms® 2020 clauses
   */
  public static async generateCommercialContract(data: any): Promise<Buffer> {
    return IncotermsPdfGenerator.generateCommercialContract(data);
  }

  /**
   * Generates formal Notice of Claim & Carrier Protest Letter (Carta de Reserva al Porteador)
   */
  public static async generateCarrierProtestLetter(
    claim: any,
  ): Promise<Buffer> {
    return ClaimsPdfGenerator.generateCarrierProtestLetter(claim);
  }

  /**
   * Generates official Subrogation Receipt & Assignment of Rights (Recibo de Finiquito y Subrogación de Derechos)
   */
  public static async generateSubrogationReceipt(claim: any): Promise<Buffer> {
    return ClaimsPdfGenerator.generateSubrogationReceipt(claim);
  }

  /**
   * Generates official Geneva 24-Box e-CMR Consignment Note (CMR Waybill)
   */
  public static async generateEcmrWaybill(c: any): Promise<Buffer> {
    return RoadFreightPdfGenerator.generateEcmrWaybill(c);
  }

  /**
   * Generates official Spanish National Carta de Porte (LOTT / Ley 15/2009)
   */
  public static async generateCartaDePorte(c: any): Promise<Buffer> {
    return RoadFreightPdfGenerator.generateCartaDePorte(c);
  }

  /**
   * Generates a Carrier Freight Dispute / Debit Note PDF (Nota de Cargo y Carta de Discrepancia).
   */
  public static async generateCarrierDisputeLetter(
    invoice: any,
    disputedLines: any[],
    company?: any,
  ): Promise<Buffer> {
    return TreasuryPdfGenerator.generateCarrierDisputeLetter(
      invoice,
      disputedLines,
      company,
    );
  }

  /**
   * Generates an Official Carrier Payment Settlement Statement PDF (Liquidación y Finiquito de Fletes).
   */
  public static async generateCarrierSettlementStatement(
    batch: any,
    invoices: any[] = [],
    company?: any,
  ): Promise<Buffer> {
    return TreasuryPdfGenerator.generateCarrierSettlementStatement(
      batch,
      invoices,
      company,
    );
  }

  /**
   * Generates an Official Pharma Cold Chain & GDP Release Certificate PDF (EN 12830).
   */
  public static async generateGdpReleaseCertificate(
    shipment: any,
    readings: any[] = [],
    profile?: any,
    company?: any,
  ): Promise<Buffer> {
    return ColdChainPdfGenerator.generateGdpReleaseCertificate(
      shipment,
      readings,
      profile,
      company,
    );
  }

  /**
   * Generates an Official CBAM Embedded Emissions & Carbon Liability Declaration Certificate PDF (EU Reg. 2023/956).
   */
  public static async generateCbamDeclarationCertificate(
    declaration: any,
    lines: any[] = [],
    company?: any,
  ): Promise<Buffer> {
    return CbamPdfGenerator.generateCbamDeclarationCertificate(
      declaration,
      lines,
      company,
    );
  }

  /**
   * Generates an Official International Consignment Note for Rail (CIM / COTIF Appendix B, UIC 992 format).
   */
  public static async generateCimConsignmentNote(
    consignment: any,
    allocations: any[] = [],
    company?: any,
  ): Promise<Buffer> {
    return RailPdfGenerator.generateCimConsignmentNote(
      consignment,
      allocations,
      company,
    );
  }

  /**
   * Generates an Official Train Composition and Braking Sheet (Boletín de Composición y Frenado UIC/ERA).
   */
  public static async generateTrainBrakingSheet(
    sheet: any,
    allocations: any[] = [],
  ): Promise<Buffer> {
    return RailPdfGenerator.generateTrainBrakingSheet(sheet, allocations);
  }

  /**
   * Generates Official Customs Bonding / Discharge Document (Documento DVD / DUA 7100/7600 PDF)
   */
  public static async generateCustomsBondingDocumentPdf(
    data: any,
  ): Promise<Buffer> {
    return CustomsWarehousePdfGenerator.generateCustomsBondingDocumentPdf(data);
  }

  /**
   * Generates Official Customs Stock & Warranty Liability Audit Certificate (PDF)
   */
  public static async generateCustomsStockCertificatePdf(
    data: any,
  ): Promise<Buffer> {
    return CustomsWarehousePdfGenerator.generateCustomsStockCertificatePdf(
      data,
    );
  }

  /**
   * Generates Official FuelEU Maritime Compliance & EU ETS Settlement Certificate (PDF)
   */
  public static async generateFuelEuComplianceCertificatePdf(
    account: any,
    vessel: any,
    pool?: any,
  ): Promise<Buffer> {
    return FuelEuPdfGenerator.generateFuelEuComplianceCertificatePdf(
      account,
      vessel,
      pool,
    );
  }

  /**
   * Generates Bunker Delivery Note & Voyage GHG Emissions Audit Sheet (PDF)
   */
  public static async generateBunkerDeliveryNoteAuditPdf(
    voyage: any,
    vessel: any,
    fuel: any,
  ): Promise<Buffer> {
    return FuelEuPdfGenerator.generateBunkerDeliveryNoteAuditPdf(
      voyage,
      vessel,
      fuel,
    );
  }

  /**
   * Generates Official Trade Credit Presentation Dossier & Cover Letter PDF (UCP 600 / URC 522).
   */
  public static async generateTradeCreditPresentationDossierPdf(data: {
    instrument: any;
    documents: any[];
    discrepancies?: any[];
  }): Promise<Buffer> {
    return TradeFinancePdfGenerator.generateTradeCreditPresentationDossierPdf(
      data,
    );
  }

  /**
   * Generates Official UCP 600 Discrepancy Notice & Examination Audit Report PDF.
   */
  public static async generateUcpDiscrepancyAuditReportPdf(data: {
    instrument: any;
    discrepancies: any[];
  }): Promise<Buffer> {
    return TradeFinancePdfGenerator.generateUcpDiscrepancyAuditReportPdf(data);
  }

  /**
   * Generates Official Demand Guarantee & Standby LC Undertaking Certificate PDF (URDG 758 / ISP98).
   */
  public static async generateDemandGuaranteeCertificatePdf(data: {
    guarantee?: any;
    instrument?: any;
  }): Promise<Buffer> {
    return TradeFinancePdfGenerator.generateDemandGuaranteeCertificatePdf({
      instrument: data.instrument || data.guarantee,
    });
  }

  /**
   * Generates Official AEO Self-Assessment Audit Report PDF (CAE AEAT / DG TAXUD).
   */
  public static async generateAeoCaeAuditReportPdf(data: {
    audit: any;
    sections: any[];
  }): Promise<Buffer> {
    return AeoSecurityPdfGenerator.generateAeoCaeAuditReportPdf(data);
  }

  /**
   * Generates Official 7-Point Container Security Inspection Certificate PDF (WCO SAFE / C-TPAT).
   */
  public static async generateSevenPointInspectionCertificatePdf(data: {
    inspection: any;
  }): Promise<Buffer> {
    return AeoSecurityPdfGenerator.generateSevenPointInspectionCertificatePdf(
      data,
    );
  }

  /**
   * Generates Official High-Security ISO 17712 Seal Custody & Verification Certificate PDF.
   */
  public static async generateIso17712SealCustodyCertificatePdf(data: {
    custody?: any;
    seal?: any;
  }): Promise<Buffer> {
    return AeoSecurityPdfGenerator.generateIso17712SealCustodyCertificatePdf({
      seal: data.seal || data.custody,
    });
  }

  /**
   * Generates Business Partner AEO Security Screening & Risk Matrix PDF.
   */
  public static async generateBusinessPartnerRiskMatrixPdf(data: {
    partners: any[];
  }): Promise<Buffer> {
    return AeoSecurityPdfGenerator.generateBusinessPartnerRiskMatrixPdf(data);
  }

  /**
   * 1. Official Charter Party Fixture Recap PDF (BIMCO Gencon 2022 / NYPE 2015)
   */
  public static async generateCharterPartyPdf(charter: any): Promise<Buffer> {
    return CharteringPdfGenerator.generateCharterPartyPdf(charter);
  }

  /**
   * 2. Official Statement of Facts (SOF) PDF
   */
  public static async generateStatementOfFactsPdf(
    sof: any,
    events: any[],
  ): Promise<Buffer> {
    return CharteringPdfGenerator.generateStatementOfFactsPdf(sof, events);
  }

  /**
   * 3. Official Laytime Calculation Sheet PDF (Demurrage/Despatch)
   */
  public static async generateLaytimeCalculationSheetPdf(
    calc: any,
    periods: any[],
  ): Promise<Buffer> {
    return CharteringPdfGenerator.generateLaytimeCalculationSheetPdf(
      calc,
      periods,
    );
  }

  /**
   * 4. Official Time Charter Hire & Off-Hire Deduction Statement PDF
   */
  public static async generateTimeCharterHireStatementPdf(
    hire: any,
    offHires: any[],
  ): Promise<Buffer> {
    return CharteringPdfGenerator.generateTimeCharterHireStatementPdf(
      hire,
      offHires,
    );
  }

  /**
   * 1. Generates an Official Master's Declaration of General Average & Sea Protest PDF (YAR 2016).
   */
  public static async generateMasterGeneralAverageDeclarationPdf(
    gaCase: any,
  ): Promise<Buffer> {
    return GeneralAveragePdfGenerator.generateMasterGeneralAverageDeclarationPdf(
      gaCase,
    );
  }

  /**
   * 2. Generates an Official Lloyd's Average Bond (LAB 77) Form PDF.
   */
  public static async generateLloydsAverageBondPdf(
    bond: any,
    gaCase: any,
  ): Promise<Buffer> {
    return GeneralAveragePdfGenerator.generateLloydsAverageBondPdf(
      bond,
      gaCase,
    );
  }

  /**
   * 3. Generates an Official Underwriters Average Guarantee PDF (Cargo Insurers Security).
   */
  public static async generateUnderwritersAverageGuaranteePdf(
    guarantee: any,
    gaCase: any,
  ): Promise<Buffer> {
    return GeneralAveragePdfGenerator.generateUnderwritersAverageGuaranteePdf(
      guarantee,
      gaCase,
    );
  }

  /**
   * 4. Generates an Official General Average Adjustment & Contribution Statement PDF.
   */
  public static async generateGeneralAverageAdjustmentStatementPdf(
    adjustment: any,
    gaCase: any,
    items: any[],
  ): Promise<Buffer> {
    return GeneralAveragePdfGenerator.generateGeneralAverageAdjustmentStatementPdf(
      adjustment,
      gaCase,
      items,
    );
  }

  /**
   * 1. Generates an Official Multimodal Dangerous Goods Declaration Form PDF (IMO IMDG / UNECE ADR).
   */
  public static async generateMultimodalDangerousGoodsDeclarationPdf(
    shipment: any,
    items: any[],
  ): Promise<Buffer> {
    return DangerousGoodsPdfGenerator.generateMultimodalDangerousGoodsDeclarationPdf(
      shipment,
      items,
    );
  }

  /**
   * 2. Generates an Official IATA Shipper's Declaration for Dangerous Goods PDF (Air Cargo DGR).
   */
  public static async generateIataShippersDeclarationPdf(
    shipment: any,
    items: any[],
  ): Promise<Buffer> {
    return DangerousGoodsPdfGenerator.generateIataShippersDeclarationPdf(
      shipment,
      items,
    );
  }

  /**
   * 3. Generates an Official Dangerous Goods Emergency Response Card & Instructions in Writing PDF.
   */
  public static async generateDangerousGoodsEmergencyCardPdf(
    emergencyCard: any,
    shipment: any,
    items: any[],
  ): Promise<Buffer> {
    return DangerousGoodsPdfGenerator.generateDangerousGoodsEmergencyCardPdf(
      emergencyCard,
      shipment,
      items,
    );
  }

  /**
   * 4. Generates an Official Container/Vehicle Packing Certificate PDF (IMDG 5.4.2 / ADR 5.4.2).
   */
  public static async generateContainerPackingCertificatePdf(
    packingCert: any,
    shipment: any,
  ): Promise<Buffer> {
    return DangerousGoodsPdfGenerator.generateContainerPackingCertificatePdf(
      packingCert,
      shipment,
    );
  }

  /**
   * 1. Generates an Official Marine/Air/Road Cargo Insurance Certificate PDF (UCP 600 Art. 28 / Incoterms® 2020 CIF/CIP).
   */
  public static async generateCargoInsuranceCertificatePdf(
    certificate: any,
    openPolicy?: any,
  ): Promise<Buffer> {
    return CargoInsurancePdfGenerator.generateCargoInsuranceCertificatePdf(
      certificate,
      openPolicy,
    );
  }

  /**
   * 2. Generates an Open Cover Policy Schedule PDF.
   */
  public static async generateOpenCoverPolicySchedulePdf(
    openPolicy: any,
  ): Promise<Buffer> {
    return CargoInsurancePdfGenerator.generateOpenCoverPolicySchedulePdf(
      openPolicy,
    );
  }

  /**
   * 3. Generates a Monthly Insurance Declaration Bordereau PDF.
   */
  public static async generateInsuranceBordereauPdf(
    bordereau: any,
    openPolicy: any,
    lines: any[],
  ): Promise<Buffer> {
    return CargoInsurancePdfGenerator.generateInsuranceBordereauPdf(
      bordereau,
      openPolicy,
      lines,
    );
  }

  /**
   * 4. Generates an Insurance Claim Adjustment Statement PDF.
   */
  public static async generateInsuranceClaimAdjustmentPdf(
    claim: any,
    certificate: any,
  ): Promise<Buffer> {
    return CargoInsurancePdfGenerator.generateInsuranceClaimAdjustmentPdf(
      claim,
      certificate,
    );
  }

  /**
   * 1. Generates an Official Hydrostatic Draft Survey Report & Displacement Certificate PDF.
   */
  public static async generateDraftSurveyReportPdf(
    survey: any,
    vesselOp: any,
  ): Promise<Buffer> {
    return BulkOperationsPdfGenerator.generateDraftSurveyReportPdf(
      survey,
      vesselOp,
    );
  }

  /**
   * 2. Generates an IMSBC Code Bulk Cargo Declaration & TML Certificate PDF.
   */
  public static async generateImsbcCargoDeclarationPdf(
    imsbc: any,
    vesselOp: any,
  ): Promise<Buffer> {
    return BulkOperationsPdfGenerator.generateImsbcCargoDeclarationPdf(
      imsbc,
      vesselOp,
    );
  }

  /**
   * 3. Generates an IMO Grain Code Stability & Loading Plan Certificate PDF.
   */
  public static async generateGrainStabilityPlanPdf(
    grainPlan: any,
    vesselOp: any,
  ): Promise<Buffer> {
    return BulkOperationsPdfGenerator.generateGrainStabilityPlanPdf(
      grainPlan,
      vesselOp,
    );
  }

  /**
   * 4. Generates a Tanker Liquid Quantity Survey Report PDF (ASTM-IP Table 54).
   */
  public static async generateUllageTankSurveyPdf(
    ullageSurvey: any,
    vesselOp: any,
  ): Promise<Buffer> {
    return BulkOperationsPdfGenerator.generateUllageTankSurveyPdf(
      ullageSurvey,
      vesselOp,
    );
  }
}
