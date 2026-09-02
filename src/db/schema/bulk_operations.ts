import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * 1. Master Operational Vessel Calls for Bulk Carriers & Tankers
 */
export const bulkVesselOperations = sqliteTable(
  "bulk_vessel_operations",
  {
    id: text("id").primaryKey(),
    vesselName: text("vessel_name").notNull(),
    imoNumber: text("imo_number").notNull(),
    callSign: text("call_sign"),
    vesselType: text("vessel_type", {
      enum: [
        "CAPESIZE_BULKER",
        "PANAMAX_BULKER",
        "HANDYSIZE_BULKER",
        "PRODUCT_TANKER",
        "CHEMICAL_TANKER",
      ],
    }).notNull(),
    portName: text("port_name").notNull(),
    terminalName: text("terminal_name").notNull(),
    berthNumber: text("berth_number").notNull(),
    cargoCategory: text("cargo_category", {
      enum: [
        "SOLID_MINERAL_BULK",
        "AGRICULTURAL_GRAIN_BULK",
        "CLEAN_LIQUID_BULK",
        "CHEMICAL_LIQUID_BULK",
      ],
    }).notNull(),
    operationType: text("operation_type", {
      enum: ["LOADING", "DISCHARGING"],
    }).notNull(),
    targetCargoTonnage: real("target_cargo_tonnage").notNull(),
    etaDate: text("eta_date").notNull(),
    etdDate: text("etd_date"),
    actualCommencedDate: text("actual_commenced_date"),
    actualCompletedDate: text("actual_completed_date"),
    status: text("status", {
      enum: [
        "SCHEDULED",
        "ALONGSIDE_SURVEYING",
        "OPERATIONS_IN_PROGRESS",
        "COMPLETED_SAILED",
      ],
    })
      .notNull()
      .default("SCHEDULED"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    imoIdx: index("idx_bulk_vessel_imo").on(table.imoNumber),
    portIdx: index("idx_bulk_vessel_port").on(table.portName),
  }),
);

/**
 * 2. Hydrostatic Draft Surveys (6-Point Drafts, Trim, Density, Deductibles, Cargo Weight)
 */
export const bulkDraftSurveys = sqliteTable(
  "bulk_draft_surveys",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id")
      .notNull()
      .references(() => bulkVesselOperations.id, { onDelete: "cascade" }),
    surveyType: text("survey_type", {
      enum: ["INITIAL_SURVEY", "INTERMEDIATE_SURVEY", "FINAL_SURVEY"],
    }).notNull(),
    surveyDate: text("survey_date").notNull(),
    surveyorName: text("surveyor_name").notNull(),
    chiefOfficerName: text("chief_officer_name").notNull(),
    forwardDraftPort: real("forward_draft_port").notNull(),
    forwardDraftStarboard: real("forward_draft_starboard").notNull(),
    aftDraftPort: real("aft_draft_port").notNull(),
    aftDraftStarboard: real("aft_draft_starboard").notNull(),
    midDraftPort: real("mid_draft_port").notNull(),
    midDraftStarboard: real("mid_draft_starboard").notNull(),
    forwardMeanDraft: real("forward_mean_draft").notNull(),
    aftMeanDraft: real("aft_mean_draft").notNull(),
    midMeanDraft: real("mid_mean_draft").notNull(),
    apparentTrim: real("apparent_trim").notNull(),
    quarterMeanDraft: real("quarter_mean_draft").notNull(),
    lengthBetweenPerpendiculars: real(
      "length_between_perpendiculars",
    ).notNull(), // LBP (m)
    longitudinalCenterOfFlotation: real(
      "longitudinal_center_of_flotation",
    ).notNull(), // LCF (m)
    tonnesPerCmImmersion: real("tonnes_per_cm_immersion").notNull(), // TPC (t/cm)
    momentToChangeTrim1Cm: real("moment_to_change_trim_1cm").notNull(), // MTC (t*m/cm)
    measuredWaterDensity: real("measured_water_density").notNull(), // t/m3 (e.g. 1.025)
    hydrostaticDisplacement: real("hydrostatic_displacement").notNull(),
    firstTrimCorrection: real("first_trim_correction").notNull(),
    secondTrimCorrection: real("second_trim_correction").notNull(),
    correctedDisplacement: real("corrected_displacement").notNull(),
    ballastWaterDeductible: real("ballast_water_deductible")
      .notNull()
      .default(0.0),
    fuelOilDeductible: real("fuel_oil_deductible").notNull().default(0.0),
    dieselOilDeductible: real("diesel_oil_deductible").notNull().default(0.0),
    freshWaterDeductible: real("fresh_water_deductible").notNull().default(0.0),
    sludgeBilgeDeductible: real("sludge_bilge_deductible")
      .notNull()
      .default(0.0),
    totalDeductibles: real("total_deductibles").notNull(),
    netDisplacement: real("net_displacement").notNull(),
    calculatedCargoTonnage: real("calculated_cargo_tonnage"),
    status: text("status", {
      enum: ["RECORDED", "CERTIFIED_BY_SURVEYOR"],
    })
      .notNull()
      .default("CERTIFIED_BY_SURVEYOR"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    opIdx: index("idx_bulk_draft_op").on(table.operationId),
  }),
);

/**
 * 3. IMSBC Code Solid Bulk Cargo Declarations (Group A/B/C, TML/FMP, Moisture, Liquefaction)
 */
export const bulkImsbcDeclarations = sqliteTable(
  "bulk_imsbc_declarations",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id")
      .notNull()
      .references(() => bulkVesselOperations.id, { onDelete: "cascade" }),
    declarationReference: text("declaration_reference").notNull().unique(),
    bulkCargoShippingName: text("bulk_cargo_shipping_name").notNull(),
    imsbcGroup: text("imsbc_group", {
      enum: [
        "GROUP_A_LIQUEFACTION",
        "GROUP_B_CHEMICAL_HAZARD",
        "GROUP_C_NON_HAZARDOUS",
      ],
    }).notNull(),
    grossWeightTonnes: real("gross_weight_tonnes").notNull(),
    moistureContentPercentage: real("moisture_content_percentage").notNull(),
    flowMoisturePointPercentage: real("flow_moisture_point_percentage"),
    transportableMoistureLimit: real("transportable_moisture_limit"),
    isLiquefactionCompliant: integer("is_liquefaction_compliant", {
      mode: "boolean",
    }).notNull(),
    angleOfReposeDegrees: real("angle_of_repose_degrees"),
    stowageFactorM3PerTonne: real("stowage_factor_m3_per_tonne").notNull(),
    shipperName: text("shipper_name").notNull(),
    laboratoryTestDate: text("laboratory_test_date").notNull(),
    testingLaboratoryName: text("testing_laboratory_name").notNull(),
    declarationStatus: text("declaration_status", {
      enum: ["APPROVED_FOR_LOADING", "REJECTED_EXCEEDS_TML"],
    })
      .notNull()
      .default("APPROVED_FOR_LOADING"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    refIdx: index("idx_bulk_imsbc_ref").on(table.declarationReference),
  }),
);

/**
 * 4. IMO Grain Code Stability & Loading Plans (Volumetric Moments, GM0, Residual Heel)
 */
export const bulkGrainStabilityPlans = sqliteTable(
  "bulk_grain_stability_plans",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id")
      .notNull()
      .references(() => bulkVesselOperations.id, { onDelete: "cascade" }),
    planReference: text("plan_reference").notNull().unique(),
    grainType: text("grain_type").notNull(),
    totalGrainTonnage: real("total_grain_tonnage").notNull(),
    stowageFactorM3PerTonne: real("stowage_factor_m3_per_tonne").notNull(),
    totalVolumetricHeelingMoment: real(
      "total_volumetric_heeling_moment",
    ).notNull(), // m4
    departureDisplacement: real("departure_displacement").notNull(), // tonnes
    departureKg: real("departure_kg").notNull(), // m
    departureGm0: real("departure_gm0").notNull(), // initial GM m
    correctedHeelingMoment: real("corrected_heeling_moment").notNull(),
    residualHeelAngleDegrees: real("residual_heel_angle_degrees").notNull(), // <= 12 deg
    residualDynamicalStabilityArea: real(
      "residual_dynamical_stability_area",
    ).notNull(), // >= 0.075 m*rad
    isImoGrainCodeCompliant: integer("is_imo_grain_code_compliant", {
      mode: "boolean",
    }).notNull(),
    approvedByMasterName: text("approved_by_master_name").notNull(),
    approvalDate: text("approval_date").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    refIdx: index("idx_bulk_grain_ref").on(table.planReference),
  }),
);

/**
 * 5. Tanker Liquid Quantity Surveys (ASTM-IP Table 54, Temp, VCF, Free Water, Mass in Air)
 */
export const bulkUllageSurveys = sqliteTable(
  "bulk_ullage_surveys",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id")
      .notNull()
      .references(() => bulkVesselOperations.id, { onDelete: "cascade" }),
    surveyReference: text("survey_reference").notNull().unique(),
    productName: text("product_name").notNull(),
    tankCount: integer("tank_count").notNull(),
    observedAverageTemperatureCelsius: real(
      "observed_average_temperature_celsius",
    ).notNull(),
    densityAt15Celsius: real("density_at_15_celsius").notNull(), // kg/L or t/m3
    apiGravityAt60Fahrenheit: real("api_gravity_at_60_fahrenheit"),
    totalObservedVolumeM3: real("total_observed_volume_m3").notNull(),
    totalFreeWaterVolumeM3: real("total_free_water_volume_m3").notNull(),
    grossObservedVolumeM3: real("gross_observed_volume_m3").notNull(),
    volumeCorrectionFactorAstm54: real(
      "volume_correction_factor_astm_54",
    ).notNull(),
    grossStandardVolumeM3: real("gross_standard_volume_m3").notNull(),
    netStandardVolumeM3: real("net_standard_volume_m3").notNull(),
    metricTonnesInAir: real("metric_tonnes_in_air").notNull(),
    metricTonnesInVacuum: real("metric_tonnes_in_vacuum").notNull(),
    surveyDate: text("survey_date").notNull(),
    surveyorCompany: text("surveyor_company").notNull(),
    status: text("status", {
      enum: ["CERTIFIED_COMPLIANT", "DISCREPANCY_DETECTED"],
    })
      .notNull()
      .default("CERTIFIED_COMPLIANT"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    refIdx: index("idx_bulk_ullage_ref").on(table.surveyReference),
  }),
);
