/**
 * @file ci-clean.mjs
 * @description Cross-platform CLI utility to inspect and purge GitHub Actions caches.
 * @module @atlas/scripts/maintenance/ci-clean
 */

import { execSync } from "node:child_process";

const DRY_RUN = process.argv.includes("--dry-run");
const PURGE_ALL = process.argv.includes("--all");
const MIN_AGE_DAYS = parseInt(
  process.argv.find((arg) => arg.startsWith("--min-age="))?.split("=")[1] || "5",
  10,
);

console.log(`🧹 [CI Clean] Starting GitHub Actions cache maintenance...`);
console.log(`   Config: minAgeDays=${MIN_AGE_DAYS}, purgeAll=${PURGE_ALL}, dryRun=${DRY_RUN}`);

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

  console.log(`📊 Found ${caches.length} total cache items in repository.`);

  const now = Date.now();
  const maxAgeMs = MIN_AGE_DAYS * 24 * 60 * 60 * 1000;

  let deletedCount = 0;
  let deletedBytes = 0;

  for (const cache of caches) {
    const lastAccessed = new Date(cache.last_accessed_at || cache.created_at).getTime();
    const ageMs = now - lastAccessed;
    const isBuildKit = cache.key.startsWith("buildkit-blob-") || cache.key.startsWith("index-");
    const isStale = ageMs > maxAgeMs;

    const shouldDelete = PURGE_ALL || (isBuildKit && isStale);

    if (shouldDelete) {
      const sizeMb = (cache.size / (1024 * 1024)).toFixed(2);
      console.log(`🗑️  [Target] ID: ${cache.id} | Size: ${sizeMb} MB | Key: ${cache.key.substring(0, 45)}...`);

      if (!DRY_RUN) {
        try {
          execSync(
            `gh api --method DELETE repos/xpallares1987-ai/Atlas-Logistics/actions/caches/${cache.id}`,
            {
              stdio: "ignore",
              env: authEnv,
            },
          );
          deletedCount++;
          deletedBytes += cache.size;
        } catch (delErr) {
          console.warn(`   ⚠️ Failed to delete cache ${cache.id}:`, delErr.message);
        }
      } else {
        deletedCount++;
        deletedBytes += cache.size;
      }
    }
  }

  const reclaimedMb = (deletedBytes / (1024 * 1024)).toFixed(2);
  const reclaimedGb = (deletedBytes / (1024 * 1024 * 1024)).toFixed(2);

  console.log(`\n✅ [CI Clean Complete]`);
  console.log(`   Caches pruned: ${deletedCount}`);
  console.log(`   Space reclaimed: ${reclaimedMb} MB (~${reclaimedGb} GB)`);
} catch (error) {
  console.error(`❌ [CI Clean Error]:`, error.message);
  process.exit(1);
}
