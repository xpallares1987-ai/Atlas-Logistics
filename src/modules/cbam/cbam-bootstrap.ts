/**
 * @file cbam-bootstrap.ts
 * @description Idempotent DDL bootstrap for CBAM definitive regime tables (EEX quotes, certificate inventory, and surrender ledger).
 * @module @atlas/api/modules/cbam/bootstrap
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { client } from "../../db/index.js";

/**
 * Idempotently creates CBAM definitive regime SQLite tables and indexes.
 */
export async function bootstrapCbamDefinitiveTables(): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS cbam_eex_quotes (
      id TEXT PRIMARY KEY,
      quote_week TEXT NOT NULL UNIQUE,
      valid_from TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      auction_average_price_eur REAL NOT NULL,
      scaled_price INTEGER NOT NULL,
      published_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'EEX_AUCTION',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS cbam_eex_quotes_week_idx ON cbam_eex_quotes(quote_week);
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS cbam_certificate_inventory (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'tenant-default',
      lot_reference TEXT NOT NULL UNIQUE,
      purchase_date TEXT NOT NULL,
      nca_registry_account_id TEXT NOT NULL,
      quantity_purchased INTEGER NOT NULL,
      quantity_surrendered INTEGER NOT NULL DEFAULT 0,
      quantity_available INTEGER NOT NULL,
      unit_price_eur REAL NOT NULL,
      unit_price_scaled INTEGER NOT NULL,
      total_cost_eur REAL NOT NULL,
      total_cost_scaled INTEGER NOT NULL,
      payment_reference TEXT,
      banking_transmission_id TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS cbam_cert_inv_tenant_status_idx ON cbam_certificate_inventory(tenant_id, status);
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS cbam_certificate_surrenders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'tenant-default',
      surrender_reference TEXT NOT NULL UNIQUE,
      declaration_id TEXT NOT NULL,
      reporting_period TEXT NOT NULL,
      total_certificates_surrendered INTEGER NOT NULL,
      surrender_date TEXT NOT NULL,
      surrender_lots TEXT NOT NULL,
      total_cost_eur REAL NOT NULL,
      verifier_name TEXT NOT NULL,
      verifier_accreditation_number TEXT NOT NULL,
      verification_report_id TEXT NOT NULL,
      surrender_payload_hash_sha256 TEXT NOT NULL,
      iso20022_payment_transmission_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS cbam_cert_surrenders_decl_idx ON cbam_certificate_surrenders(declaration_id);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS cbam_cert_surrenders_tenant_period_idx ON cbam_certificate_surrenders(tenant_id, reporting_period);
  `);

  // Ensure fuel_eu_penalties_ledger has banking_transmission_id defensively
  try {
    const tableInfo = await client.execute(
      "PRAGMA table_info(fuel_eu_penalties_ledger);",
    );
    const cols = (tableInfo.rows as unknown as Array<{ name: string }>).map(
      (r) => r.name,
    );
    if (!cols.includes("banking_transmission_id")) {
      await client.execute(
        "ALTER TABLE fuel_eu_penalties_ledger ADD COLUMN banking_transmission_id TEXT;",
      );
    }
  } catch {
    // If table doesn't exist yet in an isolated test, ignore safely
  }
}
