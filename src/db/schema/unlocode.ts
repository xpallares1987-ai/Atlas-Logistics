/**
 * @file unlocode.ts
 * @description Official UNECE UN/LOCODE (United Nations Code for Trade and Transport Locations)
 * master dataset schema preserving all 11 official publication headers and WGS84 coordinates.
 * @module @atlas/db/schema/unlocode
 * @see {@link docs/architecture/logistics-master-catalogs-spec.md}
 */

import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const unlocodeLocations = sqliteTable(
  "unlocode_locations",
  {
    /**
     * Canonical 5-character UN/LOCODE code: Country Code (2) + Location Code (3)
     * e.g. "ESBCN", "CNSHA", "NLRTM", "USLAX", "DEHAM", "SGSIN"
     */
    unLocode: text("un_locode").primaryKey(),

    /**
     * ISO 3166-1 alpha-2 country code (e.g. 'ES', 'CN', 'US', 'DE', 'NL')
     */
    countryCode: text("country_code").notNull(),

    /**
     * 3-character location identifier within the country (e.g. 'BCN', 'SHA', 'RTM')
     */
    locationCode: text("location_code").notNull(),

    /**
     * Official location name as registered with UNECE (e.g. 'Barcelona', 'Shanghai')
     */
    name: text("name").notNull(),

    /**
     * Normalized name without accents or diacritics for deterministic search
     */
    nameWoDiacritics: text("name_wo_diacritics"),

    /**
     * ISO 3166-2 administrative subdivision (e.g. 'B' for Catalunya, 'SH' for Shanghai, 'CA' for California)
     */
    subdivisionCode: text("subdivision_code"),

    /**
     * UNECE 8-position Function classifier string:
     * Pos 1: Port (1)
     * Pos 2: Rail terminal (2)
     * Pos 3: Road transport node (3)
     * Pos 4: Airport (4)
     * Pos 5: Postal exchange office (5)
     * Pos 6: Multimodal / Inland clearance depot (6)
     * Pos 7: Fixed transport / Pipeline (7)
     * Pos 8: Border crossing (B)
     */
    functionClassifier: text("function_classifier").notNull(),

    // Structured boolean mirrors of the 8-position classifier
    isPort: integer("is_port", { mode: "boolean" }).notNull().default(false),
    isRailTerminal: integer("is_rail_terminal", { mode: "boolean" })
      .notNull()
      .default(false),
    isRoadTerminal: integer("is_road_terminal", { mode: "boolean" })
      .notNull()
      .default(false),
    isAirport: integer("is_airport", { mode: "boolean" })
      .notNull()
      .default(false),
    isPostalHub: integer("is_postal_hub", { mode: "boolean" })
      .notNull()
      .default(false),
    isMultimodalIcd: integer("is_multimodal_icd", { mode: "boolean" })
      .notNull()
      .default(false),
    isBorderCrossing: integer("is_border_crossing", { mode: "boolean" })
      .notNull()
      .default(false),

    /**
     * Official UNECE approval status code:
     * 'AA' = Approved by competent national authority
     * 'AC' = Approved by UNECE Secretariat / Committee
     * 'AF' = Approved by national facilitation body
     * 'AI' = Adopted by IATA
     * 'RL' = Recognized location
     * 'RN' = Request under consideration
     * 'RQ' = Request not approved
     * 'UR' = To be reviewed
     */
    status: text("status").notNull().default("RL"),

    /**
     * Publication change indicator:
     * '+' = Added since last release
     * '#' = Change in location name
     * '¦' = Other attribute change
     * 'X' = Marked for deletion
     * '=' = Reference entry
     */
    changeCode: text("change_code"),

    /**
     * Official UNECE release publication tag (YYMM, e.g. '2407', '2501')
     */
    releaseDateYymm: text("release_date_yymm"),

    /**
     * 3-letter IATA airport code if location contains or directly serves a commercial airport
     */
    iataCode: text("iata_code"),

    /**
     * Raw UNECE coordinate string format: DDMM[N/S] DDDMM[E/W] (e.g. '4123N 00211E')
     */
    rawCoordinates: text("raw_coordinates"),

    /**
     * Parsed WGS84 decimal latitude (-90.0 to +90.0)
     */
    latitude: real("latitude"),

    /**
     * Parsed WGS84 decimal longitude (-180.0 to +180.0)
     */
    longitude: real("longitude"),

    /**
     * UNECE administrative or geographical remarks
     */
    remarks: text("remarks"),

    ...commonAuditFields,
  },
  (table) => ({
    countryIdx: index("idx_unlocode_country").on(table.countryCode),
    nameWoDiacriticsIdx: index("idx_unlocode_name_wo_diacritics").on(
      table.nameWoDiacritics,
    ),
    iataIdx: index("idx_unlocode_iata").on(table.iataCode),
    isPortIdx: index("idx_unlocode_is_port").on(table.isPort),
    isAirportIdx: index("idx_unlocode_is_airport").on(table.isAirport),
    isRailIdx: index("idx_unlocode_is_rail").on(table.isRailTerminal),
    isMultimodalIdx: index("idx_unlocode_is_multimodal").on(
      table.isMultimodalIcd,
    ),
  }),
);

export type UnlocodeLocation = typeof unlocodeLocations.$inferSelect;
export type NewUnlocodeLocation = typeof unlocodeLocations.$inferInsert;
