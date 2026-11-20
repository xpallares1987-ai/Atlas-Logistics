#!/usr/bin/env node

/**
 * @file check-naming-conventions.mjs
 * @description Automated CI and local architectural guardrail enforcing DRY file/folder naming,
 * semantic UI buckets (Modal/, Drawer/, Tab/, Banner/, Panel/, Queue/), canonical index.ts barrels,
 * clean hooks/ segregation, and canonical service/route suffixes across Atlas-Logistics.
 * @module @atlas/scripts/check-naming-conventions
 * @see {@link AGENTS.md}
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ============================================================================
// 1. CONFIGURATION & ARCHITECTURAL RULES
// ============================================================================

const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".git",
  "__tests__",
]);

const SEMANTIC_UI_BUCKETS = new Set([
  "Tab",
  "Modal",
  "Banner",
  "Drawer",
  "Queue",
  "Panel",
]);

/**
 * Walks a directory tree recursively, collecting files (skipping ignored dirs).
 * @param {string} dirPath - Root directory to traverse.
 * @param {string[]} [results] - Accumulator for absolute file paths.
 * @returns {string[]} Collected file paths.
 */
function walkFiles(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) {
    return results;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walkFiles(fullPath, results);
      }
      continue;
    }

    if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Normalizes path separators to forward slashes relative to repository root.
 * @param {string} rootDir
 * @param {string} targetPath
 * @returns {string}
 */
function toRelPosix(rootDir, targetPath) {
  return path.relative(rootDir, targetPath).replace(/\\/g, "/");
}

// ============================================================================
// 2. SCANNER ENGINE
// ============================================================================

/**
 * Audits workspace files and component module directories against DRY naming guardrails.
 * @param {object} options
 * @param {string} [options.rootDir] - Repository or fixture root directory.
 * @returns {{ scannedFiles: number, scannedBarrels: number, violations: Array<{ rule: string, path: string, message: string }>, passed: boolean }}
 */
export function scanNamingConventions({ rootDir = process.cwd() } = {}) {
  const violations = [];
  let scannedFiles = 0;
  let scannedBarrels = 0;

  const scanRoots = [
    path.join(rootDir, "src"),
    path.join(rootDir, "packages"),
  ];

  const allFiles = scanRoots.flatMap((dir) => walkFiles(dir));

  for (const filePath of allFiles) {
    const ext = path.extname(filePath);
    if (![".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) {
      continue;
    }

    scannedFiles += 1;
    const rel = toRelPosix(rootDir, filePath);
    const fileName = path.basename(filePath);
    const baseName = path.basename(filePath, ext);
    const parentDir = path.basename(path.dirname(filePath));
    const isTestFile = /\.(test|spec)\.[^.]+$/i.test(fileName);

    // Rule 1: Prohibit legacy *Component.tsx / *Component.ts suffixes
    if (/Component\.(ts|tsx|js|jsx)$/.test(fileName)) {
      violations.push({
        rule: "NO_COMPONENT_SUFFIX",
        path: rel,
        message: "Remove redundant 'Component' suffix (AGENTS.md §7 / DRY naming).",
      });
    }

    // Rule 2: Prohibit index.tsx component implementations (use atomic PascalCase.tsx + index.ts barrel)
    if (fileName === "index.tsx" && rel.startsWith("packages/")) {
      violations.push({
        rule: "NO_INDEX_TSX",
        path: rel,
        message:
          "Avoid index.tsx implementations; export atomic PascalCase.tsx components via a canonical index.ts barrel.",
      });
    }

    // Rule 3: Prohibit camelCase *Service.ts / *Routes.ts legacy naming
    if (
      !isTestFile &&
      (/(?:[a-z][A-Za-z0-9]*Service|PDFService)\.(ts|js)$/.test(fileName) ||
        /[a-z][A-Za-z0-9]*Routes\.(ts|js)$/.test(fileName))
    ) {
      violations.push({
        rule: "CANONICAL_SERVICE_ROUTE_SUFFIX",
        path: rel,
        message:
          "Use dot-separated role suffixes (e.g., kebab-case.service.ts or kebab-case.routes.ts) instead of camelCase *Service/*Routes.",
      });
    }

    // Rule 4: Enforce hooks/ directory purity (strictly use*.ts / index.ts)
    if (
      !isTestFile &&
      parentDir === "hooks" &&
      ext !== ".d.ts" &&
      fileName !== "index.ts" &&
      !/^use[A-Z]/.test(baseName)
    ) {
      violations.push({
        rule: "HOOKS_DIR_PURITY",
        path: rel,
        message:
          "Non-hook utility files do not belong in hooks/; move pure helpers or exporters to utils/ and keep hooks/ strictly for use*.ts.",
      });
    }

    // Rule 5: Enforce semantic Modal/ & Drawer/ segregation in UI component modules
    if (
      !isTestFile &&
      (rel.startsWith("packages/frontend/src/components/") ||
        rel.startsWith("packages/frontend/src/features/") ||
        rel.startsWith("packages/ui/src/components/") ||
        rel.startsWith("packages/rate-comparer/src/components/"))
    ) {
      if (
        /Modal\.tsx$/.test(fileName) &&
        fileName !== "Modal.tsx" &&
        parentDir !== "Modal"
      ) {
        violations.push({
          rule: "SEMANTIC_MODAL_BUCKET",
          path: rel,
          message:
            "Move *Modal.tsx into a semantic Modal/ subdirectory with a DRY name (e.g., Modal/CreateInvoice.tsx).",
        });
      }

      if (
        /Drawer\.tsx$/.test(fileName) &&
        fileName !== "Drawer.tsx" &&
        parentDir !== "Drawer"
      ) {
        violations.push({
          rule: "SEMANTIC_DRAWER_BUCKET",
          path: rel,
          message:
            "Move *Drawer.tsx into a semantic Drawer/ subdirectory with a DRY name (e.g., Drawer/ShipmentDetails.tsx).",
        });
      }
    }

    // Rule 6: Prohibit repeating semantic bucket suffixes inside Tab/, Modal/, Banner/, Drawer/, Queue/, Panel/
    if (
      !isTestFile &&
      SEMANTIC_UI_BUCKETS.has(parentDir) &&
      ext === ".tsx" &&
      baseName.endsWith(parentDir) &&
      baseName !== parentDir
    ) {
      violations.push({
        rule: "NO_REDUNDANT_BUCKET_SUFFIX",
        path: rel,
        message: `Do not repeat semantic bucket '${parentDir}' inside '${parentDir}/${fileName}' (AGENTS.md §7).`,
      });
    }
  }

  // Rule 7: Require canonical index.ts barrel at every top-level UI domain folder
  const barrelRoots = [
    path.join(rootDir, "packages/frontend/src/components"),
    path.join(rootDir, "packages/ui/src/components"),
  ];

  for (const barrelRoot of barrelRoots) {
    if (!fs.existsSync(barrelRoot)) continue;

    for (const entry of fs.readdirSync(barrelRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name)) continue;

      scannedBarrels += 1;
      const domainDir = path.join(barrelRoot, entry.name);
      const barrelPath = path.join(domainDir, "index.ts");
      if (!fs.existsSync(barrelPath)) {
        violations.push({
          rule: "MISSING_BARREL_INDEX",
          path: toRelPosix(rootDir, domainDir),
          message:
            "Every UI domain/category directory must expose a canonical index.ts barrel (AGENTS.md §7).",
        });
      }
    }
  }

  violations.sort((a, b) => a.path.localeCompare(b.path));

  return {
    scannedFiles,
    scannedBarrels,
    violations,
    passed: violations.length === 0,
  };
}

// ============================================================================
// 3. CLI ENTRYPOINT
// ============================================================================

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const result = scanNamingConventions({ rootDir: process.cwd() });

  console.log(
    `\n📐 [DRY Naming Guardrail] Scanned ${result.scannedFiles} source files and ${result.scannedBarrels} UI component barrels.`,
  );

  if (result.passed) {
    console.log(
      "✅ [DRY Naming Guardrail] Zero architectural naming violations detected.\n",
    );
    process.exit(0);
  }

  console.error(
    `❌ [DRY Naming Guardrail] Detected ${result.violations.length} naming violation(s):\n`,
  );
  console.table(
    result.violations.map((v) => ({
      Rule: v.rule,
      Path: v.path,
      Remediation: v.message,
    })),
  );
  process.exit(1);
}
