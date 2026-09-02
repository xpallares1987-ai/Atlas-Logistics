import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import {
  backup,
  ensureBackupDir,
  getSafeBackupDir,
  getSafeDbPath,
} from "./backup-db.js";

describe("Database Backup & Pruning Utility", () => {
  let testBackupDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    process.env.BACKUP_DIR = "backups-test";
    process.env.LOCAL_DB_PATH = "atlas-erp-test.db";
    process.env.MAX_LOCAL_BACKUPS = "3";
    testBackupDir = getSafeBackupDir();
    testDbPath = getSafeDbPath();

    await fs.writeFile(testDbPath, "dummy sqlite content for backup test");
    await fs.mkdir(testBackupDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDbPath, { force: true });
      await fs.rm(testBackupDir, { recursive: true, force: true });
    } catch {}
  });

  it("ensureBackupDir should create directory without error", async () => {
    await expect(ensureBackupDir()).resolves.not.toThrow();
  });

  it("backup should create a copy of the database", async () => {
    const backupFilePath = await backup();
    expect(backupFilePath).toBeDefined();

    const safeFileName = path.basename(backupFilePath);
    const safeBackupPath = path.resolve(testBackupDir, safeFileName);

    const exists = await fs
      .stat(safeBackupPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});
