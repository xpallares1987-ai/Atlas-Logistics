import { describe, it, expect } from "vitest";
import {
  extractCommercialInvoice,
  extractPackingList,
  extractTransportDocument,
  extractCustomsDeclaration,
  performTripartiteCrossCheck,
  SAMPLE_INVOICE_TEXT,
  SAMPLE_PACKING_LIST_TEXT,
  SAMPLE_TRANSPORT_TEXT,
  SAMPLE_DECLARATION_TEXT,
} from "./customs-ocr";

describe("Customs OCR & Tripartite Cross-Check Engine", () => {
  it("handles long whitespace after an invoice label", () => {
    const text = `INV#${" ".repeat(10_000)}!`;
    const res = extractCommercialInvoice(text);

    expect(res.extractedFields.invoiceNumber).toBe("INV-2026-X001");
  });

  it("should extract Commercial Invoice fields accurately", () => {
    const res = extractCommercialInvoice(SAMPLE_INVOICE_TEXT);
    expect(res.documentType).toBe("COMMERCIAL_INVOICE");
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    expect(res.extractedFields.invoiceNumber).toBe("INV-2026-X88192");
    expect(res.extractedFields.currency).toBe("USD");
    expect(res.extractedFields.incoterm).toBe("CIF");
    expect(res.extractedFields.totalCifUsd).toBe(148000);
    expect(res.extractedFields.lineItems.length).toBeGreaterThan(0);
    expect(res.extractedFields.lineItems[0].hsCode).toBe("8542.31.00");
  });

  it("should extract Packing List weights and container numbers", () => {
    const res = extractPackingList(SAMPLE_PACKING_LIST_TEXT);
    expect(res.documentType).toBe("PACKING_LIST");
    expect(res.extractedFields.packingListNumber).toBe("PL-2026-9041");
    expect(res.extractedFields.grossWeightKg).toBe(18500);
    expect(res.extractedFields.containerNumber).toBe("MSKU7829103");
    expect(res.extractedFields.sealNumber).toBe("ML-ES26-88129");
  });

  it("should extract Transport Document (B/L) information", () => {
    const res = extractTransportDocument(SAMPLE_TRANSPORT_TEXT);
    expect(res.documentType).toBe("TRANSPORT_DOCUMENT");
    expect(res.extractedFields.documentNumber).toBe("BL-MAERSK-2026-X88");
    expect(res.extractedFields.carrierName).toContain("Maersk");
    expect(res.extractedFields.declaredGrossWeightKg).toBe(18500);
    expect(res.extractedFields.containerNumber).toBe("MSKU7829103");
  });

  it("should extract Customs Declaration / Pedimento taxes and digital seal", () => {
    const res = extractCustomsDeclaration(SAMPLE_DECLARATION_TEXT);
    expect(res.documentType).toBe("CUSTOMS_DECLARATION");
    expect(res.extractedFields.declarationNumber).toContain("6001889");
    expect(res.extractedFields.declaredCustomsValueUsd).toBe(148000);
    expect(res.extractedFields.primaryHsCode).toBe("8542.31.00");
    expect(res.extractedFields.taxes.totalTaxesUsd).toBeGreaterThan(0);
    expect(res.extractedFields.electronicSignature.isValid).toBe(true);
  });

  it("should perform tripartite cross-check and clear matching documents", () => {
    const inv = extractCommercialInvoice(SAMPLE_INVOICE_TEXT).extractedFields;
    const pl = extractPackingList(SAMPLE_PACKING_LIST_TEXT).extractedFields;
    const tr = extractTransportDocument(SAMPLE_TRANSPORT_TEXT).extractedFields;
    const decl = extractCustomsDeclaration(SAMPLE_DECLARATION_TEXT).extractedFields;

    const crossCheck = performTripartiteCrossCheck(inv, pl, decl, tr);
    expect(crossCheck.overallStatus).toBe("MATCH_CLEARED");
    expect(crossCheck.complianceScore).toBe(100);
    expect(crossCheck.releaseCertificateId).toBeDefined();
    expect(crossCheck.releaseCertificateId).toContain("CERT-PRE-RELEASE");
    expect(crossCheck.checks.every((c) => c.isMatch)).toBe(true);
  });

  it("should detect valuation discrepancies between invoice and customs declaration", () => {
    const inv = extractCommercialInvoice(SAMPLE_INVOICE_TEXT).extractedFields;
    const pl = extractPackingList(SAMPLE_PACKING_LIST_TEXT).extractedFields;
    const tr = extractTransportDocument(SAMPLE_TRANSPORT_TEXT).extractedFields;
    const decl = extractCustomsDeclaration(SAMPLE_DECLARATION_TEXT).extractedFields;

    // Simulate fraudulent undervaluation on customs declaration
    const undervaluedDecl = {
      ...decl,
      declaredCustomsValueUsd: 85000, // 85k vs 148k on invoice
    };

    const crossCheck = performTripartiteCrossCheck(inv, pl, undervaluedDecl, tr);
    expect(crossCheck.overallStatus).toBe("CRITICAL_MISMATCH");
    expect(crossCheck.complianceScore).toBeLessThan(70);
    expect(crossCheck.releaseCertificateId).toBeUndefined();

    const valCheck = crossCheck.checks.find((c) => c.parameter.includes("Valoración"));
    expect(valCheck?.isMatch).toBe(false);
    expect(valCheck?.severity).toBe("CRITICAL");
  });

  it("should detect weight discrepancies between packing list and transport document", () => {
    const inv = extractCommercialInvoice(SAMPLE_INVOICE_TEXT).extractedFields;
    const pl = extractPackingList(SAMPLE_PACKING_LIST_TEXT).extractedFields;
    const tr = extractTransportDocument(SAMPLE_TRANSPORT_TEXT).extractedFields;
    const decl = extractCustomsDeclaration(SAMPLE_DECLARATION_TEXT).extractedFields;

    // Simulate weight discrepancy of 4,000 kg
    const alteredTransport = {
      ...tr,
      declaredGrossWeightKg: 22500, // 22.5k vs 18.5k on packing list
    };

    const crossCheck = performTripartiteCrossCheck(inv, pl, decl, alteredTransport);
    const weightCheck = crossCheck.checks.find((c) => c.parameter.includes("Peso Bruto"));
    expect(weightCheck?.isMatch).toBe(false);
    expect(weightCheck?.severity).toBe("CRITICAL");
  });
});
