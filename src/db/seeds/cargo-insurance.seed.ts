import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedCargoInsurance(): Promise<void> {
  console.log(
    "🛡️ Inyectando Pólizas Flotantes Open Cover, Certificados de Seguro UCP 600, Bordereaux y Liquidaciones de Siniestros...",
  );
  await db
    .insert(schema.insuranceOpenPolicies)
    .values([
      {
        id: "open_pol_zurich_01",
        policyNumber: "POL-MAR-2026-VAL-0089",
        insurerName: "Zurich Insurance plc / Lloyd's Syndicate 1861",
        brokerName: "Aon Marine & Global Logistics Risk SL",
        policyHolderName: "Atlas Logistics Global Forwarding SL",
        policyHolderTaxId: "B-99201452",
        currency: "EUR",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        conveyanceLimitAmount: 2500000.0,
        annualEstimatedTurnover: 15000000.0,
        baseRatePercentage: 0.2,
        warStrikeRatePercentage: 0.04,
        defaultDeductibleAmount: 500.0,
        deductibleType: "FIXED_AMOUNT",
        minPremiumPerShipment: 50.0,
        status: "ACTIVE",
        termsAndConditionsText:
          "Póliza abierta flotante anual que ampara todas las mercancías declaradas mediante bordereau mensual. Cláusulas ICC (A) 2009, Institute War Clauses (Cargo), Institute Strikes Clauses y exclusión cibernética CL 380.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.insuranceCertificates)
    .values([
      {
        id: "ins_cert_01",
        openPolicyId: "open_pol_zurich_01",
        certificateNumber: "INS-CERT-2026-VAL-0042",
        shipmentReference: "SH-2026-VAL-0089",
        transportMode: "MARITIME_OCEAN",
        carrierName: "Maersk Line",
        vesselOrFlightOrVehiclePlate: "MV Valencia Bridge",
        voyageNumber: "V.2608W",
        originPortOrCountry: "Puerto de Valencia (ESVLC)",
        destinationPortOrCountry: "Puerto de Singapur (SGSIN)",
        departureDate: "2026-09-05",
        estimatedArrivalDate: "2026-10-02",
        insuredPartyName: "Iberica Export Solutions SL",
        insuredPartyAddress: "Avda. del Puerto 120, 46024 Valencia, España",
        consigneeOrToOrderName:
          "TO THE ORDER OF DBS BANK SINGAPORE (L/C 45209)",
        claimSurveyAgentNameAddress:
          "Lloyd's Agency / SGS Marine Surveyors Singapore Ltd, 10 Anson Road, Singapore",
        claimPayableAtCity: "Madrid",
        goodsDescription:
          "Componentes electrónicos y microcontroladores de precisión",
        packageCount: 12,
        grossWeightKg: 4200.0,
        commercialInvoiceValue: 115000.0,
        commercialCurrency: "EUR",
        freightAmount: 4500.0,
        estimatedInsuranceAmount: 500.0,
        markupPercentage: 10.0,
        totalInsuredValue: 132000.0, // (115000 + 4500 + 500) * 1.10 = 120000 * 1.10 = 132000 EUR
        coverageClause: "ICC_A_ALL_RISKS_2009",
        hasWarStrikesCover: true,
        hasCyberExclusionCl380: true,
        hasSanctionsClauseJc2010: true,
        appliedRatePercentage: 0.29, // Base + War
        netPremiumAmount: 382.8,
        ipsTaxPercentage: 6.0,
        ccsConsorcioSurchargePercentage: 0.005,
        grossPremiumPayable: 405.77,
        deductibleAmount: 500.0,
        issueDate: "2026-09-01",
        status: "ISSUED_CERTIFIED",
      },
      {
        id: "ins_cert_02",
        openPolicyId: "open_pol_zurich_01",
        certificateNumber: "INS-CERT-2026-FRA-0088",
        shipmentReference: "SH-2026-FRA-0142",
        transportMode: "AIR_CARGO",
        carrierName: "Lufthansa Cargo AG",
        vesselOrFlightOrVehiclePlate: "Boeing 777F (Flight LH8220)",
        voyageNumber: "LH8220",
        originPortOrCountry: "Frankfurt Airport (FRA)",
        destinationPortOrCountry: "Chicago O'Hare Intl (ORD)",
        departureDate: "2026-09-08",
        estimatedArrivalDate: "2026-09-09",
        insuredPartyName: "Bavarian Energy Systems GmbH",
        insuredPartyAddress: "Industriestrasse 45, 80331 Munich, Germany",
        consigneeOrToOrderName: "Midwest EV Battery Assembly Corp",
        claimSurveyAgentNameAddress:
          "Crawford & Company Marine Surveyors, Chicago O'Hare Cargo Center, IL, USA",
        claimPayableAtCity: "Frankfurt",
        goodsDescription:
          "Baterías de tracción y ensambles de celda de Litio para automoción",
        packageCount: 8,
        grossWeightKg: 1850.0,
        commercialInvoiceValue: 380000.0,
        commercialCurrency: "EUR",
        freightAmount: 18000.0,
        estimatedInsuranceAmount: 2000.0,
        markupPercentage: 10.0,
        totalInsuredValue: 440000.0, // (380k + 18k + 2k) * 1.10 = 400k * 1.10 = 440000 EUR
        coverageClause: "ICC_AIR_ALL_RISKS",
        hasWarStrikesCover: true,
        hasCyberExclusionCl380: true,
        hasSanctionsClauseJc2010: true,
        appliedRatePercentage: 0.2865,
        netPremiumAmount: 1260.6,
        ipsTaxPercentage: 6.0,
        ccsConsorcioSurchargePercentage: 0.005,
        grossPremiumPayable: 1336.24,
        deductibleAmount: 1000.0,
        issueDate: "2026-09-01",
        status: "ISSUED_CERTIFIED",
      },
      {
        id: "ins_cert_03",
        openPolicyId: "open_pol_zurich_01",
        certificateNumber: "INS-CERT-2026-BCN-0105",
        shipmentReference: "SH-2026-BCN-0205",
        transportMode: "MARITIME_OCEAN",
        carrierName: "MSC Mediterranean Shipping Company",
        vesselOrFlightOrVehiclePlate: "MSC ISABELLA",
        voyageNumber: "V.88W",
        originPortOrCountry: "Puerto de Barcelona (ESBCN)",
        destinationPortOrCountry: "New York Container Terminal (USNYC)",
        departureDate: "2026-09-10",
        estimatedArrivalDate: "2026-09-22",
        insuredPartyName: "Zaragoza Intermodal Machinery SA",
        insuredPartyAddress:
          "Polígono Malpica Calle E 12, 50016 Zaragoza, España",
        consigneeOrToOrderName: "MidWest Distribution Hub LLC, Chicago, IL",
        claimSurveyAgentNameAddress: "W K Webster Marine Claims, New York, NY",
        claimPayableAtCity: "Madrid",
        goodsDescription:
          "Maquinaria industrial de ensamblaje robótico y fresadoras CNC",
        packageCount: 14,
        grossWeightKg: 18500.0,
        commercialInvoiceValue: 310000.0,
        commercialCurrency: "EUR",
        freightAmount: 3800.0,
        estimatedInsuranceAmount: 700.0,
        markupPercentage: 10.0,
        totalInsuredValue: 345950.0, // 314500 * 1.10
        coverageClause: "ICC_A_ALL_RISKS_2009",
        hasWarStrikesCover: true,
        hasCyberExclusionCl380: true,
        hasSanctionsClauseJc2010: true,
        appliedRatePercentage: 0.28,
        netPremiumAmount: 968.66,
        ipsTaxPercentage: 6.0,
        ccsConsorcioSurchargePercentage: 0.005,
        grossPremiumPayable: 1026.8,
        deductibleAmount: 500.0,
        issueDate: "2026-09-02",
        status: "ISSUED_CERTIFIED",
      },
      {
        id: "ins_cert_04",
        openPolicyId: "open_pol_zurich_01",
        certificateNumber: "INS-CERT-2026-ALG-0210",
        shipmentReference: "SH-2026-ALG-0312",
        transportMode: "MARITIME_OCEAN",
        carrierName: "ONE (Ocean Network Express)",
        vesselOrFlightOrVehiclePlate: "ONE APUS",
        voyageNumber: "V.004E",
        originPortOrCountry: "Puerto Bahía de Algeciras (ESALG)",
        destinationPortOrCountry: "Tokyo Container Terminal (JPTYO)",
        departureDate: "2026-09-12",
        estimatedArrivalDate: "2026-10-18",
        insuredPartyName: "Marítima del Estrecho Seafood SL",
        insuredPartyAddress:
          "Muelle de Isla Verde s/n, 11207 Algeciras, España",
        consigneeOrToOrderName: "TO ORDER OF MIZUHO BANK LTD TOKYO",
        claimSurveyAgentNameAddress:
          "Cornes & Co Ltd Lloyd's Agency, Tokyo, Japan",
        claimPayableAtCity: "Algeciras",
        goodsDescription:
          "Atún rojo y pescado congelado a ultrabaja temperatura (-60°C)",
        packageCount: 22,
        grossWeightKg: 24200.0,
        commercialInvoiceValue: 240000.0,
        commercialCurrency: "EUR",
        freightAmount: 6200.0,
        estimatedInsuranceAmount: 800.0,
        markupPercentage: 10.0,
        totalInsuredValue: 271700.0, // 247000 * 1.10
        coverageClause: "ICC_FROZEN_FOOD_A",
        hasWarStrikesCover: true,
        hasCyberExclusionCl380: true,
        hasSanctionsClauseJc2010: true,
        appliedRatePercentage: 0.35,
        netPremiumAmount: 950.95,
        ipsTaxPercentage: 6.0,
        ccsConsorcioSurchargePercentage: 0.005,
        grossPremiumPayable: 1008.02,
        deductibleAmount: 750.0,
        issueDate: "2026-09-03",
        status: "ISSUED_CERTIFIED",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.insuranceBordereaux)
    .values([
      {
        id: "ins_bdx_01",
        openPolicyId: "open_pol_zurich_01",
        bordereauReference: "BDX-2026-08",
        periodMonthYear: "2026-08",
        declarationCount: 2,
        totalInsuredTurnoverAmount: 572000.0,
        totalNetPremiumAmount: 1643.4,
        totalIpsTaxAmount: 98.6,
        totalCcsSurchargeAmount: 0.08,
        totalGrossPremiumPayable: 1742.08,
        submissionDate: "2026-08-31",
        status: "DECLARED_TO_INSURER",
      },
      {
        id: "ins_bdx_02",
        openPolicyId: "open_pol_zurich_01",
        bordereauReference: "BDX-2026-09",
        periodMonthYear: "2026-09",
        declarationCount: 2,
        totalInsuredTurnoverAmount: 617650.0,
        totalNetPremiumAmount: 1919.61,
        totalIpsTaxAmount: 115.18,
        totalCcsSurchargeAmount: 0.1,
        totalGrossPremiumPayable: 2034.89,
        submissionDate: "2026-09-30",
        status: "DECLARED_TO_INSURER",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.insuranceBordereauLines)
    .values([
      {
        id: "ins_line_01",
        bordereauId: "ins_bdx_01",
        certificateId: "ins_cert_01",
        shipmentReference: "SH-2026-VAL-0089",
        destination: "Puerto de Singapur (SGSIN)",
        insuredValue: 132000.0,
        netPremium: 382.8,
      },
      {
        id: "ins_line_02",
        bordereauId: "ins_bdx_01",
        certificateId: "ins_cert_02",
        shipmentReference: "SH-2026-FRA-0142",
        destination: "Chicago O'Hare Intl (ORD)",
        insuredValue: 440000.0,
        netPremium: 1260.6,
      },
      {
        id: "ins_line_03",
        bordereauId: "ins_bdx_02",
        certificateId: "ins_cert_03",
        shipmentReference: "SH-2026-BCN-0205",
        destination: "New York Container Terminal (USNYC)",
        insuredValue: 345950.0,
        netPremium: 968.66,
      },
      {
        id: "ins_line_04",
        bordereauId: "ins_bdx_02",
        certificateId: "ins_cert_04",
        shipmentReference: "SH-2026-ALG-0312",
        destination: "Tokyo Container Terminal (JPTYO)",
        insuredValue: 271700.0,
        netPremium: 950.95,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.insuranceClaimsSettlements)
    .values([
      {
        id: "ins_claim_01",
        certificateId: "ins_cert_01",
        claimReference: "CLM-INS-2026-0012",
        casualtyDate: "2026-08-25",
        casualtyLocation: "Terminal Portuaria de Singapur (PSA Terminal 3)",
        perilType: "WATER_DAMAGE_SEAWATER",
        soundMarketValueAtDestination: 120000.0,
        damagedSalvageValueAtDestination: 30000.0,
        depreciationPercentage: 75.0,
        grossClaimAssessmentAmount: 99000.0, // 132000 * 0.75
        deductibleAppliedAmount: 500.0,
        netIndemnityPayableAmount: 98500.0, // 99000 - 500
        surveyReportReference: "SURVEY-SIN-2026-8910",
        adjusterName: "Average Adjusters Association (Capt. Lee Hong)",
        settlementStatus: "ADJUSTED_APPROVED",
        settlementNotes:
          "Filtración de agua salada por escotilla averiada durante temporal. Daño peritado del 75% en módulos electrónicos. Autorizada indemnización neta de 98.500 EUR.",
      },
      {
        id: "ins_claim_02",
        certificateId: "ins_cert_03",
        claimReference: "CLM-INS-2026-0015",
        casualtyDate: "2026-08-30",
        casualtyLocation:
          "Océano Atlántico Norte (Temporal en Golfo de Vizcaya)",
        perilType: "GENERAL_AVERAGE_CONTRIBUTION",
        soundMarketValueAtDestination: 345950.0,
        damagedSalvageValueAtDestination: 345950.0,
        depreciationPercentage: 0.0,
        grossClaimAssessmentAmount: 25946.25, // 7.5% contribución provisional de Avería Gruesa
        deductibleAppliedAmount: 0.0, // Sin deducible en Avería Gruesa según ICC (A)
        netIndemnityPayableAmount: 25946.25,
        surveyReportReference: "GA-RHL-VAL-2026-001",
        adjusterName: "Richards Hogg Lindley Average Adjusters",
        settlementStatus: "ADJUSTED_APPROVED",
        settlementNotes:
          "Garantía de Avería Gruesa (Average Guarantee) suscrita y abonada por los aseguradores a la masa común.",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Pólizas Flotantes Open Cover, Certificados de Seguro UCP 600, Bordereaux y Liquidaciones de Siniestros.",
  );
}
