import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedCbam(): Promise<void> {
  // ==========================================
  // 15. MECANISMO DE AJUSTE EN FRONTERA POR CARBONO (CBAM) - REGLAMENTO (UE) 2023/956
  // ==========================================
  console.log(
    "🌿 Inyectando Catálogo de Bienes CBAM, Instalaciones Productoras Verificadas y Declaraciones Trimestrales...",
  );

  // Seed CBAM Goods Catalog
  await db
    .insert(schema.cbamGoodsCatalog)
    .values([
      {
        id: "cbam_good_steel_coil",
        cnCode: "7208 38 00",
        sector: "IRON_STEEL",
        description:
          "Productos laminados planos de hierro o acero sin alear, de anchura >= 600 mm, enrollados (bobinas en caliente), espesor 3 mm a 4.75 mm.",
        isComplexGood: false,
        defaultDirectEmissionFactor: 1.85,
        defaultIndirectEmissionFactor: 0.42,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_alum_ingot",
        cnCode: "7601 10 00",
        sector: "ALUMINIUM",
        description:
          "Aluminio en bruto sin alear, en lingotes o placas para refusión electrolítica.",
        isComplexGood: false,
        defaultDirectEmissionFactor: 1.98,
        defaultIndirectEmissionFactor: 6.8,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_cement_portland",
        cnCode: "2523 29 00",
        sector: "CEMENT",
        description:
          "Cemento Portland gris estándar (clinker de cemento molido con adiciones).",
        isComplexGood: false,
        defaultDirectEmissionFactor: 0.72,
        defaultIndirectEmissionFactor: 0.09,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_fertilizer_urea",
        cnCode: "3102 10 00",
        sector: "FERTILIZERS",
        description:
          "Urea con contenido de nitrógeno superior al 45% en peso, incluso en disolución acuosa.",
        isComplexGood: true,
        defaultDirectEmissionFactor: 1.45,
        defaultIndirectEmissionFactor: 0.35,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_hydrogen",
        cnCode: "2804 10 00",
        sector: "HYDROGEN",
        description:
          "Hidrógeno comprimido / gas licuado para uso industrial o energético.",
        isComplexGood: false,
        defaultDirectEmissionFactor: 9.1,
        defaultIndirectEmissionFactor: 1.2,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_steel_structures",
        cnCode: "7308 90 00",
        sector: "IRON_STEEL",
        description:
          "Construcciones y sus partes (puentes, torres, pilares, vigas) de fundición, hierro o acero.",
        isComplexGood: true,
        defaultDirectEmissionFactor: 2.15,
        defaultIndirectEmissionFactor: 0.55,
        standard: "EU_REG_2023_956",
      },
    ])
    .onConflictDoNothing();

  // Seed CBAM Installations
  await db
    .insert(schema.cbamInstallations)
    .values([
      {
        id: "inst_erdemir_tr",
        installationName: "Erdemir Steel Works KDZ",
        operatorName: "Eregli Demir ve Celik Fabrikalari TAS",
        countryCode: "TR",
        unLocode: "TRERE",
        latitude: 41.285,
        longitude: 31.428,
        verifiedDirectEmissionFactor: 1.72,
        verifiedIndirectEmissionFactor: 0.38,
        gridEmissionFactorCountry: 0.44,
        verifierName: "Bureau Veritas Certification Türkiye",
        verificationCertificateId: "BV-CBAM-TR-2026-9021",
      },
      {
        id: "inst_chalco_cn",
        installationName: "Chalco Zhengzhou Primary Smelter",
        operatorName: "Aluminum Corporation of China Ltd",
        countryCode: "CN",
        unLocode: "CNZZU",
        latitude: 34.757,
        longitude: 113.665,
        verifiedDirectEmissionFactor: 1.85,
        verifiedIndirectEmissionFactor: 6.15,
        gridEmissionFactorCountry: 0.58,
        verifierName: "TÜV Rheinland Greater China",
        verificationCertificateId: "TUV-CBAM-CN-2026-1184",
      },
      {
        id: "inst_ocp_ma",
        installationName: "OCP Jorf Lasfar Fertilizer Complex",
        operatorName: "OCP Group Morocco",
        countryCode: "MA",
        unLocode: "MAJFL",
        latitude: 33.125,
        longitude: -8.625,
        verifiedDirectEmissionFactor: 1.32,
        verifiedIndirectEmissionFactor: 0.28,
        gridEmissionFactorCountry: 0.62,
        verifierName: "SGS Maroc Surveillance SA",
        verificationCertificateId: "SGS-CBAM-MA-2026-5502",
      },
      {
        id: "inst_british_steel_gb",
        installationName: "Scunthorpe Integrated Steelworks",
        operatorName: "British Steel Ltd",
        countryCode: "GB",
        unLocode: "GBSCU",
        latitude: 53.585,
        longitude: -0.652,
        verifiedDirectEmissionFactor: 1.9,
        verifiedIndirectEmissionFactor: 0.4,
        gridEmissionFactorCountry: 0.21,
        verifierName: "DNV GL Business Assurance UK",
        verificationCertificateId: "DNV-CBAM-GB-2026-3390",
      },
      {
        id: "inst_posco_kr",
        installationName: "POSCO Pohang Integrated Steelworks",
        operatorName: "POSCO Holdings Inc",
        countryCode: "KR",
        unLocode: "KRKPO",
        latitude: 36.019,
        longitude: 129.385,
        verifiedDirectEmissionFactor: 1.88,
        verifiedIndirectEmissionFactor: 0.45,
        gridEmissionFactorCountry: 0.48,
        verifierName: "Korean Foundation for Quality (KFQ)",
        verificationCertificateId: "KFQ-CBAM-KR-2026-8812",
      },
      {
        id: "inst_tata_in",
        installationName: "Tata Steel Jamshedpur Works",
        operatorName: "Tata Steel Limited",
        countryCode: "IN",
        unLocode: "INIXR",
        latitude: 22.804,
        longitude: 86.202,
        verifiedDirectEmissionFactor: 2.25,
        verifiedIndirectEmissionFactor: 0.65,
        gridEmissionFactorCountry: 0.72,
        verifierName: "SGS India Industrial Services",
        verificationCertificateId: "SGS-CBAM-IN-2026-4401",
      },
    ])
    .onConflictDoNothing();

  // Seed CBAM Declarations
  await db
    .insert(schema.cbamDeclarations)
    .values([
      {
        id: "cbam_dec_2026_q3_01",
        declarationNumber: "CBAM-2026-Q3-001",
        reportingPeriod: "2026-Q3",
        declarantVat: "ESA88992211",
        declarantName:
          "Atlas Logistics Forwarding SL (Declarante Autorizado CBAM)",
        importerVat: "ESA11223344",
        importerName: "Iberian Industrial Metals SL",
        totalGrossMassTonnes: 4850.0,
        totalNetMassTonnes: 4800.0,
        totalDirectEmissionsTco2e: 8566.0,
        totalIndirectEmissionsTco2e: 7614.0,
        totalEmbeddedEmissionsTco2e: 16430.0,
        euEtsBenchmarkPriceEur: 85.5,
        grossCarbonLiabilityEur: 1404765.0,
        carbonPricePaidForeignEur: 180000.0, // Deducción UK ETS
        netCarbonLiabilityEur: 1224765.0,
        status: "VALIDATED",
        responsibleDeclarant:
          "Carlos Vega (Responsable Técnico de Aduanas & CBAM)",
        remarks:
          "Declaración trimestral auditada con certificados de instalación acreditados en Turquía, China y Reino Unido.",
      },
      {
        id: "cbam_dec_2026_q2_02",
        declarationNumber: "CBAM-2026-Q2-002",
        reportingPeriod: "2026-Q2",
        declarantVat: "ESA88992211",
        declarantName:
          "Atlas Logistics Forwarding SL (Declarante Autorizado CBAM)",
        importerVat: "ESB99887766",
        importerName: "Construcciones & Cemento del Mediterráneo SA",
        totalGrossMassTonnes: 12200.0,
        totalNetMassTonnes: 12000.0,
        totalDirectEmissionsTco2e: 8640.0,
        totalIndirectEmissionsTco2e: 1080.0,
        totalEmbeddedEmissionsTco2e: 9720.0,
        euEtsBenchmarkPriceEur: 82.0,
        grossCarbonLiabilityEur: 797040.0,
        carbonPricePaidForeignEur: 0.0,
        netCarbonLiabilityEur: 797040.0,
        status: "SUBMITTED_REGISTRY",
        responsibleDeclarant:
          "Carlos Vega (Responsable Técnico de Aduanas & CBAM)",
        remarks:
          "Presentada telemáticamente ante el Registro Transitorio CBAM de la Comisión Europea.",
      },
      {
        id: "cbam_dec_2026_q1_03",
        declarationNumber: "CBAM-2026-Q1-003",
        reportingPeriod: "2026-Q1",
        declarantVat: "ESA88992211",
        declarantName:
          "Atlas Logistics Forwarding SL (Declarante Autorizado CBAM)",
        importerVat: "ESA50112233",
        importerName: "Zaragoza Intermodal Machinery SA",
        totalGrossMassTonnes: 6400.0,
        totalNetMassTonnes: 6350.0,
        totalDirectEmissionsTco2e: 11938.0,
        totalIndirectEmissionsTco2e: 2857.5,
        totalEmbeddedEmissionsTco2e: 14795.5,
        euEtsBenchmarkPriceEur: 80.5,
        grossCarbonLiabilityEur: 1191037.75,
        carbonPricePaidForeignEur: 0.0,
        netCarbonLiabilityEur: 1191037.75,
        status: "VALIDATED",
        responsibleDeclarant:
          "Carlos Vega (Responsable Técnico de Aduanas & CBAM)",
        remarks:
          "Importación de bobinas de acero de POSCO (Corea del Sur) con factores certificados.",
      },
      {
        id: "cbam_dec_2025_q4_04",
        declarationNumber: "CBAM-2025-Q4-004",
        reportingPeriod: "2025-Q4",
        declarantVat: "ESA88992211",
        declarantName:
          "Atlas Logistics Forwarding SL (Declarante Autorizado CBAM)",
        importerVat: "ESA11223344",
        importerName: "Iberian Industrial Metals SL",
        totalGrossMassTonnes: 9200.0,
        totalNetMassTonnes: 9100.0,
        totalDirectEmissionsTco2e: 17290.0,
        totalIndirectEmissionsTco2e: 3640.0,
        totalEmbeddedEmissionsTco2e: 20930.0,
        euEtsBenchmarkPriceEur: 78.2,
        grossCarbonLiabilityEur: 1636726.0,
        carbonPricePaidForeignEur: 0.0,
        netCarbonLiabilityEur: 1636726.0,
        status: "SUBMITTED_REGISTRY",
        responsibleDeclarant:
          "Carlos Vega (Responsable Técnico de Aduanas & CBAM)",
        remarks:
          "Cierre anual 2025 presentado al registro transitorio de la DG TAXUD.",
      },
    ])
    .onConflictDoNothing();

  // Seed CBAM Declaration Lines
  await db
    .insert(schema.cbamDeclarationLines)
    .values([
      {
        id: "cbam_line_01",
        declarationId: "cbam_dec_2026_q3_01",
        shipmentId: "shp_001",
        duaNumber: "26ES00461110084920",
        duaBox33HsCode: "7208 38 00",
        goodDescription: "Bobinas de acero laminadas en caliente (2.800 t)",
        originCountry: "TR",
        installationId: "inst_erdemir_tr",
        netWeightTonnes: 2800.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 4816.0, // 2800 * 1.72
        indirectEmissionsTco2e: 1064.0, // 2800 * 0.38
        precursorEmissionsTco2e: 0.0,
        totalLineEmissionsTco2e: 5880.0,
        foreignCarbonPricePerTco2e: 0.0,
        effectiveForeignPricePaidEur: 0.0,
        lineGrossLiabilityEur: 502740.0, // 5880 * 85.50
        lineNetLiabilityEur: 502740.0,
      },
      {
        id: "cbam_line_02",
        declarationId: "cbam_dec_2026_q3_01",
        shipmentId: "shp_002",
        duaNumber: "26ES00461110091044",
        duaBox33HsCode: "7601 10 00",
        goodDescription: "Lingotes de aluminio primario sin alear (1.000 t)",
        originCountry: "CN",
        installationId: "inst_chalco_cn",
        netWeightTonnes: 1000.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 1850.0, // 1000 * 1.85
        indirectEmissionsTco2e: 6150.0, // 1000 * 6.15
        precursorEmissionsTco2e: 0.0,
        totalLineEmissionsTco2e: 8000.0,
        foreignCarbonPricePerTco2e: 0.0,
        effectiveForeignPricePaidEur: 0.0,
        lineGrossLiabilityEur: 684000.0, // 8000 * 85.50
        lineNetLiabilityEur: 684000.0,
      },
      {
        id: "cbam_line_03",
        declarationId: "cbam_dec_2026_q3_01",
        shipmentId: "shp_003",
        duaNumber: "26ES00461110095501",
        duaBox33HsCode: "7308 90 00",
        goodDescription: "Estructuras de acero fabricadas (1.000 t)",
        originCountry: "GB",
        installationId: "inst_british_steel_gb",
        netWeightTonnes: 1000.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 1900.0, // 1000 * 1.90
        indirectEmissionsTco2e: 400.0, // 1000 * 0.40
        precursorEmissionsTco2e: 250.0, // 1000 * 0.25 (palanquilla)
        totalLineEmissionsTco2e: 2550.0,
        foreignCarbonPricePerTco2e: 70.59,
        effectiveForeignPricePaidEur: 180000.0, // Compensación acreditada UK ETS
        lineGrossLiabilityEur: 218025.0, // 2550 * 85.50
        lineNetLiabilityEur: 38025.0, // 218025 - 180000
      },
      {
        id: "cbam_line_04",
        declarationId: "cbam_dec_2026_q1_03",
        shipmentId: "shp_004",
        duaNumber: "26ES00461110112233",
        duaBox33HsCode: "7208 38 00",
        goodDescription:
          "Bobinas de acero POSCO laminadas en caliente (3.500 t)",
        originCountry: "KR",
        installationId: "inst_posco_kr",
        netWeightTonnes: 3500.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 6580.0, // 3500 * 1.88
        indirectEmissionsTco2e: 1575.0, // 3500 * 0.45
        precursorEmissionsTco2e: 0.0,
        totalLineEmissionsTco2e: 8155.0,
        foreignCarbonPricePerTco2e: 0.0,
        effectiveForeignPricePaidEur: 0.0,
        lineGrossLiabilityEur: 656477.5,
        lineNetLiabilityEur: 656477.5,
      },
      {
        id: "cbam_line_05",
        declarationId: "cbam_dec_2026_q1_03",
        shipmentId: "shp_005",
        duaNumber: "26ES00461110114455",
        duaBox33HsCode: "7214 20 00",
        goodDescription:
          "Barras corrugadas de acero para hormigón armado (2.850 t)",
        originCountry: "IN",
        installationId: "inst_tata_in",
        netWeightTonnes: 2850.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 6412.5, // 2850 * 2.25
        indirectEmissionsTco2e: 1852.5, // 2850 * 0.65
        precursorEmissionsTco2e: 0.0,
        totalLineEmissionsTco2e: 8265.0,
        foreignCarbonPricePerTco2e: 0.0,
        effectiveForeignPricePaidEur: 0.0,
        lineGrossLiabilityEur: 665332.5,
        lineNetLiabilityEur: 665332.5,
      },
      {
        id: "cbam_line_06",
        declarationId: "cbam_dec_2025_q4_04",
        shipmentId: "shp_006",
        duaNumber: "25ES00461110098822",
        duaBox33HsCode: "3102 10 00",
        goodDescription: "Fertilizante granulado Urea 46% N (4.500 t)",
        originCountry: "MA",
        installationId: "inst_ocp_ma",
        netWeightTonnes: 4500.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 5940.0, // 4500 * 1.32
        indirectEmissionsTco2e: 1260.0, // 4500 * 0.28
        precursorEmissionsTco2e: 0.0,
        totalLineEmissionsTco2e: 7200.0,
        foreignCarbonPricePerTco2e: 0.0,
        effectiveForeignPricePaidEur: 0.0,
        lineGrossLiabilityEur: 563040.0,
        lineNetLiabilityEur: 563040.0,
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Catálogo CBAM, Instalaciones Verificadas, Declaraciones Trimestrales y Líneas de Importación.",
  );
}
