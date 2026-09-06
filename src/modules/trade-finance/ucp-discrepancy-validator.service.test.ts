import { describe, it, expect } from "vitest";
import {
  UcpDiscrepancyValidatorService,
  CreditInstrumentAuditInput,
  DocumentAuditInput,
} from "./ucp-discrepancy-validator.service.js";

describe("UcpDiscrepancyValidatorService (UCP 600 & ISBP 745)", () => {
  const baseCredit: CreditInstrumentAuditInput = {
    instrumentReference: "LC-2026-TEST-001",
    currency: "EUR",
    creditAmount: 100000.0,
    tolerancePercentage: 5.0,
    issueDate: "2026-08-01",
    latestShipmentDate: "2026-08-20",
    expiryDate: "2026-09-15",
    presentationPeriodDays: 21,
    portOfLoading: "ESBCN",
    portOfDischarge: "SGSIN",
    goodsDescriptionSummary: "EXTRA VIRGIN OLIVE OIL CIF SINGAPORE",
    presentationDate: "2026-08-25", // 5 days after shipment
  };

  const compliantDocuments: DocumentAuditInput[] = [
    {
      documentType: "COMMERCIAL_INVOICE",
      documentReferenceNumber: "INV-001",
      documentDate: "2026-08-18",
      issuerName: "Exporter SL",
      invoiceAmount: 102000.0, // within +5% (max 105k)
      invoiceCurrency: "EUR",
      goodsDescriptionExactMatch: true,
      originalCopiesRequired: 3,
      originalCopiesPresented: 3,
    },
    {
      documentType: "OCEAN_BILL_OF_LADING",
      documentReferenceNumber: "MSK-001",
      documentDate: "2026-08-20",
      issuerName: "Maersk",
      shippedOnBoardDate: "2026-08-20",
      cleanOnBoardStatus: true,
      freightPaymentClause: "PREPAID",
      originalCopiesRequired: 3,
      originalCopiesPresented: 3,
    },
    {
      documentType: "INSURANCE_CERTIFICATE",
      documentReferenceNumber: "INS-001",
      documentDate: "2026-08-19",
      issuerName: "Mapfre",
      insuredAmount: 112200.0, // 110% of 102,000 EUR
      insuredPercentageOfCif: 110.0,
      originalCopiesRequired: 2,
      originalCopiesPresented: 2,
    },
  ];

  it("should pass compliance when all documents strictly adhere to UCP 600 rules", () => {
    const result = UcpDiscrepancyValidatorService.auditPresentation(
      baseCredit,
      compliantDocuments,
    );

    expect(result.isCompliant).toBe(true);
    expect(result.complianceStatus).toBe("COMPLIANT");
    expect(result.totalDiscrepanciesCount).toBe(0);
    expect(result.presentationDaysElapsed).toBe(5);
    expect(result.invoiceAmountWithinTolerance).toBe(true);
    expect(result.insuranceCoverageCompliant).toBe(true);
    expect(result.transportDocumentCleanOnBoard).toBe(true);
  });

  it("should detect late presentation under UCP 600 Art. 14(c) when days elapsed > 21", () => {
    const lateCredit: CreditInstrumentAuditInput = {
      ...baseCredit,
      presentationDate: "2026-09-12", // 23 days after shipment 2026-08-20
    };

    const result = UcpDiscrepancyValidatorService.auditPresentation(
      lateCredit,
      compliantDocuments,
    );

    expect(result.isCompliant).toBe(false);
    expect(result.complianceStatus).toBe("DISCREPANT");
    expect(result.presentationDaysElapsed).toBe(23);
    const lateDisc = result.discrepancies.find(
      (d) => d.discrepancyRuleCode === "UCP600_ART_14_LATE_PRESENTATION",
    );
    expect(lateDisc).toBeDefined();
    expect(lateDisc?.severity).toBe("CRITICAL_REFUSAL");
  });

  it("should detect under-insurance under UCP 600 Art. 28(f)(ii) when coverage < 110% CIF", () => {
    const underInsuredDocs: DocumentAuditInput[] = [
      ...compliantDocuments.slice(0, 2),
      {
        documentType: "INSURANCE_CERTIFICATE",
        documentReferenceNumber: "INS-UNDER",
        documentDate: "2026-08-19",
        issuerName: "Mapfre",
        insuredAmount: 102000.0, // 100% CIF instead of 110% (112,200)
        insuredPercentageOfCif: 100.0,
      },
    ];

    const result = UcpDiscrepancyValidatorService.auditPresentation(
      baseCredit,
      underInsuredDocs,
    );

    expect(result.isCompliant).toBe(false);
    const insDisc = result.discrepancies.find(
      (d) => d.discrepancyRuleCode === "UCP600_ART_28_INSURANCE_UNDER_110_PCT",
    );
    expect(insDisc).toBeDefined();
    expect(insDisc?.severity).toBe("MAJOR_DISCREPANCY");
  });

  it("should detect claused/unclean transport document under UCP 600 Art. 27", () => {
    const clausedDocs: DocumentAuditInput[] = [
      compliantDocuments[0],
      {
        ...compliantDocuments[1],
        cleanOnBoardStatus: false, // Claused B/L
      },
      compliantDocuments[2],
    ];

    const result = UcpDiscrepancyValidatorService.auditPresentation(
      baseCredit,
      clausedDocs,
    );

    expect(result.isCompliant).toBe(false);
    const clausedDisc = result.discrepancies.find(
      (d) => d.discrepancyRuleCode === "UCP600_ART_27_CLAUSED_TRANSPORT_DOC",
    );
    expect(clausedDisc).toBeDefined();
    expect(clausedDisc?.severity).toBe("CRITICAL_REFUSAL");
  });

  it("should detect invoice amount exceeding credit amount tolerance under Art. 30", () => {
    const excessInvoiceDocs: DocumentAuditInput[] = [
      {
        ...compliantDocuments[0],
        invoiceAmount: 110000.0, // +10% exceeds +5% limit (105k)
      },
      compliantDocuments[1],
      compliantDocuments[2],
    ];

    const result = UcpDiscrepancyValidatorService.auditPresentation(
      baseCredit,
      excessInvoiceDocs,
    );

    expect(result.isCompliant).toBe(false);
    const amtDisc = result.discrepancies.find(
      (d) => d.discrepancyRuleCode === "UCP600_ART_18_AMOUNT_EXCEEDED",
    );
    expect(amtDisc).toBeDefined();
    expect(amtDisc?.severity).toBe("MAJOR_DISCREPANCY");
  });
});
