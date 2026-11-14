/**
 * @file ci-clean.mjs
 * @description Cross-platform CLI utility to inspect and purge GitHub Actions caches.
 * Intelligently prunes orphaned CodeQL base database overlays and historical BuildKit blobs
 * to prevent repository cache quota exhaustion (GitHub 10 GB limit).
 * @module @atlas/scripts/maintenance/ci-clean
 */

import { execSync } from "node:child_process";

const DRY_RUN = process.argv.includes("--dry-run");
const PURGE_ALL = process.argv.includes("--all");
const MIN_AGE_DAYS = parseInt(
  process.argv.find((arg) => arg.startsWith("--min-age="))?.split("=")[1] || "2",
  10,
);
const KEEP_BUILDKIT = parseInt(
  process.argv.find((arg) => arg.startsWith("--keep-buildkit="))?.split("=")[1] || "20",
  10,
);
const KEEP_CODEQL = parseInt(
  process.argv.find((arg) => arg.startsWith("--keep-codeql="))?.split("=")[1] || "2",
  10,
);

console.log(`🧹 [CI Clean] Starting GitHub Actions cache maintenance...`);
console.log(
  `   Config: minAgeDays=${MIN_AGE_DAYS}, keepBuildKit=${KEEP_BUILDKIT}, keepCodeQL=${KEEP_CODEQL}, purgeAll=${PURGE_ALL}, dryRun=${DRY_RUN}`,
);

try {
  const isCi = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  const authEnv = isCi && process.env.GITHUB_TOKEN ? { ...process.env } : { ...process.env, GITHUB_TOKEN: "" };

  // Fetch active caches via GitHub CLI
  const rawOutput = execSync(
    'gh api repos/xpallares1987-ai/Atlas-Logistics/actions/caches --paginate --jq ".actions_caches[] | {id: .id, key: .key, size: .size_in_bytes, created_at: .created_at, last_accessed_at: .last_accessed_at}"',
    {
      encoding: "utf-8",
      env: authEnv,
    },
  );

  const lines = rawOutput.trim().split("\n").filter(Boolean);
  const caches = lines.map((line) => JSON.parse(line));

  const totalBytes = caches.reduce((acc, c) => acc + c.size, 0);
  console.log(
    `📊 Found ${caches.length} total cache items in repository (~${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB).`,
  );

  const now = Date.now();
  const maxAgeMs = MIN_AGE_DAYS * 24 * 60 * 60 * 1000;

  const toDelete = new Map();

  if (PURGE_ALL) {
    for (const c of caches) {
      toDelete.set(c.id, { cache: c, reason: "PURGE_ALL" });
    }
  } else {
    // 1. Process CodeQL Overlay Caches
    const codeqlCaches = caches.filter((c) =>
      c.key.startsWith("codeql-overlay-base-database-"),
    );
    codeqlCaches.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const activeCodeql = codeqlCaches.slice(0, KEEP_CODEQL);
    const staleCodeql = codeqlCaches.slice(KEEP_CODEQL);
    for (const c of staleCodeql) {
      toDelete.set(c.id, {
        cache: c,
        reason: `Orphaned CodeQL database overlay (keeping ${KEEP_CODEQL} newest)`,
      });
    }

    // 2. Process BuildKit Blob Caches
    const bkCaches = caches.filter(
      (c) => c.key.startsWith("buildkit-blob-") || c.key.startsWith("index-"),
    );
    bkCaches.sort(
      (a, b) =>
        new Date(b.last_accessed_at || b.created_at).getTime() -
        new Date(a.last_accessed_at || a.created_at).getTime(),
    );

    for (let i = 0; i < bkCaches.length; i++) {
      const c = bkCaches[i];
      const lastAccessed = new Date(c.last_accessed_at || c.created_at).getTime();
      const ageMs = now - lastAccessed;
      const isBeyondKeepCount = i >= KEEP_BUILDKIT;
      const isOlderThanMinAge = ageMs > maxAgeMs;

      if (isBeyondKeepCount || isOlderThanMinAge) {
        toDelete.set(c.id, {
          cache: c,
          reason: isBeyondKeepCount
            ? `BuildKit blob beyond rank #${KEEP_BUILDKIT}`
            : `BuildKit blob older than ${MIN_AGE_DAYS}d`,
        });
      }
    }
  }

  let deletedCount = 0;
  let deletedBytes = 0;

  console.log(`🎯 Identified ${toDelete.size} cache entries to prune.`);

  for (const [id, { cache, reason }] of toDelete.entries()) {
    const sizeMb = (cache.size / (1024 * 1024)).toFixed(2);
    console.log(
      `🗑️  [Prune] ID: ${id} | ${sizeMb} MB | ${cache.key.substring(0, 42)}... | ${reason}`,
    );

    if (!DRY_RUN) {
      try {
        execSync(
          `gh api --method DELETE repos/xpallares1987-ai/Atlas-Logistics/actions/caches/${id}`,
          {
            stdio: "ignore",
            env: authEnv,
          },
        );
        deletedCount++;
        deletedBytes += cache.size;
      } catch (delErr) {
        console.warn(`   ⚠️ Failed to delete cache ${id}:`, delErr.message);
      }
    } else {
      deletedCount++;
      deletedBytes += cache.size;
    }
  }

  const reclaimedMb = (deletedBytes / (1024 * 1024)).toFixed(2);
  const reclaimedGb = (deletedBytes / (1024 * 1024 * 1024)).toFixed(2);
  const remainingGb = ((totalBytes - deletedBytes) / (1024 * 1024 * 1024)).toFixed(2);

  console.log(`\n✅ [CI Clean Complete]`);
  console.log(`   Caches pruned: ${deletedCount}`);
  console.log(`   Space reclaimed: ${reclaimedMb} MB (~${reclaimedGb} GB)`);
  console.log(`   Remaining cache footprint: ~${remainingGb} GB`);
} catch (error) {
  console.error(`❌ [CI Clean Error]:`, error.message);
  process.exit(1);
}
