// backup-db.js
// Backup script for Atlas Logistics SQLite database with auto‑prune (keep last 7 backups)

import { promises as fs } from "fs";
import path from "path";

const ROOT_DIR = path.resolve(process.cwd());

function getSafeDbPath() {
  const envPath = process.env.LOCAL_DB_PATH;
  if (!envPath) {
    return path.resolve(ROOT_DIR, "atlas-erp-v2.db");
  }
  const safeBaseName = path.basename(envPath);
  const resolved = path.resolve(ROOT_DIR, safeBaseName);
  if (!resolved.startsWith(ROOT_DIR)) {
    throw new Error(`Invalid DB_PATH traversal attempt: ${envPath}`);
  }
  return resolved;
}

function getSafeBackupDir() {
  const envDir = process.env.BACKUP_DIR || "backups";
  const safeDirName = path.basename(envDir);
  const resolved = path.resolve(ROOT_DIR, safeDirName);
  if (!resolved.startsWith(ROOT_DIR)) {
    throw new Error(`Invalid BACKUP_DIR traversal attempt: ${envDir}`);
  }
  return resolved;
}

const DB_PATH = getSafeDbPath();
const BACKUP_DIR = getSafeBackupDir();
const MAX_BACKUPS = Math.max(
  1,
  parseInt(process.env.MAX_LOCAL_BACKUPS || "30", 10),
);

async function ensureBackupDir() {
  const safeDir = getSafeBackupDir();
  try {
    await fs.mkdir(safeDir, { recursive: true });
  } catch (err) {
    console.error("Failed to create backup directory:", err);
    process.exit(1);
  }
}

function timestamp() {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, ""); // e.g., 2026-08-19T09-13-45-000Z
}

async function pruneOldBackups() {
  const safeDir = getSafeBackupDir();
  try {
    const files = await fs.readdir(safeDir);
    const dbFiles = [];

    for (const f of files) {
      const safeFileName = path.basename(f);
      if (
        safeFileName.endsWith(".db") &&
        !safeFileName.includes("..") &&
        !safeFileName.includes("/") &&
        !safeFileName.includes("\\")
      ) {
        const fullPath = path.resolve(safeDir, safeFileName);
        if (fullPath.startsWith(safeDir)) {
          const stats = await fs.stat(fullPath);
          dbFiles.push({ name: safeFileName, fullPath, mtime: stats.mtimeMs });
        }
      }
    }

    dbFiles.sort((a, b) => b.mtime - a.mtime); // newest first
    const toDelete = dbFiles.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      if (file.fullPath.startsWith(safeDir)) {
        await fs.unlink(file.fullPath);
        console.log(`🗑️ Deleted old backup: ${file.fullPath}`);
      }
    }
  } catch (err) {
    console.error("Failed to prune old backups:", err);
  }
}

async function backup() {
  await ensureBackupDir();
  const safeDir = getSafeBackupDir();
  const safeDbSource = getSafeDbPath();
  const safeTimestamp = timestamp();
  const backupFileName = `atlas-erp-v2-${safeTimestamp}.db`;
  const backupFile = path.resolve(safeDir, backupFileName);

  if (!backupFile.startsWith(safeDir)) {
    throw new Error("Invalid backup target path");
  }

  try {
    await fs.copyFile(safeDbSource, backupFile);
    console.log(`✅ Backup created: ${backupFile}`);

    // Upload to GCS if bucket is configured
    if (process.env.GCS_BACKUP_BUCKET) {
      const { Storage } = await import("@google-cloud/storage");
      const storage = new Storage();
      const bucket = storage.bucket(process.env.GCS_BACKUP_BUCKET);
      await bucket.upload(backupFile);
      console.log(
        `🔼 Uploaded backup to GCS bucket ${process.env.GCS_BACKUP_BUCKET}`,
      );
    }
    await pruneOldBackups();
    return backupFile;
  } catch (err) {
    console.error("❌ Backup failed:", err);
    throw err;
  }
}

export {
  backup,
  pruneOldBackups,
  ensureBackupDir,
  getSafeDbPath,
  getSafeBackupDir,
  DB_PATH,
  BACKUP_DIR,
  MAX_BACKUPS,
};

// Run backup if executed directly via node CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith("backup-db.js") ||
    process.argv[1].endsWith("backup-db"))
) {
  backup().catch(() => process.exit(1));
}
