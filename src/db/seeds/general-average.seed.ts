import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedGeneralAverage(): Promise<void> {
  console.log(
    "🚨 Inyectando Expedientes de Avería Gruesa, Masas Activas/Pasivas, Bonos LAB 77 y Ajustes...",
  );
  await db
    .insert(schema.gaCases)
    .values([
      {
        id: "ga_case_valencia_01",
        caseReference: "GA-2026-VAL-0012",
        vesselName: "MV Valencia Bridge",
        imoNumber: "9751024",
        flagState: "Liberia",
        builtYear: 2020,
        grossTonnage: 68000,
        summerDwtMt: 75000.0,
        shipownerName: "Mediterranean Shipping Carriers SA",
        disponentOwnerOrCharterer: "Atlantic Feeder Lines Ltd",
        masterName: "Capt. Rodrigo Alarcón",
        casualtyType: "FIRE_EXPLOSION",
        casualtyDate: "2026-08-10",
        casualtyLocation: "Golfo de León (42° 15' N, 004° 20' E)",
        voyageOrigin: "Puerto de Valencia (ESVLC)",
        voyageDestination: "Puerto de Génova (ITGOA)",
        portOfRefuge: "Puerto de Marsella (FRMRS)",
        dateArrivalPortOfRefuge: "2026-08-12",
        dateDeparturePortOfRefuge: "2026-08-26",
        governingRules: "YAR_2016",
        salvageContractType: "LOF_2024_SCOPIC",
        salvorName: "Smit Salvage BV / Boluda Towage",
        averageAdjusterFirm: "Richards Hogg Lindley (RHL London & Madrid)",
        leadAdjusterName: "Senior Adjuster David Sterling",
        estimatedLossUsd: 1845000.0,
        estimatedContributionPercentage: 7.5,
        declarationNarrative:
          "Durante la travesía se declaró un incendio grave en la Bodega N° 2. Para salvar la aventura marítima común, el Capitán ordenó inundar con agua y espuma las bodegas adyacentes y solicitar asistencia de remolcadores de salvamento bajo contrato Lloyd's Open Form (LOF 2024 con cláusula SCOPIC), desviando el buque al puerto de refugio de Marsella.",
        currencyCode: "USD",
        status: "SECURITY_COLLECTION",
      },
      {
        id: "ga_case_cadiz_02",
        caseReference: "GA-2026-CDZ-0034",
        vesselName: "MV Atlantic Pioneer",
        imoNumber: "9642019",
        flagState: "Panama",
        builtYear: 2018,
        grossTonnage: 42000,
        summerDwtMt: 55000.0,
        shipownerName: "Iberian Bulk Carriers SL",
        disponentOwnerOrCharterer: "Global Agri Commodities Corp",
        masterName: "Capt. Manuel Barrientos",
        casualtyType: "GROUNDING_REFLOATING",
        casualtyDate: "2026-07-25",
        casualtyLocation: "Bajo de Las Puercas - Bahía de Cádiz",
        voyageOrigin: "Puerto de Santos (BRSSZ)",
        voyageDestination: "Puerto de Santander (ESSDR)",
        portOfRefuge: "Puerto de Cádiz (ESCAD)",
        dateArrivalPortOfRefuge: "2026-07-28",
        dateDeparturePortOfRefuge: "2026-08-08",
        governingRules: "YAR_2016",
        salvageContractType: "LOF_2024_SCOPIC",
        salvorName: "Boluda Towage Cadiz",
        averageAdjusterFirm: "Clyde & Co Average Adjusters",
        leadAdjusterName: "Adjuster Beatriz Fuentes",
        estimatedLossUsd: 920000.0,
        estimatedContributionPercentage: 4.8,
        declarationNarrative:
          "Varada involuntaria en bajo arenoso a la entrada del canal. Para evitar la pérdida del buque, se forzaron máquinas y calderas (Regla VII) y se efectuó alijo parcial de 3.500 MT de mineral en barcazas (Regla VIII).",
        currencyCode: "USD",
        status: "ADJUSTMENT_IN_PROGRESS",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.gaAllowances)
    .values([
      {
        id: "ga_all_01",
        gaCaseId: "ga_case_valencia_01",
        allowanceCategory: "SHIP_SACRIFICE",
        yarRuleReference: "RULE_VII_MACHINERY_DAMAGE",
        description:
          "Daños a bombas de achique y sistemas eléctricos por inundación de extinción",
        creditedPartyType: "SHIPOWNER",
        creditedPartyName: "Mediterranean Shipping Carriers SA",
        originalCurrencyAmount: 250000.0,
        originalCurrency: "USD",
        exchangeRateToUsd: 1.0,
        amountUsd: 250000.0,
        isAdmissible: true,
        remarks: "Verificado por perito naval de RHL.",
      },
      {
        id: "ga_all_02",
        gaCaseId: "ga_case_valencia_01",
        allowanceCategory: "CARGO_SACRIFICE_EXTINGUISHMENT",
        yarRuleReference: "RULE_III_EXTINGUISHING_FIRE",
        description:
          "Daños directos por agua en 12 contenedores de carga general durante la extinción",
        creditedPartyType: "CARGO_OWNER",
        creditedPartyName: "Iberica Chem Trading SL",
        originalCurrencyAmount: 180000.0,
        originalCurrency: "USD",
        exchangeRateToUsd: 1.0,
        amountUsd: 180000.0,
        isAdmissible: true,
        remarks:
          "Daño por agua admisible bajo Regla III (daño por fuego excluido).",
      },
      {
        id: "ga_all_03",
        gaCaseId: "ga_case_valencia_01",
        allowanceCategory: "REFUGE_PORT_DISBURSEMENTS",
        yarRuleReference: "RULE_X_PORT_OF_REFUGE",
        description:
          "Tasas extraordinarias de entrada, atraque de emergencia y practicaje en Marsella",
        creditedPartyType: "SHIPOWNER",
        creditedPartyName: "Mediterranean Shipping Carriers SA",
        originalCurrencyAmount: 125000.0,
        originalCurrency: "USD",
        exchangeRateToUsd: 1.0,
        amountUsd: 125000.0,
        isAdmissible: true,
        remarks: "Desembolso sujeto a comisión del 2.5% Regla XX.",
      },
      {
        id: "ga_all_04",
        gaCaseId: "ga_case_valencia_01",
        allowanceCategory: "SALVAGE_AWARD_LOF",
        yarRuleReference: "RULE_PARAMOUNT_GENERAL",
        description:
          "Recompensa de salvamento acordada con remolcadores bajo contrato LOF 2024",
        creditedPartyType: "SALVOR",
        creditedPartyName: "Smit Salvage BV",
        originalCurrencyAmount: 650000.0,
        originalCurrency: "USD",
        exchangeRateToUsd: 1.0,
        amountUsd: 650000.0,
        isAdmissible: true,
        remarks:
          "Acuerdo amistoso de salvamento aprobado por aseguradoras de casco y carga.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.gaContributoryInterests)
    .values([
      {
        id: "ga_ci_01",
        gaCaseId: "ga_case_valencia_01",
        interestCategory: "VESSEL",
        blReference: null,
        containerNumber: null,
        ownerOrReceiverName: "Mediterranean Shipping Carriers SA",
        cargoDescription: "Buque Portacontenedores MV Valencia Bridge",
        weightOrTeu: 1.0,
        soundValueDestinationUsd: 18500000.0,
        particularDamageDeductionUsd: 600000.0,
        madeGoodAllowanceUsd: 250000.0,
        contributoryValueUsd: 18150000.0,
        calculatedContributionUsd: 1361250.0,
        netFinancialBalanceUsd: 1111250.0,
        balanceType: "PAYABLE_DEBTOR",
        hasSecurityProvided: true,
        cargoReleaseAuthorized: true,
      },
      {
        id: "ga_ci_02",
        gaCaseId: "ga_case_valencia_01",
        interestCategory: "FREIGHT_AT_RISK",
        blReference: null,
        containerNumber: null,
        ownerOrReceiverName: "Mediterranean Shipping Carriers SA",
        cargoDescription: "Flete al Cobro Pendiente de Percepción",
        weightOrTeu: null,
        soundValueDestinationUsd: 720000.0,
        particularDamageDeductionUsd: 70000.0, // Gastos posteriores
        madeGoodAllowanceUsd: 0.0,
        contributoryValueUsd: 650000.0,
        calculatedContributionUsd: 48750.0,
        netFinancialBalanceUsd: 48750.0,
        balanceType: "PAYABLE_DEBTOR",
        hasSecurityProvided: true,
        cargoReleaseAuthorized: true,
      },
      {
        id: "ga_ci_03",
        gaCaseId: "ga_case_valencia_01",
        interestCategory: "CARGO",
        blReference: "MSCU-VAL-GEN-001",
        containerNumber: "MSKU-782910-3",
        ownerOrReceiverName: "Iberica Chem Trading SL",
        cargoDescription: "Resinas de Polipropileno en Pellets",
        weightOrTeu: 24.5,
        soundValueDestinationUsd: 1200000.0,
        particularDamageDeductionUsd: 0.0,
        madeGoodAllowanceUsd: 180000.0,
        contributoryValueUsd: 1380000.0,
        calculatedContributionUsd: 103500.0,
        netFinancialBalanceUsd: -76500.0, // Creditor (Made good 180k > Contribution 103.5k)
        balanceType: "RECEIVABLE_CREDITOR",
        hasSecurityProvided: true,
        cargoReleaseAuthorized: true,
      },
      {
        id: "ga_ci_04",
        gaCaseId: "ga_case_valencia_01",
        interestCategory: "CARGO",
        blReference: "MSCU-VAL-GEN-002",
        containerNumber: "MEDU-481920-5",
        ownerOrReceiverName: "TransMed Auto Parts Italia SRL",
        cargoDescription: "Componentes y Motores de Automoción",
        weightOrTeu: 18.2,
        soundValueDestinationUsd: 2400000.0,
        particularDamageDeductionUsd: 0.0,
        madeGoodAllowanceUsd: 0.0,
        contributoryValueUsd: 2400000.0,
        calculatedContributionUsd: 180000.0,
        netFinancialBalanceUsd: 180000.0,
        balanceType: "PAYABLE_DEBTOR",
        hasSecurityProvided: true,
        cargoReleaseAuthorized: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.gaSecurities)
    .values([
      {
        id: "ga_sec_val_01",
        gaCaseId: "ga_case_valencia_01",
        contributoryInterestId: "ga_ci_04",
        securityReference: "SEC-2026-VAL-001",
        securityType: "AVERAGE_BOND_AND_GUARANTEE",
        cargoConsigneeName: "TransMed Auto Parts Italia SRL",
        cargoConsigneeVat: "IT08920194821",
        insurerName: "Mapfre Global Risks SA",
        insurerPolicyNumber: "POL-MAR-2026-99210",
        insurerContactEmail: "marine.claims@mapfre.com",
        securityAmountUsd: 180000.0,
        depositBankName: "Banco Santander Madrid (Escrow Trust Account)",
        depositBankAccountNumber: "ES91 0049 1500 0512 3456 7890",
        cashDepositReceiptNumber: null,
        averageBondSigned: true,
        averageBondSignDate: "2026-08-16",
        averageGuaranteeSigned: true,
        averageGuaranteeSignDate: "2026-08-17",
        cargoReleaseAuthorized: true,
        releaseAuthorizedBy: "David Sterling (Average Adjuster)",
        releaseTimestamp: "2026-08-17T14:30:00Z",
        status: "CARGO_RELEASED",
        remarks:
          "Garantía de aseguradora validada y mercancía despachada en Marsella.",
      },
      {
        id: "ga_sec_val_02",
        gaCaseId: "ga_case_valencia_01",
        contributoryInterestId: "ga_ci_03",
        securityReference: "SEC-2026-VAL-002",
        securityType: "CASH_DEPOSIT",
        cargoConsigneeName: "Iberica Chem Trading SL",
        cargoConsigneeVat: "ESA46019284",
        insurerName: "Autoseguro Directo (Sin póliza marítima)",
        insurerPolicyNumber: null,
        insurerContactEmail: "financiero@ibericachem.es",
        securityAmountUsd: 241500.0, // 17.5% de $1.38M (Tasa 7.5% + 10% margen de seguridad)
        depositBankName: "Banco Santander (Joint Trust Account RHL)",
        depositBankAccountNumber: "ES91 0049 1500 0512 3456 7890",
        cashDepositReceiptNumber: "CDR-2026-0089",
        averageBondSigned: true,
        averageBondSignDate: "2026-08-18",
        averageGuaranteeSigned: false,
        averageGuaranteeSignDate: null,
        cargoReleaseAuthorized: true,
        releaseAuthorizedBy: "David Sterling (Average Adjuster)",
        releaseTimestamp: "2026-08-19T09:15:00Z",
        status: "CARGO_RELEASED",
        remarks:
          "Depósito en efectivo recibido y custodiado en cuenta fiduciaria conjunta.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.gaAdjustments)
    .values([
      {
        id: "ga_adj_val_01",
        gaCaseId: "ga_case_valencia_01",
        adjustmentReference: "ADJ-2026-VAL-01",
        adjustmentDate: "2026-08-30",
        totalAllowancesUsd: 1205000.0,
        totalShipAllowancesUsd: 250000.0,
        totalCargoAllowancesUsd: 180000.0,
        totalRefugeExpensesUsd: 125000.0,
        totalSalvageAwardUsd: 650000.0,
        totalCommissionUsd: 3125.0, // 2.5% sobre $125k
        cmiInterestRatePercentage: 6.0,
        totalCmiInterestUsd: 3600.0,
        totalContributoryValueUsd: 22580000.0,
        vesselContributoryValueUsd: 18150000.0,
        freightContributoryValueUsd: 650000.0,
        cargoContributoryValueUsd: 3780000.0,
        containersContributoryValueUsd: 0.0,
        finalRateOfContributionPercentage: 5.3366,
        totalDebtorContributionsUsd: 1205000.0,
        totalCreditorRecoveriesUsd: 1205000.0,
        adjusterCertificationStatement:
          "Certificamos que la presente liquidación general de avería gruesa ha sido practicada con estricta sujeción a las Reglas de York y Amberes 2016 y al contrato de salvamento LOF 2024.",
        status: "CERTIFIED_BY_ADJUSTER",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Expedientes de Avería Gruesa, Masas Activas/Pasivas, Bonos LAB 77 y Ajustes.",
  );
}
