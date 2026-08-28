import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Official CBAM Goods Catalog (EU Reg. 2023/956 & 2023/1773)
export const cbamGoodsCatalog = sqliteTable("cbam_goods_catalog", {
  id: text("id").primaryKey(),
  cnCode: text("cn_code").notNull().unique(), // e.g. "7208 38 00"
  sector: text("sector", {
    enum: [
      "IRON_STEEL",
      "ALUMINIUM",
      "CEMENT",
      "FERTILIZERS",
      "HYDROGEN",
      "ELECTRICITY",
    ],
  }).notNull(),
  description: text("description").notNull(),
  isComplexGood: integer("is_complex_good", { mode: "boolean" })
    .notNull()
    .default(false),
  defaultDirectEmissionFactor: real("default_direct_emission_factor").notNull(), // tCO2e / tonne
  defaultIndirectEmissionFactor: real(
    "default_indirect_emission_factor",
  ).notNull(), // tCO2e / tonne
  standard: text("standard").notNull().default("EU_REG_2023_956"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Third-Country Production Installations & Verified Emission Benchmarks
export const cbamInstallations = sqliteTable("cbam_installations", {
  id: text("id").primaryKey(),
  installationName: text("installation_name").notNull(),
  operatorName: text("operator_name").notNull(),
  countryCode: text("country_code").notNull(), // ISO-2 (TR, CN, MA, GB, IN, US)
  unLocode: text("un_locode"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  verifiedDirectEmissionFactor: real("verified_direct_emission_factor"), // tCO2e / tonne
  verifiedIndirectEmissionFactor: real("verified_indirect_emission_factor"), // tCO2e / tonne
  gridEmissionFactorCountry: real("grid_emission_factor_country"), // tCO2 / MWh
  verifierName: text("verifier_name"), // Independent EU-accredited verifier
  verificationCertificateId: text("verification_certificate_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Official CBAM Quarterly Declarations (Art. 35 EU Reg. 2023/956)
export const cbamDeclarations = sqliteTable("cbam_declarations", {
  id: text("id").primaryKey(),
  declarationNumber: text("declaration_number").notNull().unique(), // e.g. "CBAM-2026-Q3-001"
  reportingPeriod: text("reporting_period").notNull(), // e.g. "2026-Q3"
  declarantVat: text("declarant_vat").notNull(),
  declarantName: text("declarant_name").notNull(),
  importerVat: text("importer_vat").notNull(),
  importerName: text("importer_name").notNull(),
  totalGrossMassTonnes: real("total_gross_mass_tonnes").notNull(),
  totalNetMassTonnes: real("total_net_mass_tonnes").notNull(),
  totalDirectEmissionsTco2e: real("total_direct_emissions_tco2e").notNull(),
  totalIndirectEmissionsTco2e: real("total_indirect_emissions_tco2e").notNull(),
  totalEmbeddedEmissionsTco2e: real("total_embedded_emissions_tco2e").notNull(),
  euEtsBenchmarkPriceEur: real("eu_ets_benchmark_price_eur")
    .notNull()
    .default(85.5), // Weekly average € / tCO2e
  grossCarbonLiabilityEur: real("gross_carbon_liability_eur").notNull(),
  carbonPricePaidForeignEur: real("carbon_price_paid_foreign_eur")
    .notNull()
    .default(0.0), // Art. 9 deduction
  netCarbonLiabilityEur: real("net_carbon_liability_eur").notNull(),
  status: text("status", {
    enum: ["DRAFT", "VALIDATED", "SUBMITTED_REGISTRY", "AMENDED"],
  })
    .notNull()
    .default("VALIDATED"),
  responsibleDeclarant: text("responsible_declarant"),
  remarks: text("remarks"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// CBAM Declaration Import Lines (Itemized by Shipment & Customs DUA)
export const cbamDeclarationLines = sqliteTable("cbam_declaration_lines", {
  id: text("id").primaryKey(),
  declarationId: text("declaration_id")
    .notNull()
    .references(() => cbamDeclarations.id, { onDelete: "cascade" }),
  shipmentId: text("shipment_id"),
  duaNumber: text("dua_number"),
  duaBox33HsCode: text("dua_box33_hs_code").notNull(),
  goodDescription: text("good_description").notNull(),
  originCountry: text("origin_country").notNull(),
  installationId: text("installation_id").references(
    () => cbamInstallations.id,
  ),
  netWeightTonnes: real("net_weight_tonnes").notNull(),
  useDefaultFactors: integer("use_default_factors", { mode: "boolean" })
    .notNull()
    .default(false),
  directEmissionsTco2e: real("direct_emissions_tco2e").notNull(),
  indirectEmissionsTco2e: real("indirect_emissions_tco2e").notNull(),
  precursorEmissionsTco2e: real("precursor_emissions_tco2e").default(0.0),
  totalLineEmissionsTco2e: real("total_line_emissions_tco2e").notNull(),
  foreignCarbonPricePerTco2e: real("foreign_carbon_price_per_tco2e").default(
    0.0,
  ),
  effectiveForeignPricePaidEur: real(
    "effective_foreign_price_paid_eur",
  ).default(0.0),
  lineGrossLiabilityEur: real("line_gross_liability_eur").notNull(),
  lineNetLiabilityEur: real("line_net_liability_eur").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
