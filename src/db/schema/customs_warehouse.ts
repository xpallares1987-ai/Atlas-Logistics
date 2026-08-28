import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// 1. Instalaciones de Almacenamiento Aduanero Autorizadas
export const customsFacilities = sqliteTable("customs_facilities", {
  id: text("id").primaryKey(),
  facilityCode: text("facility_code").notNull().unique(), // ej. ES-DA-08001-ZAL
  name: text("name").notNull(),
  facilityType: text("facility_type", {
    enum: [
      "CUSTOMS_WAREHOUSE_DA",
      "NON_CUSTOMS_WAREHOUSE_DDA",
      "TEMPORARY_STORAGE_ADT",
      "FREE_ZONE_ZF",
    ],
  }).notNull(),
  customsAuthorityAuthorizationRef: text(
    "customs_authority_authorization_ref",
  ).notNull(), // ej. ES-AET-2024-DA-4910
  managingOperatorName: text("managing_operator_name").notNull(),
  locationAddress: text("location_address").notNull(),
  city: text("city").notNull(),
  countryCode: text("country_code").notNull().default("ES"),
  totalPalletCapacity: integer("total_pallet_capacity").notNull(),
  occupiedPallets: integer("occupied_pallets").notNull().default(0),
  totalVolumeM3: real("total_volume_m3").notNull(),
  maxStayDaysLimit: integer("max_stay_days_limit"), // null para DA/ZF, 90 para ADT
  isReeferCertified: integer("is_reefer_certified", { mode: "boolean" })
    .notNull()
    .default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 2. Avales y Garantías Aduaneras Globales ante la AEAT
export const customsGuarantees = sqliteTable("customs_guarantees", {
  id: text("id").primaryKey(),
  guaranteeReferenceNumber: text("guarantee_reference_number")
    .notNull()
    .unique(), // ej. GRN-2026-AEAT-00918
  customsOfficeCode: text("customs_office_code").notNull(), // ej. ES000801
  guarantorFinancialInstitution: text(
    "guarantor_financial_institution",
  ).notNull(), // ej. Banco Santander S.A.
  totalGuaranteeAmountEur: real("total_guarantee_amount_eur").notNull(), // ej. 1500000.00
  committedSuspendedDebtEur: real("committed_suspended_debt_eur")
    .notNull()
    .default(0.0),
  availableCreditEur: real("available_credit_eur").notNull(),
  validFromDate: text("valid_from_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  status: text("status", {
    enum: ["ACTIVE", "DEPLETED", "EXPIRED", "UNDER_REVIEW"],
  })
    .notNull()
    .default("ACTIVE"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 3. Lotes y Partidas de Mercancía Bajo Régimen Aduanero
export const customsInventoryLots = sqliteTable("customs_inventory_lots", {
  id: text("id").primaryKey(),
  lotNumber: text("lot_number").notNull().unique(), // ej. LOT-2026-DA-08101
  facilityId: text("facility_id")
    .notNull()
    .references(() => customsFacilities.id),
  guaranteeId: text("guarantee_id").references(() => customsGuarantees.id),
  inclusionDvdNumber: text("inclusion_dvd_number").notNull(), // ej. DVD-2026-7100-00412
  inclusionDuaMrn: text("inclusion_dua_mrn"), // ej. 26ES00080100412891
  customsRegimeCode: text("customs_regime_code", {
    enum: ["7100", "7600", "5100", "ADT_STAY", "FREE_ZONE_ENTRY"],
  }).notNull(), // 7100 = DA, 7600 = DDA, 5100 = Perfeccionamiento Activo
  ownerCompanyName: text("owner_company_name").notNull(),
  ownerTaxIdEori: text("owner_tax_id_eori").notNull(),
  taricCommodityCode: text("taric_commodity_code").notNull(), // ej. 8542319000
  goodsDescription: text("goods_description").notNull(),
  originCountryCode: text("origin_country_code").notNull(),
  initialPackageCount: integer("initial_package_count").notNull(),
  currentPackageCount: integer("current_package_count").notNull(),
  initialGrossMassKg: real("initial_gross_mass_kg").notNull(),
  currentGrossMassKg: real("current_gross_mass_kg").notNull(),
  initialNetMassKg: real("initial_net_mass_kg").notNull(),
  currentNetMassKg: real("current_net_mass_kg").notNull(),
  customsValueEur: real("customs_value_eur").notNull(),
  dutyTariffRatePercent: real("duty_tariff_rate_percent")
    .notNull()
    .default(0.0),
  importVatRatePercent: real("import_vat_rate_percent").notNull().default(21.0),
  suspendedDutyAmountEur: real("suspended_duty_amount_eur")
    .notNull()
    .default(0.0),
  suspendedVatAmountEur: real("suspended_vat_amount_eur")
    .notNull()
    .default(0.0),
  totalSuspendedDebtEur: real("total_suspended_debt_eur")
    .notNull()
    .default(0.0),
  inclusionDate: text("inclusion_date").notNull(),
  maxStayDeadlineDate: text("max_stay_deadline_date"), // fecha límite (90 días para ADT)
  status: text("status", {
    enum: [
      "ACTIVE",
      "PARTIALLY_DISCHARGED",
      "CLOSED_DISCHARGED",
      "EXPIRED_ALERT",
      "CONFISCATED_UNDER_SEAL",
    ],
  })
    .notNull()
    .default("ACTIVE"),
  warehouseLocationRack: text("warehouse_location_rack"),
  responsibleCustomsAgent: text("responsible_customs_agent").notNull(),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 4. Libro Oficial de Registro Contable de Existencias (AEAT / CAU)
export const customsStockLedgerEntries = sqliteTable(
  "customs_stock_ledger_entries",
  {
    id: text("id").primaryKey(),
    entrySequentialNumber: integer("entry_sequential_number").notNull(), // nº asiento correlativo
    lotId: text("lot_id")
      .notNull()
      .references(() => customsInventoryLots.id),
    facilityId: text("facility_id")
      .notNull()
      .references(() => customsFacilities.id),
    movementType: text("movement_type", {
      enum: [
        "INCLUSION_BONDING",
        "USUAL_HANDLING_ART220",
        "PARTIAL_DISCHARGE",
        "FULL_DISCHARGE",
        "TRANSFER_BETWEEN_WAREHOUSES",
        "AUDIT_ADJUSTMENT",
      ],
    }).notNull(),
    documentReference: text("document_reference").notNull(), // DUA, DVD, Factura
    packagesDelta: integer("packages_delta").notNull(), // + o -
    packagesBalanceAfter: integer("packages_balance_after").notNull(),
    grossMassDeltaKg: real("gross_mass_delta_kg").notNull(),
    grossMassBalanceAfterKg: real("gross_mass_balance_after_kg").notNull(),
    releasedSuspendedDebtEur: real("released_suspended_debt_eur")
      .notNull()
      .default(0.0),
    movementTimestamp: text("movement_timestamp").notNull(),
    authorizedOfficerOrAgent: text("authorized_officer_or_agent").notNull(),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
  },
);

// 5. Declaraciones de Desvinculación y Salida de Depósito
export const customsDischargeDeclarations = sqliteTable(
  "customs_discharge_declarations",
  {
    id: text("id").primaryKey(),
    dischargeDeclarationNumber: text("discharge_declaration_number")
      .notNull()
      .unique(), // ej. DVD-OUT-2026-00301
    lotId: text("lot_id")
      .notNull()
      .references(() => customsInventoryLots.id),
    dischargeRegimeCode: text("discharge_regime_code", {
      enum: ["4071", "3171", "7171", "5171", "DOMESTIC_COMMERCE_DDA"],
    }).notNull(), // 4071 = Despacho a Libre Práctica, 3171 = Reexportación Tercer País
    dischargeDuaMrn: text("discharge_dua_mrn"),
    dischargedPackagesCount: integer("discharged_packages_count").notNull(),
    dischargedGrossMassKg: real("discharged_gross_mass_kg").notNull(),
    dischargedCustomsValueEur: real("discharged_customs_value_eur").notNull(),
    settledDutyAmountEur: real("settled_duty_amount_eur")
      .notNull()
      .default(0.0),
    settledVatAmountEur: real("settled_vat_amount_eur").notNull().default(0.0),
    totalSettledTaxesEur: real("total_settled_taxes_eur")
      .notNull()
      .default(0.0),
    releasedGuaranteeCreditEur: real("released_guarantee_credit_eur")
      .notNull()
      .default(0.0),
    destinationConsigneeName: text("destination_consignee_name").notNull(),
    destinationCountryCode: text("destination_country_code").notNull(),
    dischargeDate: text("discharge_date").notNull(),
    status: text("status", {
      enum: ["DRAFT", "VALIDATED", "AUTHORIZED_RELEASE", "CANCELLED"],
    })
      .notNull()
      .default("AUTHORIZED_RELEASE"),
    customsClearanceOfficer: text("customs_clearance_officer").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
);
