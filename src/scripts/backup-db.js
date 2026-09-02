// backup-db.js
// Backup script for Atlas Logistics SQLite database with auto‑prune (keep last 7 backups)

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "../..");

function isWithinDirectory(parentDir, candidatePath) {
  const relative = path.relative(parentDir, candidatePath);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function resolveWithinRoot(inputPath, label) {
  const resolved = path.resolve(ROOT_DIR, inputPath);

  if (!isWithinDirectory(ROOT_DIR, resolved)) {
    throw new Error(`Invalid ${label} traversal attempt: ${inputPath}`);
  }

  return resolved;
}

function getSafeDbPath() {
  const envPath = process.env.LOCAL_DB_PATH;
  if (!envPath) {
    return path.resolve(ROOT_DIR, "atlas-erp-v2.db");
  }
  return resolveWithinRoot(envPath, "DB_PATH");
}

function getSafeBackupDir() {
  const envDir = process.env.BACKUP_DIR || "backups";
  return resolveWithinRoot(envDir, "BACKUP_DIR");
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
        if (isWithinDirectory(safeDir, fullPath)) {
          const stats = await fs.stat(fullPath);
          dbFiles.push({ name: safeFileName, fullPath, mtime: stats.mtimeMs });
        }
      }
    }

    dbFiles.sort((a, b) => b.mtime - a.mtime); // newest first
    const toDelete = dbFiles.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      if (isWithinDirectory(safeDir, file.fullPath)) {
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

  if (!isWithinDirectory(safeDir, backupFile)) {
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
  BACKUP_DIR,
  DB_PATH,
  ensureBackupDir,
  getSafeBackupDir,
  getSafeDbPath,
  isWithinDirectory,
  MAX_BACKUPS,
  pruneOldBackups,
  resolveWithinRoot,
  ROOT_DIR,
};

// Run backup if executed directly via node CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith("backup-db.js") ||
    process.argv[1].endsWith("backup-db"))
) {
  backup().catch(() => process.exit(1));
}
