/**
 * @file check-zero-innerhtml.mjs
 * @description Zero-cost CI & local static security guardrail enforcing AGENTS.md §4 (Strict Zero-innerHTML Standard / CWE-79) across all frontend and UI workspace packages.
 * @module @atlas/scripts/check-zero-innerhtml
 * @see {@link AGENTS.md}
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// 1. CONFIGURATION & FORBIDDEN DOM SINKS
// ============================================================================
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES_DIR = path.join(ROOT_DIR, "packages");

const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  "__tests__",
]);

const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

const FORBIDDEN_PATTERNS = [
  {
    name: "dangerouslySetInnerHTML",
    regex: /\bdangerouslySetInnerHTML\b/,
  },
  {
    name: "innerHTML assignment",
    regex: /\.innerHTML\s*[+]?=/,
  },
  {
    name: "outerHTML assignment",
    regex: /\.outerHTML\s*[+]?=/,
  },
  {
    name: "insertAdjacentHTML",
    regex: /\.insertAdjacentHTML\s*\(/,
  },
];

// ============================================================================
// 2. DIRECTORY WALKER & STATIC SCANNER
// ============================================================================
function collectSourceFiles(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) {
    return results;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        collectSourceFiles(fullPath, results);
      }
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!TARGET_EXTENSIONS.has(ext)) {
      continue;
    }
    if (/\.(test|spec)\.[^.]+$/i.test(entry.name)) {
      continue;
    }
    results.push(fullPath);
  }

  return results;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const violations = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (inBlockComment) {
      if (trimmed.includes("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) {
        inBlockComment = true;
      }
      continue;
    }

    if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
      continue;
    }

    // Strip trailing inline comments before testing code portion
    const codePart = rawLine.replace(/\/\/.*$/, "");

    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.regex.test(codePart)) {
        violations.push({
          file: path.relative(ROOT_DIR, filePath).replace(/\\/g, "/"),
          line: i + 1,
          rule: rule.name,
          snippet: trimmed.slice(0, 120),
        });
      }
    }
  }

  return violations;
}

// ============================================================================
// 3. EXECUTION & REPORTING
// ============================================================================
function main() {
  const files = collectSourceFiles(PACKAGES_DIR);
  const allViolations = [];

  for (const file of files) {
    allViolations.push(...scanFile(file));
  }

  console.log("================================================================================");
  console.log(" [SECURITY GUARD] ZERO-INNERHTML / CWE-79 STATIC REGRESSION CHECK (AGENTS.md §4)");
  console.log("================================================================================");
  console.log(`Scanned ${files.length} workspace source files under packages/.\n`);

  if (allViolations.length > 0) {
    console.error(`❌ [FAIL] Detected ${allViolations.length} forbidden raw HTML sink(s):\n`);
    for (const v of allViolations) {
      console.error(`  - ${v.file}:${v.line} [${v.rule}] -> ${v.snippet}`);
    }
    console.error("\nRemediation: Use React JSX or programmatic document.createElement() / .textContent / .replaceChildren().");
    process.exit(1);
  }

  console.log("✓ Zero dangerouslySetInnerHTML, innerHTML, outerHTML, or insertAdjacentHTML sinks found.");
  console.log("================================================================================");
  console.log(" [PASS] ZERO-INNERHTML SECURITY GUARD PASSED");
  console.log("================================================================================");
  process.exit(0);
}

main();
