# Standard Logistics Master Catalogs & External Data Ingestion Specification

**Document Type**: Technical Specification & Schema Design  
**Standards Covered**: ISO 668:2020 / ISO 6346:2022 (Containers), UNECE UN/LOCODE (Locations), UN/EDIFACT (D.96A/D.00B Interchanges), and DCSA v3.0 (Ocean Transport).

---

## 1. Container ISO Master Table (`container_iso_types`)

Currently, `shipment_containers` stores a free-text `container_type` (e.g. `20DC`, `40HC`), but lacks standard physical dimensions, tare weights, payload limits, and ISO 6346 Size & Type encoding. 

In commercial shipping, freight rates, vessel stowage, crane limits, road weight limits, and customs declarations depend on exact ISO specifications.

### 1.1 Schema Definition (`src/db/schema/containers.ts`)
```typescript
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const containerIsoTypes = sqliteTable("container_iso_types", {
  // ISO 6346 4-character code: e.g. "22G1", "42G1", "45G1", "42R1", "22U1", "42P1", "22T1"
  isoCode: text("iso_code").primaryKey(),
  
  // Industry common commercial code: e.g. "20GP", "40GP", "40HC", "45HC", "20RF", "40HR", "20OT", "40FR", "20TK"
  industryCode: text("industry_code").notNull().unique(),
  
  // Equipment Category: DRY_STANDARD, HIGH_CUBE, REEFER, OPEN_TOP, FLAT_RACK, TANK, BULK, VENTILATED
  category: text("category").notNull(),
  
  // Nominal dimensions (Imperial feet standard)
  nominalLengthFt: real("nominal_length_ft").notNull(), // 20.0, 40.0, 45.0
  nominalHeightFt: real("nominal_height_ft").notNull(), // 8.5 (standard), 9.5 (high cube)
  nominalWidthFt: real("nominal_width_ft").notNull().default(8.0),
  
  // Physical external dimensions in millimeters (ISO 668)
  externalLengthMm: integer("external_length_mm").notNull(),
  externalWidthMm: integer("external_width_mm").notNull(),
  externalHeightMm: integer("external_height_mm").notNull(),
  
  // Internal usable dimensions in millimeters
  internalLengthMm: integer("internal_length_mm").notNull(),
  internalWidthMm: integer("internal_width_mm").notNull(),
  internalHeightMm: integer("internal_height_mm").notNull(),
  
  // Door opening clearance in millimeters
  doorOpeningWidthMm: integer("door_opening_width_mm"),
  doorOpeningHeightMm: integer("door_opening_height_mm"),
  
  // Capacity and weight ratings in kilograms & cubic meters
  tareWeightKg: real("tare_weight_kg").notNull(),         // Empty container weight
  maxGrossWeightKg: real("max_gross_weight_kg").notNull(), // Maximum permissible total weight (M.G.W.)
  maxPayloadKg: real("max_payload_kg").notNull(),         // Net maximum payload weight (M.G.W. - Tare)
  cubicCapacityCbm: real("cubic_capacity_cbm").notNull(), // Volume in m³
  
  // TEU (Twenty-foot Equivalent Unit) stowage multiplier
  teuFactor: real("teu_factor").notNull(), // 1.0 for 20', 2.0 for 40', 2.25 for 45'
  
  // Operational features
  isReefer: integer("is_reefer", { mode: "boolean" }).notNull().default(false),
  hasControlledAtmosphere: integer("has_controlled_atmosphere", { mode: "boolean" }).default(false),
  isVentilated: integer("is_ventilated", { mode: "boolean" }).default(false),
  
  description: text("description").notNull(),
  ...commonAuditFields,
});
```

### 1.2 Canonical Seed Master (Official ISO 668 / 6346)
| ISO Code | Industry Code | Category | Length | Height | Tare (kg) | Max Payload (kg) | Max Gross (kg) | CBM (m3) | TEU |
|---|---|---|---|---|---|---|---|---|---|
| **`22G1`** | `20DV` | Dry Standard | 20' | 8'6" | 2,230 | 28,250 | 30,480 | 33.2 | 1.0 |
| **`42G1`** | `40DV` | Dry Standard | 40' | 8'6" | 3,740 | 26,740 | 30,480 | 67.7 | 2.0 |
| **`45G1`** | `40HC` | High Cube | 40' | 9'6" | 3,980 | 28,520 | 32,500 | 76.4 | 2.0 |
| **`L5G1`** | `45HC` | High Cube | 45' | 9'6" | 4,820 | 27,680 | 32,500 | 86.0 | 2.25 |
| **`22R1`** | `20RF` | Reefer | 20' | 8'6" | 3,080 | 27,400 | 30,480 | 28.3 | 1.0 |
| **`45R1`** | `40HR` | Reefer High Cube | 40' | 9'6" | 4,630 | 29,370 | 34,000 | 67.5 | 2.0 |
| **`22U1`** | `20OT` | Open Top | 20' | 8'6" | 2,350 | 28,130 | 30,480 | 32.5 | 1.0 |
| **`42U1`** | `40OT` | Open Top | 40' | 8'6" | 3,850 | 26,630 | 30,480 | 66.5 | 2.0 |
| **`22P1`** | `20FR` | Flat Rack | 20' | 8'6" | 2,750 | 28,250 | 31,000 | | 1.0 |
| **`42P1`** | `40FR` | Flat Rack | 40' | 8'6" | 4,900 | 40,100 | 45,000 | | 2.0 |
| **`22T1`** | `20TK` | ISO Tank | 20' | 8'6" | 3,600 | 32,400 | 36,000 | 26.0 | 1.0 |

---

## 2. Official UNECE UN/LOCODE Loss-Free Ingestion Table

The United Nations Economic Commission for Europe (UNECE) releases the official UN/LOCODE database biannually (e.g. `2024-2`, `2025-1`) covering over 110,000 global transport locations.

### 2.1 UNECE Official File Headers
The official UNECE CSV distribution file (`UNLOCODE_Part1.csv`, `Part2.csv`, `Part3.csv`) contains exactly 11 columns:
1. `Change`: Character flag (`+` added, `X` marked for deletion, `#` change in location name, `¦` other change, `=` unchanged)
2. `Country`: 2-letter ISO 3166-1 alpha-2 code (`ES`, `CN`, `US`, `DE`)
3. `Location`: 3-letter location identifier (`BCN`, `SHA`, `LAX`, `HAM`)
4. `Name`: Official location name (`Barcelona`, `Shanghai`, `Los Angeles`)
5. `NameWoDiacritics`: Diacritic-free ascii name (`Barcelona`, `Shanghai`)
6. `Subdivision`: ISO 3166-2 administrative subdivision (`B`, `SH`, `CA`, `HH`)
7. `Function`: 8-digit position classifier string:
   - Position 1: `1` = Port (Maritime/River)
   - Position 2: `2` = Rail terminal
   - Position 3: `3` = Road transport node
   - Position 4: `4` = Airport
   - Position 5: `5` = Postal exchange office
   - Position 6: `6` = Multimodal / Inland Clearance Depot (ICD)
   - Position 7: `7` = Fixed transport (pipeline, oil/gas terminal)
   - Position 8: `B` = Border crossing point
8. `Status`: Approval code (`AA` competent authority, `AC` committee, `AF` national authority, `AI` IATA, `RL` recognized location)
9. `Date`: Entry/modification date in `YYMM` format (e.g. `2407`)
10. `IATA`: 3-letter IATA airport code if location contains or serves an airport (e.g. `BCN`, `SHA`, `LAX`)
11. `Coordinates`: Geographic coordinates in format `DDMM[N/S] DDDMM[E/W]` (e.g. `4123N 00211E` for Barcelona)
12. `Remarks`: Official UNECE notes.

### 2.2 Relational Ingestion Table (`src/db/schema/unlocode.ts`)
```typescript
import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";

export const unlocodeLocations = sqliteTable(
  "unlocode_locations",
  {
    // The canonical 5-letter UN/LOCODE: Country (2) + Location (3) -> "ESBCN"
    unLocode: text("un_locode").primaryKey(),
    
    countryCode: text("country_code").notNull(),       // "ES"
    locationCode: text("location_code").notNull(),     // "BCN"
    name: text("name").notNull(),                     // "Barcelona"
    nameWoDiacritics: text("name_wo_diacritics"),     // "Barcelona"
    subdivisionCode: text("subdivision_code"),         // "B" (Barcelona)
    
    // UNECE 8-position Function classifier flags (e.g. "1234--7-")
    functionClassifier: text("function_classifier").notNull(),
    isPort: integer("is_port", { mode: "boolean" }).notNull().default(false),
    isRailTerminal: integer("is_rail_terminal", { mode: "boolean" }).notNull().default(false),
    isRoadTerminal: integer("is_road_terminal", { mode: "boolean" }).notNull().default(false),
    isAirport: integer("is_airport", { mode: "boolean" }).notNull().default(false),
    isPostalHub: integer("is_postal_hub", { mode: "boolean" }).notNull().default(false),
    isMultimodalIcd: integer("is_multimodal_icd", { mode: "boolean" }).notNull().default(false),
    isBorderCrossing: integer("is_border_crossing", { mode: "boolean" }).notNull().default(false),
    
    // Official UNECE approval status & release date
    status: text("status").notNull().default("RL"), // "AA", "AC", "AI", "RL"
    changeCode: text("change_code"),                // "+", "#", "¦", "X"
    releaseDateYymm: text("release_date_yymm"),     // "2407"
    
    // IATA airport linkage
    iataCode: text("iata_code"),                    // "BCN"
    
    // Coordinates: raw UNECE string + parsed WGS84 decimal coordinates
    rawCoordinates: text("raw_coordinates"),         // "4123N 00211E"
    latitude: real("latitude"),                     // 41.3833
    longitude: real("longitude"),                   // 2.1833
    
    remarks: text("remarks"),
  },
  (table) => ({
    countryIdx: index("idx_unlocode_country").on(table.countryCode),
    nameIdx: index("idx_unlocode_name").on(table.nameWoDiacritics),
    iataIdx: index("idx_unlocode_iata").on(table.iataCode),
    portIdx: index("idx_unlocode_is_port").on(table.isPort),
  })
);
```

---

## 3. UN/EDIFACT & DCSA Data Ingestion Architecture

### 3.1 UN/EDIFACT Envelope Architecture
In international supply chain operations, EDIFACT transmissions arrive structured in standardized segment wrappers:
- `UNB` ... `UNZ`: Interchange Envelope (Sender ID, Receiver ID, Syntax Version, Control Reference, DateTime)
- `UNH` ... `UNT`: Message Envelope (Message Type: `IFTMIN` Shipping Instruction, `IFTSTA` Multimodal Status Event, `DESADV` Despatch Advice, `CUSDEC` Customs Declaration, `INVOIC` Commercial Invoice)
- Business Segments: `BGM` (Message header), `DTM` (Date/Time), `NAD` (Name and Address / Parties), `LOC` (Locations with UN/LOCODE), `TDT` (Transport Details / Vessel & Voyage), `EQD` (Equipment / Container), `MEA` (Weights & Measurements).

Our database already has `edi_interchanges` and `edi_messages` in `src/db/schema/edi.ts`. By ensuring that:
1. `NAD` segment parties map directly to `addresses` (using `address_identifiers` for DUNS/EAN/SCAC qualifiers),
2. `LOC` segment locations map directly to `unlocode_locations`,
3. `EQD` segment containers map directly to `container_iso_types`,
every parsed EDIFACT message immediately enriches the canonical relational database without intermediate loss.

### 3.2 DCSA (Digital Container Shipping Association) Architecture
DCSA standardizes API-based ocean freight data between carriers (Maersk, MSC, CMA CGM, Hapag-Lloyd, ONE) and shippers:
- `DCSA Track & Trace v3.0`: Standardized event hierarchy (`ShipmentEvent`, `TransportEvent`, `EquipmentEvent`) with standard timestamps (`ACT` actual, `EST` estimated, `PLN` planned).
- Transport events link directly to vessel IMO numbers (`marine_vessels.imo_number`) and Port UN/LOCODEs (`unlocode_locations.un_locode`).
- Equipment events link directly to validated ISO 6346 container numbers and ISO type codes (`container_iso_types.iso_code`).
