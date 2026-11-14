/**
 * @file check-markdown-links.mjs
 * @description Validates all relative links in repository markdown documentation.
 * Scans root canonical documentation and all Diátaxis quadrants in docs/.
 * Asserts target files and directories exist on disk, preventing broken links.
 * @module @atlas/scripts/check-markdown-links
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = ['docs'];
const SCAN_ROOT_FILES = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
];

const IGNORE_PROTOCOLS = /^(https?:|mailto:|ftp:|javascript:|tel:|data:)/i;
const MARKDOWN_LINK_REGEX = /!?\[([^\]]*)\]\(([^)]+)\)/g;

// ============================================================================
// 2. FILE DISCOVERY
// ============================================================================

function discoverMarkdownFiles() {
  const files = [];

  // 1. Root canonical files
  for (const rf of SCAN_ROOT_FILES) {
    const fullPath = path.join(REPO_ROOT, rf);
    if (fs.existsSync(fullPath)) {
      files.push(fullPath);
    }
  }

  // 2. Directories
  function traverse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  for (const sd of SCAN_DIRS) {
    const fullDir = path.join(REPO_ROOT, sd);
    if (fs.existsSync(fullDir)) {
      traverse(fullDir);
    }
  }

  return files;
}

// ============================================================================
// 3. LINK VERIFICATION AUDIT
// ============================================================================

function verifyMarkdownLinks() {
  console.log('='.repeat(80));
  console.log(' [AUDIT] MARKDOWN RELATIVE LINK INTEGRITY CHECKER');
  console.log('='.repeat(80));

  const files = discoverMarkdownFiles();
  console.log(`\nDiscovered ${files.length} markdown documentation files to audit.\n`);

  let totalLinksChecked = 0;
  const brokenLinks = [];

  for (const filePath of files) {
    const relativeFilePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((lineText, lineIdx) => {
      let match;
      MARKDOWN_LINK_REGEX.lastIndex = 0;

      while ((match = MARKDOWN_LINK_REGEX.exec(lineText)) !== null) {
        const linkLabel = match[1];
        let rawTarget = match[2].trim().split(/\s+/)[0]; // strip optional title "..."

        // Extract path component (strip anchor #...)
        const [targetPath, anchor] = rawTarget.split('#');

        // Pure internal anchors (#heading) or external URLs are skipped
        if (!targetPath || IGNORE_PROTOCOLS.test(targetPath)) {
          continue;
        }

        totalLinksChecked++;

        // Resolve absolute target path
        let resolvedPath;
        if (targetPath.startsWith('/')) {
          resolvedPath = path.join(REPO_ROOT, targetPath);
        } else {
          resolvedPath = path.join(path.dirname(filePath), targetPath);
        }

        // Verify physical presence
        if (!fs.existsSync(resolvedPath)) {
          brokenLinks.push({
            file: relativeFilePath,
            line: lineIdx + 1,
            label: linkLabel,
            target: targetPath,
            resolved: path.relative(REPO_ROOT, resolvedPath).replace(/\\/g, '/'),
          });
        }
      }
    });
  }

  console.log(`Total links verified: ${totalLinksChecked}`);

  if (brokenLinks.length > 0) {
    console.error(`\n❌ Found ${brokenLinks.length} broken markdown relative link(s):\n`);
    for (const b of brokenLinks) {
      console.error(`  - ${b.file}:${b.line}`);
      console.error(`    Label:  "${b.label}"`);
      console.error(`    Target: ${b.target}`);
      console.error(`    Expect: ${b.resolved}\n`);
    }
    process.exit(1);
  }

  console.log('✓ All markdown relative links resolve successfully to existing targets.\n');
  console.log('='.repeat(80));
  console.log(' [PASS] ZERO BROKEN MARKDOWN LINKS DETECTED');
  console.log('='.repeat(80));
}

verifyMarkdownLinks();
