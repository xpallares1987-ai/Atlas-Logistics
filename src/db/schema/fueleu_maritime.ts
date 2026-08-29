import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// 1. Catálogo de Combustibles Marítimos & Factores Well-to-Wake (Reg. UE 2023/1805 Anexo II)
export const marineFuels = sqliteTable("marine_fuels", {
  id: text("id").primaryKey(),
  fuelCode: text("fuel_code").notNull().unique(), // ej. FOSSIL_VLSFO, E_METHANOL_RFNBO
  fuelName: text("fuel_name").notNull(),
  fuelCategory: text("fuel_category", {
    enum: [
      "FOSSIL_LIQUID",
      "FOSSIL_GAS_LNG",
      "BIOFUEL",
      "RFNBO_E_FUEL",
      "ELECTRICITY_OPS",
    ],
  }).notNull(),
  lowerCalorificValueMjPerGram: real(
    "lower_calorific_value_mj_per_gram",
  ).notNull(), // LCV en MJ/g (ej. 0.0410 para VLSFO)
  wttFactorGco2eqPerMj: real("wtt_factor_gco2eq_per_mj").notNull(), // Well-to-Tank
  ttwFactorGco2eqPerMj: real("ttw_factor_gco2eq_per_mj").notNull(), // Tank-to-Wake
  totalWtwFactorGco2eqPerMj: real("total_wtw_factor_gco2eq_per_mj").notNull(), // Well-to-Wake total
  methaneSlipPercent: real("methane_slip_percent").notNull().default(0.0), // % fuga metano para motores de gas
  averageMarketPriceUsdPerTonne: real(
    "average_market_price_usd_per_tonne",
  ).notNull(),
  isRfnboCompliant: integer("is_rfnbo_compliant", { mode: "boolean" })
    .notNull()
    .default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 2. Flota de Buques Mercantes & Equipamiento Tecnológico
export const marineVessels = sqliteTable("marine_vessels", {
  id: text("id").primaryKey(),
  imoNumber: text("imo_number").notNull().unique(), // ej. 9811012
  vesselName: text("vessel_name").notNull(),
  vesselType: text("vessel_type", {
    enum: [
      "CONTAINER_SHIP",
      "BULK_CARRIER",
      "GENERAL_CARGO",
      "OIL_CHEMICAL_TANKER",
      "RO_RO_CARGO",
    ],
  }).notNull(),
  flagState: text("flag_state").notNull(),
  grossTonnageGt: integer("gross_tonnage_gt").notNull(), // arqueo bruto (>= 5.000 GT ámbito FuelEU)
  deadweightTonnageDwt: real("deadweight_tonnage_dwt").notNull(),
  teuCapacity: integer("teu_capacity"),
  mainEngineType: text("main_engine_type", {
    enum: [
      "TWO_STROKE_SLOW_SPEED_DIESEL",
      "FOUR_STROKE_MEDIUM_SPEED_DIESEL",
      "DUAL_FUEL_LNG_OTTO",
      "DUAL_FUEL_METHANOL",
      "ZERO_EMISSION_ELECTRIC",
    ],
  }).notNull(),
  hasOpsConnectionInstalled: integer("has_ops_connection_installed", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  operatingShippingLine: text("operating_shipping_line").notNull(),
  docHolderCompany: text("doc_holder_company").notNull(), // Document of Compliance holder
  classificationSociety: text("classification_society").notNull(), // ej. DNV, Bureau Veritas
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 3. Travesías Marítimas, Consumo de Bunker & Emisiones (THETIS-MRV / EU ETS)
export const marineVoyages = sqliteTable("marine_voyages", {
  id: text("id").primaryKey(),
  voyageReferenceNumber: text("voyage_reference_number").notNull().unique(), // ej. VOY-2026-MED-0412
  vesselId: text("vessel_id")
    .notNull()
    .references(() => marineVessels.id),
  departurePortLocode: text("departure_port_locode").notNull(), // ej. ESBCN (Barcelona)
  departurePortName: text("departure_port_name").notNull(),
  arrivalPortLocode: text("arrival_port_locode").notNull(), // ej. ITGOA (Génova) o USNYC
  arrivalPortName: text("arrival_port_name").notNull(),
  geographicScope: text("geographic_scope", {
    enum: ["INTRA_EU_100", "EXTRA_EU_50", "BERTH_PORT_EU_100"],
  }).notNull(),
  distanceNauticalMiles: real("distance_nautical_miles").notNull(),
  departureDate: text("departure_date").notNull(),
  arrivalDate: text("arrival_date").notNull(),
  navigationHours: real("navigation_hours").notNull(),
  berthHours: real("berth_hours").notNull().default(0.0),
  fuelId: text("fuel_id")
    .notNull()
    .references(() => marineFuels.id),
  fuelConsumedTonnes: real("fuel_consumed_tonnes").notNull(),
  opsElectricityConsumedKwh: real("ops_electricity_consumed_kwh")
    .notNull()
    .default(0.0),
  totalEnergyConsumedMj: real("total_energy_consumed_mj").notNull(),
  calculatedGhgIntensityGco2eqPerMj: real(
    "calculated_ghg_intensity_gco2eq_per_mj",
  ).notNull(),
  co2EmissionsTonnes: real("co2_emissions_tonnes").notNull(),
  ch4EmissionsTonnes: real("ch4_emissions_tonnes").notNull().default(0.0),
  n2oEmissionsTonnes: real("n2o_emissions_tonnes").notNull().default(0.0),
  totalGhgEmissionsScopeTco2eq: real(
    "total_ghg_emissions_scope_tco2eq",
  ).notNull(),
  etsApplicableScopeEmissionsTco2eq: real(
    "ets_applicable_scope_emissions_tco2eq",
  ).notNull(),
  carriedTeuCount: integer("carried_teu_count").notNull().default(0),
  status: text("status", {
    enum: ["PLANNED", "UNDERWAY", "COMPLETED_VERIFIED", "AUDITED_THETIS"],
  })
    .notNull()
    .default("COMPLETED_VERIFIED"),
  leadAuditorVerifier: text("lead_auditor_verifier").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 4. Balances Anuales de Cumplimiento FuelEU por Buque (Compliance Accounts)
export const fuelEuComplianceAccounts = sqliteTable(
  "fuel_eu_compliance_accounts",
  {
    id: text("id").primaryKey(),
    vesselId: text("vessel_id")
      .notNull()
      .references(() => marineVessels.id),
    reportingYear: integer("reporting_year").notNull(), // ej. 2025, 2026
    targetGhgIntensityGco2eqPerMj: real(
      "target_ghg_intensity_gco2eq_per_mj",
    ).notNull(), // 89.3368 para 2025 (-2%)
    actualAttainedGhgIntensityGco2eqPerMj: real(
      "actual_attained_ghg_intensity_gco2eq_per_mj",
    ).notNull(),
    totalAnnualEnergyMj: real("total_annual_energy_mj").notNull(),
    complianceBalanceGco2eq: real("compliance_balance_gco2eq").notNull(), // Positivo = Superávit, Negativo = Déficit
    complianceStatus: text("compliance_status", {
      enum: ["SURPLUS", "DEFICIT", "BALANCED_BY_POOL", "PENALTY_PAID"],
    })
      .notNull()
      .default("SURPLUS"),
    calculatedFuelEuPenaltyEur: real("calculated_fuel_eu_penalty_eur")
      .notNull()
      .default(0.0),
    bankedSurplusTransferredNextYearGco2eq: real(
      "banked_surplus_transferred_next_year_gco2eq",
    )
      .notNull()
      .default(0.0),
    borrowedDeficitFromNextYearGco2eq: real(
      "borrowed_deficit_from_next_year_gco2eq",
    )
      .notNull()
      .default(0.0),
    poolId: text("pool_id"),
    verifierAccreditationNumber: text(
      "verifier_accreditation_number",
    ).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
);

// 5. Agrupaciones de Cumplimiento de Flota (FuelEU Pools - Art. 21)
export const fuelEuPools = sqliteTable("fuel_eu_pools", {
  id: text("id").primaryKey(),
  poolCode: text("pool_code").notNull().unique(), // ej. POOL-2025-ATLAS-GREEN
  poolName: text("pool_name").notNull(),
  reportingYear: integer("reporting_year").notNull(),
  managingOperatorName: text("managing_operator_name").notNull(),
  totalEnrolledVesselsCount: integer("total_enrolled_vessels_count").notNull(),
  consolidatedNetComplianceBalanceGco2eq: real(
    "consolidated_net_compliance_balance_gco2eq",
  ).notNull(),
  isPoolCompliantZeroPenalty: integer("is_pool_compliant_zero_penalty", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  status: text("status", {
    enum: ["DRAFT", "REGISTERED_EMSA", "FINAL_SETTLED"],
  })
    .notNull()
    .default("REGISTERED_EMSA"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
