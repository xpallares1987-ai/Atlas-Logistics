/**
 * Atlas Logistics — Wiki Synchronization Tool
 *
 * Synchronizes curated, high-value documentation from the canonical `docs/`
 * directory to the GitHub Wiki repository (`Atlas-Logistics.wiki`).
 *
 * Normalizes links, flattens paths to GitHub Wiki conventions, and updates
 * the standard `Home.md`, `_Sidebar.md`, and `_Footer.md` index files.
 *
 * Usage:
 *   node scripts/sync-wiki.mjs [--push] [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const shouldPush = args.includes("--push");

// 1. Resolve Wiki Target Directory
const rootDir = process.cwd();
const defaultWikiDir = path.resolve(rootDir, "..", "Atlas-Logistics.wiki");
const wikiDir = process.env.WIKI_DIR ? path.resolve(process.env.WIKI_DIR) : defaultWikiDir;

console.log("📚 [Wiki Sync] Starting synchronization...");
console.log(`   Source docs: ${path.resolve(rootDir, "docs")}`);
console.log(`   Target wiki: ${wikiDir}`);

if (!fs.existsSync(wikiDir)) {
  console.error(`❌ [Wiki Sync] Target wiki directory not found at: ${wikiDir}`);
  console.error("   Please clone it first via: git clone https://github.com/xpallares1987-ai/Atlas-Logistics.wiki.git");
  process.exit(1);
}

// 2. Curated Mapping of Canonical Docs to Wiki Pages
const syncMappings = [
  // Setup & Tutorials
  {
    source: "docs/setup-guides/development-guide.md",
    target: "Development-Guide.md",
    title: "Local Development Guide",
  },
  // Architecture & Overview
  {
    source: "docs/architecture/SCM_PLATFORM_ARCHITECTURE.md",
    target: "Architecture-Overview.md",
    title: "Architecture Overview",
  },
  // Operational Runbooks
  {
    source: "docs/setup-guides/docker-setup.md",
    target: "Docker-Setup.md",
    title: "Docker Setup & Infrastructure",
  },
  {
    source: "docs/setup-guides/troubleshooting-maintenance.md",
    target: "Troubleshooting-Maintenance.md",
    title: "Troubleshooting & Maintenance",
  },
  // Key ADRs
  {
    source: "docs/adr/0008-scm-sqlite-cqrs-workflow-engine.md",
    target: "ADR-0008-scm-sqlite-cqrs-workflow-engine.md",
    title: "ADR-0008: SCM SQLite CQRS & Outbox",
  },
  {
    source: "docs/adr/0009-sqlite-wal-mandatory-foreign-keys.md",
    target: "ADR-0009-sqlite-wal-mandatory-foreign-keys.md",
    title: "ADR-0009: SQLite WAL & Enforced Foreign Keys",
  },
  {
    source: "docs/adr/0010-zero-mock-live-persistence-standard.md",
    target: "ADR-0010-zero-mock-live-persistence-standard.md",
    title: "ADR-0010: Zero-Mock Live Enterprise Data Standard",
  },
  {
    source: "docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md",
    target: "ADR-0020-frontend-modular-decomposition-and-file-size-guardrails.md",
    title: "ADR-0020: Frontend Modular Decomposition (<1,000 Lines)",
  },
  {
    source: "docs/adr/0021-external-data-governance-and-licensing.md",
    target: "ADR-0021-External-Data-Governance-and-Licensing.md",
    title: "ADR-0021: Lean External Data Governance & Offline Topology",
  },
];

// 3. Process & Copy Mappings
let syncedCount = 0;

for (const mapping of syncMappings) {
  const fullSourcePath = path.resolve(rootDir, mapping.source);
  const fullTargetPath = path.resolve(wikiDir, mapping.target);

  if (!fs.existsSync(fullSourcePath)) {
    console.warn(`⚠️ [Wiki Sync] Source not found, skipping: ${mapping.source}`);
    continue;
  }

  let content = fs.readFileSync(fullSourcePath, "utf-8");

  // Transform internal relative links for GitHub Wiki format
  // Replace ../adr/0001-... with ADR-0001-...
  content = content.replace(/\.\.\/adr\/(\d{4}-[^)]+\.md)/g, (_match, filename) => {
    return filename.replace(/\.md$/, "");
  });
  content = content.replace(/adr\/(\d{4}-[^)]+\.md)/g, (_match, filename) => {
    return filename.replace(/\.md$/, "");
  });

  if (isDryRun) {
    console.log(`🔍 [Dry Run] Would sync: ${mapping.source} ➔ ${mapping.target}`);
  } else {
    fs.writeFileSync(fullTargetPath, content, "utf-8");
    console.log(`✓ Synced: ${mapping.target}`);
  }
  syncedCount++;
}

console.log(`\n🎉 [Wiki Sync] Successfully synced ${syncedCount} documentation pages.`);

// 4. Git Push if Requested
if (shouldPush && !isDryRun) {
  try {
    console.log("\n🚀 [Wiki Sync] Staging, committing and pushing to Wiki repository...");
    execSync("git add -A", { cwd: wikiDir, stdio: "inherit" });
    const diff = execSync("git diff --staged", { cwd: wikiDir }).toString();
    if (!diff.trim()) {
      console.log("✨ [Wiki Sync] No changes detected in wiki repository. Already up to date.");
    } else {
      execSync('git commit -m "docs(wiki): automated sync from docs/"', { cwd: wikiDir, stdio: "inherit" });
      execSync("git push origin master", { cwd: wikiDir, stdio: "inherit" });
      console.log("✅ [Wiki Sync] Pushed to remote wiki repository successfully.");
    }
  } catch (err) {
    console.error("❌ [Wiki Sync] Failed to push to wiki git remote:", err.message);
  }
}
