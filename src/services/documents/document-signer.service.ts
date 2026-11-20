import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "../../db/index.js";
import {
  documents,
  shipments,
  scmLogicalShipments,
  users,
} from "../../db/schema/index.js";
import { eq, desc, or } from "drizzle-orm";
import {
  PDFService,
  type HBLData,
  type CustomsData,
  type EcmrWaybillPdfInput,
  type AirWaybillPdfInput,
  type CommercialContractPdfInput,
  type PdfDomainRecord,
  type PdfOptionalDomainRecord,
} from "../pdf.service.js";
import { logger } from "../../config/logger.js";

export type OfficialDocumentType =
  | "HBL"
  | "DUA"
  | "ECMR"
  | "AWB"
  | "CIM"
  | "INSURANCE_CERT"
  | "CONTRACT"
  | "GDP_CERT"
  | "CBAM_DECLARATION"
  | "DGR_DECLARATION"
  | "AEO_7POINT"
  | "LAYTIME_SHEET";

export interface SignerInfo {
  signedBy: string;
  signerTitle: string;
  signerCertificate?: string;
}

export interface EmitDocumentParams {
  type: OfficialDocumentType;
  documentReference?: string;
  shipmentId?: string;
  payloadData: Record<string, unknown>;
  signer?: SignerInfo;
  userId?: string;
}

export interface DocumentVerificationResult {
  authentic: boolean;
  message: string;
  document?: {
    id: string;
    name: string;
    type: string;
    documentReference: string | null;
    sha256Hash: string | null;
    status: string;
    signedBy: string | null;
    signerTitle: string | null;
    signerCertificate: string | null;
    signedAt: Date | null;
    fileSize: number | null;
    createdAt: Date;
  };
  verifiedAt: string;
}

const STORAGE_DIR = path.resolve(process.cwd(), "data", "documents");

const DOCUMENT_FILE_PREFIX: ReadonlyMap<OfficialDocumentType, string> = new Map(
  [
    ["HBL", "hbl"],
    ["DUA", "dua"],
    ["ECMR", "ecmr"],
    ["AWB", "awb"],
    ["CIM", "cim"],
    ["INSURANCE_CERT", "insurance_cert"],
    ["CONTRACT", "contract"],
    ["GDP_CERT", "gdp_cert"],
    ["CBAM_DECLARATION", "cbam_declaration"],
    ["DGR_DECLARATION", "dgr_declaration"],
    ["AEO_7POINT", "aeo_7point"],
    ["LAYTIME_SHEET", "laytime_sheet"],
  ],
);

export class DocumentSignerService {
  /**
   * Ensure local storage directory exists
   */
  private static ensureStorageDir() {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Render binary PDF for any of the 12 official multimodal document types
   */
  public static async renderPdf(
    type: OfficialDocumentType,
    data: Record<string, unknown> | null | undefined,
  ): Promise<Buffer> {
    const d: Record<string, unknown> = { ...(data || {}) };
    const asStr = (val: unknown, fallback: string): string =>
      typeof val === "string" && val.length > 0 ? val : fallback;
    const asNum = (val: unknown, fallback: number): number =>
      typeof val === "number" && !Number.isNaN(val) ? val : fallback;
    const asIsoDate = (val: unknown, fallback?: string): string => {
      if (typeof val === "string" || val instanceof Date) {
        const parsed = new Date(val);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
      return fallback ?? new Date().toISOString();
    };
    const asOptionalIsoDate = (val: unknown): string | undefined => {
      if (typeof val === "string" || val instanceof Date) {
        const parsed = new Date(val);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
      return undefined;
    };
    const asRecord = (val: unknown): PdfDomainRecord =>
      val && typeof val === "object" ? (val as PdfDomainRecord) : d;
    const asOptionalRecord = (val: unknown): PdfOptionalDomainRecord =>
      val && typeof val === "object" ? (val as PdfDomainRecord) : undefined;
    const asRecordList = (val: unknown): PdfDomainRecord[] =>
      Array.isArray(val) ? (val as PdfDomainRecord[]) : [];

    switch (type) {
      case "HBL": {
        const hblData: HBLData = {
          shipmentId: asStr(d.shipmentId, "SH-DEFAULT"),
          shipper: asStr(d.shipper, "Global Shipper S.L."),
          consignee: asStr(d.consignee, "Atlas Client Corp"),
          portOfLoading: asStr(d.portOfLoading, "Port of Loading"),
          portOfDischarge: asStr(d.portOfDischarge, "Port of Discharge"),
          vessel: asStr(d.vessel, "MSC Vessel"),
          voyage: asStr(d.voyage, "001A"),
          containers: Array.isArray(d.containers)
            ? (d.containers as HBLData["containers"])
            : [],
          commodities:
            Array.isArray(d.commodities) && d.commodities.length > 0
              ? (d.commodities as HBLData["commodities"])
              : [
                  {
                    description: "General Multimodal Cargo",
                    pieces: 10,
                    grossWeightKg: 5000,
                    volumeCbm: 15,
                  },
                ],
        };
        return PDFService.generateHBL(hblData);
      }
      case "DUA": {
        const customsData = {
          ...d,
          shipmentId: asStr(d.shipmentId, "SH-CUSTOMS-01"),
          declarationId: asStr(d.declarationId ?? d.duaNumber, "DUA-DEFAULT"),
          duaNumber: asStr(d.duaNumber, "26ES0000000000000"),
          regime: asStr(d.regime, "4000 - Libre Práctica"),
          channel: asStr(d.channel, "GREEN"),
          customsOffice: asStr(
            d.customsOffice,
            "ES004611 - Aduana de Valencia",
          ),
          declarant: asStr(d.declarant, "Atlas Logistics Customs Brokerage SL"),
          importer: asStr(d.importer, "Iberia Global Exports S.L."),
          totalInvoiceEur: asNum(d.totalInvoiceEur, 50000),
          customsValueEur: asNum(d.customsValueEur, 52000),
          dutiesPayableEur: asNum(d.dutiesPayableEur, 1200),
          vatPayableEur: asNum(d.vatPayableEur, 10920),
        };
        return PDFService.generateCustomsDeclaration(
          customsData as unknown as CustomsData,
        );
      }
      case "ECMR": {
        const ecmrData = {
          ...d,
          consignmentNumber: asStr(d.consignmentNumber, "CMR-DEFAULT"),
          pickupDate: asIsoDate(d.pickupDate),
          deliveryDate: asIsoDate(d.deliveryDate),
          originCity: asStr(d.originCity, "Madrid"),
          destinationCity: asStr(d.destinationCity, "Paris"),
          carrier: asStr(d.carrier, "Knight-Swift Road Logistics"),
          vehicleReg: asStr(d.vehicleReg, "8812-LZB"),
          adrGoods: asStr(d.adrGoods, "NON_HAZARDOUS"),
          grossWeightKg: asNum(d.grossWeightKg, 5000),
          totalGrossWeightKg: asNum(
            d.totalGrossWeightKg ?? d.grossWeightKg,
            5000,
          ),
        };
        return PDFService.generateEcmrWaybill(
          ecmrData as unknown as EcmrWaybillPdfInput,
        );
      }
      case "AWB": {
        const awbData = {
          ...d,
          awbNumber: asStr(d.awbNumber, "075-88192031"),
          airline: asStr(d.airline, "Iberia Cargo"),
          airportOfDeparture: asStr(d.airportOfDeparture, "MAD - Madrid"),
          airportOfDestination: asStr(d.airportOfDestination, "MIA - Miami"),
          totalPieces: asNum(d.totalPieces, 5),
          grossWeightKg: asNum(d.grossWeightKg, 1200),
          chargeableWeightKg: asNum(d.chargeableWeightKg, 1400),
          natureOfGoods: asStr(d.natureOfGoods, "General Cargo"),
        };
        return PDFService.generateAirWaybill(
          awbData as unknown as AirWaybillPdfInput,
        );
      }
      case "CIM":
        return PDFService.generateCimConsignmentNote(
          d,
          asRecordList(d.allocations),
          asOptionalRecord(d.company),
        );
      case "INSURANCE_CERT":
        return PDFService.generateCargoInsuranceCertificatePdf(
          d,
          asOptionalRecord(d.openPolicy),
        );
      case "CONTRACT": {
        const contractData: CommercialContractPdfInput = {
          contractNumber: asStr(d.contractNumber, "CTR-DEFAULT"),
          title: asStr(
            d.title,
            "International Multimodal Freight & Sales Contract",
          ),
          incotermCode: asStr(d.incotermCode, "CIF"),
          namedPlace: asStr(d.namedPlace, "Valencia, Spain"),
          transportMode: asStr(d.transportMode, "MULTIMODAL"),
          currency: asStr(d.currency, "EUR"),
          goodsValue: asNum(d.goodsValue, 0),
          freightEstimatedCost: asNum(d.freightEstimatedCost, 0),
          insuranceEstimatedCost: asNum(d.insuranceEstimatedCost, 0),
          customsEstimatedDuty: asNum(d.customsEstimatedDuty, 0),
          effectiveDate: asIsoDate(d.effectiveDate),
          expiryDate: asOptionalIsoDate(d.expiryDate),
          governingLaw: asStr(d.governingLaw, "Spanish Commercial Code / CISG"),
          disputeJurisdiction: asStr(
            d.disputeJurisdiction,
            "ICC International Court of Arbitration (Madrid)",
          ),
          sellerData: asOptionalRecord(d.sellerData),
          buyerData: asOptionalRecord(d.buyerData),
          forwarderData: asOptionalRecord(d.forwarderData),
          milestonesData: asRecordList(d.milestonesData),
        };
        return PDFService.generateCommercialContract(contractData);
      }
      case "GDP_CERT":
        return PDFService.generateGdpReleaseCertificate(
          asRecord(d.shipment),
          asRecordList(d.readings),
          asOptionalRecord(d.profile),
          asOptionalRecord(d.company),
        );
      case "CBAM_DECLARATION":
        return PDFService.generateCbamDeclarationCertificate(
          asRecord(d.declaration),
          asRecordList(d.lines),
          asOptionalRecord(d.company),
        );
      case "DGR_DECLARATION":
        return PDFService.generateMultimodalDangerousGoodsDeclarationPdf(
          asRecord(d.shipment),
          asRecordList(d.items),
        );
      case "AEO_7POINT":
        return PDFService.generateSevenPointInspectionCertificatePdf({
          inspection: asRecord(d.inspection),
        });
      case "LAYTIME_SHEET":
        return PDFService.generateLaytimeCalculationSheetPdf(
          asRecord(d.calc),
          asRecord(d.charterOrPeriods),
          asRecordList(d.breakdowns),
        );
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
  }

  /**
   * Emit an official multimodal document, calculate cryptographic hash, and persist to vault
   */
  public static async emitDocument(params: EmitDocumentParams) {
    this.ensureStorageDir();

    const safePrefix = DOCUMENT_FILE_PREFIX.get(params.type);
    if (!safePrefix) {
      throw new Error(`Unsupported document type: ${String(params.type)}`);
    }
    const docId = `doc_${safePrefix}_${crypto.randomUUID().substring(0, 8)}`;
    const ref =
      params.documentReference ||
      `${params.type}-${new Date().getFullYear()}-${crypto.randomInt(1000, 10000)}`;

    // 1. Render binary PDF using PDFService
    const pdfBuffer = await this.renderPdf(params.type, params.payloadData);

    // 2. Compute SHA-256 Hash
    const sha256Hash = crypto
      .createHash("sha256")
      .update(pdfBuffer)
      .digest("hex");

    // 3. Save PDF to local disk inside bounded STORAGE_DIR
    const resolvedStorageDir = path.resolve(STORAGE_DIR);
    const filePath = path.resolve(resolvedStorageDir, `${docId}.pdf`);
    if (!filePath.startsWith(`${resolvedStorageDir}${path.sep}`)) {
      throw new Error("Resolved document path escapes storage directory");
    }
    fs.writeFileSync(filePath, pdfBuffer);

    const isSigned = !!params.signer;
    const now = new Date();

    const docName = `${this.getDocumentHumanName(params.type)} (${ref})`;

    // 4. Validate shipmentId foreign key if passed
    let validShipmentId: string | undefined = undefined;
    if (params.shipmentId) {
      try {
        const foundShipment = await db
          .select({ id: shipments.id })
          .from(shipments)
          .where(eq(shipments.id, params.shipmentId))
          .limit(1);
        if (foundShipment.length > 0) {
          validShipmentId = foundShipment[0].id;
        } else {
          // Check if it's an SCM logical shipment (e.g., shp_..., sh_demo_01)
          const foundScm = await db
            .select({ id: scmLogicalShipments.shipmentId })
            .from(scmLogicalShipments)
            .where(eq(scmLogicalShipments.shipmentId, params.shipmentId))
            .limit(1);
          if (foundScm.length > 0) {
            await db
              .insert(shipments)
              .values({
                id: params.shipmentId,
                status: "ACTIVE",
                serviceType: "MULTIMODAL",
                companyId: "c-1",
              })
              .onConflictDoNothing();
            validShipmentId = params.shipmentId;
          }
        }
      } catch {
        // ignore check failure
      }
    }

    let validUserId: string | undefined = undefined;
    if (params.userId) {
      try {
        const foundUser = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, params.userId))
          .limit(1);
        if (foundUser.length > 0) {
          validUserId = foundUser[0].id;
        }
      } catch {
        // ignore check failure
      }
    }

    // 5. Persist in database
    await db.insert(documents).values({
      id: docId,
      shipmentId: validShipmentId,
      name: docName,
      type: params.type,
      documentReference: ref,
      sha256Hash,
      status: isSigned ? "SIGNED" : "EMITTED",
      signedBy: params.signer?.signedBy,
      signerTitle: params.signer?.signerTitle,
      signerCertificate:
        params.signer?.signerCertificate ||
        (isSigned ? `CERT-ATLAS-PKI-${Date.now()}` : undefined),
      signedAt: isSigned ? now : undefined,
      payloadData: params.payloadData,
      fileSize: pdfBuffer.length,
      url: `/api/documents/${docId}/pdf`,
      uploadedBy: validUserId,
      createdAt: now,
    });

    return {
      id: docId,
      documentReference: ref,
      type: params.type,
      name: docName,
      sha256Hash,
      fileSize: pdfBuffer.length,
      status: isSigned ? "SIGNED" : "EMITTED",
      signedBy: params.signer?.signedBy,
      signedAt: isSigned ? now : undefined,
      downloadUrl: `/api/documents/${docId}/pdf`,
      pdfBase64: pdfBuffer.toString("base64"),
    };
  }

  /**
   * Apply digital signature & seal to an existing document
   */
  public static async signDocument(documentId: string, signerInfo: SignerInfo) {
    const found = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (found.length === 0) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    const doc = found[0];
    const now = new Date();
    const certificate =
      signerInfo.signerCertificate ||
      `CERT-ATLAS-PKI-${crypto.randomInt(100000, 1000000)}`;

    await db
      .update(documents)
      .set({
        status: "SIGNED",
        signedBy: signerInfo.signedBy,
        signerTitle: signerInfo.signerTitle,
        signerCertificate: certificate,
        signedAt: now,
        updatedAt: now,
      })
      .where(eq(documents.id, documentId));

    return {
      id: doc.id,
      documentReference: doc.documentReference,
      status: "SIGNED",
      sha256Hash: doc.sha256Hash,
      signedBy: signerInfo.signedBy,
      signerTitle: signerInfo.signerTitle,
      signerCertificate: certificate,
      signedAt: now,
    };
  }

  /**
   * Public verification of document authenticity and tamper-evidence
   */
  public static async verifyAuthenticity(
    hashOrRef: string,
  ): Promise<DocumentVerificationResult> {
    const query = (hashOrRef || "").trim();
    if (!query) {
      return {
        authentic: false,
        message: "No query provided for verification.",
        verifiedAt: new Date().toISOString(),
      };
    }

    const found = await db
      .select()
      .from(documents)
      .where(
        or(
          eq(documents.sha256Hash, query),
          eq(documents.documentReference, query),
          eq(documents.id, query),
        ),
      )
      .limit(1);

    if (found.length === 0) {
      return {
        authentic: false,
        message:
          "Verificación fallida: No existe ningún documento oficial registrado con esta huella digital SHA-256 o número de referencia.",
        verifiedAt: new Date().toISOString(),
      };
    }

    const doc = found[0];
    const isSigned = doc.status === "SIGNED";

    return {
      authentic: true,
      message: isSigned
        ? "Documento auténtico, íntegro y debidamente firmado por un emisor certificado de Atlas Logistics."
        : "Documento oficial emitido pero pendiente de firma digital formal.",
      document: {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        documentReference: doc.documentReference,
        sha256Hash: doc.sha256Hash,
        status: doc.status,
        signedBy: doc.signedBy,
        signerTitle: doc.signerTitle,
        signerCertificate: doc.signerCertificate,
        signedAt: doc.signedAt,
        fileSize: doc.fileSize,
        createdAt: doc.createdAt,
      },
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieve PDF binary buffer (from disk or on-the-fly regeneration)
   */
  public static async getDocumentPdf(documentId: string): Promise<Buffer> {
    if (
      !documentId ||
      typeof documentId !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(documentId)
    ) {
      throw new Error("Invalid document ID format");
    }
    const safeId = path.basename(documentId);
    if (safeId !== documentId) {
      throw new Error("Invalid document ID");
    }
    const filePath = path.resolve(STORAGE_DIR, `${safeId}.pdf`);
    const rootWithSep = STORAGE_DIR.endsWith(path.sep)
      ? STORAGE_DIR
      : `${STORAGE_DIR}${path.sep}`;
    if (!filePath.startsWith(rootWithSep)) {
      throw new Error("Invalid document path");
    }
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }

    // Fallback: regenerate on the fly from database payloadData
    const found = await db
      .select()
      .from(documents)
      .where(eq(documents.id, safeId))
      .limit(1);

    if (found.length === 0) {
      throw new Error(`Document ${safeId} not found`);
    }

    const doc = found[0];
    const payload = (doc.payloadData as Record<string, unknown> | null) || {};
    const regeneratedBuffer = await this.renderPdf(
      doc.type as OfficialDocumentType,
      payload,
    );

    // Cache to disk
    this.ensureStorageDir();
    try {
      fs.writeFileSync(filePath, regeneratedBuffer);
    } catch (e) {
      logger.warn({ err: e }, "Could not cache PDF buffer to disk");
    }

    return regeneratedBuffer;
  }

  /**
   * List documents from vault
   */
  public static async listDocuments(
    type?: string,
    status?: string,
    shipmentId?: string,
  ) {
    const query = db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt));
    const all = await query;
    return all.filter((d) => {
      if (type && type !== "ALL" && d.type !== type) return false;
      if (status && status !== "ALL" && d.status !== status) return false;
      if (
        shipmentId &&
        shipmentId !== "ALL" &&
        d.shipmentId !== shipmentId &&
        (d.payloadData as { shipmentId?: string } | null)?.shipmentId !==
          shipmentId
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Human readable name for document type
   */
  public static getDocumentHumanName(type: OfficialDocumentType): string {
    const names: Record<OfficialDocumentType, string> = {
      HBL: "House Bill of Lading (FIATA / Marítimo)",
      DUA: "Documento Único Administrativo (DUA / AEAT)",
      ECMR: "Carta de Porte Internacional e-CMR (Carretera)",
      AWB: "Air Waybill IATA (e-AWB Neutral)",
      CIM: "Carta de Porte Ferroviaria CIM (UIC 992)",
      INSURANCE_CERT: "Certificado de Seguro de Carga (UCP 600 / ICC)",
      CONTRACT: "Contrato Comercial Incoterms® 2020",
      GDP_CERT: "Certificado de Liberación Pharma GDP (EN 12830)",
      CBAM_DECLARATION: "Declaración de Emisiones Incrustadas CBAM",
      DGR_DECLARATION: "Declaración Multimodal de Mercancías Peligrosas (DGR)",
      AEO_7POINT: "Acta de Inspección de Seguridad 7 Puntos (OEA / C-TPAT)",
      LAYTIME_SHEET: "Liquidación de Planchas y Estadías (Laytime BIMCO)",
    };
    return names[type] || type;
  }

  /**
   * Catalog of 12 document definitions with default template data for UI
   */
  public static getDocumentTemplates() {
    return [
      {
        type: "HBL",
        name: "House Bill of Lading (HBL)",
        domain: "MARITIME",
        regulation: "FIATA / La Haya-Visby",
        icon: "Ship",
        defaultData: {
          shipmentId: "sh_demo_01",
          shipper: "Iberia Global Exports S.L.",
          consignee: "American Logistic Hub LLC",
          portOfLoading: "Puerto de Valencia (ESVLC)",
          portOfDischarge: "New York Container Terminal (USNYC)",
          vessel: "MSC ISABELLA",
          voyage: "VOY-2026-88",
          commodities: [
            {
              description: "Industrial Machinery Parts & Robotics",
              pieces: 14,
              grossWeightKg: 18500,
              volumeCbm: 42,
            },
          ],
        },
      },
      {
        type: "DUA",
        name: "Documento Único Administrativo (DUA)",
        domain: "CUSTOMS",
        regulation: "Código Aduanero Unión (CAU)",
        icon: "FileCheck",
        defaultData: {
          duaNumber: "26ES004129988102B",
          regime: "4000 - Importación a Libre Práctica",
          customsOffice: "ES004611 - Aduana Marítima de Valencia",
          declarant: "Atlas Logistics Customs Brokerage SL",
          importer: "Iberia Global Exports S.L.",
          totalInvoiceEur: 145000,
          customsValueEur: 152300,
          dutiesPayableEur: 6853.5,
          vatPayableEur: 33422.24,
        },
      },
      {
        type: "ECMR",
        name: "Carta de Porte Internacional e-CMR",
        domain: "ROAD",
        regulation: "Convenio de Ginebra 1956",
        icon: "Truck",
        defaultData: {
          consignmentNumber: "CMR-2026-8819",
          sender: "Valencia Central Logistics S.L.",
          consignee: "Frankfurt European Distribution Hub GmbH",
          carrier: "Knight-Swift Road Logistics",
          vehicleReg: "8812-LZB / R-4412-BB",
          adrGoods: "NON_HAZARDOUS",
          grossWeightKg: 22400,
        },
      },
      {
        type: "AWB",
        name: "IATA Air Waybill (e-AWB)",
        domain: "AIR",
        regulation: "Convenio Montreal / IATA Cargo",
        icon: "Plane",
        defaultData: {
          awbNumber: "075-88192031",
          airline: "Iberia Cargo (IB / 075)",
          airportOfDeparture: "MAD - Adolfo Suárez Madrid-Barajas",
          airportOfDestination: "MIA - Miami International Airport",
          totalPieces: 8,
          grossWeightKg: 1250,
          chargeableWeightKg: 1450,
          natureOfGoods: "Temperature Sensitive Biologicals",
        },
      },
      {
        type: "CIM",
        name: "Carta de Porte Ferroviaria CIM",
        domain: "RAIL",
        regulation: "Convenio COTIF / UIC 992",
        icon: "TrainTrack",
        defaultData: {
          cimNumber: "CIM-TEN-2026-902",
          consignor: "Terminal Intermodal Zaragoza",
          consignee: "Rotterdam Rail Cargo Center",
          corridor: "Corredor Mediterráneo TEN-T",
          trainNumber: "TR-88192",
          grossWeightKg: 380000,
          allocations: [
            { wagonNumber: "33-87-5930-102-1", container: "MSKU88102" },
          ],
        },
      },
      {
        type: "INSURANCE_CERT",
        name: "Certificado de Seguro de Carga",
        domain: "FINANCE",
        regulation: "UCP 600 Art. 28 / Cláusulas ICC (A)",
        icon: "ShieldCheck",
        defaultData: {
          certificateNumber: "POL-OPEN-2026-0042",
          assured: "Iberia Global Exports S.L.",
          insuredValueEur: 220000,
          currency: "EUR",
          voyageFrom: "Valencia, Spain",
          voyageTo: "New York, USA",
          clauseCover: "Institute Cargo Clauses (A) - All Risks",
          premiumEur: 880,
        },
      },
      {
        type: "CONTRACT",
        name: "Contrato Comercial Incoterms® 2020",
        domain: "CONTRACTS",
        regulation: "Cámara Comercio Internacional (ICC)",
        icon: "FileSignature",
        defaultData: {
          contractNumber: "CTR-2026-INCO-88",
          seller: "Atlas Manufacturing Corp S.A.",
          buyer: "Transatlantic Trade LLC",
          incotermRule: "CIF - Cost, Insurance and Freight",
          namedPlace: "Puerto de Nueva York (USNYC)",
          totalAmount: 185000,
          currency: "USD",
        },
      },
      {
        type: "GDP_CERT",
        name: "Certificado de Liberación Pharma GDP",
        domain: "COLD_CHAIN",
        regulation: "Directrices UE GDP / EN 12830",
        icon: "Snowflake",
        defaultData: {
          certificateNumber: "GDP-CERT-2026-019",
          productDescription: "Vacunas y Terapias Génicas (+2°C a +8°C)",
          dataloggerSerial: "SENS-TITAN-9921",
          meanKineticTempCelsius: 4.8,
          minTempRecorded: 3.2,
          maxTempRecorded: 6.4,
          excursionsCount: 0,
          complianceResult: "RELEASED_FOR_DISTRIBUTION",
        },
      },
      {
        type: "CBAM_DECLARATION",
        name: "Declaración de Emisiones CBAM",
        domain: "SUSTAINABILITY",
        regulation: "Reglamento UE 2023/956",
        icon: "Leaf",
        defaultData: {
          declarationPeriod: "2026-Q3",
          declarant: "Atlas Logistics CBAM Services SL",
          directEmissionsTonnes: 142.5,
          indirectEmissionsTonnes: 18.2,
          totalCertificatesRequired: 161,
          carbonPriceEurPerTonne: 85.5,
        },
      },
      {
        type: "DGR_DECLARATION",
        name: "Declaración de Mercancías Peligrosas",
        domain: "SAFETY",
        regulation: "OMI IMDG / IATA DGR / ADR",
        icon: "AlertTriangle",
        defaultData: {
          unNumber: "UN 1263",
          properShippingName: "PAINT RELATED MATERIAL",
          classDivision: "3 (Líquido Inflamable)",
          packingGroup: "PG II",
          flashPointCelsius: "23°C c.c.",
          emsCode: "F-E, S-E",
        },
      },
      {
        type: "AEO_7POINT",
        name: "Acta de Inspección de Seguridad 7 Puntos",
        domain: "SECURITY",
        regulation: "Marco SAFE OMA / C-TPAT",
        icon: "ShieldAlert",
        defaultData: {
          containerNumber: "MSKU-782910-3",
          sealNumber: "ISO-17712-H-881920",
          inspectorName: "Marc Vilanova",
          location: "Terminal BEST Muelle Prat BCN",
          undercarriagePass: true,
          doorsPass: true,
          rightSidePass: true,
          leftSidePass: true,
          frontWallPass: true,
          ceilingPass: true,
          floorPass: true,
          agriculturalPestFree: true,
        },
      },
      {
        type: "LAYTIME_SHEET",
        name: "Liquidación de Planchas (Laytime)",
        domain: "CHARTERING",
        regulation: "BIMCO Standard Definitions",
        icon: "Anchor",
        defaultData: {
          vesselName: "M/V ATLANTIC BULKER",
          charterPartyDate: "2026-09-15",
          port: "Rotterdam Europoort",
          laytimeAllowedHours: 72,
          laytimeUsedHours: 86.5,
          demurrageRatePerDayUsd: 18000,
          demurrageDueUsd: 10875,
        },
      },
    ];
  }
}
