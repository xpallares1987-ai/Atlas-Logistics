import { describe, it, expect } from "vitest";
import { DocumentSignerService, OfficialDocumentType } from "./index.js";
import { db } from "../../db/index.js";
import { documents } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("Multimodal Official Document Center & Digital Signature", () => {
  describe("renderPdf", () => {
    it("should render binary PDF for HBL with valid %PDF header", async () => {
      const buffer = await DocumentSignerService.renderPdf("HBL", {
        shipmentId: "SH-TEST-01",
        shipper: "Iberia Exports SL",
        consignee: "US Imports LLC",
        portOfLoading: "Valencia (ESVLC)",
        portOfDischarge: "New York (USNYC)",
        commodities: [
          { description: "General Cargo", pieces: 10, grossWeightKg: 5000, volumeCbm: 15 },
        ],
      });

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.toString("ascii", 0, 5)).toBe("%PDF-");
    });

    it("should render binary PDF for DUA customs declaration", async () => {
      const buffer = await DocumentSignerService.renderPdf("DUA", {
        duaNumber: "26ES00998811",
        regime: "4000",
        customsOffice: "ES004611",
        declarant: "Atlas Customs Brokerage",
        importer: "Iberia Exports",
        totalInvoiceEur: 100000,
        customsValueEur: 105000,
        dutiesPayableEur: 4200,
        vatPayableEur: 23100,
      });

      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.toString("ascii", 0, 5)).toBe("%PDF-");
    });

    it("should render binary PDF for e-CMR waybill", async () => {
      const buffer = await DocumentSignerService.renderPdf("ECMR", {
        consignmentNumber: "CMR-TEST-01",
        sender: "Sender S.L.",
        consignee: "Consignee GmbH",
        carrier: "Knight-Swift Road",
        grossWeightKg: 20000,
      });

      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.toString("ascii", 0, 5)).toBe("%PDF-");
    });

    it("should render binary PDF for Pharma Cold Chain GDP Certificate", async () => {
      const buffer = await DocumentSignerService.renderPdf("GDP_CERT", {
        certificateNumber: "GDP-TEST-01",
        productDescription: "Vaccines",
        dataloggerSerial: "SENS-01",
        meanKineticTempCelsius: 4.5,
        minTempRecorded: 3.0,
        maxTempRecorded: 6.0,
        complianceResult: "RELEASED_FOR_DISTRIBUTION",
      });

      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.toString("ascii", 0, 5)).toBe("%PDF-");
    });
  });

  describe("emitDocument & Cryptographic Hashing", () => {
    it("should emit document, compute SHA-256 hash, and store in database", async () => {
      const ref = `HBL-TEST-${Date.now()}`;
      const result = await DocumentSignerService.emitDocument({
        type: "HBL",
        documentReference: ref,
        shipmentId: "sh_demo_01",
        payloadData: {
          shipmentId: "sh_demo_01",
          shipper: "Test Shipper SL",
          consignee: "Test Consignee Inc",
          portOfLoading: "Valencia",
          portOfDischarge: "Miami",
          commodities: [{ description: "Electronics", pieces: 5, grossWeightKg: 1200, volumeCbm: 4 }],
        },
      });

      expect(result.id).toBeDefined();
      expect(result.documentReference).toBe(ref);
      expect(result.sha256Hash).toBeDefined();
      expect(result.sha256Hash.length).toBe(64); // 256 bits in hex
      expect(result.status).toBe("EMITTED");

      // Verify in DB
      const dbDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, result.id))
        .limit(1);

      expect(dbDoc.length).toBe(1);
      expect(dbDoc[0].sha256Hash).toBe(result.sha256Hash);
      expect(dbDoc[0].type).toBe("HBL");
    });

    it("should emit and automatically sign when signer info is provided", async () => {
      const ref = `DUA-TEST-${Date.now()}`;
      const result = await DocumentSignerService.emitDocument({
        type: "DUA",
        documentReference: ref,
        payloadData: {
          duaNumber: "26ES99999",
          regime: "4000",
          declarant: "Atlas Logistics",
          customsValueEur: 50000,
        },
        signer: {
          signedBy: "Carlos Mendoza",
          signerTitle: "Director de Operaciones",
          signerCertificate: "CERT-ATLAS-TEST-01",
        },
      });

      expect(result.status).toBe("SIGNED");
      expect(result.signedBy).toBe("Carlos Mendoza");

      const dbDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, result.id))
        .limit(1);

      expect(dbDoc[0].status).toBe("SIGNED");
      expect(dbDoc[0].signedBy).toBe("Carlos Mendoza");
      expect(dbDoc[0].signerCertificate).toBe("CERT-ATLAS-TEST-01");
    });
  });

  describe("signDocument", () => {
    it("should transition document from EMITTED to SIGNED with certificate details", async () => {
      const emitRes = await DocumentSignerService.emitDocument({
        type: "ECMR",
        payloadData: {
          consignmentNumber: `CMR-TEST-${Date.now()}`,
          sender: "ACME Corp",
          consignee: "Globex Corp",
        },
      });

      expect(emitRes.status).toBe("EMITTED");

      const signedRes = await DocumentSignerService.signDocument(emitRes.id, {
        signedBy: "Elena Vega",
        signerTitle: "Transport Manager",
        signerCertificate: "CERT-IRU-TEST-01",
      });

      expect(signedRes.status).toBe("SIGNED");
      expect(signedRes.signedBy).toBe("Elena Vega");
      expect(signedRes.signerCertificate).toBe("CERT-IRU-TEST-01");

      const updated = await db
        .select()
        .from(documents)
        .where(eq(documents.id, emitRes.id))
        .limit(1);

      expect(updated[0].status).toBe("SIGNED");
      expect(updated[0].signedBy).toBe("Elena Vega");
    });
  });

  describe("getDocumentPdf", () => {
    it("should reject document IDs that escape the storage directory", async () => {
      await expect(
        DocumentSignerService.getDocumentPdf("../../outside"),
      ).rejects.toThrow("Invalid document ID");
    });
  });

  describe("verifyAuthenticity", () => {
    it("should return authentic: true when verifying with valid SHA-256 hash", async () => {
      const emitRes = await DocumentSignerService.emitDocument({
        type: "AWB",
        payloadData: {
          awbNumber: "075-99881122",
          airline: "Iberia Cargo",
          totalPieces: 4,
          grossWeightKg: 800,
        },
        signer: {
          signedBy: "Lucía Domínguez",
          signerTitle: "IATA Cargo Agent",
        },
      });

      const verification = await DocumentSignerService.verifyAuthenticity(
        emitRes.sha256Hash,
      );

      expect(verification.authentic).toBe(true);
      expect(verification.document).toBeDefined();
      expect(verification.document?.sha256Hash).toBe(emitRes.sha256Hash);
      expect(verification.document?.status).toBe("SIGNED");
      expect(verification.document?.signedBy).toBe("Lucía Domínguez");
    });

    it("should return authentic: true when verifying with document reference", async () => {
      const ref = `REF-VERIFY-${Date.now()}`;
      await DocumentSignerService.emitDocument({
        type: "CIM",
        documentReference: ref,
        payloadData: {
          cimNumber: ref,
          consignor: "Zaragoza Rail",
          consignee: "Rotterdam Rail",
        },
      });

      const verification = await DocumentSignerService.verifyAuthenticity(ref);
      expect(verification.authentic).toBe(true);
      expect(verification.document?.documentReference).toBe(ref);
    });

    it("should return authentic: false when hash is invalid or tampered", async () => {
      const fakeHash = crypto.createHash("sha256").update("FAKE_TAMPERED").digest("hex");
      const verification = await DocumentSignerService.verifyAuthenticity(fakeHash);

      expect(verification.authentic).toBe(false);
      expect(verification.message).toContain("Verificación fallida");
    });
  });

  describe("getDocumentTemplates", () => {
    it("should return 12 official multimodal document templates", () => {
      const templates = DocumentSignerService.getDocumentTemplates();
      expect(templates.length).toBe(12);

      const types = templates.map((t) => t.type);
      expect(types).toContain("HBL");
      expect(types).toContain("DUA");
      expect(types).toContain("ECMR");
      expect(types).toContain("AWB");
      expect(types).toContain("CIM");
      expect(types).toContain("INSURANCE_CERT");
      expect(types).toContain("CONTRACT");
      expect(types).toContain("GDP_CERT");
      expect(types).toContain("CBAM_DECLARATION");
      expect(types).toContain("DGR_DECLARATION");
      expect(types).toContain("AEO_7POINT");
      expect(types).toContain("LAYTIME_SHEET");
    });
  });
});
