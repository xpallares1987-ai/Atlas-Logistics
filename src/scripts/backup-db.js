// backup-db.js
// Backup script for Atlas Logistics SQLite database with auto‑prune (keep last 7 backups)

import { promises as fs } from "fs";
import path from "path";

const DB_PATH = process.env.LOCAL_DB_PATH
  ? path.resolve(process.cwd(), process.env.LOCAL_DB_PATH)
  : path.resolve(process.cwd(), "atlas-erp-v2.db");
const BACKUP_DIR = path.resolve(
  process.cwd(),
  process.env.BACKUP_DIR || "backups",
);
const MAX_BACKUPS = parseInt(process.env.MAX_LOCAL_BACKUPS || "30", 10);

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create backup directory:", err);
    process.exit(1);
  }
}

function timestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-"); // e.g., 2026-08-19T09-13-45-000Z
}

async function pruneOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const dbFiles = files
      .filter((f) => f.endsWith(".db"))
      .map((f) => ({
        name: f,
        time: fs.stat(path.join(BACKUP_DIR, f)).then((s) => s.mtimeMs),
      }));
    const resolved = await Promise.all(
      dbFiles.map(async (o) => ({ name: o.name, mtime: await o.time })),
    );
    resolved.sort((a, b) => b.mtime - a.mtime); // newest first
    const toDelete = resolved.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      const fullPath = path.join(BACKUP_DIR, file.name);
      await fs.unlink(fullPath);
      console.log(`🗑️ Deleted old backup: ${fullPath}`);
    }
  } catch (err) {
    console.error("Failed to prune old backups:", err);
  }
}

async function backup() {
  await ensureBackupDir();
  const backupFile = path.join(BACKUP_DIR, `atlas-erp-v2-${timestamp()}.db`);
  try {
    await fs.copyFile(DB_PATH, backupFile);
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
