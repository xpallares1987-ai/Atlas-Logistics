import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Rail Corridors (TEN-T Rail Freight Corridors - RFC)
 */
export const railCorridors = sqliteTable("rail_corridors", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // RFC4_ATLANTIC, RFC6_MEDITERRANEAN, IBERIAN_CORE
  name: text("name").notNull(),
  description: text("description"),
  originNode: text("origin_node").notNull(),
  destinationNode: text("destination_node").notNull(),
  maxTrainLengthMeters: integer("max_train_length_meters")
    .default(750)
    .notNull(), // 750m TEN-T
  maxAxleLoadCategory: text("max_axle_load_category").default("D").notNull(), // A (16t), B (18t), C (20t), D (22.5t)
  gaugeProfile: text("gauge_profile").default("P400_GA").notNull(), // G1, GA, GB, GC, P400
  electrificationKv: real("electrification_kv").default(25.0).notNull(), // 25kV AC / 3kV DC / 1.5kV DC
  createdAt: text("created_at").notNull(),
});

/**
 * Rail Terminals & Gauge Transfer Stations (Hendaye, Portbou, Zaragoza Plaza, etc.)
 */
export const railTerminals = sqliteTable("rail_terminals", {
  id: text("id").primaryKey(),
  uicStationCode: text("uic_station_code").notNull().unique(), // 5-digit or 7-digit UIC
  name: text("name").notNull(),
  city: text("city").notNull(),
  countryCode: text("country_code").notNull(), // ES, FR, DE, BE, LU
  trackGauge: text("track_gauge").notNull(), // IBERIAN_1668, UIC_1435, DUAL_GAUGE
  isGaugeTransferNode: integer("is_gauge_transfer_node", { mode: "boolean" })
    .default(false)
    .notNull(),
  hasElectrification: integer("has_electrification", { mode: "boolean" })
    .default(true)
    .notNull(),
  maxTrackCapacityMeters: integer("max_track_capacity_meters")
    .default(750)
    .notNull(),
  storageTeuCapacity: integer("storage_teu_capacity").default(2500).notNull(),
  createdAt: text("created_at").notNull(),
});

/**
 * Rail Wagons (Intermodal wagons: Sggmrss, Sdggmrss T3000e, Sgnss)
 */
export const railWagons = sqliteTable("rail_wagons", {
  id: text("id").primaryKey(),
  uicWagonNumber: text("uic_wagon_number").notNull().unique(), // 12-digit UIC number e.g. 33 80 4956 123-4
  wagonSeries: text("wagon_series").notNull(), // Sggmrss 90', Sdggmrss T3000e (P400), Sgnss 60'
  wagonType: text("wagon_type").notNull(), // CONTAINER_FLATBED, POCKET_WAGON_P400, CAR_CARRIER
  numberOfAxles: integer("number_of_axles").notNull(), // 4 or 6 axles
  tareWeightTonnes: real("tare_weight_tonnes").notNull(), // e.g. 21.5 or 28.5 tonnes
  lengthOverBuffersMeters: real("length_over_buffers_meters").notNull(), // e.g. 19.74m or 29.59m
  maxBrakedWeightTonnes: real("max_braked_weight_tonnes").notNull(), // Brake mass e.g. 64 tonnes
  maxPayloadCategoryA: real("max_payload_category_a").notNull(), // at 16.0 t/axle
  maxPayloadCategoryB: real("max_payload_category_b").notNull(), // at 18.0 t/axle
  maxPayloadCategoryC: real("max_payload_category_c").notNull(), // at 20.0 t/axle
  maxPayloadCategoryD: real("max_payload_category_d").notNull(), // at 22.5 t/axle
  isP400Certified: integer("is_p400_certified", { mode: "boolean" })
    .default(false)
    .notNull(),
  status: text("status").default("AVAILABLE").notNull(), // AVAILABLE, IN_CONSIST, MAINTENANCE
  createdAt: text("created_at").notNull(),
});

/**
 * Rail Consignments & CIM Consignment Notes (COTIF / CIM Uniform Rules)
 */
export const railConsignments = sqliteTable("rail_consignments", {
  id: text("id").primaryKey(),
  cimNumber: text("cim_number").notNull().unique(), // CIM-2026-XXXXX
  senderName: text("sender_name").notNull(),
  senderAddress: text("sender_address"),
  senderVat: text("sender_vat"),
  consigneeName: text("consignee_name").notNull(),
  consigneeAddress: text("consignee_address"),
  consigneeVat: text("consignee_vat"),
  originTerminalId: text("origin_terminal_id")
    .notNull()
    .references(() => railTerminals.id),
  destinationTerminalId: text("destination_terminal_id")
    .notNull()
    .references(() => railTerminals.id),
  gaugeTransferTerminalId: text("gauge_transfer_terminal_id").references(
    () => railTerminals.id,
  ),
  corridorId: text("corridor_id")
    .notNull()
    .references(() => railCorridors.id),
  railwayUndertakingRu: text("railway_undertaking_ru").notNull(), // e.g. Renfe Mercancías, Captrain, DB Cargo
  declaredGoodsDescription: text("declared_goods_description").notNull(),
  nhmCommodityCode: text("nhm_commodity_code").notNull(), // 6-digit NHM code (Nomenclature Harmonisée Marchandises)
  ridHazardousClass: text("rid_hazardous_class"), // RID class if dangerous goods (COTIF Appendix C)
  unNumber: text("un_number"),
  totalGrossMassTonnes: real("total_gross_mass_tonnes").notNull(),
  totalTeu: integer("total_teu").default(2).notNull(),
  commercialContractRef: text("commercial_contract_ref"),
  customsStatus: text("customs_status").default("T1").notNull(), // T1, T2, UNION_GOODS
  status: text("status").default("PLANNED").notNull(), // PLANNED, TRAIN_FORMED, IN_TRANSIT, GAUGE_TRANSFERRED, DELIVERED
  departureDate: text("departure_date"),
  estimatedArrivalDate: text("estimated_arrival_date"),
  actualArrivalDate: text("actual_arrival_date"),
  responsibleRailwayOfficer: text("responsible_railway_officer"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

/**
 * Rail Train Consists & Train Formation Runs (Trenes Bloque & Surcos)
 */
export const railTrainConsists = sqliteTable("rail_train_consists", {
  id: text("id").primaryKey(),
  trainRunNumber: text("train_run_number").notNull().unique(), // e.g. TR-89201 (Adif / SNCF train slot)
  locomotiveSeries: text("locomotive_series").notNull(), // e.g. Stadler Eurodual 6000 / Traxx MS3
  locomotiveLengthMeters: real("locomotive_length_meters")
    .default(23.0)
    .notNull(),
  locomotiveWeightTonnes: real("locomotive_weight_tonnes")
    .default(123.0)
    .notNull(),
  locomotiveBrakedWeightTonnes: real("locomotive_braked_weight_tonnes")
    .default(110.0)
    .notNull(),
  corridorId: text("corridor_id")
    .notNull()
    .references(() => railCorridors.id),
  originTerminalId: text("origin_terminal_id")
    .notNull()
    .references(() => railTerminals.id),
  destinationTerminalId: text("destination_terminal_id")
    .notNull()
    .references(() => railTerminals.id),
  maxAllowedLengthMeters: integer("max_allowed_length_meters")
    .default(750)
    .notNull(),
  totalTrainLengthMeters: real("total_train_length_meters").notNull(),
  totalGrossMassTonnes: real("total_gross_mass_tonnes").notNull(),
  totalBrakedMassTonnes: real("total_braked_mass_tonnes").notNull(),
  calculatedBrakePercentage: real("calculated_brake_percentage").notNull(), // (Braked / Gross) * 100
  requiredBrakePercentage: real("required_brake_percentage")
    .default(65.0)
    .notNull(),
  isLengthCompliant: integer("is_length_compliant", { mode: "boolean" })
    .default(true)
    .notNull(),
  isBrakeCompliant: integer("is_brake_compliant", { mode: "boolean" })
    .default(true)
    .notNull(),
  status: text("status").default("FORMED").notNull(), // FORMED, DISPATCHED, COMPLETED, CANCELLED
  driverName: text("driver_name"),
  tractionOperator: text("traction_operator").notNull(),
  departureTimestamp: text("departure_timestamp"),
  arrivalTimestamp: text("arrival_timestamp"),
  createdAt: text("created_at").notNull(),
});

/**
 * Rail Train Wagon Allocations & UTI Loading (Contenedores / Semirremolques P400)
 */
export const railTrainWagonAllocations = sqliteTable(
  "rail_train_wagon_allocations",
  {
    id: text("id").primaryKey(),
    trainConsistId: text("train_consist_id")
      .notNull()
      .references(() => railTrainConsists.id, { onDelete: "cascade" }),
    consignmentId: text("consignment_id").references(() => railConsignments.id),
    wagonId: text("wagon_id")
      .notNull()
      .references(() => railWagons.id),
    positionInTrain: integer("position_in_train").notNull(), // 1, 2, 3...
    utiType: text("uti_type").notNull(), // CONTAINER_20, CONTAINER_40, CONTAINER_45, SEMITRAILER_P400
    utiIdentification: text("uti_identification").notNull(), // e.g. MSCU9928192 or E-4819-KLP
    payloadMassTonnes: real("payload_mass_tonnes").notNull(),
    grossWagonMassTonnes: real("gross_wagon_mass_tonnes").notNull(), // Tare + Payload
    calculatedAxleLoadTonnes: real("calculated_axle_load_tonnes").notNull(), // Gross / Axles
    maxAllowedAxleLoadTonnes: real("max_allowed_axle_load_tonnes")
      .default(22.5)
      .notNull(),
    isAxleLoadCompliant: integer("is_axle_load_compliant", { mode: "boolean" })
      .default(true)
      .notNull(),
    sealNumber: text("seal_number"),
    createdAt: text("created_at").notNull(),
  },
);
