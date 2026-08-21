import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { backup, pruneOldBackups, ensureBackupDir } from "./backup-db.js";

const TEST_BACKUP_DIR = path.resolve(process.cwd(), "backups-test");
const TEST_DB_PATH = path.resolve(process.cwd(), "atlas-erp-test.db");

describe("Database Backup & Pruning Utility", () => {
  beforeEach(async () => {
    process.env.BACKUP_DIR = "backups-test";
    process.env.LOCAL_DB_PATH = "atlas-erp-test.db";
    process.env.MAX_LOCAL_BACKUPS = "3";
    await fs.writeFile(TEST_DB_PATH, "dummy sqlite content for backup test");
    await fs.mkdir(TEST_BACKUP_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DB_PATH, { force: true });
      await fs.rm(TEST_BACKUP_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("ensureBackupDir should create directory without error", async () => {
    await expect(ensureBackupDir()).resolves.not.toThrow();
  });

  it("backup should create a copy of the database", async () => {
    const backupFilePath = await backup();
    expect(backupFilePath).toBeDefined();
    const exists = await fs
      .stat(backupFilePath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});
