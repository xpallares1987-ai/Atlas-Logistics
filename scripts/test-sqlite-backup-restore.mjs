/**
 * @file test-sqlite-backup-restore.mjs
 * @description Automated verification suite for SQLite WAL online backup, VACUUM INTO,
 *              PRAGMA integrity_check, PRAGMA foreign_key_check, and disaster restoration.
 * @module @atlas/scripts/test-sqlite-backup-restore
 * @see {@link docs/adr/0009-sqlite-wal-mandatory-foreign-keys.md}
 */

import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const PRIMARY_DB_PATH = path.resolve(REPO_ROOT, 'data/dev.db');
const TEST_SCRATCH_DIR = path.resolve(REPO_ROOT, 'data/backups/test-scratch');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeUnlink(filePath, maxRetries = 5, delay = 200) {
  if (!fs.existsSync(filePath)) return;
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.unlinkSync(filePath);
      return;
    } catch {
      await sleep(delay);
    }
  }
}

async function runBackupRestoreVerification() {
  console.log('='.repeat(80));
  console.log(' ATLAS LOGISTICS - SQLITE WAL BACKUP & RESTORATION TEST SUITE');
  console.log('='.repeat(80));

  if (!fs.existsSync(PRIMARY_DB_PATH)) {
    console.error(`❌ [FAIL] Primary database not found at: ${PRIMARY_DB_PATH}`);
    process.exit(1);
  }

  // Ensure scratch directory exists
  if (!fs.existsSync(TEST_SCRATCH_DIR)) {
    fs.mkdirSync(TEST_SCRATCH_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const backupFilePath = path.resolve(TEST_SCRATCH_DIR, `snapshot-${timestamp}.db`);
  const restoredFilePath = path.resolve(TEST_SCRATCH_DIR, `restored-${timestamp}.db`);

  // Normalized path with forward slashes for SQLite VACUUM INTO statement
  const backupSqlPath = backupFilePath.replace(/\\/g, '/');

  console.log(`\n1. PRIMARY DATABASE INSPECTION:`);
  console.log(`   Location: ${PRIMARY_DB_PATH}`);
  const primaryStats = fs.statSync(PRIMARY_DB_PATH);
  console.log(`   File Size: ${(primaryStats.size / (1024 * 1024)).toFixed(2)} MB`);

  let primaryClient;
  let backupClient;
  let restoredClient;

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Connect to Primary & Check Canonical State
    // -------------------------------------------------------------------------
    primaryClient = createClient({ url: `file:${PRIMARY_DB_PATH}` });

    console.log(`\n2. FLUSHING WAL LOG (PRAGMA wal_checkpoint(TRUNCATE))...`);
    const checkpointResult = await primaryClient.execute('PRAGMA wal_checkpoint(TRUNCATE);');
    console.log(`   ✓ WAL Checkpoint executed successfully:`, checkpointResult.rows[0]);

    console.log(`\n3. GATHERING BASELINE RECORD COUNTS FROM PRIMARY...`);
    const countQueries = {
      companies: 'SELECT COUNT(*) as count FROM companies;',
      users: 'SELECT COUNT(*) as count FROM users;',
      shipments: 'SELECT COUNT(*) as count FROM shipments;',
      addresses: 'SELECT COUNT(*) as count FROM addresses;',
      branch_offices: 'SELECT COUNT(*) as count FROM branch_offices;',
    };

    const primaryCounts = {};
    for (const [table, sql] of Object.entries(countQueries)) {
      const res = await primaryClient.execute(sql);
      primaryCounts[table] = Number(res.rows[0].count);
      console.log(`   - ${table.padEnd(12)}: ${primaryCounts[table]} records`);
    }

    // Verify canonical shipment sh_demo_01
    const canonicalDemo = await primaryClient.execute(
      "SELECT id, tracking_number, company_id, status FROM shipments WHERE id = 'sh_demo_01';"
    );
    if (canonicalDemo.rows.length === 0) {
      console.warn('   ⚠️ Warning: Canonical shipment sh_demo_01 not found in primary.');
    } else {
      console.log(`   ✓ Canonical shipment sh_demo_01 found: Tracking ${canonicalDemo.rows[0].tracking_number}`);
    }

    // -------------------------------------------------------------------------
    // Phase 2: Online Atomic Snapshot via VACUUM INTO
    // -------------------------------------------------------------------------
    console.log(`\n4. EXECUTING ONLINE ATOMIC BACKUP (VACUUM INTO)...`);
    const t0 = performance.now();
    await primaryClient.execute(`VACUUM INTO '${backupSqlPath}';`);
    const backupDuration = (performance.now() - t0).toFixed(2);

    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file was not created at: ${backupFilePath}`);
    }

    const backupStats = fs.statSync(backupFilePath);
    console.log(`   ✓ Snapshot completed in ${backupDuration} ms`);
    console.log(`   ✓ Snapshot size: ${(backupStats.size / (1024 * 1024)).toFixed(2)} MB`);

    // -------------------------------------------------------------------------
    // Phase 3: Verify Integrity & Foreign Keys on Backup
    // -------------------------------------------------------------------------
    console.log(`\n5. VERIFYING INTEGRITY OF BACKUP FILE...`);
    backupClient = createClient({ url: `file:${backupFilePath}` });

    const integrityRes = await backupClient.execute('PRAGMA integrity_check;');
    const integrityStatus = integrityRes.rows[0]?.integrity_check;
    if (integrityStatus !== 'ok') {
      throw new Error(`Integrity check failed on backup snapshot: ${JSON.stringify(integrityRes.rows)}`);
    }
    console.log(`   ✓ PRAGMA integrity_check: ${integrityStatus}`);

    const fkRes = await backupClient.execute('PRAGMA foreign_key_check;');
    if (fkRes.rows.length > 0) {
      throw new Error(`Foreign key constraint violations found in backup: ${JSON.stringify(fkRes.rows)}`);
    }
    console.log(`   ✓ PRAGMA foreign_key_check: 0 violations (Strict Referential Integrity)`);

    // Verify record counts parity
    console.log(`\n6. VALIDATING DATA PARITY (PRIMARY vs BACKUP)...`);
    for (const [table, sql] of Object.entries(countQueries)) {
      const res = await backupClient.execute(sql);
      const backupCount = Number(res.rows[0].count);
      if (backupCount !== primaryCounts[table]) {
        throw new Error(`Data mismatch on table ${table}: primary=${primaryCounts[table]}, backup=${backupCount}`);
      }
      console.log(`   ✓ ${table.padEnd(12)}: ${backupCount} records match`);
    }

    // -------------------------------------------------------------------------
    // Phase 4: Disaster Recovery Restoration Test
    // -------------------------------------------------------------------------
    console.log(`\n7. SIMULATING DISASTER RECOVERY RESTORATION...`);
    // Copy snapshot to target restoration file
    fs.copyFileSync(backupFilePath, restoredFilePath);

    restoredClient = createClient({ url: `file:${restoredFilePath}` });
    await restoredClient.execute('PRAGMA journal_mode = WAL;');
    await restoredClient.execute('PRAGMA foreign_keys = ON;');

    const restoredDemo = await restoredClient.execute(
      "SELECT id, tracking_number, company_id, status FROM shipments WHERE id = 'sh_demo_01';"
    );
    if (canonicalDemo.rows.length > 0 && restoredDemo.rows.length === 0) {
      throw new Error('Restored database failed to recover canonical shipment sh_demo_01.');
    }
    console.log(`   ✓ Restored database mounted in WAL mode with active foreign keys.`);
    console.log(`   ✓ Verified canonical query execution on restored database.`);

    console.log('\n' + '='.repeat(80));
    console.log(' [PASS] ALL SQLITE BACKUP & RESTORATION CHECKS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
  } catch (err) {
    console.error(`\n❌ [FAIL] Backup & restoration test failed:`, err);
    process.exitCode = 1;
  } finally {
    // Gracefully close clients
    if (restoredClient) {
      try { await restoredClient.close(); } catch {}
    }
    if (backupClient) {
      try { await backupClient.close(); } catch {}
    }
    if (primaryClient) {
      try { await primaryClient.close(); } catch {}
    }

    // Brief pause to allow Windows file handles to release
    await sleep(250);

    // Clean up temporary test files
    try {
      await safeUnlink(backupFilePath);
      await safeUnlink(restoredFilePath);
      await safeUnlink(`${backupFilePath}-wal`);
      await safeUnlink(`${backupFilePath}-shm`);
      await safeUnlink(`${restoredFilePath}-wal`);
      await safeUnlink(`${restoredFilePath}-shm`);
    } catch {
      // Ignored for non-critical transient locks
    }
  }
}

runBackupRestoreVerification();
