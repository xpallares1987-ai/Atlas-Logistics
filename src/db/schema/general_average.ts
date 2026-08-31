import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * 1. Expedientes de Siniestro y Declaración de Avería Gruesa
 * Siniestros mayores (incendio a bordo, varada, avería de máquinas con remolque, echazón)
 * Reglas de York y Amberes (YAR 2016 / 1994) y Contratos de Salvamento LOF 2024 / SCOPIC.
 */
export const gaCases = sqliteTable("ga_cases", {
  id: text("id").primaryKey(), // 'ga_case_2026_01'
  caseReference: text("case_reference").notNull().unique(), // 'GA-2026-VAL-0012'
  vesselName: text("vessel_name").notNull(), // 'MV Valencia Bridge'
  imoNumber: text("imo_number").notNull(), // '9751024'
  flagState: text("flag_state").notNull(), // 'Liberia'
  builtYear: integer("built_year").notNull(), // 2020
  grossTonnage: integer("gross_tonnage").notNull(), // 68000
  summerDwtMt: real("summer_dwt_mt").notNull(), // 75000.0
  shipownerName: text("shipowner_name").notNull(), // 'Mediterranean Shipping Carriers SA'
  disponentOwnerOrCharterer: text("disponent_owner_or_charterer"), // 'Atlantic Feeder Lines Ltd'
  masterName: text("master_name").notNull(), // 'Capt. Rodrigo Alarcón'
  casualtyType: text("casualty_type", {
    enum: [
      "FIRE_EXPLOSION",
      "GROUNDING_REFLOATING",
      "ENGINE_BREAKDOWN_HEAVY_WEATHER",
      "JETTISON_COMMON_SAFETY",
      "COLLISION_INGRESS_WATER",
    ],
  }).notNull(),
  casualtyDate: text("casualty_date").notNull(), // '2026-08-10'
  casualtyLocation: text("casualty_location").notNull(), // 'Golfo de León (42° 15\' N, 004° 20\' E)'
  voyageOrigin: text("voyage_origin").notNull(), // 'Puerto de Valencia (ESVLC)'
  voyageDestination: text("voyage_destination").notNull(), // 'Puerto de Génova (ITGOA)'
  portOfRefuge: text("port_of_refuge").notNull(), // 'Puerto de Marsella (FRMRS)'
  dateArrivalPortOfRefuge: text("date_arrival_port_of_refuge"), // '2026-08-12'
  dateDeparturePortOfRefuge: text("date_departure_port_of_refuge"), // '2026-08-26'
  governingRules: text("governing_rules", {
    enum: ["YAR_2016", "YAR_1994", "YAR_1974"],
  })
    .notNull()
    .default("YAR_2016"),
  salvageContractType: text("salvage_contract_type", {
    enum: [
      "LOF_2024_SCOPIC",
      "LOF_2020",
      "TOWCON_BIMCO",
      "COMMERCIAL_TOWAGE",
      "NONE",
    ],
  })
    .notNull()
    .default("LOF_2024_SCOPIC"),
  salvorName: text("salvor_name"), // 'Smit Salvage BV / Boluda Towage'
  averageAdjusterFirm: text("average_adjuster_firm").notNull(), // 'Richards Hogg Lindley (RHL)'
  leadAdjusterName: text("lead_adjuster_name").notNull(), // 'Senior Adjuster David Sterling'
  estimatedLossUsd: real("estimated_loss_usd").notNull().default(0), // 1850000.0
  estimatedContributionPercentage: real("estimated_contribution_percentage")
    .notNull()
    .default(7.5), // 7.5%
  declarationNarrative: text("declaration_narrative").notNull(), // Relato de la protesta de mar y formalización
  currencyCode: text("currency_code").notNull().default("USD"),
  status: text("status", {
    enum: [
      "DECLARED_ACTIVE",
      "SECURITY_COLLECTION",
      "ADJUSTMENT_IN_PROGRESS",
      "FINAL_SETTLEMENT",
      "CLOSED",
    ],
  })
    .notNull()
    .default("DECLARED_ACTIVE"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/**
 * 2. Masa Activa Admisible (General Average Allowances)
 * Sacrificios de buque, sacrificios de carga (echazón, extinción), gastos de puerto de refugio,
 * comisión estatutaria del 2.5% (Regla XX) e intereses CMI (Regla XXI).
 */
export const gaAllowances = sqliteTable("ga_allowances", {
  id: text("id").primaryKey(), // 'ga_all_01'
  gaCaseId: text("ga_case_id")
    .notNull()
    .references(() => gaCases.id, { onDelete: "cascade" }),
  allowanceCategory: text("allowance_category", {
    enum: [
      "SHIP_SACRIFICE",
      "CARGO_SACRIFICE_JETTISON",
      "CARGO_SACRIFICE_EXTINGUISHMENT",
      "REFUGE_PORT_DISBURSEMENTS",
      "REFUGE_CREW_MAINTENANCE_FUEL",
      "TEMPORARY_REPAIRS",
      "SALVAGE_AWARD_LOF",
      "COMMISSION_FUNDS_RULE_XX",
      "CMI_INTEREST_RULE_XXI",
      "ADJUSTERS_FEES_EXPENSES",
    ],
  }).notNull(),
  yarRuleReference: text("yar_rule_reference", {
    enum: [
      "RULE_I_JETTISON",
      "RULE_II_DAMAGE_JETTISON",
      "RULE_III_EXTINGUISHING_FIRE",
      "RULE_VII_MACHINERY_DAMAGE",
      "RULE_VIII_LIGHTENING_EXPENSES",
      "RULE_X_PORT_OF_REFUGE",
      "RULE_XI_CREW_WAGES_FUEL",
      "RULE_XIV_TEMPORARY_REPAIRS",
      "RULE_XX_COMMISSION_2_5_PCT",
      "RULE_XXI_CMI_INTEREST",
      "RULE_PARAMOUNT_GENERAL",
    ],
  }).notNull(),
  description: text("description").notNull(),
  creditedPartyType: text("credited_party_type", {
    enum: [
      "SHIPOWNER",
      "CARGO_OWNER",
      "SALVOR",
      "TIME_CHARTERER",
      "AVERAGE_ADJUSTER",
    ],
  }).notNull(),
  creditedPartyName: text("credited_party_name").notNull(),
  originalCurrencyAmount: real("original_currency_amount").notNull(),
  originalCurrency: text("original_currency").notNull().default("USD"),
  exchangeRateToUsd: real("exchange_rate_to_usd").notNull().default(1.0),
  amountUsd: real("amount_usd").notNull(),
  isAdmissible: integer("is_admissible", { mode: "boolean" })
    .notNull()
    .default(true),
  remarks: text("remarks"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/**
 * 3. Masa Pasiva Contributoria & Intereses Contribuyentes
 * Tasación de valores salvados al término del viaje: Buque en estado averiado,
 * Flete al cobro pendiente de cobro, Carga valor comercial CIF en destino, Contenedores.
 */
export const gaContributoryInterests = sqliteTable(
  "ga_contributory_interests",
  {
    id: text("id").primaryKey(), // 'ga_ci_01'
    gaCaseId: text("ga_case_id")
      .notNull()
      .references(() => gaCases.id, { onDelete: "cascade" }),
    interestCategory: text("interest_category", {
      enum: ["VESSEL", "FREIGHT_AT_RISK", "CARGO", "CONTAINERS_EQUIPMENT"],
    }).notNull(),
    blReference: text("bl_reference"), // 'MSCU-VAL-GEN-90812'
    containerNumber: text("container_number"), // 'MSKU-481920-4'
    ownerOrReceiverName: text("owner_or_receiver_name").notNull(), // 'Iberica Chem Trading SL'
    cargoDescription: text("cargo_description"), // 'Resinas de Polipropileno en Pellets'
    weightOrTeu: real("weight_or_teu"), // 24.5 MT o 1 TEU
    soundValueDestinationUsd: real("sound_value_destination_usd").notNull(), // Valor sano en destino
    particularDamageDeductionUsd: real("particular_damage_deduction_usd")
      .notNull()
      .default(0), // Deducción avería particular
    madeGoodAllowanceUsd: real("made_good_allowance_usd").notNull().default(0), // Suma acreditada en avería gruesa
    contributoryValueUsd: real("contributory_value_usd").notNull(), // Sound - ParticularDamage + MadeGood
    calculatedContributionUsd: real("calculated_contribution_usd")
      .notNull()
      .default(0), // ContributoryValue * Rate%
    netFinancialBalanceUsd: real("net_financial_balance_usd")
      .notNull()
      .default(0), // Contribution - MadeGood
    balanceType: text("balance_type", {
      enum: ["PAYABLE_DEBTOR", "RECEIVABLE_CREDITOR", "BALANCED"],
    })
      .notNull()
      .default("PAYABLE_DEBTOR"),
    hasSecurityProvided: integer("has_security_provided", { mode: "boolean" })
      .notNull()
      .default(false),
    cargoReleaseAuthorized: integer("cargo_release_authorized", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
);

/**
 * 4. Garantías de Avería Gruesa & Fianza de Liberación de Carga
 * Lloyd's Average Bond (LAB 77), Garantía de Asegurador de Transportes (Average Guarantee),
 * y Depósitos en Efectivo con emisión de recibo oficial fiduciario (Regla XXII YAR).
 */
export const gaSecurities = sqliteTable("ga_securities", {
  id: text("id").primaryKey(), // 'ga_sec_01'
  gaCaseId: text("ga_case_id")
    .notNull()
    .references(() => gaCases.id, { onDelete: "cascade" }),
  contributoryInterestId: text("contributory_interest_id")
    .notNull()
    .references(() => gaContributoryInterests.id, { onDelete: "cascade" }),
  securityReference: text("security_reference").notNull().unique(), // 'SEC-2026-VAL-001'
  securityType: text("security_type", {
    enum: [
      "AVERAGE_BOND_AND_GUARANTEE",
      "CASH_DEPOSIT",
      "UNDERWRITER_GUARANTEE_ONLY",
      "INSURER_DIRECT_UNDERTAKING",
    ],
  })
    .notNull()
    .default("AVERAGE_BOND_AND_GUARANTEE"),
  cargoConsigneeName: text("cargo_consignee_name").notNull(),
  cargoConsigneeVat: text("cargo_consignee_vat"),
  insurerName: text("insurer_name"), // 'Mapfre Global Risks SA / Allianz Marine'
  insurerPolicyNumber: text("insurer_policy_number"), // 'POL-MAR-2026-89410'
  insurerContactEmail: text("insurer_contact_email"),
  securityAmountUsd: real("security_amount_usd").notNull(), // Importe garantizado o depositado
  depositBankName: text("deposit_bank_name"), // 'Banco Santander (Joint Trust Account)'
  depositBankAccountNumber: text("deposit_bank_account_number"),
  cashDepositReceiptNumber: text("cash_deposit_receipt_number"),
  averageBondSigned: integer("average_bond_signed", { mode: "boolean" })
    .notNull()
    .default(false),
  averageBondSignDate: text("average_bond_sign_date"),
  averageGuaranteeSigned: integer("average_guarantee_signed", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  averageGuaranteeSignDate: text("average_guarantee_sign_date"),
  cargoReleaseAuthorized: integer("cargo_release_authorized", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  releaseAuthorizedBy: text("release_authorized_by"), // 'David Sterling (Average Adjuster)'
  releaseTimestamp: text("release_timestamp"),
  status: text("status", {
    enum: [
      "SECURITY_PENDING",
      "SECURITY_VALIDATED",
      "CARGO_RELEASED",
      "CASH_DEPOSIT_REFUNDED",
      "REJECTED_DISPUTED",
    ],
  })
    .notNull()
    .default("SECURITY_PENDING"),
  remarks: text("remarks"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/**
 * 5. Liquidaciones Finales y Dictamen del Liquidador (GA Adjustments)
 * Dictamen formal del Average Adjuster con certificación de masa activa,
 * masa pasiva, tasa de contribución final y aprobación del CMI.
 */
export const gaAdjustments = sqliteTable("ga_adjustments", {
  id: text("id").primaryKey(), // 'ga_adj_01'
  gaCaseId: text("ga_case_id")
    .notNull()
    .references(() => gaCases.id, { onDelete: "cascade" }),
  adjustmentReference: text("adjustment_reference").notNull().unique(), // 'ADJ-2026-VAL-01'
  adjustmentDate: text("adjustment_date").notNull(), // '2026-08-30'
  totalAllowancesUsd: real("total_allowances_usd").notNull(), // Total Masa Activa Admisible
  totalShipAllowancesUsd: real("total_ship_allowances_usd")
    .notNull()
    .default(0),
  totalCargoAllowancesUsd: real("total_cargo_allowances_usd")
    .notNull()
    .default(0),
  totalRefugeExpensesUsd: real("total_refuge_expenses_usd")
    .notNull()
    .default(0),
  totalSalvageAwardUsd: real("total_salvage_award_usd").notNull().default(0),
  totalCommissionUsd: real("total_commission_usd").notNull().default(0), // 2.5% Rule XX
  cmiInterestRatePercentage: real("cmi_interest_rate_percentage")
    .notNull()
    .default(6.0), // 6.0% Rule XXI
  totalCmiInterestUsd: real("total_cmi_interest_usd").notNull().default(0),
  totalContributoryValueUsd: real("total_contributory_value_usd").notNull(), // Total Masa Pasiva
  vesselContributoryValueUsd: real("vessel_contributory_value_usd")
    .notNull()
    .default(0),
  freightContributoryValueUsd: real("freight_contributory_value_usd")
    .notNull()
    .default(0),
  cargoContributoryValueUsd: real("cargo_contributory_value_usd")
    .notNull()
    .default(0),
  containersContributoryValueUsd: real("containers_contributory_value_usd")
    .notNull()
    .default(0),
  finalRateOfContributionPercentage: real(
    "final_rate_of_contribution_percentage",
  ).notNull(), // (Allowances / Contributory) * 100
  totalDebtorContributionsUsd: real("total_debtor_contributions_usd")
    .notNull()
    .default(0),
  totalCreditorRecoveriesUsd: real("total_creditor_recoveries_usd")
    .notNull()
    .default(0),
  adjusterCertificationStatement: text(
    "adjuster_certification_statement",
  ).notNull(),
  status: text("status", {
    enum: [
      "DRAFT",
      "CERTIFIED_BY_ADJUSTER",
      "APPROVED_BY_COMMITTEE",
      "SETTLED_FINAL",
    ],
  })
    .notNull()
    .default("DRAFT"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
