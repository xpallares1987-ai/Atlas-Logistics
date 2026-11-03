import { db } from "../index.js";
import { documents } from "../schema/index.js";
import { sql } from "drizzle-orm";
import crypto from "crypto";

export async function seedDocuments(): Promise<void> {
  console.log(
    "🌱 Initializing and seeding Multimodal Official Document Center & Vault...",
  );

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
    {
      id: "doc_ecmr_drayage_zaz_bcn",
      name: "Carta de Porte e-CMR Acarreo Terrestre (tmZ Zaragoza -> BEST Barcelona)",
      type: "ECMR",
      documentReference: "CMR-2026-DRAY-011",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_CMR_2026_DRAY_011_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Ignacio Sesé",
      signerTitle:
        "Director de Operaciones Intermodales - Grupo Logístico Sesé",
      signerCertificate: "CERT-MITMA-CMR-2026-88124",
      signedAt: new Date(Date.now() - 3600000 * 8),
      fileSize: 138200,
      url: "/api/documents/doc_ecmr_drayage_zaz_bcn/pdf",
      payloadData: {
        consignmentNumber: "CMR-2026-DRAY-011",
        sender: "Zaragoza Intermodal Machinery SA",
        consignee: "Hutchison Ports BEST (Muelle Prat, Port de Barcelona)",
        carrier: "Grupo Logístico Sesé SL",
        vehicleReg: "4491-LXP / R-9821-BC",
        adrGoods: "NON_HAZARDOUS",
        grossWeightKg: 24500,
        containerNumber: "MSKU-782910-3",
        pinGateCode: "9481",
        distanceKm: 320,
        co2eEmissionsKg: 142.8,
      },
    },
    {
      id: "doc_cim_rail_4410",
      name: "Carta de Porte Ferroviaria Internacional CIM (CIM-ES-2026-4410)",
      type: "CIM",
      documentReference: "CIM-ES-2026-4410",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_CIM_2026_4410_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Pau Casals",
      signerTitle:
        "Jefe de Tráfico Intermodal Ferroviario (CIT / Renfe Mercancías)",
      signerCertificate: "CERT-CIT-CIM-EU-2026-091",
      signedAt: new Date(Date.now() - 3600000 * 16),
      fileSize: 165400,
      url: "/api/documents/doc_cim_rail_4410/pdf",
      payloadData: {
        consignmentNumber: "CIM-ES-2026-4410",
        corridor: "RFC 6 Mediterranean Rail Corridor",
        departureStation: "Barcelona Can Tunis (71004)",
        arrivalStation: "Antwerp North C.T. (88001)",
        tractionCarrier: "Captrain España / Lineas Intermodal",
        trainNumber: "TR-48201",
        trainLengthMeters: 740,
        wagonsCount: 22,
        totalTeu: 44,
        grossWeightTonnes: 1150,
      },
    },
    {
      id: "doc_insur_cert_8820",
      name: "Certificado de Seguro de Mercancías ICC(A) (POL-LGT-2026-8820)",
      type: "INSURANCE_CERT",
      documentReference: "POL-LGT-2026-8820",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_INSUR_2026_8820_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Ana Belén Morales",
      signerTitle: "Apoderada de Suscripción Marítima - Mapfre Global Risks",
      signerCertificate: "CERT-DGSFP-MAPFRE-2026-441",
      signedAt: new Date(Date.now() - 3600000 * 20),
      fileSize: 148900,
      url: "/api/documents/doc_insur_cert_8820/pdf",
      payloadData: {
        policyNumber: "POL-LGT-2026-8820",
        clauses: "Institute Cargo Clauses (A) 2009 / ICC Air / War & Strikes",
        insuredParty: "Zaragoza Intermodal Machinery SA",
        sumInsuredEur: 345000,
        deductibleEur: 500,
        generalAverageCovered: true,
        vesselConveyance: "MSC ISABELLA v.88W",
        voyage: "Puerto de Barcelona -> New York Container Terminal",
      },
    },
    {
      id: "doc_contract_fcl_2026",
      name: "Contrato Marco de Transporte y Logística Multimodal (CTR-2026-9912)",
      type: "CONTRACT",
      documentReference: "CTR-2026-9912",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_CONTRACT_2026_9912_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Carlos Mendoza",
      signerTitle: "Director de Operaciones & Tráfico Marítimo",
      signerCertificate: "CERT-ATLAS-PKI-2026-8819",
      signedAt: new Date(Date.now() - 3600000 * 30),
      fileSize: 172000,
      url: "/api/documents/doc_contract_fcl_2026/pdf",
      payloadData: {
        contractNumber: "CTR-2026-9912",
        shipperName: "Aceros del Cantábrico Bilbao SL",
        carrierName: "Atlas Forwarding & Intermodal Hub S.L.",
        annualCommitmentTeu: 450,
        serviceLevelTargetPct: 98.5,
        paymentTerms: "30_DAYS_EOM",
        governingLaw:
          "Jurisdicción Marítima de España (Ley Navegación Marítima 14/2014)",
      },
    },
    {
      id: "doc_cbam_emissions_1140",
      name: "Declaración de Emisiones Incrustadas CBAM UE 2023/956 (CBAM-ES-2026-1140)",
      type: "CBAM_DECLARATION",
      documentReference: "CBAM-ES-2026-1140",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_CBAM_2026_1140_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Beatriz Galindo",
      signerTitle:
        "Auditora Verificadora de Sostenibilidad y Emisiones ISO 14064",
      signerCertificate: "CERT-ENAC-CBAM-VERIFIER-2026",
      signedAt: new Date(Date.now() - 3600000 * 10),
      fileSize: 154300,
      url: "/api/documents/doc_cbam_emissions_1140/pdf",
      payloadData: {
        cbamDeclarationNumber: "CBAM-ES-2026-1140",
        declarantEori: "ESA99214012",
        installationCountry: "CN (China)",
        installationId: "CN-INSTALL-BAOSTEEL-8812",
        cnCode: "7208 51 00 (Flat-rolled products of iron/non-alloy steel)",
        importedMassTonnes: 48.5,
        directSpecificEmissionsTCo2ePerT: 1.82,
        indirectSpecificEmissionsTCo2ePerT: 0.44,
        totalEmbeddedEmissionsTCo2e: 109.61,
        carbonPricePaidOriginEur: 0,
        cbamCertificatesSurrendered: 110,
      },
    },
    {
      id: "doc_dgr_declaration_901",
      name: "Declaración del Expedidor de Mercancías Peligrosas DGR / IMDG (DGR-2026-0901)",
      type: "DGR_DECLARATION",
      documentReference: "DGR-2026-0901",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_DGR_2026_0901_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Javier Montero",
      signerTitle: "Consejero de Seguridad Certificado ADR / IMDG (RD 97/2014)",
      signerCertificate: "CERT-MITMA-DG-ADR-2026-0312",
      signedAt: new Date(Date.now() - 3600000 * 14),
      fileSize: 161800,
      url: "/api/documents/doc_dgr_declaration_901/pdf",
      payloadData: {
        dgrDeclarationNumber: "DGR-2026-0901",
        shipper: "Tarragona Petrochemicals S.A.",
        consignee: "Fos Chemical Industrial Park SAS (Francia)",
        unNumber: "UN 1824",
        properShippingName: "SODIUM HYDROXIDE SOLUTION",
        classOrDivision: "8 (Corrosive Substances)",
        packingGroup: "II",
        tunnelRestrictionCode: "(E)",
        netMassKg: 18400,
        packageType: "18 x Composite IBCs (31HA1)",
        emergencyResponseTelephone: "+34 91 562 04 20 (INTCF)",
      },
    },
    {
      id: "doc_aeo_7point_3310",
      name: "Acta de Inspección de Seguridad 7 Puntos Contenedor OEA (AEO-7PT-2026-3310)",
      type: "AEO_7POINT",
      documentReference: "AEO-7PT-2026-3310",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_AEO_2026_3310_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Marc Vilanova",
      signerTitle:
        "Oficial de Seguridad Portuaria y Protección PFSO (ISPS Code)",
      signerCertificate: "CERT-AP-VALENCIA-PFSO-2026",
      signedAt: new Date(Date.now() - 3600000 * 5),
      fileSize: 129400,
      url: "/api/documents/doc_aeo_7point_3310/pdf",
      payloadData: {
        inspectionCode: "AEO-7PT-2026-3310",
        containerNumber: "MSKU-782910-3",
        containerType: "40ft High Cube Dry Van",
        sealNumber: "ISO-17712-H-881920",
        location: "Terminal BEST Muelle Prat Barcelona",
        undercarriagePass: true,
        doorsPass: true,
        rightSidePass: true,
        leftSidePass: true,
        frontWallPass: true,
        ceilingPass: true,
        floorPass: true,
        agriculturalPestFree: true,
        inspectionVerdict: "CLEARED_FOR_OCEAN_STOWAGE",
      },
    },
    {
      id: "doc_laytime_sheet_551",
      name: "Liquidación y Cómputo de Planchas Laytime Statement (SOF-2026-0551)",
      type: "LAYTIME_SHEET",
      documentReference: "SOF-2026-0551",
      sha256Hash: crypto
        .createHash("sha256")
        .update("ATLAS_OFFICIAL_LAYTIME_2026_0551_BYTES_PAYLOAD")
        .digest("hex"),
      status: "SIGNED",
      signedBy: "Capt. Dimitrios Papandreou",
      signerTitle: "Master Mariner / Capitán Inspector Portuario (BIMCO FDD)",
      signerCertificate: "CERT-HELLENIC-MASTER-MARINER-8812",
      signedAt: new Date(Date.now() - 3600000 * 48),
      fileSize: 147800,
      url: "/api/documents/doc_laytime_sheet_551/pdf",
      payloadData: {
        statementNumber: "SOF-2026-0551",
        vesselName: "M/V AEGEAN WIND",
        portOfOperation: "Puerto de Algeciras (Muelle de Graneles)",
        charterPartyTerms: "GENCON 1994",
        cargoDescription: "35,000 MT Trigo Panificable a Granel",
        norTenderedAt: "2026-08-14T08:00:00Z",
        norAcceptedAt: "2026-08-14T14:00:00Z",
        laytimeAllowedHours: 72.0,
        laytimeUsedHours: 58.5,
        timeSavedHours: 13.5,
        despatchRatePerDayUsd: 12000.0,
        demurrageRatePerDayUsd: 24000.0,
        balanceVerdict: "DESPATCH_DUE_TO_CHARTERER",
        netDespatchEarnedUsd: 6750.0,
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

  console.log(
    `✅ Creados ${sampleDocs.length} documentos oficiales firmados digitalmente.`,
  );
}
