#!/usr/bin/env node
/**
 * @file check-sensitive-leaks.cjs
 * @description Leak Prevention Guard: Autonomous pre-commit hook and CI validator
 * that scans files and paths to prevent leaks of confidential entities, personal names,
 * user login codes, private corporate domains, and un-anonymized customer references.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. RULE CATALOG (Severity Differentiated)
// ---------------------------------------------------------------------------
const FORBIDDEN_CODES = ["ES" + "XPA", "ES" + "ACA", "ES" + "ARC", "ES" + "RSE", "ES" + "JMG", "ES" + "FMO", "ES" + "HVO"];
const FORBIDDEN_CORRIDORS = ["BCN" + ".FE.FE01.012", "Book" + " 012"];

const RULES = [
  // --- CRITICAL (Hard-blocking, Exit Code 1) ---
  {
    id: 'USER_CODE',
    severity: 'CRITICAL',
    pattern: new RegExp(`\\b(${FORBIDDEN_CODES.join('|')})\\b`),
    description: 'Personal or legacy corporate user login code'
  },
  {
    id: 'PERSONAL_NAME',
    severity: 'CRITICAL',
    pattern: /(Xavier\s+Pallar[eè]s|Ariel\s+Catalano|Raquel\s+Serrano|Jos[eé]\s+Miguel\s+G[oó]mez|Fernando\s+Montalvo|Heiko\s+Vogel|x\.palleja)/i,
    description: 'Personal real name or corporate username'
  },
  {
    id: 'CORPORATE_DOMAIN',
    severity: 'CRITICAL',
    pattern: /(@?fms-logistics\.com|fms-spain\.com)/i,
    description: 'Private corporate email domain or intranet host'
  },
  {
    id: 'LEGACY_CORRIDOR_DEPT',
    severity: 'CRITICAL',
    pattern: new RegExp(`(\\b${FORBIDDEN_CORRIDORS[0]}\\b|\\b${FORBIDDEN_CORRIDORS[1]}\\b)`, 'i'),
    description: 'Legacy internal corridor or department code'
  },
  {
    id: 'COMPANY_ENTITY',
    severity: 'CRITICAL',
    pattern: /(Fr\.\s*Meyer'?s?\s*Sohn|FMS\s+Logistics)/i,
    description: 'Legacy corporate company name'
  },

  // --- PATH_RULE (Hard-blocking on filename / filepath) ---
  {
    id: 'PROHIBITED_FILE_EXT',
    severity: 'CRITICAL',
    isPathRule: true,
    pattern: /\.(msg|pst)$/i,
    description: 'Raw Outlook email storage file (.msg / .pst)'
  },

  // --- MEDIUM (Informational Warning, Non-blocking) ---
  {
    id: 'AMBIGUOUS_ACRONYM',
    severity: 'MEDIUM',
    pattern: /\bFMS\b(?!VAULT)/,
    description: 'Isolated acronym FMS (potential ambiguous reference)'
  }
];

// Default directory / file ignores
const DEFAULT_IGNORES = [
  '.git',
  'node_modules',
  'dist',
  'dev-dist',
  'coverage',
  '.turbo',
  '.cache',
  'backups',
  '.pnpm-store',
  'pnpm-lock.yaml',
  'package-lock.json',
  'audit-results.json'
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz',
  '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.sqlite', '.vault'
]);

// ---------------------------------------------------------------------------
// 2. HELPER FUNCTIONS
// ---------------------------------------------------------------------------

function loadLeakIgnore(root) {
  const ignoreFile = path.join(root, '.leakignore');
  const ignores = [...DEFAULT_IGNORES];
  if (fs.existsSync(ignoreFile)) {
    const lines = fs.readFileSync(ignoreFile, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    ignores.push(...lines);
  }
  return ignores;
}

function shouldIgnorePath(relPath, ignorePatterns) {
  const normalized = relPath.replace(/\\/g, '/');
  for (const pattern of ignorePatterns) {
    const cleanPattern = pattern.replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '');
    if (!cleanPattern) continue;
    if (normalized === cleanPattern || normalized.startsWith(cleanPattern + '/') || normalized.includes('/' + cleanPattern + '/')) {
      return true;
    }
    if (cleanPattern.startsWith('*') && normalized.endsWith(cleanPattern.slice(1))) {
      return true;
    }
  }
  return false;
}

function getStagedFiles(root) {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return output.split(/\r?\n/).map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.warn('⚠️ Warning: unable to get git staged files, falling back to empty list.');
    return [];
  }
}

function getAllFiles(dir, ignorePatterns, fileList = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return fileList;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(REPO_ROOT, fullPath);

    if (shouldIgnorePath(relPath, ignorePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      getAllFiles(fullPath, ignorePatterns, fileList);
    } else if (entry.isFile()) {
      fileList.push(relPath);
    }
  }
  return fileList;
}

function scanFile(filePath, root, ignorePatterns) {
  const relPath = path.isAbsolute(filePath) ? path.relative(root, filePath) : filePath;
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);

  if (shouldIgnorePath(relPath, ignorePatterns)) {
    return [];
  }

  const findings = [];
  const normalizedRelPath = relPath.replace(/\\/g, '/');

  // 1. Path Rules
  for (const rule of RULES.filter(r => r.isPathRule)) {
    if (rule.pattern.test(normalizedRelPath)) {
      findings.push({
        file: relPath,
        line: 0,
        ruleId: rule.id,
        severity: rule.severity,
        desc: rule.description,
        snippet: `Path matched: ${relPath}`
      });
    }
  }

  // 2. Binary extensions check
  const ext = path.extname(absPath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return findings;
  }

  // Self check: Do not self-trigger on this validator script or .leakignore
  if (normalizedRelPath.endsWith('check-sensitive-leaks.cjs') || normalizedRelPath.endsWith('.leakignore')) {
    return findings;
  }

  if (!fs.existsSync(absPath)) {
    return findings;
  }

  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch (e) {
    return findings; // unreadable binary or locked
  }

  const lines = content.split(/\r?\n/);
  const contentRules = RULES.filter(r => !r.isPathRule);

  lines.forEach((lineText, idx) => {
    for (const rule of contentRules) {
      if (rule.pattern.test(lineText)) {
        findings.push({
          file: relPath,
          line: idx + 1,
          ruleId: rule.id,
          severity: rule.severity,
          desc: rule.description,
          snippet: lineText.trim().substring(0, 140)
        });
      }
    }
  });

  return findings;
}

// ---------------------------------------------------------------------------
// 3. MAIN EXECUTION
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const ignorePatterns = loadLeakIgnore(REPO_ROOT);

  let targetFiles = [];

  if (args.includes('--staged')) {
    targetFiles = getStagedFiles(REPO_ROOT);
    if (targetFiles.length === 0) {
      console.log('🛡️  [Leak Guard] No staged files to scan.');
      process.exit(0);
    }
  } else if (args.includes('--all')) {
    targetFiles = getAllFiles(REPO_ROOT, ignorePatterns);
  } else if (args.length > 0) {
    // Files passed explicitly (e.g. by lint-staged)
    targetFiles = args.filter(a => !a.startsWith('--'));
  } else {
    // Default to staged if in git repo, otherwise all
    targetFiles = getStagedFiles(REPO_ROOT);
    if (targetFiles.length === 0) {
      targetFiles = getAllFiles(REPO_ROOT, ignorePatterns);
    }
  }

  console.log(`🛡️  [Leak Prevention Guard] Scanning ${targetFiles.length} file(s)...`);

  const allFindings = [];
  for (const file of targetFiles) {
    const findings = scanFile(file, REPO_ROOT, ignorePatterns);
    allFindings.push(...findings);
  }

  const criticalFindings = allFindings.filter(f => f.severity === 'CRITICAL');
  const warningFindings = allFindings.filter(f => f.severity === 'MEDIUM');

  if (warningFindings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warningFindings.length} non-blocking item(s)):`);
    for (const f of warningFindings) {
      console.log(`   - [${f.ruleId}] ${f.file}:${f.line} -> "${f.snippet}"`);
    }
  }

  if (criticalFindings.length > 0) {
    console.error(`\n❌ CRITICAL LEAKS DETECTED (${criticalFindings.length} issue(s)):`);
    console.error(`   The commit / build has been BLOCKED to protect confidential data.\n`);

    for (const f of criticalFindings) {
      console.error(`   🛑 [${f.ruleId}] ${f.desc}`);
      console.error(`      File: ${f.file}${f.line > 0 ? `:${f.line}` : ''}`);
      console.error(`      Code: ${f.snippet}\n`);
    }

    console.error(`💡 Remediation:`);
    console.error(`   - Replace real company names, employee names or codes with official aliases (ADMIN, TEST01, TEST02, etc.).`);
    console.error(`   - If this file is a false positive fixture, declare it in .leakignore.\n`);

    process.exit(1);
  }

  console.log(`✅ [Leak Prevention Guard] Clean! Zero confidential leaks detected.`);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { RULES, scanFile, loadLeakIgnore, shouldIgnorePath };
