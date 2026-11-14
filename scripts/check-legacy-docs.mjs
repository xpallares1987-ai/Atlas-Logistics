/**
 * @file check-legacy-docs.mjs
 * @description Automated regression check ensuring obsolete database (PostgreSQL/psql)
 *              and legacy infrastructure terms are not reintroduced into active documentation.
 * @module @atlas/scripts/check-legacy-docs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Prohibited legacy patterns (case-insensitive)
const FORBIDDEN_PATTERNS = [
  /\bpostgresql\b/i,
  /\bpostgres\b/i,
  /\bpsql\b/i,
  /\bpg_dump\b/i,
  /\bpg_restore\b/i,
  /DATABASE_URL=postgres/i,
];

// Directories and files to exclude (e.g. historical archives, ADR rationales, changelogs)
const ALLOWLISTED_PATHS = [
  path.join('CHANGELOG.md'), // Release change log documenting what was deprecated or purged
  path.join('docs', 'adr'), // Architectural Decision Records explaining migration decisions and context
  path.join('docs', 'reports'), // Historical audit reports and implementation summaries
  path.join('docs', 'superpowers'), // Historical sprint specs and planning packages
  path.join('docs', 'reference', 'database-schema-full-inventory-and-relational-map.md'), // Documents external audit findings & resolution
  path.join('node_modules'),
  path.join('.git'),
];

/**
 * Check if a relative path matches any allowlisted paths
 */
function isAllowlisted(relPath) {
  const normalized = path.normalize(relPath);
  return ALLOWLISTED_PATHS.some((allowed) => normalized.startsWith(allowed));
}

/**
 * Recursively find all markdown files
 */
function findMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(REPO_ROOT, fullPath);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || isAllowlisted(relPath)) {
        continue;
      }
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (!isAllowlisted(relPath)) {
        files.push(relPath);
      }
    }
  }

  return files;
}

function runAudit() {
  console.log('='.repeat(80));
  console.log(' ATLAS LOGISTICS - LEGACY DOCUMENTATION REGRESSION AUDIT');
  console.log('='.repeat(80));

  const targetFiles = [
    'README.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'CHANGELOG.md',
    ...findMarkdownFiles(path.join(REPO_ROOT, 'docs')),
  ];

  const violations = [];

  for (const relPath of targetFiles) {
    if (isAllowlisted(relPath)) continue;

    const fullPath = path.join(REPO_ROOT, relPath);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            file: relPath,
            line: index + 1,
            match: line.trim(),
            pattern: pattern.toString(),
          });
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error(`\n❌ [FAIL] Found ${violations.length} forbidden legacy terms in active documentation:\n`);
    violations.forEach((v) => {
      console.error(`  - ${v.file}:${v.line} [${v.pattern}]: "${v.match}"`);
    });
    console.error('\nAtlas Logistics is standardized 100% on SQLite WAL mode and Docker Compose.');
    console.error('Please remove or update legacy references to align with project standards.\n');
    process.exit(1);
  }

  console.log(`\n  ✓ Scanned ${targetFiles.length} active documentation files.`);
  console.log('  ✓ Zero forbidden legacy database/infrastructure terms detected.');
  console.log('='.repeat(80));
  console.log(' [PASS] Legacy documentation audit passed successfully.');
  console.log('='.repeat(80));
}

runAudit();
