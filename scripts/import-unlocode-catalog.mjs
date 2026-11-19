/**
 * @file import-unlocode-catalog.mjs
 * @description Bulk-imports the official UNECE UN/LOCODE 2022-2 compressed NDJSON catalog
 * (~116,000 locations) into SQLite `unlocode_locations` using fast batched WAL transactions.
 * @module @atlas/scripts/import-unlocode-catalog
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { createClient } from "@libsql/client";

const CATALOG_PATH = path.resolve(
  process.cwd(),
  "data/catalogs/unlocode-2022-2.ndjson.gz",
);
const DB_URL = process.env.DATABASE_URL || "file:./data/dev.db";

export async function importUnlocodeCatalog(targetUrl = DB_URL) {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(
      `Compressed UN/LOCODE catalog not found at ${CATALOG_PATH}. Run scripts/extract-unlocode-mdb.ps1 first.`,
    );
  }

  const client = createClient({ url: targetUrl });
  await client.execute("PRAGMA busy_timeout = 5000;");
  await client.execute("PRAGMA journal_mode = WAL;");
  await client.execute("PRAGMA synchronous = NORMAL;");

  const startMs = Date.now();
  const gunzip = zlib.createGunzip();
  const fileStream = fs.createReadStream(CATALOG_PATH);
  const rl = readline.createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });

  const BATCH_SIZE = 1000;
  let batch = [];
  let totalInserted = 0;
  const nowSec = Math.floor(Date.now() / 1000);

  const flushBatch = async (rows) => {
    if (rows.length === 0) return;
    const tx = await client.transaction("write");
    try {
      const sql = `
        INSERT INTO unlocode_locations (
          un_locode, country_code, location_code, name, name_wo_diacritics,
          subdivision_code, function_classifier,
          is_port, is_rail_terminal, is_road_terminal, is_airport,
          is_postal_hub, is_multimodal_icd, is_border_crossing,
          status, change_code, release_date_yymm, iata_code,
          raw_coordinates, latitude, longitude, remarks,
          created_at, updated_at, is_deleted, is_active
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, 0, 1
        )
        ON CONFLICT(un_locode) DO UPDATE SET
          name = excluded.name,
          name_wo_diacritics = excluded.name_wo_diacritics,
          subdivision_code = excluded.subdivision_code,
          function_classifier = excluded.function_classifier,
          is_port = excluded.is_port,
          is_rail_terminal = excluded.is_rail_terminal,
          is_road_terminal = excluded.is_road_terminal,
          is_airport = excluded.is_airport,
          is_postal_hub = excluded.is_postal_hub,
          is_multimodal_icd = excluded.is_multimodal_icd,
          is_border_crossing = excluded.is_border_crossing,
          status = excluded.status,
          change_code = excluded.change_code,
          release_date_yymm = excluded.release_date_yymm,
          iata_code = excluded.iata_code,
          raw_coordinates = excluded.raw_coordinates,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          remarks = excluded.remarks,
          updated_at = excluded.updated_at
      `;

      for (const r of rows) {
        const fn = String(r.f || "--------");
        await tx.execute({
          sql,
          args: [
            r.u,
            r.c,
            r.l,
            r.n,
            r.nw || r.n,
            r.sb ?? null,
            fn,
            fn.includes("1") ? 1 : 0,
            fn.includes("2") ? 1 : 0,
            fn.includes("3") ? 1 : 0,
            fn.includes("4") ? 1 : 0,
            fn.includes("5") ? 1 : 0,
            fn.includes("6") ? 1 : 0,
            fn.includes("B") ? 1 : 0,
            r.st || "RL",
            r.ch ?? null,
            r.dt ?? null,
            r.ia ?? null,
            r.rc ?? null,
            r.la ?? null,
            r.lo ?? null,
            r.rm ?? null,
            nowSec,
            nowSec,
          ],
        });
      }
      await tx.commit();
      totalInserted += rows.length;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  };

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    batch.push(JSON.parse(trimmed));
    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      batch = [];
      if (totalInserted % 20000 === 0) {
        console.log(`  ...imported ${totalInserted} UN/LOCODE records`);
      }
    }
  }
  await flushBatch(batch);

  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(2);
  console.log(
    `[UN/LOCODE] Successfully imported ${totalInserted} official UNECE 2022-2 locations into ${targetUrl} in ${elapsedSec}s.`,
  );
  client.close();
  return totalInserted;
}

import { fileURLToPath } from "node:url";
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  importUnlocodeCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[UN/LOCODE] Import failed:", err);
      process.exit(1);
    });
}
