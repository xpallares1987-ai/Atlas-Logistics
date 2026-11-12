/**
 * Documents Storage Garbage Collector
 *
 * Scans the physical document storage directory (DOCS_ROOT or ./uploads)
 * and reconciles it against the SQLite documents ledger.
 *
 * Detects and purges orphaned files (files on disk without active metadata in SQLite,
 * or marked as isDeleted = 1) to prevent physical storage leakage and disk bloat.
 */

import fs from "fs";
import path from "path";
import { db } from "../db/index.js";
import { documents } from "../db/schema/support.js";
import { eq, or } from "drizzle-orm";

export interface GarbageCollectionResult {
  totalDiskFiles: number;
  activeLedgerFiles: number;
  orphanedFiles: string[];
  purgedCount: number;
  freedBytes: number;
  dryRun: boolean;
}

export function getDocsRoot(): string {
  if (process.env.DOCS_ROOT) {
    return path.resolve(process.env.DOCS_ROOT);
  }
  return path.resolve(process.cwd(), "uploads");
}

export async function runDocumentsGarbageCollector(
  options: {
    dryRun?: boolean;
    targetDir?: string;
  } = {},
): Promise<GarbageCollectionResult> {
  const dryRun = options.dryRun ?? true;
  const docsDir = options.targetDir
    ? path.resolve(options.targetDir)
    : getDocsRoot();

  const result: GarbageCollectionResult = {
    totalDiskFiles: 0,
    activeLedgerFiles: 0,
    orphanedFiles: [],
    purgedCount: 0,
    freedBytes: 0,
    dryRun,
  };

  if (!fs.existsSync(docsDir)) {
    return result;
  }

  // 1. Scan physical disk
  const diskEntries = await fs.promises.readdir(docsDir, {
    withFileTypes: true,
  });
  const diskFiles = diskEntries.filter((e) => e.isFile()).map((e) => e.name);
  result.totalDiskFiles = diskFiles.length;

  if (diskFiles.length === 0) {
    return result;
  }

  // 2. Query active documents in SQLite ledger
  let activeDocs: { url: string; isDeleted: boolean }[] = [];
  try {
    activeDocs = await db
      .select({
        url: documents.url,
        isDeleted: documents.isDeleted,
      })
      .from(documents);
  } catch (err: any) {
    console.warn(
      "⚠ Garbage Collector could not query SQLite documents table:",
      err.message,
    );
    return result;
  }

  const activeFilenames = new Set<string>();
  for (const doc of activeDocs) {
    if (!doc.isDeleted && doc.url) {
      const filename = path.basename(doc.url);
      activeFilenames.add(filename);
    }
  }
  result.activeLedgerFiles = activeFilenames.size;

  // 3. Reconcile and detect orphans
  for (const diskFile of diskFiles) {
    // Ignore dotfiles, temp files, or system markers
    if (
      diskFile.startsWith(".") ||
      diskFile === "README.md" ||
      diskFile === ".gitkeep"
    ) {
      continue;
    }

    if (!activeFilenames.has(diskFile)) {
      result.orphanedFiles.push(diskFile);
      const filePath = path.join(docsDir, diskFile);
      try {
        const stats = await fs.promises.stat(filePath);
        result.freedBytes += stats.size;
        if (!dryRun) {
          await fs.promises.unlink(filePath);
          result.purgedCount++;
        }
      } catch {
        // file could have been locked or removed concurrently
      }
    }
  }

  return result;
}

// Execute as CLI if run directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith("documents-garbage-collector.ts") ||
    process.argv[1].endsWith("documents-garbage-collector.js") ||
    process.argv[1].endsWith("documents-garbage-collector"))
) {
  const isPurge =
    process.argv.includes("--purge") || process.argv.includes("-f");
  console.log(
    `🧹 Running Documents Garbage Collector (Mode: ${isPurge ? "PURGE" : "AUDIT (DRY-RUN)"})...`,
  );

  runDocumentsGarbageCollector({ dryRun: !isPurge })
    .then((res) => {
      console.log(`\n--- Garbage Collection Summary ---`);
      console.log(`Total files on disk:      ${res.totalDiskFiles}`);
      console.log(`Active documents in DB:   ${res.activeLedgerFiles}`);
      console.log(`Orphaned files found:     ${res.orphanedFiles.length}`);
      if (res.orphanedFiles.length > 0) {
        console.log(
          `Orphan list: ${res.orphanedFiles.slice(0, 10).join(", ")}${res.orphanedFiles.length > 10 ? "..." : ""}`,
        );
      }
      console.log(
        `Space reclaimed:          ${(res.freedBytes / 1024).toFixed(2)} KB`,
      );
      console.log(`Purged count:             ${res.purgedCount}`);
      console.log(`Status:                   ✅ Completed`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Garbage collection failed:", err);
      process.exit(1);
    });
}
