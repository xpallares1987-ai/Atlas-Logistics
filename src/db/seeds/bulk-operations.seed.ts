import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedBulkOperations(): Promise<void> {
  console.log(
    "⚓ Inyectando Operaciones de Graneles Portuarios, Draft Surveys, Declaraciones IMSBC, Estabilidad Grain Code y Sondeos Ullage ASTM...",
  );
  await db
    .insert(schema.bulkVesselOperations)
    .values([
      {
        id: "bulk_op_capesize_01",
        vesselName: "MV Cape Finisterre",
        imoNumber: "9482012",
        callSign: "EABF",
        vesselType: "CAPESIZE_BULKER",
        portName: "Puerto de Gijón (ESGIJ)",
        terminalName: "Terminal de Graneles Sólidos El Musel (EBHI)",
        berthNumber: "Muelle de Graneles 1",
        cargoCategory: "SOLID_MINERAL_BULK",
        operationType: "LOADING",
        targetCargoTonnage: 120000.0,
        etaDate: "2026-09-01",
        etdDate: "2026-09-06",
        actualCommencedDate: "2026-09-02",
        status: "OPERATIONS_IN_PROGRESS",
      },
      {
        id: "bulk_op_grain_01",
        vesselName: "MV Ceres Grain",
        imoNumber: "9321845",
        callSign: "C6XY8",
        vesselType: "PANAMAX_BULKER",
        portName: "Puerto de Valencia (ESVLC)",
        terminalName: "Terminal Agroalimentaria Silval",
        berthNumber: "Muelle de la Xitxarra",
        cargoCategory: "AGRICULTURAL_GRAIN_BULK",
        operationType: "LOADING",
        targetCargoTonnage: 65000.0,
        etaDate: "2026-09-03",
        etdDate: "2026-09-07",
        actualCommencedDate: "2026-09-03",
        status: "OPERATIONS_IN_PROGRESS",
      },
      {
        id: "bulk_op_tanker_01",
        vesselName: "MT Atlantic Energy",
        imoNumber: "9610234",
        callSign: "IBEZ",
        vesselType: "PRODUCT_TANKER",
        portName: "Puerto de Huelva (ESHUV)",
        terminalName: "Terminal de Hidrocarburos Decal",
        berthNumber: "Muelle Petrolero Pantalán 2",
        cargoCategory: "CLEAN_LIQUID_BULK",
        operationType: "DISCHARGING",
        targetCargoTonnage: 35000.0,
        etaDate: "2026-09-02",
        etdDate: "2026-09-04",
        actualCommencedDate: "2026-09-02",
        status: "OPERATIONS_IN_PROGRESS",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.bulkDraftSurveys)
    .values([
      {
        id: "draft_survey_initial_01",
        operationId: "bulk_op_capesize_01",
        surveyType: "INITIAL_SURVEY",
        surveyDate: "2026-09-02",
        surveyorName: "Capt. Alejandro Valdés (SGS Marine)",
        chiefOfficerName: "C/O Marco Rossi",
        forwardDraftPort: 4.2,
        forwardDraftStarboard: 4.22,
        aftDraftPort: 6.8,
        aftDraftStarboard: 6.84,
        midDraftPort: 5.48,
        midDraftStarboard: 5.52,
        forwardMeanDraft: 4.21,
        aftMeanDraft: 6.82,
        midMeanDraft: 5.5,
        apparentTrim: 2.61,
        quarterMeanDraft: 5.501,
        lengthBetweenPerpendiculars: 220.0,
        longitudinalCenterOfFlotation: -3.5,
        tonnesPerCmImmersion: 65.0,
        momentToChangeTrim1Cm: 850.0,
        measuredWaterDensity: 1.02,
        hydrostaticDisplacement: 28500.0,
        firstTrimCorrection: -26.33,
        secondTrimCorrection: 8.52,
        correctedDisplacement: 28343.34,
        ballastWaterDeductible: 12000.0,
        fuelOilDeductible: 1500.0,
        dieselOilDeductible: 200.0,
        freshWaterDeductible: 300.0,
        sludgeBilgeDeductible: 0.0,
        totalDeductibles: 14000.0,
        netDisplacement: 14343.34, // Lightship + Constant
        calculatedCargoTonnage: null,
        status: "CERTIFIED_BY_SURVEYOR",
      },
      {
        id: "draft_survey_final_01",
        operationId: "bulk_op_capesize_01",
        surveyType: "FINAL_SURVEY",
        surveyDate: "2026-09-05",
        surveyorName: "Capt. Alejandro Valdés (SGS Marine)",
        chiefOfficerName: "C/O Marco Rossi",
        forwardDraftPort: 15.6,
        forwardDraftStarboard: 15.64,
        aftDraftPort: 16.1,
        aftDraftStarboard: 16.14,
        midDraftPort: 15.86,
        midDraftStarboard: 15.9,
        forwardMeanDraft: 15.62,
        aftMeanDraft: 16.12,
        midMeanDraft: 15.88,
        apparentTrim: 0.5,
        quarterMeanDraft: 15.875,
        lengthBetweenPerpendiculars: 220.0,
        longitudinalCenterOfFlotation: -0.8,
        tonnesPerCmImmersion: 82.0,
        momentToChangeTrim1Cm: 1100.0,
        measuredWaterDensity: 1.022,
        hydrostaticDisplacement: 137800.0,
        firstTrimCorrection: -14.91,
        secondTrimCorrection: 1.42,
        correctedDisplacement: 137382.45,
        ballastWaterDeductible: 1200.0,
        fuelOilDeductible: 1350.0,
        dieselOilDeductible: 180.0,
        freshWaterDeductible: 250.0,
        sludgeBilgeDeductible: 0.0,
        totalDeductibles: 2980.0,
        netDisplacement: 134402.45,
        calculatedCargoTonnage: 120059.11, // 134402.45 - 14343.34
        status: "CERTIFIED_BY_SURVEYOR",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.bulkImsbcDeclarations)
    .values([
      {
        id: "imsbc_dec_01",
        operationId: "bulk_op_capesize_01",
        declarationReference: "IMSBC-2026-GIJ-0089",
        bulkCargoShippingName: "IRON ORE CONCENTRATE (PELLET FEED)",
        imsbcGroup: "GROUP_A_LIQUEFACTION",
        grossWeightTonnes: 120000.0,
        moistureContentPercentage: 8.5,
        flowMoisturePointPercentage: 11.0,
        transportableMoistureLimit: 9.9, // 11.0 * 0.90
        isLiquefactionCompliant: true,
        angleOfReposeDegrees: 38.0,
        stowageFactorM3PerTonne: 0.45,
        shipperName: "Asturiana de Minerales e Importaciones SA",
        laboratoryTestDate: "2026-08-30",
        testingLaboratoryName: "SGS Mineral Testing Laboratories Gijón",
        declarationStatus: "APPROVED_FOR_LOADING",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.bulkGrainStabilityPlans)
    .values([
      {
        id: "grain_plan_01",
        operationId: "bulk_op_grain_01",
        planReference: "GRAIN-2026-VLC-0042",
        grainType: "WHEAT (TRIGO PANIFICABLE)",
        totalGrainTonnage: 65000.0,
        stowageFactorM3PerTonne: 1.35,
        totalVolumetricHeelingMoment: 12500.0,
        departureDisplacement: 82000.0,
        departureKg: 9.8,
        departureGm0: 1.15,
        correctedHeelingMoment: 0.113,
        residualHeelAngleDegrees: 5.62,
        residualDynamicalStabilityArea: 0.109,
        isImoGrainCodeCompliant: true,
        approvedByMasterName: "Capt. Fernando Méndez (MV Ceres Grain)",
        approvalDate: "2026-09-03",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.bulkUllageSurveys)
    .values([
      {
        id: "ullage_surv_01",
        operationId: "bulk_op_tanker_01",
        surveyReference: "ULL-2026-HUV-0019",
        productName: "AVIATION TURBINE FUEL JET A-1",
        tankCount: 8,
        observedAverageTemperatureCelsius: 22.0,
        densityAt15Celsius: 0.7985,
        apiGravityAt60Fahrenheit: 45.6,
        totalObservedVolumeM3: 44000.0,
        totalFreeWaterVolumeM3: 20.0,
        grossObservedVolumeM3: 43980.0,
        volumeCorrectionFactorAstm54: 0.9941,
        grossStandardVolumeM3: 43720.52,
        netStandardVolumeM3: 43720.52,
        metricTonnesInAir: 34862.75, // 43720.52 * (0.7985 - 0.0011)
        metricTonnesInVacuum: 34910.84, // 43720.52 * 0.7985
        surveyDate: "2026-09-02",
        surveyorCompany: "Saybolt Spain / Decal Terminal Surveyors",
        status: "CERTIFIED_COMPLIANT",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Operaciones de Graneles Portuarios, Draft Surveys, Declaraciones IMSBC, Estabilidad Grain Code y Sondeos Ullage ASTM.",
  );

  // Ensure admin user exists
}
