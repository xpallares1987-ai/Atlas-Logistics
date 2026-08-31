import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Charter Parties (Fixtures & Contracts)
 * Covers Voyage Charters (BIMCO Gencon 2022 / ASBATANKVO) and Time Charters (BIMCO NYPE 2015)
 */
export const charterParties = sqliteTable("charter_parties", {
  id: text("id").primaryKey(),
  fixtureReference: text("fixture_reference").notNull().unique(), // e.g. "CP-2026-BCN-001"
  charterType: text("charter_type", {
    enum: ["VOYAGE_CHARTER", "TIME_CHARTER", "BAREBOAT_CHARTER"],
  })
    .notNull()
    .default("VOYAGE_CHARTER"),
  contractForm: text("contract_form", {
    enum: [
      "GENCON_2022",
      "GENCON_1994",
      "ASBATANKVO",
      "NYPE_2015",
      "BALTIME_1939",
      "CUSTOM_CHARTER",
    ],
  })
    .notNull()
    .default("GENCON_2022"),

  // Parties
  ownerName: text("owner_name").notNull(),
  chartererName: text("charterer_name").notNull(),
  brokerName: text("broker_name"),

  // Vessel Details
  vesselName: text("vessel_name").notNull(),
  imoNumber: text("imo_number").notNull(),
  flagState: text("flag_state").notNull().default("Malta"),
  builtYear: integer("built_year").default(2020),
  summerDwtMt: real("summer_dwt_mt").default(45000),
  grossTonnage: real("gross_tonnage").default(28000),

  // Commodity / Voyage info
  cargoDescription: text("cargo_description")
    .notNull()
    .default("Trigo a Granel (Bulk Wheat)"),
  cargoQuantityMt: real("cargo_quantity_mt").notNull().default(35000),
  quantityMarginPercentage: real("quantity_margin_percentage")
    .notNull()
    .default(5.0), // MOLOO +/- 5%
  loadingPort: text("loading_port")
    .notNull()
    .default("Puerto de Santander (ESSDR)"),
  dischargingPort: text("discharging_port")
    .notNull()
    .default("Puerto de Alexandria (EGALY)"),
  laycanStart: text("laycan_start").notNull(), // YYYY-MM-DD
  laycanEnd: text("laycan_end").notNull(), // YYYY-MM-DD

  // Commercial Terms & Rates
  freightRateUsdPerMt: real("freight_rate_usd_per_mt").default(32.5), // For Voyage
  dailyHireRateUsd: real("daily_hire_rate_usd").default(18500), // For Time Charter
  demurrageRateUsdPerDay: real("demurrage_rate_usd_per_day")
    .notNull()
    .default(14000),
  despatchRateUsdPerDay: real("despatch_rate_usd_per_day")
    .notNull()
    .default(7000), // Typically 50%
  despatchCalculationBasis: text("despatch_calculation_basis", {
    enum: ["ATS_ALL_TIME_SAVED", "WTS_WORKING_TIME_SAVED"],
  })
    .notNull()
    .default("ATS_ALL_TIME_SAVED"),

  // Laytime Terms & Clauses
  laytimeTerms: text("laytime_terms", {
    enum: ["SHINC", "SHEX_EIU", "SHEX_UU", "FHINC", "FHEX", "CUSTOM"],
  })
    .notNull()
    .default("SHEX_EIU"), // SHEX Even If Used
  laytimeAllowanceType: text("laytime_allowance_type", {
    enum: ["FIXED_TOTAL_HOURS", "LOADING_DISCHARGING_RATES", "TOTAL_DAYS_WWD"],
  })
    .notNull()
    .default("LOADING_DISCHARGING_RATES"),
  totalAllowedLaytimeHours: real("total_allowed_laytime_hours"), // e.g. 120.0 hrs
  loadRateMtPerDay: real("load_rate_mt_per_day").default(5000), // 5,000 MT/WWD
  dischargeRateMtPerDay: real("discharge_rate_mt_per_day").default(3500), // 3,500 MT/WWD
  turnTimeHours: real("turn_time_hours").notNull().default(12.0), // Turn time before laytime starts
  norOfficeHoursOnly: integer("nor_office_hours_only", { mode: "boolean" })
    .notNull()
    .default(true),

  // Maritime NOR Clauses (JSON array of strings e.g. ["WIPON", "WIBON", "WIFPON", "WCCON"])
  norClausesJson: text("nor_clauses_json")
    .notNull()
    .default('["WIPON","WIBON","WIFPON","WCCON"]'),
  laytimeReversibility: text("laytime_reversibility", {
    enum: ["NON_REVERSIBLE", "REVERSIBLE", "AVERAGE_LAYTIME"],
  })
    .notNull()
    .default("NON_REVERSIBLE"),

  // Status & Metadata
  status: text("status", {
    enum: [
      "DRAFT",
      "FIXED_ACTIVE",
      "OPERATIONS_COMPLETED",
      "SETTLED",
      "DISPUTED",
    ],
  })
    .notNull()
    .default("FIXED_ACTIVE"),
  remarks: text("remarks"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Statement of Facts (SOF)
 * Port call log record for loading or discharging operations
 */
export const statementOfFacts = sqliteTable("statement_of_facts", {
  id: text("id").primaryKey(),
  charterPartyId: text("charter_party_id")
    .notNull()
    .references(() => charterParties.id, { onDelete: "cascade" }),
  sofReference: text("sof_reference").notNull().unique(), // e.g. "SOF-2026-SDR-01"
  portOperation: text("port_operation", {
    enum: ["LOADING", "DISCHARGING"],
  })
    .notNull()
    .default("LOADING"),
  portCode: text("port_code").notNull().default("ESSDR"),
  portName: text("port_name").notNull().default("Santander Port"),
  terminalBerth: text("terminal_berth").default("Muelle de Raos 4"),
  vesselAgentName: text("vessel_agent_name").default("Bergé Marítima"),
  masterName: text("master_name").default("Capt. Santiago Aranda"),

  // Operational Milestones
  eospTimestamp: text("eosp_timestamp"), // End of Sea Passage (YYYY-MM-DDTHH:mm:ssZ)
  anchorageDropTimestamp: text("anchorage_drop_timestamp"),
  norTenderedTimestamp: text("nor_tendered_timestamp").notNull(),
  norAcceptedTimestamp: text("nor_accepted_timestamp").notNull(),
  turnTimeExpiryTimestamp: text("turn_time_expiry_timestamp"),
  allFastBerthingTimestamp: text("all_fast_berthing_timestamp"),
  gangwayDownTimestamp: text("gangway_down_timestamp"),
  customsHealthClearedTimestamp: text("customs_health_cleared_timestamp"),
  draftSurveyStartTimestamp: text("draft_survey_start_timestamp"),
  draftSurveyEndTimestamp: text("draft_survey_end_timestamp"),
  commencedOperationsTimestamp: text(
    "commenced_operations_timestamp",
  ).notNull(),
  completedOperationsTimestamp: text(
    "completed_operations_timestamp",
  ).notNull(),
  hosesDisconnectedTimestamp: text("hoses_disconnected_timestamp"),
  vesselSailedTimestamp: text("vessel_sailed_timestamp"),

  actualCargoHandledMt: real("actual_cargo_handled_mt")
    .notNull()
    .default(35000),
  isFinalized: integer("is_finalized", { mode: "boolean" })
    .notNull()
    .default(false),
  agentNotes: text("agent_notes"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * SOF Chronological Events & Laytime Interruptions
 * Detailed events during the port stay (working, rain, breakdowns, holidays)
 */
export const sofEvents = sqliteTable("sof_events", {
  id: text("id").primaryKey(),
  statementOfFactsId: text("statement_of_facts_id")
    .notNull()
    .references(() => statementOfFacts.id, { onDelete: "cascade" }),
  eventStartTimestamp: text("event_start_timestamp").notNull(), // ISO
  eventEndTimestamp: text("event_end_timestamp").notNull(), // ISO
  durationMinutes: integer("duration_minutes").notNull(),

  eventType: text("eventType", {
    enum: [
      "WORKING_OPERATIONS",
      "RAIN_STOPPAGE",
      "STRONG_WINDS_STORM_WWD",
      "VESSEL_CRANE_BREAKDOWN",
      "SHORE_EQUIPMENT_BREAKDOWN",
      "SUNDAY_SHEX_EXCLUDED",
      "HOLIDAY_SHEX_EXCLUDED",
      "BERTHING_SHIFTING_TRANSIT",
      "CREW_STRIKE_FORCE_MAJEURE",
      "DRAFT_SURVEY_INSPECTION",
      "WAITING_FOR_CARGO_CHARTERER",
      "OTHER_INTERRUPTION",
    ],
  })
    .notNull()
    .default("WORKING_OPERATIONS"),

  laytimeCountingPercentage: real("laytime_counting_percentage")
    .notNull()
    .default(100.0), // 100%, 50%, or 0%
  isCountedAgainstLaytime: integer("is_counted_against_laytime", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  affectedHatchesOrCranes: text("affected_hatches_or_cranes").default(
    "Hold 1-4 / Shore Crane 2",
  ),
  interruptionReason: text("interruption_reason"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Laytime Calculations & Demurrage / Despatch Settlements
 * Mathematical comparison between Allowed Laytime and Used Laytime
 */
export const laytimeCalculations = sqliteTable("laytime_calculations", {
  id: text("id").primaryKey(),
  charterPartyId: text("charter_party_id")
    .notNull()
    .references(() => charterParties.id, { onDelete: "cascade" }),
  statementOfFactsId: text("statement_of_facts_id")
    .notNull()
    .references(() => statementOfFacts.id, { onDelete: "cascade" }),
  calculationReference: text("calculation_reference").notNull().unique(), // e.g. "LAY-2026-001"
  portOperation: text("port_operation", {
    enum: ["LOADING", "DISCHARGING", "COMBINED_REVERSIBLE"],
  })
    .notNull()
    .default("LOADING"),

  // Time Allowed & Used (stored in seconds and decimal days)
  laytimeCommencedTimestamp: text("laytime_commenced_timestamp").notNull(),
  laytimeCeasedTimestamp: text("laytime_ceased_timestamp").notNull(),
  allowedLaytimeSeconds: integer("allowed_laytime_seconds").notNull(),
  allowedLaytimeFormatted: text("allowed_laytime_formatted").notNull(), // e.g. "7d 00h 00m"

  grossTimeUsedSeconds: integer("gross_time_used_seconds").notNull(),
  deductionsSeconds: integer("deductions_seconds").notNull(),
  netLaytimeUsedSeconds: integer("net_laytime_used_seconds").notNull(),
  netLaytimeUsedFormatted: text("net_laytime_used_formatted").notNull(), // e.g. "8d 14h 30m"

  // Settlement Result
  timeDifferenceSeconds: integer("time_difference_seconds").notNull(), // Positive = Demurrage, Negative = Despatch
  isDemurrage: integer("is_demurrage", { mode: "boolean" }).notNull(),
  demurrageDaysDecimal: real("demurrage_days_decimal").notNull().default(0),
  despatchDaysDecimal: real("despatch_days_decimal").notNull().default(0),

  demurrageRatePerDayUsd: real("demurrage_rate_per_day_usd").notNull(),
  despatchRatePerDayUsd: real("despatch_rate_per_day_usd").notNull(),

  totalDemurrageAmountUsd: real("total_demurrage_amount_usd")
    .notNull()
    .default(0),
  totalDespatchAmountUsd: real("total_despatch_amount_usd")
    .notNull()
    .default(0),
  netFinancialPayableUsd: real("net_financial_payable_usd")
    .notNull()
    .default(0), // Who pays who

  calculationMethod: text("calculation_method", {
    enum: ["ATS_ALL_TIME_SAVED", "WTS_WORKING_TIME_SAVED"],
  })
    .notNull()
    .default("ATS_ALL_TIME_SAVED"),

  settlementStatus: text("settlement_status", {
    enum: [
      "PENDING_AUDIT",
      "CLAIM_SUBMITTED",
      "AGREED_OWNER_CHARTERER",
      "INVOICED_SETTLED",
      "IN_DISPUTE",
    ],
  })
    .notNull()
    .default("PENDING_AUDIT"),

  auditorNotes: text("auditor_notes"),
  calculatedAt: text("calculated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Time Charter Off-Hire & Hire Adjustments
 * Tracks breakdown periods, bunker offsets and hire credit balances (NYPE 2015)
 */
export const timeCharterOffHires = sqliteTable("time_charter_off_hires", {
  id: text("id").primaryKey(),
  charterPartyId: text("charter_party_id")
    .notNull()
    .references(() => charterParties.id, { onDelete: "cascade" }),
  offHireReference: text("off_hire_reference").notNull().unique(), // e.g. "OFF-2026-001"

  offHireReason: text("off_hire_reason", {
    enum: [
      "MAIN_ENGINE_BREAKDOWN",
      "DRYDOCK_MAINTENANCE",
      "CREW_STRIKE_DEFICIENCY",
      "EMERGENCY_MEDICAL_DEVIATION",
      "PORT_STATE_CONTROL_DETENTION",
      "GROUNDING_COLLISION",
      "CARGO_GEAR_CRANE_FAILURE",
      "OTHER_OFF_HIRE",
    ],
  })
    .notNull()
    .default("MAIN_ENGINE_BREAKDOWN"),

  offHireStartTimestamp: text("off_hire_start_timestamp").notNull(), // ISO
  offHireEndTimestamp: text("off_hire_end_timestamp").notNull(), // ISO
  durationHours: real("duration_hours").notNull(),
  durationDaysDecimal: real("duration_days_decimal").notNull(),

  dailyHireRateUsd: real("daily_hire_rate_usd").notNull(),
  hireDeductionUsd: real("hire_deduction_usd").notNull(), // Days * Daily Hire

  bunkerVlsfoConsumedMt: real("bunker_vlsfo_consumed_mt").default(0),
  bunkerMgoConsumedMt: real("bunker_mgo_consumed_mt").default(0),
  vlsfoPriceUsdPerMt: real("vlsfo_price_usd_per_mt").default(580),
  mgoPriceUsdPerMt: real("mgo_price_usd_per_mt").default(750),
  bunkerCompensationUsd: real("bunker_compensation_usd").notNull().default(0),

  totalOffHireClaimUsd: real("total_off_hire_claim_usd").notNull(), // Hire + Bunker
  offHireStatus: text("off_hire_status", {
    enum: ["LOGGED", "AGREED_OWNER", "DEDUCTED_FROM_HIRE", "DISPUTED"],
  })
    .notNull()
    .default("LOGGED"),

  incidentDescription: text("incident_description"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});
