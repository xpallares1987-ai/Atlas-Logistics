import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

/**
 * Pólizas Marco / Flotantes de Seguro de Transporte (Open Cover / Floating Policies)
 */
export const insuranceOpenPolicies = sqliteTable("insurance_open_policies", {
  id: text("id").primaryKey(),
  policyNumber: text("policy_number").notNull().unique(),
  insurerName: text("insurer_name").notNull(),
  brokerName: text("broker_name").notNull(),
  policyHolderName: text("policy_holder_name").notNull(),
  policyHolderTaxId: text("policy_holder_tax_id").notNull(),
  currency: text("currency").notNull().default("EUR"), // EUR, USD, GBP
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  conveyanceLimitAmount: real("conveyance_limit_amount")
    .notNull()
    .default(1000000.0), // Max limit per vessel/truck
  annualEstimatedTurnover: real("annual_estimated_turnover")
    .notNull()
    .default(10000000.0),
  baseRatePercentage: real("base_rate_percentage").notNull().default(0.2), // 0.20%
  warStrikeRatePercentage: real("war_strike_rate_percentage")
    .notNull()
    .default(0.04), // 0.04%
  defaultDeductibleAmount: real("default_deductible_amount")
    .notNull()
    .default(500.0),
  deductibleType: text("deductible_type").notNull().default("FIXED_AMOUNT"), // FIXED_AMOUNT, PERCENTAGE_OF_SUM
  minPremiumPerShipment: real("min_premium_per_shipment")
    .notNull()
    .default(50.0),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, SUSPENDED, EXPIRED
  termsAndConditionsText: text("terms_and_conditions_text"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

/**
 * Certificados Individuales de Seguro de Transporte de Mercancías (UCP 600 Art. 28)
 */
export const insuranceCertificates = sqliteTable("insurance_certificates", {
  id: text("id").primaryKey(),
  openPolicyId: text("open_policy_id").references(
    () => insuranceOpenPolicies.id,
  ),
  certificateNumber: text("certificate_number").notNull().unique(),
  shipmentReference: text("shipment_reference").notNull(),
  transportMode: text("transport_mode").notNull().default("MARITIME_OCEAN"), // MARITIME_OCEAN, AIR_CARGO, ROAD_FREIGHT, RAIL_FREIGHT, MULTIMODAL
  carrierName: text("carrier_name").notNull(),
  vesselOrFlightOrVehiclePlate: text(
    "vessel_or_flight_or_vehicle_plate",
  ).notNull(),
  voyageNumber: text("voyage_number"),
  originPortOrCountry: text("origin_port_or_country").notNull(),
  destinationPortOrCountry: text("destination_port_or_country").notNull(),
  departureDate: text("departure_date").notNull(),
  estimatedArrivalDate: text("estimated_arrival_date"),

  // Partes Aseguradas & Comisario de Averías
  insuredPartyName: text("insured_party_name").notNull(),
  insuredPartyAddress: text("insured_party_address").notNull(),
  consigneeOrToOrderName: text("consignee_or_to_order_name").notNull(),
  claimSurveyAgentNameAddress: text(
    "claim_survey_agent_name_address",
  ).notNull(),
  claimPayableAtCity: text("claim_payable_at_city").notNull().default("Madrid"),

  // Valores Económicos & Suma Asegurada (110% CIF)
  goodsDescription: text("goods_description").notNull(),
  packageCount: integer("package_count").notNull().default(1),
  grossWeightKg: real("gross_weight_kg").notNull(),
  commercialInvoiceValue: real("commercial_invoice_value").notNull(),
  commercialCurrency: text("commercial_currency").notNull().default("EUR"),
  freightAmount: real("freight_amount").notNull().default(0.0),
  estimatedInsuranceAmount: real("estimated_insurance_amount")
    .notNull()
    .default(0.0),
  markupPercentage: real("markup_percentage").notNull().default(10.0), // 10% under UCP 600 / Incoterms CIF
  totalInsuredValue: real("total_insured_value").notNull(), // 110% CIF sum

  // Cláusulas LMA/IUA & Coberturas
  coverageClause: text("coverage_clause")
    .notNull()
    .default("ICC_A_ALL_RISKS_2009"), // ICC_A_ALL_RISKS_2009, ICC_B_MAJOR_PERILS_2009, ICC_C_BASIC_PERILS_2009, ICC_AIR_ALL_RISKS
  hasWarStrikesCover: integer("has_war_strikes_cover", { mode: "boolean" })
    .notNull()
    .default(true),
  hasCyberExclusionCl380: integer("has_cyber_exclusion_cl380", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  hasSanctionsClauseJc2010: integer("has_sanctions_clause_jc2010", {
    mode: "boolean",
  })
    .notNull()
    .default(true),

  // Liquidación de Primas & Cargas Fiscales
  appliedRatePercentage: real("applied_rate_percentage")
    .notNull()
    .default(0.24), // Base + War
  netPremiumAmount: real("net_premium_amount").notNull(),
  ipsTaxPercentage: real("ips_tax_percentage").notNull().default(6.0), // 6% Impuesto sobre Primas de Seguros
  ccsConsorcioSurchargePercentage: real("ccs_consorcio_surcharge_percentage")
    .notNull()
    .default(0.005), // Consorcio
  grossPremiumPayable: real("gross_premium_payable").notNull(),
  deductibleAmount: real("deductible_amount").notNull().default(500.0),

  issueDate: text("issue_date").notNull(),
  status: text("status").notNull().default("ISSUED_CERTIFIED"), // DRAFT, ISSUED_CERTIFIED, CLAIM_REPORTED, CANCELLED
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

/**
 * Bordereaux Mensuales de Declaración de Expediciones de Seguros
 */
export const insuranceBordereaux = sqliteTable("insurance_bordereaux", {
  id: text("id").primaryKey(),
  openPolicyId: text("open_policy_id")
    .notNull()
    .references(() => insuranceOpenPolicies.id),
  bordereauReference: text("bordereau_reference").notNull().unique(),
  periodMonthYear: text("period_month_year").notNull(), // '2026-08'
  declarationCount: integer("declaration_count").notNull().default(0),
  totalInsuredTurnoverAmount: real("total_insured_turnover_amount")
    .notNull()
    .default(0.0),
  totalNetPremiumAmount: real("total_net_premium_amount")
    .notNull()
    .default(0.0),
  totalIpsTaxAmount: real("total_ips_tax_amount").notNull().default(0.0),
  totalCcsSurchargeAmount: real("total_ccs_surcharge_amount")
    .notNull()
    .default(0.0),
  totalGrossPremiumPayable: real("total_gross_premium_payable")
    .notNull()
    .default(0.0),
  submissionDate: text("submission_date").notNull(),
  status: text("status").notNull().default("DECLARED_TO_INSURER"), // DRAFT, DECLARED_TO_INSURER, INVOICED_SETTLED
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

/**
 * Líneas Individuales de Expedición Declaradas en el Bordereau
 */
export const insuranceBordereauLines = sqliteTable(
  "insurance_bordereau_lines",
  {
    id: text("id").primaryKey(),
    bordereauId: text("bordereau_id")
      .notNull()
      .references(() => insuranceBordereaux.id),
    certificateId: text("certificate_id")
      .notNull()
      .references(() => insuranceCertificates.id),
    shipmentReference: text("shipment_reference").notNull(),
    destination: text("destination").notNull(),
    insuredValue: real("insured_value").notNull(),
    netPremium: real("net_premium").notNull(),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
);

/**
 * Liquidaciones Periciales de Siniestros & Franquicias de Seguro de Transporte
 */
export const insuranceClaimsSettlements = sqliteTable(
  "insurance_claims_settlements",
  {
    id: text("id").primaryKey(),
    certificateId: text("certificate_id")
      .notNull()
      .references(() => insuranceCertificates.id),
    claimReference: text("claim_reference").notNull().unique(),
    casualtyDate: text("casualty_date").notNull(),
    casualtyLocation: text("casualty_location").notNull(),
    perilType: text("peril_type").notNull().default("WATER_DAMAGE_SEAWATER"), // FIRE_EXPLOSION, SINKING_GROUNDING, WATER_DAMAGE_SEAWATER, CARGO_THEFT_PILFERAGE, ROUGH_HANDLING_BREAKAGE, TEMPERATURE_EXCURSION, GENERAL_AVERAGE_CONTRIBUTION
    soundMarketValueAtDestination: real(
      "sound_market_value_at_destination",
    ).notNull(),
    damagedSalvageValueAtDestination: real(
      "damaged_salvage_value_at_destination",
    )
      .notNull()
      .default(0.0),
    depreciationPercentage: real("depreciation_percentage").notNull(), // ((Sound - Salvage)/Sound)*100
    grossClaimAssessmentAmount: real("gross_claim_assessment_amount").notNull(),
    deductibleAppliedAmount: real("deductible_applied_amount").notNull(),
    netIndemnityPayableAmount: real("net_indemnity_payable_amount").notNull(),
    surveyReportReference: text("survey_report_reference").notNull(),
    adjusterName: text("adjuster_name").notNull(),
    settlementStatus: text("settlement_status")
      .notNull()
      .default("ADJUSTED_APPROVED"), // PENDING_SURVEY, ADJUSTED_APPROVED, INDEMNITY_PAID, REJECTED
    settlementNotes: text("settlement_notes"),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
);
