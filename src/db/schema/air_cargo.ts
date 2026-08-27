import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const iataAirports = sqliteTable("iata_airports", {
  code: text("code").primaryKey(), // e.g. MAD, FRA, LHR, JFK
  name: text("name").notNull(),
  city: text("city").notNull(),
  countryCode: text("country_code").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  ...commonAuditFields,
});

export const dgrRegistry = sqliteTable("dgr_registry", {
  unNumber: text("un_number").primaryKey(), // UN3480, UN1845, UN1263
  properShippingName: text("proper_shipping_name").notNull(),
  dgrClass: text("dgr_class").notNull(), // Class 9, Class 3, etc.
  subRisks: text("sub_risks"),
  packingGroup: text("packing_group"), // I, II, III
  passengerLimitKg: text("passenger_limit_kg").notNull().default("FORBIDDEN"),
  cargoAircraftLimitKg: text("cargo_aircraft_limit_kg")
    .notNull()
    .default("35 kg"),
  packingInstructionPax: text("packing_instruction_pax"),
  packingInstructionCao: text("packing_instruction_cao"),
  defaultShc: text("default_shc").notNull().default("DGR"), // ELI, ELM, CAO, COL, ICE
  ...commonAuditFields,
});

export const airwayBills = sqliteTable("airway_bills", {
  id: text("id").primaryKey(),
  type: text("type").notNull().default("DIRECT"), // MAWB, HAWB, DIRECT
  awbNumber: text("awb_number").notNull().unique(), // PPP-NNNNNNNC (MAWB) or HAWB-XXXXXX
  airlinePrefix: text("airline_prefix"), // 020, 074, 075, 125, 016
  airlineName: text("airline_name"),
  parentMawbId: text("parent_mawb_id"), // Foreign key for HAWB consolidation under MAWB
  originAirport: text("origin_airport").notNull().default("MAD"),
  destinationAirport: text("destination_airport").notNull().default("JFK"),
  flightNumber: text("flight_number"),
  flightDate: integer("flight_date", { mode: "timestamp" }),
  shipperData: text("shipper_data", { mode: "json" }),
  consigneeData: text("consignee_data", { mode: "json" }),
  issuingAgentData: text("issuing_agent_data", { mode: "json" }),
  pieces: integer("pieces").notNull().default(1),
  grossWeightKg: real("gross_weight_kg").notNull().default(0),
  volumeCbm: real("volume_cbm").notNull().default(0),
  volumetricWeightKg: real("volumetric_weight_kg").notNull().default(0),
  chargeableWeightKg: real("chargeable_weight_kg").notNull().default(0),
  rateClass: text("rate_class").notNull().default("N"), // M, N, Q, C, U
  ratePerKg: real("rate_per_kg").notNull().default(0),
  freightCharge: real("freight_charge").notNull().default(0),
  otherCharges: text("other_charges", { mode: "json" }), // [{ code: "MYC", amount: 45 }, { code: "SCC", amount: 20 }, ...]
  totalPrepaid: real("total_prepaid").notNull().default(0),
  totalCollect: real("total_collect").notNull().default(0),
  currency: text("currency").notNull().default("EUR"),
  natureOfGoods: text("nature_of_goods").notNull().default("General Cargo"),
  specialHandlingCodes: text("special_handling_codes", { mode: "json" }), // ["ELI", "COL", "CAO"]
  dgrDetails: text("dgr_details", { mode: "json" }), // UN details if hazardous
  handlingInfo: text("handling_info"),
  status: text("status").notNull().default("DRAFT"), // DRAFT, BOOKED, RCS, DEP, ARR, RCF, DLV
  eAwbCertified: integer("e_awb_certified", { mode: "boolean" })
    .notNull()
    .default(true),
  awbData: text("awb_data", { mode: "json" }), // Full 12-box IATA structure
  ...commonAuditFields,
});
