// backup-db.js
// Backup script for Atlas Logistics SQLite database and environment secrets
// Ensures ACID transactional consistency using WAL checkpointing (PRAGMA wal_checkpoint(TRUNCATE))
// Retention: 14 latest backups, destination configurable via ATLAS_BACKUP_DIR (default G:\Backups\Atlas-Logistics or ./backups)

import { promises as fs, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "../..");

export function getSafeDbPath() {
  if (process.env.LOCAL_DB_PATH) {
    return path.resolve(ROOT_DIR, process.env.LOCAL_DB_PATH);
  }
  if (
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL.startsWith("file:")
  ) {
    const rawPath = process.env.DATABASE_URL.replace(/^file:/, "");
    return path.resolve(ROOT_DIR, rawPath);
  }
  // Default to development or production database
  const v2Db = path.resolve(ROOT_DIR, "atlas-erp-v2.db");
  const prodDb = path.resolve(ROOT_DIR, "atlas-erp-prod.db");
  if (existsSync(v2Db)) return v2Db;
  if (existsSync(prodDb)) return prodDb;
  return v2Db;
}

export function getSafeBackupDir() {
  if (process.env.ATLAS_BACKUP_DIR) {
    return path.resolve(process.env.ATLAS_BACKUP_DIR);
  }
  if (process.env.BACKUP_DIR) {
    return path.resolve(ROOT_DIR, process.env.BACKUP_DIR);
  }
  // Check for Google Drive virtual drive on G:
  if (existsSync("G:\\Mi unidad")) {
    return path.resolve("G:\\Mi unidad\\Backups\\Atlas-Logistics");
  }
  if (existsSync("G:\\My Drive")) {
    return path.resolve("G:\\My Drive\\Backups\\Atlas-Logistics");
  }
  return path.resolve(ROOT_DIR, "backups");
}

export const DB_PATH = getSafeDbPath();
export const BACKUP_DIR = getSafeBackupDir();
export const MAX_BACKUPS = Math.max(
  1,
  parseInt(process.env.MAX_LOCAL_BACKUPS || "14", 10),
);

export async function ensureBackupDir(targetDir = getSafeBackupDir()) {
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (err) {
    console.error("❌ Failed to create backup directory:", err);
    throw err;
  }
}

export function timestamp() {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, ""); // e.g. 2026-10-23T06-00-00-000Z
}

export async function checkpointDatabase(dbFilePath) {
  if (!existsSync(dbFilePath)) {
    return false;
  }
  try {
    console.log(
      `🔄 Checkpointing SQLite WAL for: ${path.basename(dbFilePath)}...`,
    );
    const client = createClient({ url: `file:${dbFilePath}` });
    await client.execute("PRAGMA wal_checkpoint(TRUNCATE);");
    await client.close();
    console.log(
      "✓ WAL checkpoint completed (all transactions flushed into main DB).",
    );
    return true;
  } catch (err) {
    console.warn(
      `⚠ WAL checkpoint warning: ${err.message}. Proceeding with file copy.`,
    );
    return false;
  }
}

export async function pruneOldBackups(
  targetDir = getSafeBackupDir(),
  maxToKeep = MAX_BACKUPS,
) {
  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const backupItems = [];

    for (const entry of entries) {
      const fullPath = path.resolve(targetDir, entry.name);
      const isBackupFolder =
        entry.isDirectory() && entry.name.startsWith("atlas-backup-");
      const isLegacyDbFile =
        entry.isFile() &&
        entry.name.startsWith("atlas-erp-v2-") &&
        entry.name.endsWith(".db");

      if (isBackupFolder || isLegacyDbFile) {
        const stats = await fs.stat(fullPath);
        backupItems.push({
          name: entry.name,
          fullPath,
          mtime: stats.mtimeMs,
          isDirectory: entry.isDirectory(),
        });
      }
    }

    backupItems.sort((a, b) => b.mtime - a.mtime); // Newest first

    if (backupItems.length > maxToKeep) {
      const toDelete = backupItems.slice(maxToKeep);
      for (const item of toDelete) {
        await fs.rm(item.fullPath, { recursive: true, force: true });
        console.log(
          `🗑️ Pruned old backup (${maxToKeep} retention limit): ${item.name}`,
        );
      }
    }
  } catch (err) {
    console.error("⚠ Failed to prune old backups:", err.message);
  }
}

export async function backup() {
  const targetDir = getSafeBackupDir();
  await ensureBackupDir(targetDir);

  const dbSource = getSafeDbPath();
  const currentTimestamp = timestamp();
  const backupFolder = path.resolve(
    targetDir,
    `atlas-backup-${currentTimestamp}`,
  );
  await fs.mkdir(backupFolder, { recursive: true });

  const summary = {
    timestamp: new Date().toISOString(),
    sourceDatabase: dbSource,
    backupFolder,
    files: [],
  };

  // 1. Consistent SQLite snapshot
  if (existsSync(dbSource)) {
    await checkpointDatabase(dbSource);
    const dbBackupTarget = path.resolve(backupFolder, path.basename(dbSource));
    await fs.copyFile(dbSource, dbBackupTarget);
    const dbStat = await fs.stat(dbBackupTarget);
    summary.files.push({
      file: path.basename(dbSource),
      sizeBytes: dbStat.size,
      sizeMB: (dbStat.size / (1024 * 1024)).toFixed(2),
    });
    console.log(
      `✅ Database snapshot created: ${dbBackupTarget} (${(dbStat.size / (1024 * 1024)).toFixed(2)} MB)`,
    );
  } else {
    console.warn(`⚠ Database file not found at: ${dbSource}`);
  }

  // 2. Backup environment files (.env, .env.local, .env.production)
  const envFiles = [".env", ".env.local", ".env.production"];
  for (const envName of envFiles) {
    const envSource = path.resolve(ROOT_DIR, envName);
    if (existsSync(envSource)) {
      const envTarget = path.resolve(backupFolder, envName);
      await fs.copyFile(envSource, envTarget);
      const envStat = await fs.stat(envTarget);
      summary.files.push({
        file: envName,
        sizeBytes: envStat.size,
      });
      console.log(`🔒 Secret environment backed up: ${envName}`);
    }
  }

  // 3. Write manifest.json
  const manifestPath = path.resolve(backupFolder, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(summary, null, 2), "utf8");

  // 4. Prune old backups
  await pruneOldBackups(targetDir, MAX_BACKUPS);

  console.log(`\n🎉 Backup completed successfully in: ${backupFolder}`);
  return backupFolder;
}

// Run backup if executed directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith("backup-db.js") ||
    process.argv[1].endsWith("backup-db.ts") ||
    process.argv[1].endsWith("backup-db"))
) {
  backup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Backup failed:", err);
      process.exit(1);
    });
}
