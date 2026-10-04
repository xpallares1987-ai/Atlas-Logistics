🔍 DEEP PROJECT ANALYSIS — ATLAS LOGISTICS
══════════════════════════════════════════════════════════════════════════════

After thorough analysis of your project, here are ADDITIONAL RECOMMENDATIONS beyond the setup optimization:


1️⃣ CRITICAL: Clean Up `packages/shared/node_modules_prod/`
═══════════════════════════════════════════════════════════════════════════════

⚠️ ISSUE FOUND:
  Location: packages/shared/node_modules_prod/
  Problem: 3.3MB+ of bundled dependencies in source control
  
Why it's a problem:
  • Unnecessarily bloats the repository
  • Should never be committed (defeats purpose of package.json)
  • Slows down git operations
  • Duplicates what pnpm manages

RECOMMENDATION:
  1. Add to .gitignore (already done ✓)
  2. Remove from git history:
     $ git rm -r --cached packages/shared/node_modules_prod/
     $ git commit -m "remove: clean up committed node_modules"
  3. Regenerate only when absolutely needed:
     $ cd packages/shared && pnpm install --prod


2️⃣ REMOVE ANALYSIS FILES (Clutter)
═══════════════════════════════════════════════════════════════════════════════

⚠️ FILES THAT SHOULD NOT EXIST:
  • packages/arbol.md
  • packages/duplicados.md
  • packages/duplicados_hash.md
  • packages/estadisticas.md
  • packages/estadisticas_modulos.md
  • packages/estructura.ndjson

ACTION:
  These are analysis/debug files, not part of the codebase.
  
  $ rm packages/arbol.md
  $ rm packages/duplicados.md
  $ rm packages/duplicados_hash.md
  $ rm packages/estadisticas.md
  $ rm packages/estadisticas_modulos.md
  $ rm packages/estructura.ndjson
  
  $ git add packages/
  $ git commit -m "cleanup: remove analysis artifacts"


3️⃣ WARNING: Huge Data File in rate-comparer
═══════════════════════════════════════════════════════════════════════════════

⚠️ ISSUE FOUND:
  File: packages/rate-comparer/src/data/datos.ts (109 KB)
  Problem: Very large TypeScript data file
  
RECOMMENDATION:
  Option A: Split into smaller files (recommended)
    packages/rate-comparer/src/data/
    ├── rates-base.ts (30KB)
    ├── rates-surcharges.ts (30KB)
    ├── rates-special.ts (49KB)
    
  Option B: Move to JSON + import
    packages/rate-comparer/src/data/rates.json
    // Then import with: import rates from './rates.json'
    
  Option C: Lazy-load the data
    // Load datos.ts only when needed, not at startup


4️⃣ SECURITY AUDIT: CVEs Ignored
═══════════════════════════════════════════════════════════════════════════════

⚠️ CURRENT STATUS:
  Your package.json has 14 ignored CVEs:
  
  ignoreCves: [
    "CVE-2026-14257",           ← Future date (2026!)
    "GHSA-mh99-v99m-4gvg",
    ... (12 more)
  ]

RECOMMENDATIONS:
  1. Review each CVE quarterly
     $ pnpm audit --audit-level=moderate
  
  2. For CVE-2026-14257 (year 2026):
     → This appears to be a data entry error
     → Check if it's actually a current year
     → Update to 2024/2025 if possible
  
  3. For each GHSA:
     → Research if it actually affects your code
     → Update when fixes are available
     → Don't ignore indefinitely


5️⃣ DATABASE SCHEMA HEALTH CHECK
═══════════════════════════════════════════════════════════════════════════════

RECOMMENDATIONS:
  1. Create a schema documentation script:
     $ pnpm db:inspect  # Already available!
  
  2. Export schema as documentation:
     $ pnpm db:generate  # Already available!
  
  3. Regular schema audit (monthly):
     Review src/db/schema/ for:
     • Unused tables (drop them)
     • Missing indexes (add them)
     • Outdated migrations (clean them)
  
  4. Backup strategy:
     $ pnpm backup-db  # Already available!
     Run weekly, keep 4 backups


6️⃣ MONOREPO OPTIMIZATION
═══════════════════════════════════════════════════════════════════════════════

CURRENT SETUP:
  pnpm-workspace.yaml:
  packages:
    - "packages/*"
    - "src/*"  ← This is unusual

POTENTIAL ISSUE:
  src/* shouldn't be a workspace package
  It should be part of the root package

RECOMMENDATION:
  Update pnpm-workspace.yaml to:
  
  packages:
    - "packages/*"
  
  Then verify:
  $ pnpm list -r
  Should show all workspace packages correctly


7️⃣ TEST COVERAGE GAPS
═══════════════════════════════════════════════════════════════════════════════

CURRENT:
  vitest.config.ts configured but:
  • No coverage thresholds set
  • No HTML coverage report
  • exclude pattern includes tests/e2e but no mention of them

RECOMMENDATIONS:
  1. Add coverage thresholds:
     // vitest.config.ts
     coverage: {
       provider: 'v8',
       reporter: ['text', 'json', 'html'],
       exclude: [
         'node_modules/',
         'dist/',
       ],
       lines: 80,        // Enforce 80% line coverage
       functions: 80,
       branches: 75,
       statements: 80,
     }
  
  2. Run coverage:
     $ pnpm test:coverage
     $ open coverage/index.html  # View HTML report
  
  3. Enforce in CI/pre-commit:
     pnpm test:coverage --run


8️⃣ DEPENDENCY ANALYSIS
═══════════════════════════════════════════════════════════════════════════════

POTENTIAL ISSUES IDENTIFIED:

A. Duplicate Dependencies:
   ├── react: ^19.2.8 (both dependencies & devDependencies)
   ├── react-dom: ^19.2.8 (same)
   
   These should ONLY be in devDependencies or peerDependencies

B. Old Versions To Consider:
   • vite: 8.2.2 (current: 5.x+)
   • typescript: 5.7.3 (good, current)
   • playwright: 1.62.1 (check for updates)

C. Unused? (Check if actually used):
   • d3-color (large dependency, verify it's needed)
   • @emotion/is-prop-valid (rarely needed)
   • cross-fetch (should be native fetch in Node 18+)

RECOMMENDATIONS:
  1. Audit dependencies quarterly:
     $ pnpm outdated
  
  2. Remove unused:
     $ pnpm install -r  # Clean install
     $ pnpm prune       # Remove unused
  
  3. Update strategically:
     $ pnpm update react@latest
     $ pnpm test        # Verify nothing breaks


9️⃣ PERFORMANCE MONITORING RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════════════════

ADD TO YOUR MONTHLY BENCHMARK:

1. Bundle Size Analysis:
   $ pnpm build
   $ npm install -g size-limit
   $ size-limit
   
   Expected:
   • Frontend bundle: < 500KB
   • Backend dist: < 2MB
   • Each MFE: < 200KB

2. Dependency Health:
   $ pnpm audit
   $ npm ls --depth=0
   
   Expected:
   • 0 critical vulnerabilities
   • 0 ignored CVEs (or document why)

3. Build Performance:
   $ time pnpm build
   
   Expected: < 60 seconds

4. Turbo Cache:
   $ turbo prune
   $ du -sh .turbo
   
   Monthly cleanup: rm -rf .turbo


🔟 DEVELOPMENT EXPERIENCE ENHANCEMENTS
═══════════════════════════════════════════════════════════════════════════════

RECOMMENDATIONS:

1. Add a .nvmrc file for Node version management:
   $ echo "20.11.0" > .nvmrc
   
   Why: Ensures team uses same Node version
   Usage: $ nvm use

2. Add a .npmrc file for pnpm config:
   $ cat > .npmrc << 'EOF'
   shamefully-hoist=true
   strict-peer-dependencies=false
   EOF

3. Add package.json "scripts" for common tasks:
   "audit": "pnpm audit --audit-level=moderate",
   "upgrade": "pnpm update -r --latest",
   "workspace:list": "pnpm list -r --depth=0",
   "workspace:check": "pnpm audit && pnpm lint && pnpm type-check"

4. Create development guidelines:
   • CONTRIBUTING.md should have:
     ✓ Setup instructions (already exists)
     ✓ Commit conventions
     ✓ PR review checklist
     ✓ Testing requirements


🛡️ SECURITY RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════════════════

1. Add secret scanning:
   Create .env.local.example showing all needed vars (already done ✓)
   
2. Add SBOM (Software Bill of Materials):
   $ npm install -g @spdx/sbom-template
   $ cyclonedx-npm --output-file sbom.json
   
   Already exists: scout-spdx.json ✓

3. Add supply chain security:
   $ npm install --lockfile-only
   $ git commit package-lock.json  # or pnpm-lock.yaml
   
   Already using pnpm-lock.yaml ✓

4. Implement rate limiting on APIs:
   Already configured: @fastify/rate-limit ✓
   
   Verify it's enabled:
   // Ensure this is in src/app.ts
   import { rateLimit } from '@fastify/rate-limit'
   app.register(rateLimit)


SUMMARY OF ACTION ITEMS
═══════════════════════════════════════════════════════════════════════════════

IMMEDIATE (Do today):
  [ ] Remove packages/shared/node_modules_prod/ from git
  [ ] Delete analysis files (arbol.md, duplicados.md, etc.)
  [ ] Review CVE-2026-14257 (year 2026 seems wrong)

THIS WEEK:
  [ ] Analyze packages/rate-comparer/src/data/datos.ts (109KB)
  [ ] Fix pnpm-workspace.yaml (remove src/*)
  [ ] Add coverage thresholds to vitest.config.ts
  [ ] Check Vite version (8.2.2 might be old)

THIS MONTH:
  [ ] Audit all dependencies (pnpm audit, pnpm outdated)
  [ ] Remove unused dependencies
  [ ] Set up monthly security scanning
  [ ] Add SBOM generation to CI/CD

THIS QUARTER:
  [ ] Quarterly security audit
  [ ] Review test coverage gaps
  [ ] Performance optimization based on metrics
  [ ] Team review of development guidelines


RISK ASSESSMENT
═══════════════════════════════════════════════════════════════════════════════

🔴 HIGH PRIORITY:
  • node_modules_prod in git (repo bloat + security)
  • Analysis files in source (clutter)

🟡 MEDIUM PRIORITY:
  • Large datos.ts file (could impact build time)
  • Ignored CVEs need quarterly review
  • Coverage thresholds not enforced

🟢 LOW PRIORITY:
  • Old Vite version (still works, update when convenient)
  • Cross-fetch (upgrade when dropping Node <18 support)


EXPECTED BENEFITS
═══════════════════════════════════════════════════════════════════════════════

After implementing these recommendations:
  ✓ Repository size reduced by ~5MB
  ✓ Git operations faster
  ✓ Cleaner codebase (no analysis artifacts)
  ✓ Better test coverage visibility
  ✓ Proactive security monitoring
  ✓ Improved developer experience
  ✓ Better dependency health


═══════════════════════════════════════════════════════════════════════════════
Next: Review the HIGH PRIORITY items first.
Then schedule the MEDIUM and LOW priority items.
═══════════════════════════════════════════════════════════════════════════════
