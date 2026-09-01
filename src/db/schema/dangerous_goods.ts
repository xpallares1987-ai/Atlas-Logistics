import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * 1. Expedientes de Mercancías Peligrosas Multimodales (Dangerous Goods Consignments)
 * Gestión de expedientes bajo IMO IMDG Code, IATA DGR, UNECE ADR y RID.
 */
export const dgShipments = sqliteTable("dg_shipments", {
  id: text("id").primaryKey(), // 'dg_ship_2026_01'
  shipmentReference: text("shipment_reference").notNull().unique(), // 'DGD-2026-VAL-0089'
  transportMode: text("transport_mode", {
    enum: [
      "MARITIME_OCEAN",
      "AIR_CARGO",
      "ROAD_FREIGHT",
      "RAIL_INTERMODAL",
      "MULTIMODAL",
    ],
  }).notNull(),
  carrierName: text("carrier_name").notNull(), // 'Maersk Line / Lufthansa Cargo'
  vesselOrFlightOrVehiclePlate: text(
    "vessel_or_flight_or_vehicle_plate",
  ).notNull(), // 'MV Valencia Bridge / LH8220 / 4819-KMN'
  voyageOrFlightNumber: text("voyage_or_flight_number"), // 'V.2608W'
  originPortOrLocation: text("origin_port_or_location").notNull(), // 'Puerto de Valencia (ESVLC)'
  destinationPortOrLocation: text("destination_port_or_location").notNull(), // 'Puerto de Singapur (SGSIN)'
  shipperName: text("shipper_name").notNull(), // 'Iberica Chemical Solutions SL'
  shipperAddress: text("shipper_address").notNull(),
  consigneeName: text("consignee_name").notNull(), // 'Asia Pacific Polymers Ltd'
  consigneeAddress: text("consignee_address").notNull(),
  emergencyContactName: text("emergency_contact_name").notNull(), // 'CHEMTREC / Centro de Emergencias Químicas'
  emergencyContactPhone: text("emergency_contact_phone").notNull(), // '+34 91 562 04 20'
  aircraftType: text("aircraft_type", {
    enum: ["PASSENGER_AND_CARGO", "CARGO_AIRCRAFT_ONLY_CAO", "NOT_APPLICABLE"],
  })
    .notNull()
    .default("NOT_APPLICABLE"),
  totalPackages: integer("total_packages").notNull().default(1),
  totalNetQuantityKg: real("total_net_quantity_kg").notNull().default(0),
  totalGrossMassKg: real("total_gross_mass_kg").notNull().default(0),
  hasRadioactiveMaterials: integer("has_radioactive_materials", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  hasMarinePollutants: integer("has_marine_pollutants", { mode: "boolean" })
    .notNull()
    .default(false),
  hasLithiumBatteries: integer("has_lithium_batteries", { mode: "boolean" })
    .notNull()
    .default(false),
  segregationStatus: text("segregation_status", {
    enum: [
      "COMPLIANT_SEGREGATED",
      "INCOMPATIBLE_VIOLATION",
      "SEGREGATION_REQUIRED",
      "PENDING_AUDIT",
    ],
  })
    .notNull()
    .default("PENDING_AUDIT"),
  status: text("status", {
    enum: [
      "DRAFT",
      "SEGREGATION_VERIFIED",
      "CERTIFIED_READY",
      "IN_TRANSIT",
      "DELIVERED",
    ],
  })
    .notNull()
    .default("DRAFT"),
  declarationRemarks: text("declaration_remarks"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/**
 * 2. Partidas de Mercancías Peligrosas (Consignment Dangerous Goods Items)
 * Detalle de cada sustancia ONU con clase primaria, riesgos secundarios, grupo de embalaje y exenciones.
 */
export const dgConsignmentItems = sqliteTable("dg_consignment_items", {
  id: text("id").primaryKey(), // 'dg_item_01'
  dgShipmentId: text("dg_shipment_id")
    .notNull()
    .references(() => dgShipments.id, { onDelete: "cascade" }),
  unNumber: text("un_number").notNull(), // 'UN 1203'
  properShippingName: text("proper_shipping_name").notNull(), // 'GASOLINE' / 'MOTOR SPIRIT'
  technicalChemicalName: text("technical_chemical_name"), // 'Gasolina Octanaje 95'
  primaryHazardClass: text("primary_hazard_class").notNull(), // '3' (o '1.1D', '2.1', '5.1', '6.1', '8', '9')
  subsidiaryHazardClasses: text("subsidiary_hazard_classes"), // '6.1, 8' o null
  packingGroup: text("packing_group", {
    enum: ["PG_I", "PG_II", "PG_III", "NONE"],
  })
    .notNull()
    .default("PG_II"),
  flashPointCelsius: real("flash_point_celsius"), // ej. -45.0 °C
  isMarinePollutant: integer("is_marine_pollutant", { mode: "boolean" })
    .notNull()
    .default(false),
  packageCount: integer("package_count").notNull().default(1),
  packageTypeDescription: text("package_type_description").notNull(), // 'Tambores de acero (1A1)' / 'Cajas de cartón (4G)'
  packageUnCode: text("package_un_code").notNull().default("4G"), // '1A1', '4G', '1H1'
  netQuantityPerPackage: real("net_quantity_per_package").notNull(), // 200.0 (L o kg)
  unitOfMeasure: text("unit_of_measure", {
    enum: ["LITERS", "KILOGRAMS", "GRAMS", "MILLILITERS"],
  })
    .notNull()
    .default("LITERS"),
  totalNetQuantity: real("total_net_quantity").notNull(), // 800.0
  totalGrossMassKg: real("total_gross_mass_kg").notNull(), // 920.0
  netExplosiveMassKg: real("net_explosive_mass_kg").notNull().default(0), // Para Clase 1
  isLimitedQuantityLq: integer("is_limited_quantity_lq", { mode: "boolean" })
    .notNull()
    .default(false),
  exceptedQuantityCode: text("excepted_quantity_code", {
    enum: ["E0", "E1", "E2", "E3", "E4", "E5"],
  })
    .notNull()
    .default("E0"),
  adrTransportCategory: integer("adr_transport_category").notNull().default(2), // 0, 1, 2, 3, 4
  adrPointsCalculated: real("adr_points_calculated").notNull().default(0), // Total Net * Multiplier
  adrTunnelRestrictionCode: text("adr_tunnel_restriction_code")
    .notNull()
    .default("D/E"), // 'B', 'B/D', 'C/E', 'D/E', 'E'
  kemlerHazardIdNumber: text("kemler_hazard_id_number").notNull().default("33"), // '33' para líquido muy inflamable
  emsFireCode: text("ems_fire_code").notNull().default("F-E"), // 'F-E'
  emsSpillageCode: text("ems_spillage_code").notNull().default("S-E"), // 'S-E'
  iataPackingInstruction: text("iata_packing_instruction"), // 'Y341', '353', '364' (CAO), '965' (Lithium)
  lithiumBatterySection: text("lithium_battery_section", {
    enum: ["NOT_APPLICABLE", "SECTION_IA", "SECTION_IB", "SECTION_II"],
  })
    .notNull()
    .default("NOT_APPLICABLE"),
  lithiumStateOfChargePercentage: real("lithium_state_of_charge_percentage"), // <= 30%
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/**
 * 3. Auditorías de Segregación y Compatibilidad Química (IMDG 7.2.4 & ADR)
 * Verificación par a par en contenedores, semirremolques o bodegas de buques.
 */
export const dgSegregationAudits = sqliteTable("dg_segregation_audits", {
  id: text("id").primaryKey(), // 'dg_seg_01'
  dgShipmentId: text("dg_shipment_id")
    .notNull()
    .references(() => dgShipments.id, { onDelete: "cascade" }),
  containerOrVehicleNumber: text("container_or_vehicle_number").notNull(), // 'MSKU-891024-3'
  auditDate: text("audit_date").notNull(), // '2026-09-01'
  evaluatedItemIdsJson: text("evaluated_item_ids_json").notNull(), // JSON array of item IDs
  segregationComplianceStatus: text("segregation_compliance_status", {
    enum: [
      "COMPLIANT_SEGREGATED",
      "INCOMPATIBLE_VIOLATION",
      "SEGREGATION_REQUIRED",
    ],
  })
    .notNull()
    .default("COMPLIANT_SEGREGATED"),
  totalConflictsDetected: integer("total_conflicts_detected")
    .notNull()
    .default(0),
  conflictDetailsJson: text("conflict_details_json"), // Array of { itemA, itemB, rule, severity, advice }
  auditorName: text("auditor_name").notNull(), // 'DG Safety Adviser Carlos Vega'
  auditCertificateStatement: text("audit_certificate_statement").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/**
 * 4. Fichas de Respuesta a Emergencias y Códigos EmS (Emergency Response Cards)
 * Ficha de intervención rápida para tripulaciones marítimas, bomberos y transportistas.
 */
export const dgEmergencyCards = sqliteTable("dg_emergency_cards", {
  id: text("id").primaryKey(), // 'dg_emc_01'
  dgShipmentId: text("dg_shipment_id")
    .notNull()
    .references(() => dgShipments.id, { onDelete: "cascade" }),
  cardReference: text("card_reference").notNull().unique(), // 'EMC-2026-VAL-001'
  unNumbersSummary: text("un_numbers_summary").notNull(), // 'UN 1203, UN 1789'
  primaryClassesSummary: text("primary_classes_summary").notNull(), // 'Clase 3 (Líquido Inflamable), Clase 8 (Corrosivo)'
  emergencyPhone24h: text("emergency_phone_24h").notNull(), // '+34 91 562 04 20'
  fireInterventionProtocol: text("fire_intervention_protocol").notNull(),
  spillageContainmentProtocol: text("spillage_containment_protocol").notNull(),
  firstAidProtocol: text("first_aid_protocol").notNull(),
  requiredPpeEquipment: text("required_ppe_equipment").notNull(), // 'Traje químico estanco, máscara autónoma SCBA...'
  specialEnvironmentalHazards: text("special_environmental_hazards"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/**
 * 5. Certificados de Embalaje y Estiba de Contenedor/Vehículo (Container/Vehicle Packing Certificate)
 * Certificado obligatorio bajo IMDG 5.4.2 y ADR 5.4.2 firmado por el responsable de la estiba.
 */
export const dgPackingCertificates = sqliteTable("dg_packing_certificates", {
  id: text("id").primaryKey(), // 'dg_pack_01'
  dgShipmentId: text("dg_shipment_id")
    .notNull()
    .references(() => dgShipments.id, { onDelete: "cascade" }),
  certificateReference: text("certificate_reference").notNull().unique(), // 'CPC-2026-VAL-0089'
  containerOrVehicleNumber: text("container_or_vehicle_number").notNull(), // 'MSKU-891024-3'
  sealNumberIso17712: text("seal_number_iso_17712").notNull(), // 'ES-VAL-H-992104'
  packingFacilityName: text("packing_facility_name").notNull(), // 'Terminal Química de Graneles Port Valencia'
  packingFacilityAddress: text("packing_facility_address").notNull(),
  declarantName: text("declarant_name").notNull(), // 'Javier Navarro (Jefe de Estiba DGR)'
  declarantCompany: text("declarant_company").notNull(), // 'Atlas Logistics Port Terminal SL'
  declarantPosition: text("declarant_position").notNull(), // 'Dangerous Goods Certified Loader'
  isCleanDrySuitable: integer("is_clean_dry_suitable", { mode: "boolean" })
    .notNull()
    .default(true),
  isSegregationCompliant: integer("is_segregation_compliant", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  isPackagesSoundUndamaged: integer("is_packages_sound_undamaged", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  isProperlySecuredBraced: integer("is_properly_secured_braced", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  isPlacardedAndMarked: integer("is_placarded_and_marked", { mode: "boolean" })
    .notNull()
    .default(true),
  signDate: text("sign_date").notNull(), // '2026-09-01'
  status: text("status", {
    enum: ["CERTIFIED_COMPLIANT", "REJECTED_IMPROPER_STOWAGE"],
  })
    .notNull()
    .default("CERTIFIED_COMPLIANT"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
