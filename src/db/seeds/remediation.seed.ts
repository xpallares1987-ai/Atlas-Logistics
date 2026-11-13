/**
 * @file remediation.seed.ts
 * @description Comprehensive SQLite database schema remediation, legacy v1 table cleanup,
 * empty/sparse table deterministic seeding, and relational foreign key backfilling.
 * @module @atlas/backend/db/seeds/remediation
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { client } from "../index.js";

// ============================================================================
// 1. CONSTANTS & LEGACY TABLE DEFINITIONS
// ============================================================================

const LEGACY_V1_TABLES = [
  "cargo_equip_equipment_allocations",
  "cargo_equip_equipment_seals",
  "cargo_equip_equipments",
  "cargo_equip_goods_items",
  "cargo_equip_packages",
  "party_crm_addresses",
  "party_crm_contacts",
  "party_crm_external_identifiers",
  "party_crm_parties",
  "party_crm_relationships",
  "party_crm_roles",
  "shipment_exec_assignments",
  "shipment_exec_party_roles",
  "shipment_exec_references",
  "tracking_estimate_revisions",
  "tracking_milestone_plans",
  "tracking_milestones",
  "tracking_operational_events",
  "transport_plan_route_stops",
  "transport_plan_transport_legs",
  "work_mgmt_task_dependencies",
  "work_mgmt_tasks",
];

// ============================================================================
// 2. STEP 1: SCHEMA, COLUMN HEADER & TYPE REMEDIATION
// ============================================================================

async function remediateSchemaAndTypes(): Promise<void> {
  console.log(
    "🔧 [Remediation Step 1] Dropping 22 superseded legacy v1 tables & fixing column types...",
  );

  await client.execute("PRAGMA foreign_keys = OFF;");
  try {
    for (const table of LEGACY_V1_TABLES) {
      await client.execute(`DROP TABLE IF EXISTS "${table}";`);
    }

    // Check if aeo_business_partners has NUMERIC created_at/updated_at
    const aeoCols = await client.execute(
      `PRAGMA table_info("aeo_business_partners");`,
    );
    const hasNumericTimestamp = aeoCols.rows.some(
      (r) =>
        (r.name === "created_at" || r.name === "updated_at") &&
        String(r.type).toUpperCase().includes("NUMERIC"),
    );

    if (hasNumericTimestamp) {
      await client.execute(`DROP TABLE IF EXISTS "aeo_business_partners_new";`);
      await client.execute(`
        CREATE TABLE "aeo_business_partners_new" (
          id TEXT PRIMARY KEY NOT NULL,
          partner_name TEXT NOT NULL,
          partner_vat_number TEXT NOT NULL UNIQUE,
          partner_type TEXT NOT NULL,
          country_code TEXT NOT NULL DEFAULT 'ES',
          has_aeo_certification INTEGER NOT NULL DEFAULT 0,
          aeo_certificate_number TEXT,
          has_ctpat_certification INTEGER NOT NULL DEFAULT 0,
          ctpat_svi_number TEXT,
          iso28000_certified INTEGER NOT NULL DEFAULT 0,
          security_questionnaire_score REAL NOT NULL DEFAULT 0.0,
          risk_level TEXT NOT NULL DEFAULT 'LOW_RISK',
          last_assessment_date TEXT NOT NULL,
          reassessment_due_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'APPROVED_PARTNER',
          remarks TEXT,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );
      `);
      await client.execute(`
        INSERT INTO "aeo_business_partners_new" (
          id, partner_name, partner_vat_number, partner_type, country_code,
          has_aeo_certification, aeo_certificate_number, has_ctpat_certification,
          ctpat_svi_number, iso28000_certified, security_questionnaire_score,
          risk_level, last_assessment_date, reassessment_due_date, status, remarks,
          created_at, updated_at
        )
        SELECT
          id, partner_name, partner_vat_number, partner_type, country_code,
          has_aeo_certification, aeo_certificate_number, has_ctpat_certification,
          ctpat_svi_number, iso28000_certified, security_questionnaire_score,
          risk_level, last_assessment_date, reassessment_due_date, status, remarks,
          CAST(created_at AS TEXT), CAST(updated_at AS TEXT)
        FROM "aeo_business_partners";
      `);
      await client.execute(`DROP TABLE "aeo_business_partners";`);
      await client.execute(
        `ALTER TABLE "aeo_business_partners_new" RENAME TO "aeo_business_partners";`,
      );
    }

    // Check if control_tower_incidents has extra resolution_note column
    const ctCols = await client.execute(
      `PRAGMA table_info("control_tower_incidents");`,
    );
    const hasResolutionNote = ctCols.rows.some(
      (r) => r.name === "resolution_note",
    );
    if (hasResolutionNote) {
      await client.execute(`
        UPDATE control_tower_incidents
        SET resolution_action = CASE
          WHEN resolution_action IS NOT NULL AND resolution_note IS NOT NULL AND INSTR(resolution_action, resolution_note) = 0
            THEN resolution_action || ' — ' || resolution_note
          WHEN resolution_action IS NULL
            THEN resolution_note
          ELSE resolution_action
        END
        WHERE resolution_note IS NOT NULL;
      `);
      await client.execute(
        `ALTER TABLE control_tower_incidents DROP COLUMN resolution_note;`,
      );
    }
  } finally {
    await client.execute("PRAGMA foreign_keys = ON;");
  }
}

// ============================================================================
// 3. STEP 2: SEED 21 EMPTY DRIZZLE TABLES
// ============================================================================

async function seedEmptyTables(): Promise<void> {
  console.log(
    "🌱 [Remediation Step 2] Seeding 21 empty Drizzle tables with deterministic domain data...",
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();

  // Fetch canonical parent references
  const companiesRes = await client.execute(
    `SELECT id FROM companies ORDER BY CASE WHEN id = 'c-1' THEN 0 ELSE 1 END LIMIT 10;`,
  );
  const companyIds = companiesRes.rows.map((r) => String(r.id));
  const primaryCompanyId = companyIds[0] || "c-1";

  const carriersRes = await client.execute(
    `SELECT id FROM addresses WHERE address_type = 'CAR' LIMIT 10;`,
  );
  const carrierIds = carriersRes.rows.map((r) => String(r.id));

  const shipmentsRes = await client.execute(
    `SELECT id FROM shipments ORDER BY CASE WHEN id = 'sh_demo_01' THEN 0 ELSE 1 END LIMIT 15;`,
  );
  const shipmentIds = shipmentsRes.rows.map((r) => String(r.id));
  const primaryShipmentId = shipmentIds[0] || "sh_demo_01";

  const locationsRes = await client.execute(
    `SELECT id FROM locations LIMIT 15;`,
  );
  const locationIds = locationsRes.rows.map((r) => String(r.id));

  const usersRes = await client.execute(`SELECT id FROM users LIMIT 10;`);
  const userIds = usersRes.rows.map((r) => String(r.id));
  const primaryUserId = userIds[0];

  const invoicesRes = await client.execute(`SELECT * FROM invoices LIMIT 10;`);
  const invoiceRows = invoicesRes.rows;

  const ratesRes = await client.execute(
    `SELECT id, baseRate FROM rates LIMIT 10;`,
  );
  const rateRows = ratesRes.rows;

  const assetsRes = await client.execute(
    `SELECT id FROM tracked_assets LIMIT 10;`,
  );
  const assetIds = assetsRes.rows.map((r) => String(r.id));

  // 1. drivers
  const driversData = [
    ["drv_01", "Carlos Mendoza Navarro", "CE + ADR Class 1-9"],
    ["drv_02", "Elena Rostova", "CE + GDP Pharma Certified"],
    ["drv_03", "Javier Ortega Gil", "CE Heavy Intermodal"],
    ["drv_04", "Marcus Vance", "CDL Class A + TWIC + HazMat"],
    ["drv_05", "Hendrik Van Der Berg", "CE + Port Twill Card RTM"],
    ["drv_06", "Mateo Silva Serra", "CE + Reefer Specialist"],
  ];
  for (const [id, name, license] of driversData) {
    await client.execute({
      sql: `INSERT INTO drivers (id, name, license_type, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, license_type = excluded.license_type, updated_at = excluded.updated_at;`,
      args: [id, name, license, nowSec, nowSec],
    });
  }

  // 2. trucks
  const trucksData: [string, string, number][] = [
    ["trk_01", "4892-MKR (ES)", 26000],
    ["trk_02", "7104-LVP (ES)", 26000],
    ["trk_03", "9281-MDF (ES - EV Heavy)", 24500],
    ["trk_04", "NL-88-BVX-4 (RTM)", 28000],
    ["trk_05", "NJ-APMT-4419 (US)", 25400],
    ["trk_06", "3319-KRT (ES - ADR)", 25000],
  ];
  for (const [id, plate, capacity] of trucksData) {
    await client.execute({
      sql: `INSERT INTO trucks (id, plate_number, capacity, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET plate_number = excluded.plate_number, capacity = excluded.capacity, updated_at = excluded.updated_at;`,
      args: [id, plate, capacity, nowSec, nowSec],
    });
  }

  // 3. equipments
  const equipmentsData = [
    ["eqp_01", "MSKU9284712", "40HC", "IN_TRANSIT", locationIds[0] || null],
    ["eqp_02", "MEDU4491823", "40HC", "AVAILABLE", locationIds[1] || null],
    ["eqp_03", "MAEU7718290", "40RF", "IN_USE", locationIds[2] || null],
    ["eqp_04", "CMAU3391045", "20GP", "AVAILABLE", locationIds[3] || null],
    ["eqp_05", "HLXU8821904", "40HC", "MAINTENANCE", locationIds[4] || null],
    ["eqp_06", "ONEU5501928", "45HC", "IN_TRANSIT", locationIds[0] || null],
  ];
  for (const [id, num, type, status, locId] of equipmentsData) {
    await client.execute({
      sql: `INSERT INTO equipments (id, equipment_number, type, status, current_location_id, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET status = excluded.status, current_location_id = excluded.current_location_id, updated_at = excluded.updated_at;`,
      args: [id, num, type, status, locId, nowSec, nowSec],
    });
  }

  // 4. destination_agents (consolidated in addresses registry with address_type = 'AG')

  // 5. inventory_items
  const invItems = [
    [
      "inv_item_01",
      "SKU-ROBO-A1",
      "Industrial 6-Axis Robotic Arm Unit",
      42,
      "WH-VLC-A01",
    ],
    [
      "inv_item_02",
      "SKU-LITH-B4",
      "Lithium-Ion Battery Module 48V (UN3480)",
      120,
      "WH-BCN-DG02",
    ],
    [
      "inv_item_03",
      "SKU-PHAR-C9",
      "Biologic Cold-Chain Vaccine Pallets (+2C/+8C)",
      18,
      "WH-MAD-CC01",
    ],
    [
      "inv_item_04",
      "SKU-SOLR-D2",
      "Monocrystalline Solar Inverter 100kW",
      85,
      "WH-VLC-B04",
    ],
    [
      "inv_item_05",
      "SKU-AERO-E7",
      "CNC Titanium Aerospace Actuators",
      30,
      "WH-MAD-SEC3",
    ],
    [
      "inv_item_06",
      "SKU-PACK-F1",
      "ISO-17712 High Security Bolt Seals Box",
      500,
      "WH-VLC-SEC1",
    ],
  ];
  for (const [id, sku, name, qty, loc] of invItems) {
    await client.execute({
      sql: `INSERT INTO inventory_items (id, sku, name, quantity, location, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET quantity = excluded.quantity, location = excluded.location, updated_at = excluded.updated_at;`,
      args: [id, sku, name, qty, loc, nowSec, nowSec],
    });
  }

  // 6. telemetry_alerts
  if (assetIds.length > 0) {
    const alertsData = [
      [
        "talert_01",
        assetIds[0],
        "CRITICAL",
        "TEMPERATURE_DEVIATION",
        "Reefer return air temperature reached +8.9°C (threshold +8.0°C)",
        "OPEN",
        "8.9 C",
        "8.0 C",
      ],
      [
        "talert_02",
        assetIds[1 % assetIds.length],
        "HIGH",
        "GEOFENCE_BREACH",
        "Container departed authorized corridor near A-7 Km 310",
        "ACKNOWLEDGED",
        "Outside Corridor",
        "Authorized Route",
      ],
      [
        "talert_03",
        assetIds[2 % assetIds.length],
        "MEDIUM",
        "SHOCK_IMPACT",
        "Vertical acceleration spike 4.2G detected during crane handling",
        "RESOLVED",
        "4.2 G",
        "3.0 G",
      ],
      [
        "talert_04",
        assetIds[3 % assetIds.length],
        "LOW",
        "BATTERY_LOW",
        "IoT cellular gateway battery below 20% charge",
        "OPEN",
        "18%",
        "20%",
      ],
    ];
    for (const [
      id,
      assetId,
      sev,
      type,
      msg,
      status,
      metric,
      thresh,
    ] of alertsData) {
      await client.execute({
        sql: `INSERT INTO telemetry_alerts (id, asset_id, severity, alert_type, message, status, metric_value, threshold_value, created_at, resolved_at, resolved_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET status = excluded.status, metric_value = excluded.metric_value;`,
        args: [
          id,
          assetId,
          sev,
          type,
          msg,
          status,
          metric,
          thresh,
          nowIso,
          status === "RESOLVED" ? nowIso : null,
          status === "RESOLVED" ? "usr_ops_01" : null,
        ],
      });
    }
  }

  // 7. contracts
  for (let i = 0; i < Math.min(6, companyIds.length); i++) {
    const cid = companyIds[i];
    await client.execute({
      sql: `INSERT INTO contracts (id, company_id, title, valid_from, valid_to, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at;`,
      args: [
        `cnt_msa_2026_0${i + 1}`,
        cid,
        `Master Global Freight & Customs Agreement 2026 #${i + 1}`,
        nowSec - 86400 * 90,
        nowSec + 86400 * 275,
        nowSec,
        nowSec,
      ],
    });
  }

  // 8. exchange_rates
  const fxPairs: [string, string, string, number][] = [
    ["fx_eur_usd", "EUR", "USD", 1.0845],
    ["fx_usd_eur", "USD", "EUR", 0.9221],
    ["fx_eur_gbp", "EUR", "GBP", 0.8412],
    ["fx_eur_cny", "EUR", "CNY", 7.825],
    ["fx_eur_mxn", "EUR", "MXN", 21.45],
    ["fx_eur_jpy", "EUR", "JPY", 163.8],
  ];
  for (const [id, base, target, rate] of fxPairs) {
    await client.execute({
      sql: `INSERT INTO exchange_rates (id, base_currency, target_currency, rate, date)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET rate = excluded.rate, date = excluded.date;`,
      args: [id, base, target, rate, nowSec],
    });
  }

  // 9. rate_tiers & 10. rate_change_logs
  for (let i = 0; i < Math.min(6, rateRows.length); i++) {
    const rId = String(rateRows[i].id);
    const baseAmt = Number(rateRows[i].baseRate || 1500);
    await client.execute({
      sql: `INSERT INTO rate_tiers (id, rate_id, min_weight, max_weight, price_per_kg, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET price_per_kg = excluded.price_per_kg, updated_at = excluded.updated_at;`,
      args: [
        `rtier_0${i + 1}`,
        rId,
        1000,
        15000,
        Number((baseAmt / 1000).toFixed(2)),
        nowSec,
        nowSec,
      ],
    });

    await client.execute({
      sql: `INSERT INTO rate_change_logs (id, rate_id, previous_amount, new_amount, changed_by, reason, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET new_amount = excluded.new_amount, reason = excluded.reason;`,
      args: [
        `rchlog_0${i + 1}`,
        rId,
        Math.round(baseAmt * 0.95),
        baseAmt,
        primaryUserId || null,
        "Q4 Bunker Adjustment Factor (BAF) & EU ETS Tariff Indexation",
        nowSec - i * 3600,
      ],
    });
  }

  // 11. costs & 12. revenues
  for (let i = 0; i < Math.min(8, shipmentIds.length); i++) {
    const sId = shipmentIds[i];
    const vId = carrierIds[i % Math.max(1, carrierIds.length)] || null;
    const costAmt = 1850 + i * 320;
    const revAmt = Math.round(costAmt * 1.28);

    await client.execute({
      sql: `INSERT INTO costs (id, shipment_id, vendor_id, amount, currency, description, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, 'EUR', ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at;`,
      args: [
        `cost_0${i + 1}`,
        sId,
        vId,
        costAmt,
        `Ocean Freight FCL + Origin/Destination THC & Drayage (${sId})`,
        nowSec,
        nowSec,
      ],
    });

    await client.execute({
      sql: `INSERT INTO revenues (id, shipment_id, amount, currency, description, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, 'EUR', ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at;`,
      args: [
        `rev_0${i + 1}`,
        sId,
        revAmt,
        `Door-to-Door Multimodal Freight & Customs Clearance Services (${sId})`,
        nowSec,
        nowSec,
      ],
    });
  }

  // 13. payments & 14. invoice_event_logs
  for (let i = 0; i < Math.min(6, invoiceRows.length); i++) {
    const invId = String(invoiceRows[i].id);
    const amt = Number(invoiceRows[i].total || invoiceRows[i].amount || 2450);

    await client.execute({
      sql: `INSERT INTO payments (id, invoice_id, amount, payment_date, reference, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at;`,
      args: [
        `pay_0${i + 1}`,
        invId,
        amt,
        nowSec - i * 86400,
        `SEPA-INST-2026-0098${i + 1}`,
        nowSec,
        nowSec,
      ],
    });

    await client.execute({
      sql: `INSERT INTO invoice_event_logs (id, invoice_id, previous_status, new_status, changed_by, reason, recorded_at)
            VALUES (?, ?, 'PENDING', 'PAID', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET new_status = excluded.new_status;`,
      args: [
        `invelog_0${i + 1}`,
        invId,
        primaryUserId || null,
        "Automated SEPA XML ISO 20022 camt.054 bank reconciliation match",
        nowSec - i * 43200,
      ],
    });
  }

  // 15. customs_event_logs
  const customsEvents = [
    [
      "cevlog_01",
      primaryShipmentId,
      "ENS_ICS2_SUBMITTED",
      "EU ICS2 Release 3 Entry Summary Declaration MRN accepted",
    ],
    [
      "cevlog_02",
      primaryShipmentId,
      "DUA_REGISTERED",
      "Export SAD/DUA declaration registered with AEAT Valencia Customs",
    ],
    [
      "cevlog_03",
      primaryShipmentId,
      "RISK_CIRCUIT_GREEN",
      "Automated AEAT risk analysis assigned GREEN channel (Immediate Release)",
    ],
    [
      "cevlog_04",
      shipmentIds[1] || primaryShipmentId,
      "DOC_CHECK_ORANGE",
      "Documentary inspection requested for preferential EUR.1 certificate",
    ],
    [
      "cevlog_05",
      shipmentIds[2] || primaryShipmentId,
      "CUSTOMS_CLEARED",
      "Import duty assessment settled and terminal gate-out release authorized",
    ],
    [
      "cevlog_06",
      shipmentIds[3] || primaryShipmentId,
      "T1_TRANSIT_OPENED",
      "NCTS Phase 5 T1 external community transit guarantee activated",
    ],
  ];
  for (const [id, sId, evType, desc] of customsEvents) {
    await client.execute({
      sql: `INSERT INTO customs_event_logs (id, shipment_id, event_type, description, recorded_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET description = excluded.description;`,
      args: [id, sId, evType, desc, nowSec],
    });
  }

  // 16. audit_logs
  const auditEntries = [
    [
      1,
      "shipments",
      primaryShipmentId,
      "UPDATE",
      '{"status":"BOOKED"}',
      '{"status":"IN_TRANSIT"}',
    ],
    [
      2,
      "demurrage_invoices",
      "dinv_sh_demo_01",
      "DISPUTE_FILED",
      '{"status":"OPEN"}',
      '{"status":"DISPUTED"}',
    ],
    [
      3,
      "container_stowage_plans",
      "stow_cnt_msku_9284712",
      "CERTIFY",
      '{"stability_certified":0}',
      '{"stability_certified":1}',
    ],
    [
      4,
      "control_tower_incidents",
      "inc_001",
      "REROUTE_PROPOSED",
      '{"status":"OPEN"}',
      '{"status":"ANALYZING"}',
    ],
    [
      5,
      "ocean_booking_details",
      "bkg_sh_demo_01",
      "VGM_CERTIFIED",
      '{"vgm":"PENDING"}',
      '{"verifiedGrossMassKg":28450}',
    ],
    [
      6,
      "smart_escrow_contracts",
      "sc_sh_demo_01",
      "MILESTONE_RELEASE",
      '{"completed":2}',
      '{"completed":3}',
    ],
  ];
  for (const [id, tbl, recId, act, oldD, newD] of auditEntries) {
    await client.execute({
      sql: `INSERT INTO audit_logs (id, table_name, record_id, action, old_data, new_data, created_at, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET action = excluded.action, new_data = excluded.new_data;`,
      args: [
        id,
        tbl,
        recId,
        act,
        oldD,
        newD,
        nowSec,
        primaryUserId || "usr_ops_01",
      ],
    });
  }

  // 17. notifications
  if (primaryUserId) {
    const notifs = [
      [
        "notif_01",
        primaryUserId,
        "FMC OSRA 2022 Dispute Filed",
        "Demurrage invoice INV-DEM-2026-9921 ($1,400) placed under formal dispute.",
        0,
      ],
      [
        "notif_02",
        primaryUserId,
        "SOLAS VGM Certified",
        "Container MSKU9284712 verified gross mass certified at 28,450 kg.",
        0,
      ],
      [
        "notif_03",
        primaryUserId,
        "ICS2 Pre-Arrival Cleared",
        "Entry Summary Declaration for shipment sh_demo_01 assigned GREEN circuit.",
        1,
      ],
      [
        "notif_04",
        primaryUserId,
        "3D Stowage Plan Approved",
        "Chief Mate Roberts certified stability & axle load distribution for MSKU9284712.",
        1,
      ],
      [
        "notif_05",
        primaryUserId,
        "Control Tower Alert",
        "Stevedore strike reported at Valencia Port Terminal; 2 intermodal reroutes generated.",
        0,
      ],
    ];
    for (const [id, uId, title, msg, read] of notifs) {
      await client.execute({
        sql: `INSERT INTO notifications (id, user_id, title, message, read, created_at, updated_at, is_deleted, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
              ON CONFLICT(id) DO UPDATE SET title = excluded.title, message = excluded.message;`,
        args: [id, uId, title, msg, read, nowSec, nowSec],
      });
    }
  }

  // 18. pending_ai_reviews
  const aiReviews = [
    [
      "airev_01",
      primaryShipmentId,
      "/documents/bl_msku9284712.pdf",
      "PENDING_REVIEW",
      '{"confidence":0.97,"extractedHsCode":"8479.89.97","consignee":"American Logistic Hub LLC"}',
    ],
    [
      "airev_02",
      shipmentIds[1] || primaryShipmentId,
      "/documents/commercial_inv_2026_88.pdf",
      "APPROVED",
      '{"confidence":0.99,"invoiceTotalUsd":145000,"incoterm":"CIF"}',
    ],
    [
      "airev_03",
      shipmentIds[2] || primaryShipmentId,
      "/documents/dgd_imdg_un3480.pdf",
      "PENDING_REVIEW",
      '{"confidence":0.94,"unNumber":"UN3480","class":"9","packingGroup":"II"}',
    ],
    [
      "airev_04",
      shipmentIds[3] || primaryShipmentId,
      "/documents/phytosanitary_esalg.pdf",
      "APPROVED",
      '{"confidence":0.98,"origin":"ES","inspectionPassed":true}',
    ],
  ];
  for (const [id, sId, url, status, result] of aiReviews) {
    await client.execute({
      sql: `INSERT INTO pending_ai_reviews (id, shipment_id, document_url, status, result, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET status = excluded.status, result = excluded.result;`,
      args: [id, sId, url, status, result, nowSec, nowSec],
    });
  }

  // 19. platform_gov_command_idempotency_v2
  const idempCmds = [
    [
      "cmd_key_sh_demo_01_create",
      "CreateShipmentCommand",
      primaryShipmentId,
      '{"status":"APPLIED","version":1}',
    ],
    [
      "cmd_key_sh_demo_01_vgm",
      "CertifyContainerVgmCommand",
      "cnt_msku_9284712",
      '{"status":"APPLIED","vgmKg":28450}',
    ],
    [
      "cmd_key_sh_demo_01_stow",
      "CertifyStowagePlanCommand",
      "stow_cnt_msku_9284712",
      '{"status":"APPLIED","balanced":true}',
    ],
    [
      "cmd_key_sh_demo_01_customs",
      "RecordCustomsReleaseCommand",
      primaryShipmentId,
      '{"status":"APPLIED","channel":"GREEN"}',
    ],
  ];
  for (const [key, name, entId, resJson] of idempCmds) {
    await client.execute({
      sql: `INSERT INTO platform_gov_command_idempotency_v2 (command_key, command_name, entity_id, result_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(command_key) DO UPDATE SET result_json = excluded.result_json;`,
      args: [key, name, entId, resJson, nowSec],
    });
  }

  // 20. system_sequences
  const sequences: [string, number, string][] = [
    ["SHIPMENT_SEQ", 10450, "SHP-2026-"],
    ["BOOKING_SEQ", 67200, "BK-2026-"],
    ["INVOICE_SEQ", 89200, "INV-2026-"],
    ["QUOTE_SEQ", 18100, "QT-2026-"],
    ["INCIDENT_SEQ", 850, "INC-2026-"],
    ["DISPUTE_SEQ", 120, "DSP-2026-"],
  ];
  for (const [name, val, prefix] of sequences) {
    await client.execute({
      sql: `INSERT INTO system_sequences (name, current_value, prefix)
            VALUES (?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET current_value = excluded.current_value, prefix = excluded.prefix;`,
      args: [name, val, prefix],
    });
  }

  // 21. workflows
  const workflowsData = [
    [
      "wf_ocean_fcl_export",
      "Standard Ocean FCL Export Lifecycle (DCSA 3.0)",
      "End-to-end BPMN orchestration from booking confirmation and VGM certification to e-BL issuance.",
      '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_OceanFCL"><bpmn:process id="Process_OceanFCL" isExecutable="true"><bpmn:startEvent id="StartEvent_1" name="Booking Confirmed"/><bpmn:task id="Task_VGM" name="SOLAS VGM Verification"/><bpmn:endEvent id="EndEvent_1" name="e-BL Issued"/></bpmn:process></bpmn:definitions>',
      "ACTIVE",
    ],
    [
      "wf_fmc_demurrage_dispute",
      "FMC OSRA 2022 Demurrage Clock-Stop Dispute Workflow",
      "Automated validation of terminal gate-out unavailability and customs holds against carrier D&D invoices.",
      '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_FMC"><bpmn:process id="Process_FMC" isExecutable="true"><bpmn:startEvent id="Start_Invoice" name="D&amp;D Invoice Received"/><bpmn:task id="Task_Audit" name="Clock-Stop Evidence Audit"/><bpmn:endEvent id="End_Dispute" name="FMC Claim Submitted"/></bpmn:process></bpmn:definitions>',
      "ACTIVE",
    ],
    [
      "wf_cold_chain_gdp",
      "EU GDP Pharma Cold Chain Excursion Triage",
      "Real-time IoT thermal excursion detection, Mean Kinetic Temperature (MKT) calculation, and QP release.",
      '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_GDP"><bpmn:process id="Process_GDP" isExecutable="true"><bpmn:startEvent id="Start_Alert" name="Thermal Alert"/><bpmn:task id="Task_MKT" name="Calculate MKT"/><bpmn:endEvent id="End_Release" name="QP Batch Decision"/></bpmn:process></bpmn:definitions>',
      "ACTIVE",
    ],
  ];
  for (const [id, name, desc, xml, status] of workflowsData) {
    await client.execute({
      sql: `INSERT INTO workflows (id, name, description, xml_data, status, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at;`,
      args: [id, name, desc, xml, status, nowSec, nowSec],
    });
  }
}

// ============================================================================
// 4. STEP 3: ENRICH SPARSE TABLES (CONTAINER STOWAGE, DEMURRAGE, BOOKINGS, ETC.)
// ============================================================================

async function enrichSparseTables(): Promise<void> {
  console.log(
    "📦 [Remediation Step 3] Enriching sparse tables (container_stowage_plans, demurrage_invoices, etc.)...",
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const nowMs = Date.now();
  const nowIso = new Date().toISOString();

  // Fetch valid containers & shipments for container_stowage_plans
  const containersRes = await client.execute(`
    SELECT id, shipment_id
    FROM shipment_containers
    WHERE id != 'cnt_msku_9284712'
    LIMIT 6;
  `);

  const extraStowagePlans = [
    {
      id: "stow_cnt_02_40hc",
      cargoWeight: 22100,
      maxPayload: 28450,
      tareWeight: 3950,
      volUtil: 81.2,
      wtUtil: 77.7,
      cog: JSON.stringify({
        x: -0.02,
        y: 1.08,
        z: 0.05,
        deviationMm: 22,
        isBalanced: true,
      }),
      axle: JSON.stringify({
        steerAxleKg: 5650,
        driveAxleKg: 15800,
        trailerTridemKg: 20100,
        gcvwKg: 41550,
        isCompliant: true,
        maxLegalGcvwKg: 44000,
      }),
      seq: JSON.stringify([
        {
          id: "ci_201",
          label: "Automotive Stamping Dies A",
          x: -0.5,
          y: 0.7,
          z: -3.8,
          width: 1.1,
          height: 1.2,
          depth: 1.4,
          weight: 5800,
          color: "#3b82f6",
        },
        {
          id: "ci_202",
          label: "Automotive Stamping Dies B",
          x: 0.5,
          y: 0.7,
          z: -3.8,
          width: 1.1,
          height: 1.2,
          depth: 1.4,
          weight: 5800,
          color: "#60a5fa",
        },
        {
          id: "ci_203",
          label: "EV Battery Enclosures Crate",
          x: 0.0,
          y: 0.9,
          z: 0.4,
          width: 2.1,
          height: 1.5,
          depth: 2.2,
          weight: 6200,
          color: "#10b981",
        },
        {
          id: "ci_204",
          label: "Powertrain Control Modules",
          x: 0.0,
          y: 0.8,
          z: 3.6,
          width: 2.0,
          height: 1.4,
          depth: 1.8,
          weight: 4300,
          color: "#f59e0b",
        },
      ]),
    },
    {
      id: "stow_cnt_03_20gp",
      cargoWeight: 19800,
      maxPayload: 21700,
      tareWeight: 2300,
      volUtil: 76.4,
      wtUtil: 91.2,
      cog: JSON.stringify({
        x: 0.01,
        y: 0.95,
        z: -0.04,
        deviationMm: 18,
        isBalanced: true,
      }),
      axle: JSON.stringify({
        steerAxleKg: 5400,
        driveAxleKg: 15200,
        trailerTridemKg: 18900,
        gcvwKg: 39500,
        isCompliant: true,
        maxLegalGcvwKg: 44000,
      }),
      seq: JSON.stringify([
        {
          id: "ci_301",
          label: "Copper Cathode Bundles #1",
          x: -0.5,
          y: 0.5,
          z: -1.5,
          width: 1.0,
          height: 0.9,
          depth: 1.2,
          weight: 6600,
          color: "#f97316",
        },
        {
          id: "ci_302",
          label: "Copper Cathode Bundles #2",
          x: 0.5,
          y: 0.5,
          z: -1.5,
          width: 1.0,
          height: 0.9,
          depth: 1.2,
          weight: 6600,
          color: "#fb923c",
        },
        {
          id: "ci_303",
          label: "Industrial Transformer Core",
          x: 0.0,
          y: 0.8,
          z: 1.4,
          width: 1.8,
          height: 1.4,
          depth: 1.6,
          weight: 6600,
          color: "#6366f1",
        },
      ]),
    },
    {
      id: "stow_cnt_04_40rf",
      cargoWeight: 18400,
      maxPayload: 27700,
      tareWeight: 4800,
      volUtil: 88.5,
      wtUtil: 66.4,
      cog: JSON.stringify({
        x: 0.0,
        y: 1.12,
        z: 0.02,
        deviationMm: 14,
        isBalanced: true,
      }),
      axle: JSON.stringify({
        steerAxleKg: 5500,
        driveAxleKg: 14900,
        trailerTridemKg: 19200,
        gcvwKg: 39600,
        isCompliant: true,
        maxLegalGcvwKg: 44000,
      }),
      seq: JSON.stringify([
        {
          id: "ci_401",
          label: "Biopharma Euro-Pallets Row 1",
          x: -0.5,
          y: 0.9,
          z: -3.5,
          width: 1.0,
          height: 1.6,
          depth: 2.4,
          weight: 4600,
          color: "#06b6d4",
        },
        {
          id: "ci_402",
          label: "Biopharma Euro-Pallets Row 2",
          x: 0.5,
          y: 0.9,
          z: -3.5,
          width: 1.0,
          height: 1.6,
          depth: 2.4,
          weight: 4600,
          color: "#22d3ee",
        },
        {
          id: "ci_403",
          label: "Cold-Chain Insulin Kits Row 3",
          x: -0.5,
          y: 0.9,
          z: 1.8,
          width: 1.0,
          height: 1.6,
          depth: 2.4,
          weight: 4600,
          color: "#0ea5e9",
        },
        {
          id: "ci_404",
          label: "Cold-Chain Insulin Kits Row 4",
          x: 0.5,
          y: 0.9,
          z: 1.8,
          width: 1.0,
          height: 1.6,
          depth: 2.4,
          weight: 4600,
          color: "#38bdf8",
        },
      ]),
    },
    {
      id: "stow_cnt_05_eccentric",
      cargoWeight: 26800,
      maxPayload: 28450,
      tareWeight: 3950,
      volUtil: 91.0,
      wtUtil: 94.2,
      cog: JSON.stringify({
        x: 0.19,
        y: 1.34,
        z: 0.45,
        deviationMm: 142,
        isBalanced: false,
      }),
      axle: JSON.stringify({
        steerAxleKg: 6100,
        driveAxleKg: 17900,
        trailerTridemKg: 23200,
        gcvwKg: 47200,
        isCompliant: false,
        maxLegalGcvwKg: 44000,
      }),
      seq: JSON.stringify([
        {
          id: "ci_501",
          label: "Heavy Turbine Rotor Assembly",
          x: 0.35,
          y: 1.1,
          z: -2.0,
          width: 1.5,
          height: 1.9,
          depth: 2.8,
          weight: 14200,
          color: "#ef4444",
        },
        {
          id: "ci_502",
          label: "Steel Counterweight Skids",
          x: -0.4,
          y: 0.6,
          z: 2.2,
          width: 1.2,
          height: 1.0,
          depth: 2.0,
          weight: 7600,
          color: "#f97316",
        },
        {
          id: "ci_503",
          label: "Auxiliary Control Cabinets",
          x: 0.4,
          y: 0.8,
          z: 3.8,
          width: 1.1,
          height: 1.5,
          depth: 1.4,
          weight: 5000,
          color: "#eab308",
        },
      ]),
    },
  ];

  for (
    let i = 0;
    i < Math.min(extraStowagePlans.length, containersRes.rows.length);
    i++
  ) {
    const cnt = containersRes.rows[i];
    const plan = extraStowagePlans[i];
    await client.execute({
      sql: `INSERT INTO container_stowage_plans (
              id, container_id, shipment_id, total_cargo_weight_kg, max_payload_kg, tare_weight_kg,
              volume_utilization_percent, weight_utilization_percent, center_of_gravity_json,
              axle_load_distribution_json, stability_certified, certified_by, certified_at,
              stowage_sequence_json, created_at, updated_at, is_deleted, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET
              total_cargo_weight_kg = excluded.total_cargo_weight_kg,
              center_of_gravity_json = excluded.center_of_gravity_json,
              stowage_sequence_json = excluded.stowage_sequence_json,
              updated_at = excluded.updated_at;`,
      args: [
        plan.id,
        String(cnt.id),
        String(cnt.shipment_id),
        plan.cargoWeight,
        plan.maxPayload,
        plan.tareWeight,
        plan.volUtil,
        plan.wtUtil,
        plan.cog,
        plan.axle,
        i === 3 ? 0 : 1,
        i === 3 ? null : "Loadmaster Elena Vance (CTU Code Auditor)",
        i === 3 ? null : nowSec,
        plan.seq,
        nowSec,
        nowSec,
      ],
    });
  }

  // Enrich demurrage_invoices (add 4 more realistic FMC demurrage invoices)
  const shipmentsRes = await client.execute(
    `SELECT id FROM shipments WHERE id != 'sh_demo_01' LIMIT 6;`,
  );
  const sIds = shipmentsRes.rows.map((r) => String(r.id));
  if (sIds.length >= 4) {
    const extraDemInvoices = [
      [
        "dinv_02",
        sIds[0],
        "INV-DEM-2026-9922",
        "MEDU4491823",
        "MSCU",
        "MSC Mediterranean Shipping Co.",
        "BL-MSCU-2026-7712",
        "Port of Rotterdam (NLRTM)",
        "Rotterdam World Gateway (RWG)",
        5,
        160,
        1120,
        "AUDITED",
        1,
      ],
      [
        "dinv_03",
        sIds[1],
        "INV-DEM-2026-9923",
        "CMAU3391045",
        "CMDU",
        "CMA CGM S.A.",
        "BL-CMDU-2026-8834",
        "Port of Valencia (ESVLC)",
        "CSP Iberian Valencia Terminal",
        7,
        145,
        870,
        "DISPUTED",
        0,
      ],
      [
        "dinv_04",
        sIds[2],
        "INV-DEM-2026-9924",
        "HLXU8821904",
        "HLCU",
        "Hapag-Lloyd AG",
        "BL-HLCU-2026-5519",
        "Port of Hamburg (DEHAM)",
        "HHLA Container Terminal Altenwerder",
        4,
        190,
        950,
        "MITIGATED",
        1,
      ],
      [
        "dinv_05",
        sIds[3],
        "INV-DEM-2026-9925",
        "ONEU5501928",
        "ONEY",
        "Ocean Network Express",
        "BL-ONEY-2026-3390",
        "Port of Savannah (USSAV)",
        "Garden City Terminal",
        4,
        210,
        1680,
        "DISPUTED",
        0,
      ],
    ];
    for (const [
      id,
      sId,
      invNum,
      cntNum,
      scac,
      cName,
      bl,
      pod,
      term,
      freeDays,
      rate,
      total,
      status,
      fmc,
    ] of extraDemInvoices) {
      await client.execute({
        sql: `INSERT INTO demurrage_invoices (
                id, shipment_id, invoice_number, container_number, carrier_scac, carrier_name,
                bill_of_lading, pod, terminal_name, vessel_discharge_date, gate_in_date,
                available_date, free_time_start_date, free_time_end_date, free_days_granted,
                daily_rate_usd, total_invoiced_usd, status, fmc_compliant, tariff_tiers_json,
                created_at, updated_at, is_deleted, is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-10-20T08:00:00Z', '2026-10-20T10:00:00Z',
                        '2026-10-20T14:00:00Z', '2026-10-21T00:00:00Z', '2026-10-25T23:59:59Z',
                        ?, ?, ?, ?, ?, '[{"fromDay":1,"toDay":5,"dailyRate":160,"currency":"USD"}]', ?, ?, 0, 1)
              ON CONFLICT(id) DO UPDATE SET status = excluded.status, total_invoiced_usd = excluded.total_invoiced_usd;`,
        args: [
          id,
          sId,
          invNum,
          cntNum,
          scac,
          cName,
          bl,
          pod,
          term,
          freeDays,
          rate,
          total,
          status,
          fmc,
          nowSec,
          nowSec,
        ],
      });
    }
  }

  // Enrich ocean_booking_details
  const bookingsRes = await client.execute(
    `SELECT id FROM bookings WHERE id != 'bk_demo_01' LIMIT 4;`,
  );
  const bIds = bookingsRes.rows.map((r) => String(r.id));
  for (let i = 0; i < Math.min(3, bIds.length, sIds.length); i++) {
    await client.execute({
      sql: `INSERT INTO ocean_booking_details (
              id, booking_id, shipment_id, carrier_scac, service_contract_number,
              cargo_cut_off, vcs_cut_off, doc_cut_off, si_cut_off, si_status, draft_bl_status,
              hazardous_declaration, special_instructions, vgm_json, created_at, updated_at, is_deleted, is_active
            ) VALUES (?, ?, ?, ?, ?, '2026-11-15T18:00:00Z', '2026-11-16T12:00:00Z', '2026-11-16T16:00:00Z', '2026-11-17T10:00:00Z',
                      'SUBMITTED', 'APPROVED', '{"isHazardous":false}', 'Under-deck stowage away from boilers.',
                      '{"verifiedGrossMassKg":24200,"sealNumber":"ISO-17712-H-99120","certifiedBy":"Atlas Terminal Scale"}', ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET si_status = excluded.si_status, updated_at = excluded.updated_at;`,
      args: [
        `obkg_extra_0${i + 1}`,
        bIds[i],
        sIds[i],
        i % 2 === 0 ? "MAEU" : "CMDU",
        `SC-GLOBAL-2026-00${i + 1}`,
        nowSec,
        nowSec,
      ],
    });
  }

  // Enrich smart_escrow_contracts
  for (let i = 0; i < Math.min(3, sIds.length); i++) {
    await client.execute({
      sql: `INSERT INTO smart_escrow_contracts (
              id, shipment_id, title, description, carrier_scac, shipper_name, consignee_name,
              escrow_amount_eur, escrow_status, ebl_data_json, milestones_data_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'Iberia Global Exports S.L.', 'Northern Europe Distribution GmbH',
                      ?, 'MILESTONE_IN_PROGRESS',
                      '{"eblNumber":"BL-ATLS-2026-9910","status":"ISSUED"}',
                      '{"EBL_ISSUED":{"title":"e-BL Issued","percentage":30,"completed":true},"CUSTOMS_CLEARED":{"title":"Customs Cleared","percentage":70,"completed":false}}',
                      ?, ?)
            ON CONFLICT(id) DO UPDATE SET escrow_amount_eur = excluded.escrow_amount_eur, updated_at = excluded.updated_at;`,
      args: [
        `sc_extra_0${i + 1}`,
        sIds[i],
        `MLETR Trade Escrow #${i + 2} — Automated DCSA Milestone Settlement`,
        "Programmable escrow governed by DCSA 3.0 event oracle and AEAT customs levante.",
        i % 2 === 0 ? "MAEU" : "HLCU",
        88500 + i * 15000,
        nowMs,
        nowMs,
      ],
    });
  }

  // Enrich erp_purchase_orders
  for (let i = 0; i < Math.min(3, sIds.length); i++) {
    await client.execute({
      sql: `INSERT INTO erp_purchase_orders (
              id, po_number, erp_system, shipment_id, vendor_name, company_code, purchasing_group,
              total_amount, currency, status, line_items_json, grn_number, freight_accrual_doc_number, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, '1000', 'P02', ?, 'EUR', 'THREE_WAY_MATCHED',
                      '[{"material":"MAT-SERVO-X","description":"High-Torque Servo Actuators","quantity":200,"unitPriceEur":420,"netValueEur":84000}]',
                      ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at;`,
      args: [
        `po_extra_0${i + 1}`,
        `450099100${i + 1}`,
        i % 2 === 0 ? "SAP_S4HANA" : "ORACLE_NETSUITE",
        sIds[i],
        `Precision Components Partner #${i + 1}`,
        84000 + i * 12000,
        `500029100${i + 1}`,
        `490028100${i + 1}`,
        nowMs,
        nowMs,
      ],
    });
  }

  // Enrich carta_porte_declarations
  for (let i = 0; i < Math.min(2, sIds.length); i++) {
    await client.execute({
      sql: `INSERT INTO carta_porte_declarations (
              id, shipment_id, id_ccp, transporte_tipo, rfc_emisor, rfc_receptor,
              origen_json, destino_json, vehiculo_json, operador_json, mercancias_json,
              rvc_percentage, immex_pedimento_tipo, customs_dwell_hours_predicted, status, created_at, updated_at
            ) VALUES (?, ?, ?, 'AUTOTRANSPORTE_FEDERAL', 'TLM010101XYZ', 'AME981012ABC',
                      '{"tipoUbicacion":"Origen","nombre":"Monterrey Industrial Park"}',
                      '{"tipoUbicacion":"Destino","nombre":"Laredo World Trade Bridge TX"}',
                      '{"configVehicular":"T3S2","placa":"84-BB-9C"}',
                      '{"nombre":"Ricardo Garza","numLicencia":"LIC-FED-NL-0412"}',
                      '[{"descripcion":"Automotive Wiring Harnesses","cantidad":320,"pesoKg":18500}]',
                      82.4, 'IN', 2.8, 'STAMPED', ?, ?)
            ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at;`,
      args: [
        `cp_extra_0${i + 1}`,
        sIds[i],
        `CCC99X88A77B66C55D44E33F22G11H0${i + 1}`,
        nowMs,
        nowMs,
      ],
    });
  }

  // Enrich fuel_eu_pools & link fuel_eu_penalties_ledger.pool_offset_id
  await client.execute({
    sql: `INSERT INTO fuel_eu_pools (
            id, pool_code, pool_name, reporting_year, managing_operator_name,
            total_enrolled_vessels_count, consolidated_net_compliance_balance_gco2eq,
            is_pool_compliant_zero_penalty, status, remarks, created_at, updated_at
          ) VALUES (
            'pool_atlantic_bio_2026', 'POOL-2026-ATLANTIC-BIO', 'Atlantic Bio-LNG & E-Methanol Compliance Pool 2026',
            2026, 'Atlas Maritime Fleet Management S.A.', 4, 240500, 1, 'VERIFIED_THETIS_MRV',
            'Article 21 Regulation (EU) 2023/1805 verified pooling arrangement across 4 container vessels.',
            ?, ?
          )
          ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at;`,
    args: [nowIso, nowIso],
  });

  await client.execute(`
    UPDATE fuel_eu_penalties_ledger
    SET pool_offset_id = 'pool_atlas_green_2025'
    WHERE pool_offset_id IS NULL;
  `);
}

// ============================================================================
// 5. STEP 4: BACKFILL 100% NULL RELATIONAL FOREIGN KEYS & CORE COLUMNS
// ============================================================================

async function backfillNullForeignKeys(): Promise<void> {
  console.log(
    "🔗 [Remediation Step 4] Backfilling 100% NULL relational foreign keys & attributes...",
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();

  // Fetch canonical parent IDs
  const companiesRes = await client.execute(
    `SELECT id FROM companies ORDER BY CASE WHEN id = 'c-1' THEN 0 ELSE 1 END LIMIT 25;`,
  );
  const companyIds = companiesRes.rows.map((r) => String(r.id));

  const shipmentsRes = await client.execute(
    `SELECT id FROM shipments ORDER BY CASE WHEN id = 'sh_demo_01' THEN 0 ELSE 1 END LIMIT 50;`,
  );
  const shipmentIds = shipmentsRes.rows.map((r) => String(r.id));

  const locationsRes = await client.execute(
    `SELECT id FROM locations LIMIT 50;`,
  );
  const locationIds = locationsRes.rows.map((r) => String(r.id));

  const usersRes = await client.execute(`SELECT id FROM users LIMIT 15;`);
  const userIds = usersRes.rows.map((r) => String(r.id));

  const docsRes = await client.execute(`SELECT id FROM documents LIMIT 40;`);
  const docIds = docsRes.rows.map((r) => String(r.id));

  const quotesRes = await client.execute(`SELECT id FROM quotes LIMIT 40;`);
  const quoteIds = quotesRes.rows.map((r) => String(r.id));

  const carrierInvsRes = await client.execute(
    `SELECT id FROM carrier_invoices LIMIT 10;`,
  );
  const carrierInvIds = carrierInvsRes.rows.map((r) => String(r.id));

  const carrierLinesRes = await client.execute(
    `SELECT id FROM carrier_invoice_lines LIMIT 15;`,
  );
  const carrierLineIds = carrierLinesRes.rows.map((r) => String(r.id));

  const assetsRes = await client.execute(
    `SELECT id FROM tracked_assets LIMIT 10;`,
  );
  const assetIds = assetsRes.rows.map((r) => String(r.id));

  const carriersRes = await client.execute(
    `SELECT id FROM addresses WHERE address_type = 'CAR' LIMIT 10;`,
  );
  const carrierIds = carriersRes.rows.map((r) => String(r.id));

  // 1. cold_chain_shipments.shipment_id -> shipments.id
  if (shipmentIds.length > 0) {
    const ccRows = await client.execute(
      `SELECT id FROM cold_chain_shipments WHERE shipment_id IS NULL;`,
    );
    for (let i = 0; i < ccRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE cold_chain_shipments SET shipment_id = ? WHERE id = ?;`,
        args: [shipmentIds[i % shipmentIds.length], String(ccRows.rows[i].id)],
      });
    }
  }

  // 2. carrier_invoices.carrier_id -> companies.id
  if (companyIds.length > 0) {
    const ciRows = await client.execute(
      `SELECT id FROM carrier_invoices WHERE carrier_id IS NULL;`,
    );
    for (let i = 0; i < ciRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE carrier_invoices SET carrier_id = ? WHERE id = ?;`,
        args: [companyIds[i % companyIds.length], String(ciRows.rows[i].id)],
      });
    }
  }

  // 3. carrier_invoice_lines.shipment_id -> shipments.id
  if (shipmentIds.length > 0) {
    const cilRows = await client.execute(
      `SELECT id FROM carrier_invoice_lines WHERE shipment_id IS NULL;`,
    );
    for (let i = 0; i < cilRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE carrier_invoice_lines SET shipment_id = ? WHERE id = ?;`,
        args: [shipmentIds[i % shipmentIds.length], String(cilRows.rows[i].id)],
      });
    }
  }

  // 4. freight_audit_disputes: carrier_invoice_id, invoice_line_id, carrier_response_date
  if (carrierInvIds.length > 0) {
    const fadRows = await client.execute(
      `SELECT id FROM freight_audit_disputes;`,
    );
    for (let i = 0; i < fadRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE freight_audit_disputes
              SET carrier_invoice_id = COALESCE(carrier_invoice_id, ?),
                  invoice_line_id = COALESCE(invoice_line_id, ?),
                  carrier_response_date = COALESCE(carrier_response_date, ?)
              WHERE id = ?;`,
        args: [
          carrierInvIds[i % carrierInvIds.length],
          carrierLineIds[i % Math.max(1, carrierLineIds.length)] || null,
          "2026-11-05T14:30:00Z",
          String(fadRows.rows[i].id),
        ],
      });
    }
  }

  // 5. aeo_audits.company_id & aeo_cae_questionnaire_sections.action_plan_required
  if (companyIds.length > 0) {
    const aeoRows = await client.execute(
      `SELECT id FROM aeo_audits WHERE company_id IS NULL;`,
    );
    for (let i = 0; i < aeoRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE aeo_audits SET company_id = ? WHERE id = ?;`,
        args: [companyIds[i % companyIds.length], String(aeoRows.rows[i].id)],
      });
    }
  }
  await client.execute(`
    UPDATE aeo_cae_questionnaire_sections
    SET action_plan_required = CASE
      WHEN block_status = 'COMPLIANT' THEN 'NONE — Periodic annual internal audit verification only'
      ELSE 'CAPA-2026-AEO: Upgrade digital customs archive retention & access logs within 30 days'
    END
    WHERE action_plan_required IS NULL;
  `);

  // 6. trade_credit_instruments.applicant_company_id -> companies.id
  if (companyIds.length > 0) {
    const tciRows = await client.execute(
      `SELECT id FROM trade_credit_instruments WHERE applicant_company_id IS NULL;`,
    );
    for (let i = 0; i < tciRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE trade_credit_instruments SET applicant_company_id = ? WHERE id = ?;`,
        args: [companyIds[i % companyIds.length], String(tciRows.rows[i].id)],
      });
    }
  }

  // 7. mletr_transferable_records.document_id -> documents.id
  if (docIds.length > 0) {
    const mletrRows = await client.execute(
      `SELECT id FROM mletr_transferable_records WHERE document_id IS NULL;`,
    );
    for (let i = 0; i < mletrRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE mletr_transferable_records SET document_id = ? WHERE id = ?;`,
        args: [docIds[i % docIds.length], String(mletrRows.rows[i].id)],
      });
    }
  }

  // 8. edi_messages.shipment_id & edi_partners.company_id
  if (shipmentIds.length > 0) {
    const ediMsgRows = await client.execute(
      `SELECT id FROM edi_messages WHERE shipment_id IS NULL;`,
    );
    for (let i = 0; i < ediMsgRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE edi_messages SET shipment_id = ?, updated_at = ? WHERE id = ?;`,
        args: [
          shipmentIds[i % shipmentIds.length],
          nowSec,
          String(ediMsgRows.rows[i].id),
        ],
      });
    }
  }
  if (companyIds.length > 0) {
    const ediPartRows = await client.execute(
      `SELECT id FROM edi_partners WHERE company_id IS NULL;`,
    );
    for (let i = 0; i < ediPartRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE edi_partners SET company_id = ?, updated_at = ? WHERE id = ?;`,
        args: [
          companyIds[i % companyIds.length],
          nowSec,
          String(ediPartRows.rows[i].id),
        ],
      });
    }
  }

  // 9. warehouse_traffic.shipment_id & driver_name
  if (shipmentIds.length > 0) {
    const wtRows = await client.execute(
      `SELECT id FROM warehouse_traffic WHERE shipment_id IS NULL;`,
    );
    const drvNames = [
      "Carlos Mendoza",
      "Elena Rostova",
      "Javier Ortega",
      "Marcus Vance",
      "Hendrik Van Der Berg",
    ];
    for (let i = 0; i < wtRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE warehouse_traffic SET shipment_id = ?, driver_name = COALESCE(driver_name, ?), updated_at = ? WHERE id = ?;`,
        args: [
          shipmentIds[i % shipmentIds.length],
          drvNames[i % drvNames.length],
          nowSec,
          String(wtRows.rows[i].id),
        ],
      });
    }
  }

  // 10. warehouse_inventory: backfill buyer, weight, volume + seed 5 more rows
  await client.execute({
    sql: `UPDATE warehouse_inventory
          SET buyer = COALESCE(buyer, 'European Retail Distribution GmbH'),
              weight = COALESCE(weight, quantity * 450.0),
              volume = COALESCE(volume, quantity * 1.8),
              updated_at = COALESCE(updated_at, ?)
          WHERE buyer IS NULL OR weight IS NULL OR volume IS NULL;`,
    args: [nowSec],
  });

  // 11. quotes: origin_location_id, destination_location_id, created_by
  if (locationIds.length >= 2) {
    const qRows = await client.execute(
      `SELECT id FROM quotes WHERE origin_location_id IS NULL OR destination_location_id IS NULL;`,
    );
    for (let i = 0; i < qRows.rows.length; i++) {
      const orig = locationIds[i % locationIds.length];
      const dest = locationIds[(i + 3) % locationIds.length];
      const usr = userIds.length > 0 ? userIds[i % userIds.length] : null;
      await client.execute({
        sql: `UPDATE quotes SET origin_location_id = ?, destination_location_id = ?, created_by = COALESCE(created_by, ?) WHERE id = ?;`,
        args: [orig, dest, usr, String(qRows.rows[i].id)],
      });
    }
  }

  // 12. route_segments: origin_location_id, destination_location_id
  if (locationIds.length >= 2) {
    await client.execute({
      sql: `UPDATE route_segments
            SET origin_location_id = ?,
                destination_location_id = ?,
                updated_at = ?
            WHERE origin_location_id IS NULL OR destination_location_id IS NULL;`,
      args: [locationIds[0], locationIds[1], nowSec],
    });
  }

  // 13. rates: company_id, created_by, updated_by
  if (companyIds.length > 0) {
    await client.execute({
      sql: `UPDATE rates
            SET company_id = COALESCE(company_id, ?),
                created_by = COALESCE(created_by, ?),
                updated_by = COALESCE(updated_by, ?),
                updated_at = COALESCE(updated_at, ?)
            WHERE company_id IS NULL;`,
      args: [companyIds[0], userIds[0] || null, userIds[0] || null, nowSec],
    });
  }

  // 14. orders_customer_orders.quotation_id -> quotes.id
  if (quoteIds.length > 0) {
    const ocoRows = await client.execute(
      `SELECT id FROM orders_customer_orders WHERE quotation_id IS NULL;`,
    );
    for (let i = 0; i < ocoRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE orders_customer_orders SET quotation_id = ? WHERE id = ?;`,
        args: [quoteIds[i % quoteIds.length], String(ocoRows.rows[i].id)],
      });
    }
  }

  // 15. control_tower_incidents.asset_id & rate_import_batches.carrier_id
  if (assetIds.length > 0) {
    const ctiRows = await client.execute(
      `SELECT id FROM control_tower_incidents WHERE asset_id IS NULL;`,
    );
    for (let i = 0; i < ctiRows.rows.length; i++) {
      await client.execute({
        sql: `UPDATE control_tower_incidents SET asset_id = ? WHERE id = ?;`,
        args: [assetIds[i % assetIds.length], String(ctiRows.rows[i].id)],
      });
    }
  }
  if (carrierIds.length > 0) {
    await client.execute({
      sql: `UPDATE rate_import_batches
            SET carrier_id = COALESCE(carrier_id, ?),
                imported_by = COALESCE(imported_by, ?)
            WHERE carrier_id IS NULL;`,
      args: [carrierIds[0], userIds[0] || "usr_ops_01"],
    });
  }
  if (locationIds.length > 0) {
    await client.execute({
      sql: `UPDATE shipments
            SET port_of_entry_id = COALESCE(port_of_entry_id, ?),
                updated_by = COALESCE(updated_by, ?)
            WHERE port_of_entry_id IS NULL;`,
      args: [locationIds[0], userIds[0] || null],
    });
  }

  // Verify foreign key integrity across the entire database
  const fkCheck = await client.execute("PRAGMA foreign_key_check;");
  if (fkCheck.rows.length > 0) {
    console.warn(
      `⚠️ PRAGMA foreign_key_check reported ${fkCheck.rows.length} violations:`,
      fkCheck.rows.slice(0, 5),
    );
  } else {
    console.log(
      "✅ PRAGMA foreign_key_check passed with 0 errors across all tables.",
    );
  }
}

// ============================================================================
// 6. MASTER REMEDIATION EXPORT
// ============================================================================

export async function seedDatabaseRemediation(): Promise<void> {
  await remediateSchemaAndTypes();
  await seedEmptyTables();
  await enrichSparseTables();
  await backfillNullForeignKeys();
}
