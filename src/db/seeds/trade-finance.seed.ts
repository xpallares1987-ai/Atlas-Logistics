import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedTradeFinance(): Promise<void> {
  // ----------------------------------------------------
  console.log(
    "💰 Inyectando Instrumentos de Financiación de Comercio Exterior & UCP 600...",
  );

  await db
    .insert(schema.tradeCreditInstruments)
    .values([
      {
        id: "lc_bcn_2026_01",
        instrumentReference: "LC-2026-BCN-0089",
        instrumentType: "COMMERCIAL_LC_CONFIRMED",
        applicableRules: "UCP600",
        applicantCompanyId: null,
        applicantName: "Singapore Food Imports Pte Ltd",
        beneficiaryName: "Mediterranean Olive Oil Exports SL",
        beneficiaryCountry: "ES",
        issuingBankBic: "DBSSSGSGXXX",
        issuingBankName: "DBS Bank Ltd Singapore",
        confirmingBankBic: "BSCHESMMXXX",
        confirmingBankName: "Banco Santander SA Madrid",
        currency: "EUR",
        creditAmount: 145000.0,
        tolerancePercentage: 5.0,
        issueDate: "2026-08-01",
        latestShipmentDate: "2026-09-15",
        expiryDate: "2026-10-06",
        expiryPlace: "Counters of Banco Santander SA, Barcelona",
        portOfLoading: "ESBCN - Port of Barcelona",
        portOfDischarge: "SGSIN - Port of Singapore",
        goodsDescriptionSummary:
          "5,000 BOXES EXTRA VIRGIN OLIVE OIL (50,000 LITRES) CIF SINGAPORE INCOTERMS 2020",
        partialShipmentsAllowed: false,
        transhipmentAllowed: false,
        presentationPeriodDays: 21,
        confirmationInstructions: "CONFIRM",
        paymentTerms: "SIGHT",
        tenorDays: 0,
        status: "DOCUMENTS_PRESENTED",
        remarks:
          "Crédito documentario plenamente conforme. Pendiente de pago a la vista por el banco confirmador.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lc_val_2026_02",
        instrumentReference: "LC-2026-VAL-0145",
        instrumentType: "COMMERCIAL_LC_IRREVOCABLE",
        applicableRules: "UCP600",
        applicantCompanyId: null,
        applicantName: "Manhattan Tile & Stone Design LLC",
        beneficiaryName: "Cerámicas y Gres Levantino SA",
        beneficiaryCountry: "ES",
        issuingBankBic: "CHASUS33XXX",
        issuingBankName: "JPMorgan Chase Bank NA New York",
        confirmingBankBic: "BBVAESMMXXX",
        confirmingBankName: "BBVA SA Valencia",
        currency: "USD",
        creditAmount: 320000.0,
        tolerancePercentage: 5.0,
        issueDate: "2026-07-15",
        latestShipmentDate: "2026-08-10",
        expiryDate: "2026-09-05",
        expiryPlace: "Counters of Advising Bank, Valencia",
        portOfLoading: "ESVLC - Port of Valencia",
        portOfDischarge: "USNYC - Port of New York & New Jersey",
        goodsDescriptionSummary:
          "8 FCL CONTAINERS PORCELAIN FLOOR TILES GRADE A CIF NEW YORK INCOTERMS 2020",
        partialShipmentsAllowed: true,
        transhipmentAllowed: false,
        presentationPeriodDays: 21,
        confirmationInstructions: "WITHOUT",
        paymentTerms: "ACCEPTANCE_USANCE",
        tenorDays: 60,
        status: "DISCREPANCIES_FOUND",
        remarks:
          "Discrepancias detectadas: Presentación tardía de documentos (Art. 14c) y Póliza con infraseguro (Art. 28f).",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "sblc_mad_2026_03",
        instrumentReference: "SBLC-2026-MAD-0920",
        instrumentType: "DEMAND_GUARANTEE_URDG758",
        applicableRules: "URDG758",
        applicantCompanyId: null,
        applicantName: "Atlas Renewables Project Logistics SL",
        beneficiaryName: "TenneT Offshore Wind Grid TSO BV",
        beneficiaryCountry: "NL",
        issuingBankBic: "CAIXESBBXXX",
        issuingBankName: "CaixaBank SA Madrid",
        confirmingBankBic: "INGBNL2AXXX",
        confirmingBankName: "ING Bank NV Amsterdam",
        currency: "EUR",
        creditAmount: 500000.0,
        tolerancePercentage: 0.0,
        issueDate: "2026-06-01",
        latestShipmentDate: "2026-12-31",
        expiryDate: "2027-06-30",
        expiryPlace: "Amsterdam, Netherlands",
        portOfLoading: "ESBIO - Port of Bilbao",
        portOfDischarge: "NLRTM - Port of Rotterdam",
        goodsDescriptionSummary:
          "PERFORMANCE BOND GUARANTEE FOR MULTI-MODAL HEAVY LIFT OFFSHORE WIND TURBINE TRANSPORTATION CONTRACT",
        partialShipmentsAllowed: true,
        transhipmentAllowed: true,
        presentationPeriodDays: 30,
        confirmationInstructions: "CONFIRM",
        paymentTerms: "SIGHT",
        tenorDays: 0,
        status: "ISSUED",
        remarks:
          "Garantía a primera demanda emitida bajo URDG 758. Aval bancario activo y no ejecutado.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "rem_cad_2026_04",
        instrumentReference: "REM-2026-CAD-0033",
        instrumentType: "DOC_COLLECTION_DP",
        applicableRules: "URC522",
        applicantCompanyId: null,
        applicantName: "Distribuidora Mexicana de Alimentos SA de CV",
        beneficiaryName: "Bodegas y Viñedos de Jerez SL",
        beneficiaryCountry: "ES",
        issuingBankBic: "BSABESBBXXX",
        issuingBankName: "Banco Sabadell SA Cádiz",
        confirmingBankBic: "BNMXMXMMXXX",
        confirmingBankName: "Banco Nacional de México (Citibanamex)",
        currency: "EUR",
        creditAmount: 78500.0,
        tolerancePercentage: 0.0,
        issueDate: "2026-08-10",
        latestShipmentDate: "2026-08-25",
        expiryDate: "2026-10-31",
        expiryPlace: "Veracruz, Mexico",
        portOfLoading: "ESCAD - Port of Cádiz",
        portOfDischarge: "MXVER - Port of Veracruz",
        goodsDescriptionSummary:
          "1,200 CASES JEREZ-XÉRÈS-SHERRY D.O. WINE CIF VERACRUZ INCOTERMS 2020",
        partialShipmentsAllowed: false,
        transhipmentAllowed: false,
        presentationPeriodDays: 21,
        confirmationInstructions: "WITHOUT",
        paymentTerms: "SIGHT",
        tenorDays: 0,
        status: "DOCUMENTS_PRESENTED",
        remarks:
          "Remesa documentaria contra pago (D/P) tramitada conforme a las reglas URC 522 de la CCI.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lc_hamb_2026_05",
        instrumentReference: "LC-2026-HAM-0219",
        instrumentType: "COMMERCIAL_LC_CONFIRMED",
        applicableRules: "UCP600",
        applicantCompanyId: null,
        applicantName: "Bavarian Precision Tools GmbH",
        beneficiaryName: "Iberica Heavy Industry Components SA",
        beneficiaryCountry: "ES",
        issuingBankBic: "DEUTDEDDXXX",
        issuingBankName: "Deutsche Bank AG Frankfurt",
        confirmingBankBic: "BNPAESMMXXX",
        confirmingBankName: "BNP Paribas SA Madrid",
        currency: "EUR",
        creditAmount: 680000.0,
        tolerancePercentage: 5.0,
        issueDate: "2026-08-15",
        latestShipmentDate: "2026-09-30",
        expiryDate: "2026-10-21",
        expiryPlace: "Counters of Confirming Bank, Madrid",
        portOfLoading: "DEHAM - Port of Hamburg",
        portOfDischarge: "ESBIO - Port of Bilbao",
        goodsDescriptionSummary:
          "HEAVY INDUSTRIAL CNC MILLING CENTERS & PRECISION ROBOTIC HEADS CIF BILBAO INCOTERMS 2020",
        partialShipmentsAllowed: false,
        transhipmentAllowed: false,
        presentationPeriodDays: 21,
        confirmationInstructions: "CONFIRM",
        paymentTerms: "SIGHT",
        tenorDays: 0,
        status: "DOCUMENTS_PRESENTED",
        remarks:
          "Crédito documentario plenamente conforme. Documentos aprobados para pago por BNP Paribas.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lc_shang_2026_06",
        instrumentReference: "LC-2026-SHA-0402",
        instrumentType: "COMMERCIAL_LC_IRREVOCABLE",
        applicableRules: "UCP600",
        applicantCompanyId: null,
        applicantName: "Valencia Solar Green Energy SL",
        beneficiaryName: "Shanghai Jinko Clean Energy Co Ltd",
        beneficiaryCountry: "CN",
        issuingBankBic: "BSCHESMMXXX",
        issuingBankName: "Banco Santander SA Valencia",
        confirmingBankBic: "BKCHCNBJXXX",
        confirmingBankName: "Bank of China Ltd Shanghai",
        currency: "USD",
        creditAmount: 890000.0,
        tolerancePercentage: 5.0,
        issueDate: "2026-08-10",
        latestShipmentDate: "2026-09-20",
        expiryDate: "2026-10-15",
        expiryPlace: "Shanghai, China",
        portOfLoading: "CNSHA - Port of Shanghai",
        portOfDischarge: "ESVLC - Port of Valencia",
        goodsDescriptionSummary:
          "12,000 MONOCRYSTALLINE BIFACIAL SOLAR PV MODULES 650W CIF VALENCIA INCOTERMS 2020",
        partialShipmentsAllowed: true,
        transhipmentAllowed: true,
        presentationPeriodDays: 21,
        confirmationInstructions: "WITHOUT",
        paymentTerms: "ACCEPTANCE_USANCE",
        tenorDays: 90,
        status: "DISCREPANCIES_FOUND",
        remarks:
          "Discrepancia detectada: Diferencia en la descripción de bultos en Bill of Lading (Art. 18c) y presentación con fecha posterior a 21 días (Art. 14c).",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.tradeCreditDocuments)
    .values([
      // Documents for LC-2026-BCN-0089 (Compliant)
      {
        id: "doc_bcn_inv_01",
        instrumentId: "lc_bcn_2026_01",
        documentType: "COMMERCIAL_INVOICE",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "INV-2026-MED-098",
        documentDate: "2026-08-18",
        issuerName: "Mediterranean Olive Oil Exports SL",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: 145000.0,
        invoiceCurrency: "EUR",
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks:
          "Descripción exacta y valor coincidente al céntimo con el crédito.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_bcn_bl_02",
        instrumentId: "lc_bcn_2026_01",
        documentType: "OCEAN_BILL_OF_LADING",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "MSK-BCN-SIN-88190",
        documentDate: "2026-08-20",
        issuerName: "Maersk Line Marine Agency",
        shippedOnBoardDate: "2026-08-20",
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: null,
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks:
          "Conocimiento de embarque marítimo 'Clean on Board' con flete prepagado.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_bcn_ins_03",
        instrumentId: "lc_bcn_2026_01",
        documentType: "INSURANCE_CERTIFICATE",
        originalCopiesRequired: 2,
        originalCopiesPresented: 2,
        documentReferenceNumber: "POL-MAPFRE-MAR-771",
        documentDate: "2026-08-19",
        issuerName: "Mapfre Global Risks SA",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: "EUR",
        goodsDescriptionExactMatch: true,
        insuredAmount: 159500.0, // 110% de 145,000 EUR
        insuredPercentageOfCif: 110.0,
        complianceStatus: "COMPLIANT",
        remarks:
          "Cobertura ICC (A) Todo Riesgo emitida al 110% CIF con fecha anterior al embarque.",
        createdAt: new Date().toISOString(),
      },

      // Documents for LC-2026-VAL-0145 (Discrepant)
      {
        id: "doc_val_inv_01",
        instrumentId: "lc_val_2026_02",
        documentType: "COMMERCIAL_INVOICE",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "INV-CER-2026-044",
        documentDate: "2026-08-05",
        issuerName: "Cerámicas y Gres Levantino SA",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: 320000.0,
        invoiceCurrency: "USD",
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks: "Factura comercial conforme.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_val_bl_02",
        instrumentId: "lc_val_2026_02",
        documentType: "OCEAN_BILL_OF_LADING",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "MSC-VAL-NYC-9921",
        documentDate: "2026-08-08",
        issuerName: "MSC Mediterranean Shipping Co",
        shippedOnBoardDate: "2026-08-08",
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: null,
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "DISCREPANT",
        remarks:
          "Embarque el 08/08/2026; documentos presentados al banco el 02/09/2026 (25 días transcurridos > límite de 21 días Art. 14c UCP 600).",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_val_ins_03",
        instrumentId: "lc_val_2026_02",
        documentType: "INSURANCE_CERTIFICATE",
        originalCopiesRequired: 2,
        originalCopiesPresented: 2,
        documentReferenceNumber: "INS-ALLIANZ-MAR-554",
        documentDate: "2026-08-07",
        issuerName: "Allianz Global Corporate & Specialty",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: "USD",
        goodsDescriptionExactMatch: true,
        insuredAmount: 320000.0, // 100% CIF en lugar del 110% exigido
        insuredPercentageOfCif: 100.0,
        complianceStatus: "DISCREPANT",
        remarks:
          "Infraseguro: póliza suscrita al 100% CIF ($320,000) en lugar del mínimo reglamentario del 110% CIF ($352,000) Art. 28f UCP 600.",
        createdAt: new Date().toISOString(),
      },

      // Documents for LC-2026-HAM-0219 (Compliant CNC Machinery)
      {
        id: "doc_ham_inv_01",
        instrumentId: "lc_hamb_2026_05",
        documentType: "COMMERCIAL_INVOICE",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "INV-BAV-2026-9901",
        documentDate: "2026-08-22",
        issuerName: "Bavarian Precision Tools GmbH",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: 680000.0,
        invoiceCurrency: "EUR",
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks:
          "Factura comercial conforme con desglose arancelario de maquinaria CNC.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_ham_bl_02",
        instrumentId: "lc_hamb_2026_05",
        documentType: "OCEAN_BILL_OF_LADING",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "MSK-HAM-BIO-9941",
        documentDate: "2026-08-25",
        issuerName: "Maersk Line Agency Deutschland",
        shippedOnBoardDate: "2026-08-25",
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: null,
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks:
          "B/L marítimo Shipped on Board limpio de cláusulas desfavorables.",
        createdAt: new Date().toISOString(),
      },

      // Documents for LC-2026-SHA-0402 (Discrepant Solar Modules)
      {
        id: "doc_sha_inv_01",
        instrumentId: "lc_shang_2026_06",
        documentType: "COMMERCIAL_INVOICE",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "INV-JIN-2026-440",
        documentDate: "2026-08-18",
        issuerName: "Shanghai Jinko Clean Energy Co Ltd",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: 890000.0,
        invoiceCurrency: "USD",
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks: "Factura comercial coincidente con el importe del crédito.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_sha_bl_02",
        instrumentId: "lc_shang_2026_06",
        documentType: "OCEAN_BILL_OF_LADING",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "ONE-SHA-VLC-7721",
        documentDate: "2026-08-21",
        issuerName: "Ocean Network Express (ONE) Shanghai",
        shippedOnBoardDate: "2026-08-21",
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: null,
        goodsDescriptionExactMatch: false,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "DISCREPANT",
        remarks:
          "Discrepancia Art. 18(c) UCP 600: El conocimiento de embarque indica 'POLYCRYSTALLINE SOLAR MODULES' en contradicción con la especificación de 'MONOCRYSTALLINE BIFACIAL'.",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.tradeDiscrepancies)
    .values([
      {
        id: "disc_val_01",
        instrumentId: "lc_val_2026_02",
        documentId: "doc_val_bl_02",
        discrepancyRuleCode: "UCP600_ART_14_LATE_PRESENTATION",
        articleReference: "UCP 600 Art. 14(c) & ISBP 745 Para A19",
        severity: "CRITICAL_REFUSAL",
        description:
          "Presentación tardía de documentos: fecha de 'Shipped on Board' 08/08/2026 vs fecha de presentación bancaria 02/09/2026 (25 días transcurridos, superando el límite legal de 21 días naturales).",
        suggestedRemedy:
          "Solicitar waiver formal de discrepancia al Ordenante (Applicant) a través del Banco Emisor JPMorgan Chase.",
        status: "WAIVER_REQUESTED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "disc_val_02",
        instrumentId: "lc_val_2026_02",
        documentId: "doc_val_ins_03",
        discrepancyRuleCode: "UCP600_ART_28_INSURANCE_UNDER_110_PCT",
        articleReference: "UCP 600 Art. 28(f)(ii) & ISBP 745 Para K7",
        severity: "MAJOR_DISCREPANCY",
        description:
          "Infraseguro de mercancías: la póliza cubre USD 320,000.00 (100% CIF) cuando el Artículo 28(f)(ii) de la UCP 600 exige una cobertura mínima del 110% del valor CIF (USD 352,000.00).",
        suggestedRemedy:
          "Aportar suplemento o certificado complementario de la aseguradora cubriendo el 10% adicional o solicitar waiver.",
        status: "OPEN",
        createdAt: new Date().toISOString(),
      },
      {
        id: "disc_sha_01",
        instrumentId: "lc_shang_2026_06",
        documentId: "doc_sha_bl_02",
        discrepancyRuleCode: "UCP600_ART_18_GOODS_DESCRIPTION_MISMATCH",
        articleReference: "UCP 600 Art. 18(c) & ISBP 745 Para E5",
        severity: "CRITICAL_REFUSAL",
        description:
          "Discrepancia en la designación de las mercancías: el Conocimiento de Embarque declara 'POLYCRYSTALLINE SOLAR MODULES', en conflicto con la descripción del crédito 'MONOCRYSTALLINE BIFACIAL SOLAR PV MODULES'.",
        suggestedRemedy:
          "Emitir Swift MT734 al banco presentador (Bank of China) y recabar autorización expresa de pago (waiver) de Valencia Solar Green Energy SL.",
        status: "OPEN",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.tradeFeeSchedules)
    .values([
      {
        id: "fee_bcn_01",
        instrumentId: "lc_bcn_2026_01",
        openingFeeRatePct: 0.25,
        confirmationFeeRatePct: 0.5,
        discrepancyFeeAmount: 75.0,
        amendmentFeeAmount: 50.0,
        paymentSettlementFeeAmount: 60.0,
        calculatedOpeningFeeEur: 362.5,
        calculatedConfirmationFeeEur: 181.25,
        calculatedDiscrepancyFeeEur: 0.0,
        totalBankFeesEur: 603.75,
        feePayerParty: "APPLICANT",
        createdAt: new Date().toISOString(),
      },
      {
        id: "fee_val_02",
        instrumentId: "lc_val_2026_02",
        openingFeeRatePct: 0.25,
        confirmationFeeRatePct: 0.65,
        discrepancyFeeAmount: 85.0,
        amendmentFeeAmount: 50.0,
        paymentSettlementFeeAmount: 75.0,
        calculatedOpeningFeeEur: 800.0,
        calculatedConfirmationFeeEur: 346.67,
        calculatedDiscrepancyFeeEur: 170.0, // 2 discrepancias detectadas @ $85 c/u
        totalBankFeesEur: 1391.67,
        feePayerParty: "BENEFICIARY",
        createdAt: new Date().toISOString(),
      },
      {
        id: "fee_sblc_03",
        instrumentId: "sblc_mad_2026_03",
        openingFeeRatePct: 0.35,
        confirmationFeeRatePct: 0.45,
        discrepancyFeeAmount: 100.0,
        amendmentFeeAmount: 50.0,
        paymentSettlementFeeAmount: 100.0,
        calculatedOpeningFeeEur: 7000.0, // 4 trimestres
        calculatedConfirmationFeeEur: 2250.0,
        calculatedDiscrepancyFeeEur: 0.0,
        totalBankFeesEur: 9350.0,
        feePayerParty: "APPLICANT",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.tradeSwiftMessages)
    .values([
      {
        id: "swift_bcn_mt700",
        instrumentId: "lc_bcn_2026_01",
        messageType: "MT700_ISSUE",
        senderBic: "DBSSSGSGXXX",
        receiverBic: "BSCHESMMXXX",
        rawSwiftMessage: `{1:F01DBSSSGSGAXXX0000000000}{2:I700BSCHESMMXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:LC-2026-BCN-0089
:31C:260801
:40E:UCP LATEST VERSION
:31D:261006COUNTERS OF BEN BANK
:50:SINGAPORE FOOD IMPORTS PTE LTD
10 MARINA BOULEVARD, SINGAPORE
:59:MEDITERRANEAN OLIVE OIL EXPORTS SL
CALLE ARAGÓN 220, BARCELONA, SPAIN
:32B:EUR145000,00
:39A:05/05
:41A:BSCHESMMXXX BY PAYMENT
:42C:AT SIGHT
:43P:NOT ALLOWED
:43T:NOT ALLOWED
:44E:ESBCN
:44F:SGSIN
:44C:260915
:45A:5,000 BOXES EXTRA VIRGIN OLIVE OIL CIF SINGAPORE INCOTERMS 2020
:46A:1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS
2. FULL SET CLEAN ON BOARD OCEAN BILLS OF LADING CONSIGNED TO ORDER OF DBS BANK
3. MARINE INSURANCE CERTIFICATE COVERING ALL RISKS FOR 110 PCT CIF INVOICE VALUE
:47A:+ ALL DOCUMENTS MUST BE IN ENGLISH
+ DOCUMENTS TO BE PRESENTED WITHIN 21 DAYS AFTER SHIPMENT DATE
:49:CONFIRM
-}`,
        transmissionStatus: "ACKNOWLEDGED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "swift_val_mt734",
        instrumentId: "lc_val_2026_02",
        messageType: "MT734_REFUSAL",
        senderBic: "CHASUS33XXX",
        receiverBic: "BBVAESMMXXX",
        rawSwiftMessage: `{1:F01CHASUS33AXXX0000000000}{2:I734BBVAESMMXXXXN}{4:
:20:LC-2026-VAL-0145
:21:DISC-2026-VAL-01
:32A:260902USD320000,00
:77J:DISCREPANCIES FOUND AS FOLLOWS:
1. UCP 600 ART. 14(C) - DOCUMENTS PRESENTED 25 DAYS AFTER SHIPPED ON BOARD DATE (LATE PRESENTATION EXCEEDING 21 DAYS).
2. UCP 600 ART. 28(F)(II) - INSURANCE CERTIFICATE VALUE USD 320,000 (100% CIF) DOES NOT COVER THE MINIMUM 110% CIF VALUE (USD 352,000 REQUIRED).
:77B:HOLDING DOCUMENTS AT YOUR DISPOSAL PENDING WAIVER INSTRUCTIONS FROM APPLICANT.
-}`,
        transmissionStatus: "TRANSMITTED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "swift_zaz_mt700",
        instrumentId: "lc_bcn_2026_01",
        messageType: "MT700_ISSUE",
        senderBic: "BOFAUS3NXXX",
        receiverBic: "CAIXESBBXXX",
        rawSwiftMessage: `{1:F01BOFAUS3NAXXX0000000000}{2:I700CAIXESBBXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:LC-2026-ZAZ-0201
:31C:260815
:40E:UCP LATEST VERSION
:31D:261115COUNTERS OF CONFIRMING BANK
:50:CHICAGO HEAVY MACHINERY IMPORT LLC
233 S WACKER DR, CHICAGO, IL 60606
:59:ZARAGOZA INTERMODAL MACHINERY SA
POLIGONO MALPICA CALLE E 12, ZARAGOZA, SPAIN
:32B:USD480000,00
:39A:05/05
:41A:CAIXESBBXXX BY NEGOTIATION
:42C:90 DAYS AFTER BILL OF LADING DATE
:43P:ALLOWED
:43T:NOT ALLOWED
:44E:ESBCN
:44F:USCHI
:44C:261020
:45A:6 INDUSTRIAL CNC MILLING STATIONS CIF CHICAGO INCOTERMS 2020
:46A:1. SIGNED COMMERCIAL INVOICE IN 4 ORIGINALS
2. FULL SET CLEAN ON BOARD MULTIMODAL BILLS OF LADING CONSIGNED TO ORDER
3. CERTIFICATE OF ORIGIN ISSUED BY CHAMBER OF COMMERCE
:49:CONFIRM
-}`,
        transmissionStatus: "ACKNOWLEDGED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "swift_zaz_mt707",
        instrumentId: "lc_bcn_2026_01",
        messageType: "MT707_AMENDMENT",
        senderBic: "BOFAUS3NXXX",
        receiverBic: "CAIXESBBXXX",
        rawSwiftMessage: `{1:F01BOFAUS3NAXXX0000000000}{2:I707CAIXESBBXXXXN}{4:
:20:LC-2026-ZAZ-0201
:21:AMD-01
:30:260825
:31E:261130
:44C:261105
:79:LATEST SHIPMENT DATE EXTENDED TO 261105 DUE TO OCEAN CARRIER BLANK SAILING.
-}`,
        transmissionStatus: "ACKNOWLEDGED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "swift_ham_mt700",
        instrumentId: "lc_hamb_2026_05",
        messageType: "MT700_ISSUE",
        senderBic: "DEUTDEDDXXX",
        receiverBic: "BNPAESMMXXX",
        rawSwiftMessage: `{1:F01DEUTDEDDAXXX0000000000}{2:I700BNPAESMMXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:LC-2026-HAM-0219
:31C:260815
:40E:UCP LATEST VERSION
:31D:261021COUNTERS OF CONFIRMING BANK, MADRID
:50:BAVARIAN PRECISION TOOLS GMBH
MAX-PLANCK-STRASSE 12, MUNICH, GERMANY
:59:IBERICA HEAVY INDUSTRY COMPONENTS SA
POL. IND. ARRIETA PARC. 4, BILBAO, SPAIN
:32B:EUR680000,00
:39A:05/05
:41A:BNPAESMMXXX BY PAYMENT
:42C:AT SIGHT
:43P:NOT ALLOWED
:43T:NOT ALLOWED
:44E:DEHAM
:44F:ESBIO
:44C:260930
:45A:HEAVY INDUSTRIAL CNC MILLING CENTERS & PRECISION ROBOTIC HEADS CIF BILBAO INCOTERMS 2020
:46A:1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS
2. FULL SET CLEAN ON BOARD OCEAN BILLS OF LADING CONSIGNED TO ORDER
3. PACKING LIST AND MANUFACTURER CE DECLARATION OF CONFORMITY
:49:CONFIRM
-}`,
        transmissionStatus: "ACKNOWLEDGED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "swift_sha_mt700",
        instrumentId: "lc_shang_2026_06",
        messageType: "MT700_ISSUE",
        senderBic: "BSCHESMMXXX",
        receiverBic: "BKCHCNBJXXX",
        rawSwiftMessage: `{1:F01BSCHESMMAXXX0000000000}{2:I700BKCHCNBJXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:LC-2026-SHA-0402
:31C:260810
:40E:UCP LATEST VERSION
:31D:261015COUNTERS OF ADVISING BANK, SHANGHAI
:50:VALENCIA SOLAR GREEN ENERGY SL
CALLE PINTOR SOROLLA 15, VALENCIA, SPAIN
:59:SHANGHAI JINKO CLEAN ENERGY CO LTD
PUDONG CENTURY BLVD 800, SHANGHAI, CHINA
:32B:USD890000,00
:39A:05/05
:41A:BKCHCNBJXXX BY NEGOTIATION
:42C:90 DAYS AFTER BILL OF LADING DATE
:43P:ALLOWED
:43T:ALLOWED
:44E:CNSHA
:44F:ESVLC
:44C:260920
:45A:12,000 MONOCRYSTALLINE BIFACIAL SOLAR PV MODULES 650W CIF VALENCIA INCOTERMS 2020
:46A:1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS
2. FULL SET CLEAN ON BOARD OCEAN BILLS OF LADING CONSIGNED TO ORDER OF BANCO SANTANDER
3. CERTIFICATE OF ORIGIN ISSUED BY CCPIT
:47A:+ DOCUMENTS TO BE PRESENTED WITHIN 21 DAYS AFTER SHIPMENT DATE
:49:WITHOUT
-}`,
        transmissionStatus: "ACKNOWLEDGED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "swift_sha_mt734",
        instrumentId: "lc_shang_2026_06",
        messageType: "MT734_REFUSAL",
        senderBic: "BSCHESMMXXX",
        receiverBic: "BKCHCNBJXXX",
        rawSwiftMessage: `{1:F01BSCHESMMAXXX0000000000}{2:I734BKCHCNBJXXXXN}{4:
:20:LC-2026-SHA-0402
:21:DISC-2026-SHA-01
:32A:260829USD890000,00
:77J:DISCREPANCY OBSERVED PURSUANT TO UCP 600 ARTICLE 18(C):
BILL OF LADING ONE-SHA-VLC-7721 STIPULATES 'POLYCRYSTALLINE SOLAR MODULES', WHICH DOES NOT CORRESPOND WITH CREDIT REQUIREMENT 'MONOCRYSTALLINE BIFACIAL SOLAR PV MODULES'.
:77B:HOLDING DOCUMENTS PENDING APPLICANT FORMAL WAIVER ACCEPTANCE.
-}`,
        transmissionStatus: "TRANSMITTED",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Instrumentos de Crédito UCP 600, Documentos, Discrepancias, Liquidaciones de Comisiones y Mensajes SWIFT MT.",
  );

  // =========================================================================
  // SEED: OPERADOR ECONÓMICO AUTORIZADO (OEA / AEO) & SEGURIDAD ISO 28000 / C-TPAT
}
