import { db } from "../index.js";
import { documents } from "../schema/index.js";
import { sql } from "drizzle-orm";
import crypto from "crypto";

export async function seedDocuments(): Promise<void> {
  console.log("🌱 Initializing and seeding Multimodal Official Document Center & Vault...");

  // 1. Create table or alter if missing new columns
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      shipment_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      document_reference TEXT,
      sha256_hash TEXT,
      status TEXT NOT NULL DEFAULT 'EMITTED',
      signed_by TEXT,
      signer_title TEXT,
      signer_certificate TEXT,
      signed_at INTEGER,
      payload_data TEXT,
      file_size INTEGER,
      url TEXT NOT NULL,
      uploaded_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      tags TEXT
    );
  `);

  // Safe ALTER TABLE for SQLite if table previously existed without the new columns
  const alterColumns = [
    `ALTER TABLE documents ADD COLUMN document_reference TEXT;`,
    `ALTER TABLE documents ADD COLUMN sha256_hash TEXT;`,
    `ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'EMITTED';`,
    `ALTER TABLE documents ADD COLUMN signed_by TEXT;`,
    `ALTER TABLE documents ADD COLUMN signer_title TEXT;`,
    `ALTER TABLE documents ADD COLUMN signer_certificate TEXT;`,
    `ALTER TABLE documents ADD COLUMN signed_at INTEGER;`,
    `ALTER TABLE documents ADD COLUMN payload_data TEXT;`,
    `ALTER TABLE documents ADD COLUMN file_size INTEGER;`,
  ];

  for (const alterSql of alterColumns) {
    try {
      await db.run(sql.raw(alterSql));
    } catch {
      // Column already exists, safe to ignore in SQLite
    }
  }

  // 2. Pre-seed 5 Official Multimodal Signed Documents
  const sampleDocs = [
    {
      id: "doc_hbl_0081",
      name: "House Bill of Lading (HBL-2026-0081)",
      type: "HBL",
      documentReference: "HBL-2026-0081",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_HBL_2026_0081_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Carlos Mendoza",
      signerTitle: "Director de Operaciones & Tráfico Marítimo",
      signerCertificate: "CERT-ATLAS-PKI-2026-8819",
      signedAt: new Date(Date.now() - 3600000 * 24),
      fileSize: 142500,
      url: "/api/documents/doc_hbl_0081/pdf",
      payloadData: {
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
      id: "doc_dua_0412",
      name: "Documento Único Administrativo (DUA-ES-2026-00412)",
      type: "DUA",
      documentReference: "DUA-ES-2026-00412",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_DUA_2026_00412_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Mateo Ortiz",
      signerTitle: "Representante Aduanero Colegiado OEA (Colegio 4192)",
      signerCertificate: "CERT-AEAT-OEA-ESP-2026-4192",
      signedAt: new Date(Date.now() - 3600000 * 18),
      fileSize: 188400,
      url: "/api/documents/doc_dua_0412/pdf",
      payloadData: {
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
      id: "doc_ecmr_8819",
      name: "Carta de Porte Internacional e-CMR (CMR-2026-8819)",
      type: "ECMR",
      documentReference: "CMR-2026-8819",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_CMR_2026_8819_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Elena Vega",
      signerTitle: "Gestor de Tráfico Terrestre Internacional",
      signerCertificate: "CERT-IRU-ECMR-2026-00192",
      signedAt: new Date(Date.now() - 3600000 * 12),
      fileSize: 124800,
      url: "/api/documents/doc_ecmr_8819/pdf",
      payloadData: {
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
      id: "doc_awb_2031",
      name: "IATA Air Waybill (AWB-075-88192031)",
      type: "AWB",
      documentReference: "075-88192031",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_AWB_075_88192031_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Lucía Domínguez",
      signerTitle: "Agente de Carga IATA Acreditado (CASS 14-3)",
      signerCertificate: "CERT-IATA-CASS-ESP-2026-143",
      signedAt: new Date(Date.now() - 3600000 * 6),
      fileSize: 156900,
      url: "/api/documents/doc_awb_2031/pdf",
      payloadData: {
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
      id: "doc_gdp_019",
      name: "Certificado de Liberación Pharma GDP (GDP-CERT-2026-019)",
      type: "GDP_CERT",
      documentReference: "GDP-CERT-2026-019",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_GDP_CERT_2026_019_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Carlos Mendoza",
      signerTitle: "Responsable Técnico Farmacéutico (QA / GDP)",
      signerCertificate: "CERT-EMA-GDP-COMPLIANCE-2026",
      signedAt: new Date(Date.now() - 3600000 * 3),
      fileSize: 132100,
      url: "/api/documents/doc_gdp_019/pdf",
      payloadData: {
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
  ];

  for (const doc of sampleDocs) {
    await db
      .insert(documents)
      .values({
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
        payloadData: doc.payloadData,
        fileSize: doc.fileSize,
        url: doc.url,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Creados ${sampleDocs.length} documentos oficiales firmados digitalmente.`);
}
