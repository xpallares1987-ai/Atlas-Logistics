import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  backup,
  ensureBackupDir,
  getSafeBackupDir,
  getSafeDbPath,
  isWithinDirectory,
  resolveWithinRoot,
} from "./backup-db.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");

describe("Database Backup & Pruning Utility", () => {
  let originalCwd: string;
  let testBackupDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    process.env.BACKUP_DIR = "backups-test";
    process.env.LOCAL_DB_PATH = "atlas-erp-test.db";
    process.env.MAX_LOCAL_BACKUPS = "3";
    testBackupDir = getSafeBackupDir();
    testDbPath = getSafeDbPath();

    await fs.writeFile(testDbPath, "dummy sqlite content for backup test");
    await fs.mkdir(testBackupDir, { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(testDbPath, { force: true });
      await fs.rm(testBackupDir, { recursive: true, force: true });
    } catch {}
  });

  it("ensureBackupDir should create directory without error", async () => {
    await expect(ensureBackupDir()).resolves.not.toThrow();
  });

  it("should reject directory traversal in BACKUP_DIR", () => {
    process.env.BACKUP_DIR = "../../outside-backups";
    expect(() => getSafeBackupDir()).toThrow(
      "Invalid BACKUP_DIR traversal attempt",
    );
  });

  it("should reject directory traversal in LOCAL_DB_PATH", () => {
    process.env.LOCAL_DB_PATH = "../../outside.db";
    expect(() => getSafeDbPath()).toThrow("Invalid DB_PATH traversal attempt");
  });

  it("should resolve BACKUP_DIR from the repository root regardless of caller cwd", async () => {
    const callerDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "atlas-backup-caller-"),
    );

    try {
      process.chdir(callerDir);

      expect(getSafeBackupDir()).toBe(path.resolve(REPO_ROOT, "backups-test"));
    } finally {
      process.chdir(originalCwd);
      await fs.rm(callerDir, { recursive: true, force: true });
    }
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

describe("isWithinDirectory", () => {
  const parent = path.resolve(REPO_ROOT, "backups-test");

  it("returns true for the directory itself", () => {
    expect(isWithinDirectory(parent, parent)).toBe(true);
  });

  it("returns true for a nested descendant path", () => {
    const nested = path.resolve(parent, "nested", "deep", "file.db");
    expect(isWithinDirectory(parent, nested)).toBe(true);
  });

  it("returns false for a parent traversal path", () => {
    const outside = path.resolve(parent, "..", "outside.db");
    expect(isWithinDirectory(parent, outside)).toBe(false);
  });

  it("returns false for a sibling directory sharing a name prefix", () => {
    // "backups-test-evil" is not inside "backups-test" despite the shared prefix
    const sibling = `${parent}-evil`;
    expect(isWithinDirectory(parent, sibling)).toBe(false);
  });

  it("returns false for an unrelated absolute path", () => {
    const unrelated = path.resolve(os.tmpdir(), "outside-root.db");
    expect(isWithinDirectory(parent, unrelated)).toBe(false);
  });
});

describe("resolveWithinRoot", () => {
  it("resolves a safe nested relative path within the repo root", () => {
    const resolved = resolveWithinRoot(
      path.join("backups-test", "nested", "dir"),
      "TEST_PATH",
    );
    expect(resolved).toBe(
      path.resolve(REPO_ROOT, "backups-test", "nested", "dir"),
    );
  });

  it("rejects a relative traversal path (../..)", () => {
    expect(() => resolveWithinRoot("../../etc/passwd", "TEST_PATH")).toThrow(
      "Invalid TEST_PATH traversal attempt",
    );
  });

  it("rejects an absolute path outside the repo root", () => {
    const outsideAbsolute = path.resolve(os.tmpdir(), "outside-root.db");
    expect(() => resolveWithinRoot(outsideAbsolute, "TEST_PATH")).toThrow(
      "Invalid TEST_PATH traversal attempt",
    );
  });

  it("accepts an absolute path that is within the repo root", () => {
    const insideAbsolute = path.resolve(REPO_ROOT, "backups-test", "in.db");
    expect(resolveWithinRoot(insideAbsolute, "TEST_PATH")).toBe(insideAbsolute);
  });

  it("accepts a leading-dot directory name that remains within the root", () => {
    expect(resolveWithinRoot("..backups", "TEST_PATH")).toBe(
      path.resolve(REPO_ROOT, "..backups"),
    );
  });

  it("rejects a leading-dot name whose resolved path still escapes the root", () => {
    const escapingPath = path.join("..backups", "..", "..", "outside");
    expect(() => resolveWithinRoot(escapingPath, "TEST_PATH")).toThrow(
      "Invalid TEST_PATH traversal attempt",
    );
  });
});
