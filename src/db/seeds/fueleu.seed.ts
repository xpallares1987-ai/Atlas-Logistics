import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedFuelEu(): Promise<void> {
  // 17. Seed FuelEU Maritime & Descarbonización Marítima (Reg. UE 2023/1805 & Dir. UE 2023/959)
  await db
    .insert(schema.marineFuels)
    .values([
      {
        id: "fuel_vlsfo",
        fuelCode: "FOSSIL_VLSFO",
        fuelName: "Very Low Sulphur Fuel Oil (VLSFO 0.5% S)",
        fuelCategory: "FOSSIL_LIQUID",
        lowerCalorificValueMjPerGram: 0.041,
        wttFactorGco2eqPerMj: 13.5,
        ttwFactorGco2eqPerMj: 77.66,
        totalWtwFactorGco2eqPerMj: 91.16, // Línea base de referencia reglamentaria
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 620.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_mgo",
        fuelCode: "FOSSIL_MGO",
        fuelName: "Marine Gas Oil (MGO DMA 0.1% S)",
        fuelCategory: "FOSSIL_LIQUID",
        lowerCalorificValueMjPerGram: 0.0427,
        wttFactorGco2eqPerMj: 14.4,
        ttwFactorGco2eqPerMj: 76.2,
        totalWtwFactorGco2eqPerMj: 90.6,
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 780.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_hfo",
        fuelCode: "FOSSIL_HFO_SCRUBBER",
        fuelName: "Heavy Fuel Oil con Scrubber (HFO 3.5% S + EGCS)",
        fuelCategory: "FOSSIL_LIQUID",
        lowerCalorificValueMjPerGram: 0.0405,
        wttFactorGco2eqPerMj: 13.5,
        ttwFactorGco2eqPerMj: 78.8,
        totalWtwFactorGco2eqPerMj: 92.3,
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 490.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_lng_otto",
        fuelCode: "FOSSIL_LNG_OTTO",
        fuelName: "Gas Natural Licuado (LNG Dual-Fuel Motor Otto)",
        fuelCategory: "FOSSIL_GAS_LNG",
        lowerCalorificValueMjPerGram: 0.0491,
        wttFactorGco2eqPerMj: 18.5,
        ttwFactorGco2eqPerMj: 56.4,
        totalWtwFactorGco2eqPerMj: 74.9, // Incluye deslizamiento de metano CH4
        methaneSlipPercent: 3.1,
        averageMarketPriceUsdPerTonne: 710.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_bio_mgo_hvo",
        fuelCode: "BIO_MGO_HVO",
        fuelName: "Bio-MGO / Hidrobiodiésel (HVO 100% Biogénico)",
        fuelCategory: "BIOFUEL",
        lowerCalorificValueMjPerGram: 0.044,
        wttFactorGco2eqPerMj: 15.0,
        ttwFactorGco2eqPerMj: 0.0, // Cero emisiones netas Tank-to-Wake
        totalWtwFactorGco2eqPerMj: 15.0,
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 1250.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_bio_lng",
        fuelCode: "BIO_LNG",
        fuelName: "Bio-LNG (Biometano Licuado de Residuos)",
        fuelCategory: "BIOFUEL",
        lowerCalorificValueMjPerGram: 0.0491,
        wttFactorGco2eqPerMj: 12.0,
        ttwFactorGco2eqPerMj: 0.0,
        totalWtwFactorGco2eqPerMj: 12.0,
        methaneSlipPercent: 1.5,
        averageMarketPriceUsdPerTonne: 1100.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_e_methanol",
        fuelCode: "E_METHANOL_RFNBO",
        fuelName: "E-Metanol Verde Sintético (RFNBO Certificado)",
        fuelCategory: "RFNBO_E_FUEL",
        lowerCalorificValueMjPerGram: 0.0199,
        wttFactorGco2eqPerMj: 5.2,
        ttwFactorGco2eqPerMj: 0.0,
        totalWtwFactorGco2eqPerMj: 5.2, // Reducción > 94% respecto a base
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 1450.0,
        isRfnboCompliant: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_electricity_ops",
        fuelCode: "ELECTRICITY_OPS",
        fuelName: "Electricidad en Muelle (OPS - Onshore Power Supply)",
        fuelCategory: "ELECTRICITY_OPS",
        lowerCalorificValueMjPerGram: 0.0036, // 1 kWh = 3.6 MJ
        wttFactorGco2eqPerMj: 28.0, // Mix eléctrico red europea
        ttwFactorGco2eqPerMj: 0.0,
        totalWtwFactorGco2eqPerMj: 28.0,
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 180.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.marineVessels)
    .values([
      {
        id: "ves_atlas_med",
        imoNumber: "9811012",
        vesselName: "Atlas Mediterranean",
        vesselType: "CONTAINER_SHIP",
        flagState: "ES", // España
        grossTonnageGt: 148500,
        deadweightTonnageDwt: 165000.0,
        teuCapacity: 15200,
        mainEngineType: "TWO_STROKE_SLOW_SPEED_DIESEL",
        hasOpsConnectionInstalled: true,
        operatingShippingLine: "Atlas Mediterranean Line S.A.",
        docHolderCompany: "Atlas Maritime Shipmanagement Ltd.",
        classificationSociety: "DNV",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "ves_iberian_voyager",
        imoNumber: "9923410",
        vesselName: "Iberian Voyager",
        vesselType: "CONTAINER_SHIP",
        flagState: "PT", // Madeira (Portugal)
        grossTonnageGt: 96000,
        deadweightTonnageDwt: 110000.0,
        teuCapacity: 9200,
        mainEngineType: "DUAL_FUEL_METHANOL",
        hasOpsConnectionInstalled: true,
        operatingShippingLine: "Atlas Green Shipping Lines",
        docHolderCompany: "Atlas Maritime Shipmanagement Ltd.",
        classificationSociety: "Bureau Veritas",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "ves_valencia_express",
        imoNumber: "9789123",
        vesselName: "Valencia Express Feeder",
        vesselType: "CONTAINER_SHIP",
        flagState: "CY", // Chipre
        grossTonnageGt: 28400,
        deadweightTonnageDwt: 34000.0,
        teuCapacity: 2600,
        mainEngineType: "DUAL_FUEL_LNG_OTTO",
        hasOpsConnectionInstalled: true,
        operatingShippingLine: "Marítima Valenciana Feeder Hub",
        docHolderCompany: "Valenciana Marine Ops S.L.",
        classificationSociety: "Lloyd's Register",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "ves_cadiz_bulk",
        imoNumber: "9654321",
        vesselName: "Cádiz Bulk Trader",
        vesselType: "BULK_CARRIER",
        flagState: "ES",
        grossTonnageGt: 43200,
        deadweightTonnageDwt: 82000.0,
        teuCapacity: 0,
        mainEngineType: "TWO_STROKE_SLOW_SPEED_DIESEL",
        hasOpsConnectionInstalled: false,
        operatingShippingLine: "Transmed Bulk Transport S.A.",
        docHolderCompany: "Transmed Maritime Corp.",
        classificationSociety: "RINA",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.marineVoyages)
    .values([
      {
        id: "voy_2026_01",
        voyageReferenceNumber: "VOY-2026-MED-0101",
        vesselId: "ves_atlas_med",
        departurePortLocode: "ESVLC",
        departurePortName: "Puerto de Valencia (España)",
        arrivalPortLocode: "ITGOA",
        arrivalPortName: "Porto di Genova (Italia)",
        geographicScope: "INTRA_EU_100", // 100% de cobertura EU ETS & FuelEU
        distanceNauticalMiles: 480.0,
        departureDate: "2026-08-01T08:00:00Z",
        arrivalDate: "2026-08-03T12:00:00Z",
        navigationHours: 52.0,
        berthHours: 24.0,
        fuelId: "fuel_vlsfo",
        fuelConsumedTonnes: 85.0,
        opsElectricityConsumedKwh: 12500.0,
        totalEnergyConsumedMj: 85.0 * 1000 * 41.0 + 12500.0 * 3.6, // 3,485,000 MJ + 45,000 MJ = 3,530,000 MJ
        calculatedGhgIntensityGco2eqPerMj: 90.35, // Ligeramente por encima de 89.34 g/MJ (genera leve déficit)
        co2EmissionsTonnes: 264.77,
        ch4EmissionsTonnes: 0.005,
        n2oEmissionsTonnes: 0.012,
        totalGhgEmissionsScopeTco2eq: 268.09,
        etsApplicableScopeEmissionsTco2eq: 268.09, // 100%
        carriedTeuCount: 4200,
        status: "COMPLETED_VERIFIED",
        leadAuditorVerifier: "Jean-Paul Sartre (DNV Lead Auditor)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "voy_2026_02",
        voyageReferenceNumber: "VOY-2026-ATL-0202",
        vesselId: "ves_iberian_voyager",
        departurePortLocode: "ESBCN",
        departurePortName: "Port de Barcelona (España)",
        arrivalPortLocode: "NLRTM",
        arrivalPortName: "Port of Rotterdam (Países Bajos)",
        geographicScope: "INTRA_EU_100",
        distanceNauticalMiles: 1850.0,
        departureDate: "2026-08-05T10:00:00Z",
        arrivalDate: "2026-08-10T18:00:00Z",
        navigationHours: 128.0,
        berthHours: 32.0,
        fuelId: "fuel_e_methanol",
        fuelConsumedTonnes: 140.0,
        opsElectricityConsumedKwh: 18000.0,
        totalEnergyConsumedMj: 140.0 * 1000 * 19.9 + 18000.0 * 3.6,
        calculatedGhgIntensityGco2eqPerMj: 5.72, // Masivo superávit verde (E-Metanol RFNBO)
        co2EmissionsTonnes: 0.0, // Cero fósil neto
        ch4EmissionsTonnes: 0.0,
        n2oEmissionsTonnes: 0.002,
        totalGhgEmissionsScopeTco2eq: 0.53,
        etsApplicableScopeEmissionsTco2eq: 0.53,
        carriedTeuCount: 3800,
        status: "COMPLETED_VERIFIED",
        leadAuditorVerifier: "Marc Van Houten (Bureau Veritas Marine)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "voy_2026_03",
        voyageReferenceNumber: "VOY-2026-TRS-0303",
        vesselId: "ves_atlas_med",
        departurePortLocode: "ESALG",
        departurePortName: "Puerto de Algeciras (España)",
        arrivalPortLocode: "USNYC",
        arrivalPortName: "Port of New York & New Jersey (EE.UU.)",
        geographicScope: "EXTRA_EU_50", // 50% de cobertura bajo EU ETS & FuelEU
        distanceNauticalMiles: 3150.0,
        departureDate: "2026-08-12T06:00:00Z",
        arrivalDate: "2026-08-20T14:00:00Z",
        navigationHours: 200.0,
        berthHours: 40.0,
        fuelId: "fuel_vlsfo",
        fuelConsumedTonnes: 420.0,
        opsElectricityConsumedKwh: 0.0,
        totalEnergyConsumedMj: 420.0 * 1000 * 41.0, // 17,220,000 MJ
        calculatedGhgIntensityGco2eqPerMj: 91.16,
        co2EmissionsTonnes: 1308.3,
        ch4EmissionsTonnes: 0.02,
        n2oEmissionsTonnes: 0.06,
        totalGhgEmissionsScopeTco2eq: 1324.76,
        etsApplicableScopeEmissionsTco2eq: 662.38, // 50% extra-EU
        carriedTeuCount: 6500,
        status: "COMPLETED_VERIFIED",
        leadAuditorVerifier: "Jean-Paul Sartre (DNV Lead Auditor)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "voy_2026_04",
        voyageReferenceNumber: "VOY-2026-VLC-0404",
        vesselId: "ves_valencia_express",
        departurePortLocode: "ESVLC",
        departurePortName: "Puerto de Valencia (Muelle MTO)",
        arrivalPortLocode: "ESVLC",
        arrivalPortName: "Puerto de Valencia (Muelle MTO)",
        geographicScope: "BERTH_PORT_EU_100", // Estancia en puerto 100% OPS
        distanceNauticalMiles: 0.0,
        departureDate: "2026-08-18T00:00:00Z",
        arrivalDate: "2026-08-19T12:00:00Z",
        navigationHours: 0.0,
        berthHours: 36.0,
        fuelId: "fuel_electricity_ops",
        fuelConsumedTonnes: 0.0,
        opsElectricityConsumedKwh: 22000.0,
        totalEnergyConsumedMj: 22000.0 * 3.6, // 79,200 MJ
        calculatedGhgIntensityGco2eqPerMj: 28.0, // Cero emisiones directas en puerto
        co2EmissionsTonnes: 0.0,
        ch4EmissionsTonnes: 0.0,
        n2oEmissionsTonnes: 0.0,
        totalGhgEmissionsScopeTco2eq: 2.22,
        etsApplicableScopeEmissionsTco2eq: 0.0, // Cero derechos al usar conexión OPS
        carriedTeuCount: 0,
        status: "AUDITED_THETIS",
        leadAuditorVerifier:
          "Almudena Grandes (Inspectora Autoridad Portuaria)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.fuelEuPools)
    .values([
      {
        id: "pool_atlas_green_2025",
        poolCode: "POOL-2025-ATLAS-GREEN",
        poolName: "Atlas Green Alliance Compliance Pool 2025",
        reportingYear: 2025,
        managingOperatorName: "Atlas Mediterranean Line S.A.",
        totalEnrolledVesselsCount: 3,
        consolidatedNetComplianceBalanceGco2eq: 245000.0 - 120000.0 + 60000.0, // +185,000 kg CO2eq
        isPoolCompliantZeroPenalty: true,
        status: "REGISTERED_EMSA",
        remarks:
          "Pool de cumplimiento regulatorio autorizado bajo el Art. 21 del Reg. (UE) 2023/1805. El excedente del Iberian Voyager (E-Metanol) compensa íntegramente el déficit del Atlas Mediterranean (VLSFO), resultando en 0€ de penalización para la flota.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.fuelEuComplianceAccounts)
    .values([
      {
        id: "acc_iberian_2025",
        vesselId: "ves_iberian_voyager",
        reportingYear: 2025,
        targetGhgIntensityGco2eqPerMj: 89.3368, // -2% de 91.16
        actualAttainedGhgIntensityGco2eqPerMj: 5.72,
        totalAnnualEnergyMj: 2848000.0,
        complianceBalanceGco2eq: 238120000.0, // +238.12 toneladas CO2eq de superávit
        complianceStatus: "SURPLUS",
        calculatedFuelEuPenaltyEur: 0.0,
        bankedSurplusTransferredNextYearGco2eq: 53120000.0,
        borrowedDeficitFromNextYearGco2eq: 0.0,
        poolId: "pool_atlas_green_2025",
        verifierAccreditationNumber: "BV-MAR-VERIF-2025-8891",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc_atlas_med_2025",
        vesselId: "ves_atlas_med",
        reportingYear: 2025,
        targetGhgIntensityGco2eqPerMj: 89.3368,
        actualAttainedGhgIntensityGco2eqPerMj: 90.95,
        totalAnnualEnergyMj: 20750000.0,
        complianceBalanceGco2eq: -33470000.0, // Déficit de ~33.47 t CO2eq
        complianceStatus: "BALANCED_BY_POOL",
        calculatedFuelEuPenaltyEur: 0.0, // Neutralizado por el pool con Iberian Voyager
        bankedSurplusTransferredNextYearGco2eq: 0.0,
        borrowedDeficitFromNextYearGco2eq: 0.0,
        poolId: "pool_atlas_green_2025",
        verifierAccreditationNumber: "DNV-MAR-VERIF-2025-4412",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc_valencia_2025",
        vesselId: "ves_valencia_express",
        reportingYear: 2025,
        targetGhgIntensityGco2eqPerMj: 89.3368,
        actualAttainedGhgIntensityGco2eqPerMj: 74.5,
        totalAnnualEnergyMj: 4120000.0,
        complianceBalanceGco2eq: 61120000.0, // Superávit LNG + OPS
        complianceStatus: "SURPLUS",
        calculatedFuelEuPenaltyEur: 0.0,
        bankedSurplusTransferredNextYearGco2eq: 61120000.0,
        borrowedDeficitFromNextYearGco2eq: 0.0,
        poolId: "pool_atlas_green_2025",
        verifierAccreditationNumber: "LR-MAR-VERIF-2025-1109",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc_cadiz_bulk_2025",
        vesselId: "ves_cadiz_bulk",
        reportingYear: 2025,
        targetGhgIntensityGco2eqPerMj: 89.3368,
        actualAttainedGhgIntensityGco2eqPerMj: 91.8,
        totalAnnualEnergyMj: 12500000.0,
        complianceBalanceGco2eq: -30790000.0, // Déficit
        complianceStatus: "DEFICIT",
        calculatedFuelEuPenaltyEur: 33020.15, // Penalización a abonar si no entra en pool
        bankedSurplusTransferredNextYearGco2eq: 0.0,
        borrowedDeficitFromNextYearGco2eq: 0.0,
        poolId: null,
        verifierAccreditationNumber: "RINA-MAR-VERIF-2025-3310",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Combustibles Marítimos WtW, Buques, Travesías, Cuentas FuelEU y Pools de Flota.",
  );

  // ----------------------------------------------------
  // TRADE FINANCE & LETTERS OF CREDIT (UCP 600 / URDG 758 / URC 522)
}
