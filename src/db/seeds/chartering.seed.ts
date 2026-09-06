import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedChartering(): Promise<void> {
  console.log(
    "⚓ Inyectando Pólizas de Fletamento, Estados de Hechos (SOF) y Liquidaciones de Planchas...",
  );
  await db
    .insert(schema.charterParties)
    .values([
      {
        id: "cp_gencon_wheat_01",
        fixtureReference: "CP-2026-SDR-0081",
        charterType: "VOYAGE_CHARTER",
        contractForm: "GENCON_2022",
        ownerName: "Naviera Cantábrica SA",
        chartererName: "AgroGrain International Traders Ltd",
        brokerName: "Braemar Shipbroking London",
        vesselName: "MV Northern Star",
        imoNumber: "9842109",
        flagState: "Malta",
        builtYear: 2021,
        summerDwtMt: 45000,
        grossTonnage: 28000,
        cargoDescription: "Trigo Duro a Granel (Durum Wheat in Bulk)",
        cargoQuantityMt: 35000,
        quantityMarginPercentage: 5.0,
        loadingPort: "Puerto de Santander (ESSDR)",
        dischargingPort: "Puerto de Alexandria (EGALY)",
        laycanStart: "2026-09-01",
        laycanEnd: "2026-09-10",
        freightRateUsdPerMt: 32.5,
        dailyHireRateUsd: 18500,
        demurrageRateUsdPerDay: 14000,
        despatchRateUsdPerDay: 7000,
        despatchCalculationBasis: "ATS_ALL_TIME_SAVED",
        laytimeTerms: "SHEX_EIU",
        laytimeAllowanceType: "LOADING_DISCHARGING_RATES",
        loadRateMtPerDay: 5000,
        dischargeRateMtPerDay: 3500,
        turnTimeHours: 12.0,
        norOfficeHoursOnly: true,
        norClausesJson: JSON.stringify(["WIPON", "WIBON", "WIFPON", "WCCON"]),
        laytimeReversibility: "NON_REVERSIBLE",
        status: "FIXED_ACTIVE",
        remarks:
          "Póliza Gencon 2022 para carga de cereal con cláusula de huelga BIMCO.",
      },
      {
        id: "cp_nype_container_02",
        fixtureReference: "CP-2026-TC-0042",
        charterType: "TIME_CHARTER",
        contractForm: "NYPE_2015",
        ownerName: "Iberian Ocean Carriers SL",
        chartererName: "Global Feeder Lines Singapore Pte",
        brokerName: "Clarksons Platou Madrid",
        vesselName: "MV Atlantic Trader",
        imoNumber: "9721085",
        flagState: "Cyprus",
        builtYear: 2019,
        summerDwtMt: 38000,
        grossTonnage: 24500,
        cargoDescription:
          "Contenedores y Carga General (Containers & Breakbulk)",
        cargoQuantityMt: 28000,
        quantityMarginPercentage: 0.0,
        loadingPort: "Puerto de Valencia (ESVLC)",
        dischargingPort: "Puerto de Santos (BRSSZ)",
        laycanStart: "2026-08-15",
        laycanEnd: "2026-11-15",
        freightRateUsdPerMt: 0,
        dailyHireRateUsd: 19800,
        demurrageRateUsdPerDay: 15000,
        despatchRateUsdPerDay: 7500,
        despatchCalculationBasis: "ATS_ALL_TIME_SAVED",
        laytimeTerms: "SHINC",
        laytimeAllowanceType: "TOTAL_DAYS_WWD",
        turnTimeHours: 6.0,
        norOfficeHoursOnly: false,
        norClausesJson: JSON.stringify(["WIPON", "WIBON"]),
        laytimeReversibility: "NON_REVERSIBLE",
        status: "FIXED_ACTIVE",
        remarks:
          "Fletamento por tiempo de 3 meses para servicio feeder transatlántico.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.statementOfFacts)
    .values([
      {
        id: "sof_sdr_load_01",
        charterPartyId: "cp_gencon_wheat_01",
        sofReference: "SOF-2026-SDR-01",
        portOperation: "LOADING",
        portCode: "ESSDR",
        portName: "Puerto de Santander",
        terminalBerth: "Muelle de Raos 4 (Silo Cerealero)",
        vesselAgentName: "Bergé Marítima Santander",
        masterName: "Capt. Santiago Aranda",
        eospTimestamp: "2026-09-01T04:30:00Z",
        anchorageDropTimestamp: "2026-09-01T05:15:00Z",
        norTenderedTimestamp: "2026-09-01T08:00:00Z",
        norAcceptedTimestamp: "2026-09-01T08:15:00Z",
        turnTimeExpiryTimestamp: "2026-09-01T20:00:00Z",
        allFastBerthingTimestamp: "2026-09-01T18:30:00Z",
        gangwayDownTimestamp: "2026-09-01T19:00:00Z",
        customsHealthClearedTimestamp: "2026-09-01T19:45:00Z",
        commencedOperationsTimestamp: "2026-09-01T20:00:00Z",
        completedOperationsTimestamp: "2026-09-09T14:00:00Z",
        actualCargoHandledMt: 35000,
        isFinalized: true,
        agentNotes:
          "Carga completada con interrupción por lluvia y domingo SHEX.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.sofEvents)
    .values([
      {
        id: "ev_sof_01",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-01T20:00:00Z",
        eventEndTimestamp: "2026-09-03T18:00:00Z",
        durationMinutes: 2760, // 46h
        eventType: "WORKING_OPERATIONS",
        laytimeCountingPercentage: 100.0,
        isCountedAgainstLaytime: true,
        affectedHatchesOrCranes: "Bodegas 1 a 4 / Cinta Embarcadora Silo",
        interruptionReason: "Carga continua de trigo a granel a ritmo nominal.",
      },
      {
        id: "ev_sof_02",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-03T18:00:00Z",
        eventEndTimestamp: "2026-09-04T06:00:00Z",
        durationMinutes: 720, // 12h
        eventType: "RAIN_STOPPAGE",
        laytimeCountingPercentage: 0.0,
        isCountedAgainstLaytime: false,
        affectedHatchesOrCranes: "Todas las bodegas cerradas",
        interruptionReason:
          "Fuerte aguacero y temporal costero. Escotillas cerradas para preservar mercancía.",
      },
      {
        id: "ev_sof_03",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-04T06:00:00Z",
        eventEndTimestamp: "2026-09-06T00:00:00Z",
        durationMinutes: 2520, // 42h
        eventType: "WORKING_OPERATIONS",
        laytimeCountingPercentage: 100.0,
        isCountedAgainstLaytime: true,
        affectedHatchesOrCranes: "Bodegas 1 a 4",
        interruptionReason:
          "Reanudación de operaciones de carga tras paso del frente de lluvia.",
      },
      {
        id: "ev_sof_04",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-06T00:00:00Z",
        eventEndTimestamp: "2026-09-07T00:00:00Z",
        durationMinutes: 1440, // 24h
        eventType: "SUNDAY_SHEX_EXCLUDED",
        laytimeCountingPercentage: 0.0,
        isCountedAgainstLaytime: false,
        affectedHatchesOrCranes: "Terminal inactiva",
        interruptionReason:
          "Domingo reglamentario excluido bajo cláusula SHEX Even If Used.",
      },
      {
        id: "ev_sof_05",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-07T00:00:00Z",
        eventEndTimestamp: "2026-09-09T14:00:00Z",
        durationMinutes: 3720, // 62h
        eventType: "WORKING_OPERATIONS",
        laytimeCountingPercentage: 100.0,
        isCountedAgainstLaytime: true,
        affectedHatchesOrCranes: "Bodegas 1 a 4",
        interruptionReason:
          "Operaciones finales y trimado de bodegas hasta completar 35.000 MT.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.laytimeCalculations)
    .values([
      {
        id: "lay_calc_sdr_01",
        charterPartyId: "cp_gencon_wheat_01",
        statementOfFactsId: "sof_sdr_load_01",
        calculationReference: "LAY-2026-SDR-001",
        portOperation: "LOADING",
        laytimeCommencedTimestamp: "2026-09-01T20:00:00Z",
        laytimeCeasedTimestamp: "2026-09-09T14:00:00Z",
        allowedLaytimeSeconds: 604800, // 7d 00h 00m (35,000 MT / 5,000 MT/d)
        allowedLaytimeFormatted: "7d 00h 00m",
        grossTimeUsedSeconds: 669600, // 7d 18h 00m
        deductionsSeconds: 129600, // 36h = 12h lluvia + 24h domingo
        netLaytimeUsedSeconds: 540000, // 6d 06h 00m
        netLaytimeUsedFormatted: "6d 06h 00m",
        timeDifferenceSeconds: -64800, // 18h saved (Despatch)
        isDemurrage: false,
        demurrageDaysDecimal: 0,
        despatchDaysDecimal: 0.75, // 18h / 24h = 0.75 días
        demurrageRatePerDayUsd: 14000,
        despatchRatePerDayUsd: 7000,
        totalDemurrageAmountUsd: 0,
        totalDespatchAmountUsd: 5250.0, // 0.75 * 7000
        netFinancialPayableUsd: 5250.0,
        calculationMethod: "ATS_ALL_TIME_SAVED",
        settlementStatus: "AGREED_OWNER_CHARTERER",
        auditorNotes:
          "Cálculo revisado y acordado: 18 horas de pronto despacho (Despatch) a favor del fletador.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.timeCharterOffHires)
    .values([
      {
        id: "offhire_atlant_01",
        charterPartyId: "cp_nype_container_02",
        offHireReference: "OFF-2026-VLC-01",
        offHireReason: "MAIN_ENGINE_BREAKDOWN",
        offHireStartTimestamp: "2026-08-28T02:00:00Z",
        offHireEndTimestamp: "2026-08-29T14:00:00Z",
        durationHours: 36.0,
        durationDaysDecimal: 1.5,
        dailyHireRateUsd: 19800,
        hireDeductionUsd: 29700.0, // 1.5 * 19,800
        bunkerVlsfoConsumedMt: 4.2,
        bunkerMgoConsumedMt: 0.8,
        vlsfoPriceUsdPerMt: 580,
        mgoPriceUsdPerMt: 750,
        bunkerCompensationUsd: 3036.0, // 4.2*580 + 0.8*750 = 2436 + 600
        totalOffHireClaimUsd: 32736.0,
        offHireStatus: "AGREED_OWNER",
        incidentDescription:
          "Fallo en turbocompresor principal requiriendo fondeo de emergencia y reparación con repuestos de tierra.",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Pólizas de Fletamento, Estados de Hechos (SOF), Cronología de Planchas y Off-Hires.",
  );
}
