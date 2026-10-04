⚡ QUICK FIXES — ATLAS LOGISTICS
═══════════════════════════════════════════════════════════════════════════════

Apply these fixes immediately (< 10 minutes each):


FIX #1: Remove node_modules_prod from Git History
──────────────────────────────────────────────────

⏱️ Time: 3 minutes

```bash
# 1. Remove from git tracking
git rm -r --cached packages/shared/node_modules_prod/

# 2. Verify it's gone from staging
git status

# 3. Commit the removal
git commit -m "cleanup: remove node_modules_prod from version control"

# 4. Verify it's in .gitignore (should be)
grep "node_modules" .gitignore  # Should show: node_modules/

# 5. Force cleanup old commits (optional, advanced)
# Only do if the repo is small and not shared widely
# git gc --aggressive --prune=now
```

Impact: Reduces repo size by ~3.3MB


FIX #2: Delete Analysis Files
──────────────────────────────

⏱️ Time: 2 minutes

```bash
# Delete each file
rm packages/arbol.md
rm packages/duplicados.md
rm packages/duplicados_hash.md
rm packages/estadisticas.md
rm packages/estadisticas_modulos.md
rm packages/estructura.ndjson

# Commit the cleanup
git add packages/
git commit -m "cleanup: remove analysis artifacts"
```

Impact: Cleaner codebase, no clutter


FIX #3: Fix pnpm-workspace.yaml
───────────────────────────────

⏱️ Time: 2 minutes

BEFORE:
```yaml
packages:
  - "packages/*"
  - "src/*"  # ← REMOVE THIS LINE
```

AFTER:
```yaml
packages:
  - "packages/*"
```

WHY:
- src/* should not be a workspace package
- It's the root backend code
- Having it here causes confusing workspace structure

Apply:
```bash
# Edit the file
nano pnpm-workspace.yaml  # or use your editor

# Remove the "src/*" line

# Verify
pnpm list -r --depth=0

# Commit
git add pnpm-workspace.yaml
git commit -m "fix: correct pnpm workspace configuration"
```


FIX #4: Add CVE Review to Maintenance
──────────────────────────────────────

⏱️ Time: 5 minutes

Add this to MAINTENANCE_CHECKLIST.md:

```markdown
### Security Audit (Monthly)
- [ ] Run: pnpm audit
- [ ] Review GHSA advisories in package.json
- [ ] Update package.json ignoreCves if fixed
- [ ] Check for CVE-2026-14257 - verify year is correct
```

WHY:
- CVE-2026-14257 has a future year (2026)
- This looks like a typo
- Need to verify and fix if it's wrong


FIX #5: Update vitest.config.ts with Coverage Thresholds
────────────────────────────────────────────────────────

⏱️ Time: 3 minutes

BEFORE:
```typescript
export default defineConfig({
  test: {
    environment: "node",
    env: { ... },
    exclude: [ ... ],
  },
});
```

AFTER:
```typescript
export default defineConfig({
  test: {
    environment: "node",
    env: { ... },
    exclude: [ ... ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
    },
  },
});
```

Apply:
```bash
# Edit file
nano vitest.config.ts

# Add the coverage section above

# Test it works
pnpm test:coverage

# Commit
git add vitest.config.ts
git commit -m "chore: add test coverage thresholds"
```


FIX #6: Update .nvmrc for Node Version
──────────────────────────────────────

⏱️ Time: 1 minute

```bash
# Create .nvmrc
echo "20.11.0" > .nvmrc

# Verify
cat .nvmrc

# Commit
git add .nvmrc
git commit -m "chore: add Node version lockfile"
```

WHY:
- Ensures team uses same Node version
- Prevents "works on my machine" issues
- nvm users: `nvm use` automatically picks it up


FIX #7: Add npm Scripts for Common Tasks
─────────────────────────────────────────

⏱️ Time: 2 minutes

Add to package.json scripts:

```json
"scripts": {
  // ... existing scripts ...
  "audit": "pnpm audit --audit-level=moderate",
  "workspace:list": "pnpm list -r --depth=0",
  "workspace:outdated": "pnpm outdated -r",
  "clean:all": "rm -rf node_modules packages/*/node_modules dist .turbo",
}
```

Apply:
```bash
# Edit package.json (add scripts above)
# Then:
pnpm audit      # Try new command
pnpm clean:all  # Try cleanup

# Commit
git add package.json
git commit -m "chore: add convenience npm scripts"
```


FIX #8: Create .nvmrc and Update .npmrc
────────────────────────────────────────

⏱️ Time: 2 minutes

Create .npmrc:
```bash
cat > .npmrc << 'EOF'
shamefully-hoist=false
strict-peer-dependencies=false
EOF

git add .npmrc
git commit -m "chore: add pnpm configuration"
```

WHY:
- shamefully-hoist=false: Keep pnpm's strict node_modules structure
- strict-peer-dependencies=false: Flexible peer dependency resolution


RECOMMENDED ORDER TO APPLY
═══════════════════════════════════════════════════════════════════════════════

1. FIX #1 (remove node_modules_prod) — HIGHEST PRIORITY
2. FIX #2 (delete analysis files)
3. FIX #3 (fix pnpm-workspace.yaml)
4. FIX #5 (coverage thresholds)
5. FIX #6 (.nvmrc)
6. FIX #7 (npm scripts)
7. FIX #8 (.npmrc)
8. FIX #4 (update maintenance checklist) — LAST

Total Time: ~20 minutes


VERIFICATION CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

After applying all fixes:

```bash
# Verify git is clean
git status
# Should show: nothing to commit, working tree clean

# Verify workspace structure
pnpm list -r --depth=0
# Should NOT show "src" as a workspace package

# Verify .nvmrc exists
cat .nvmrc
# Should show: 20.11.0

# Verify test coverage config
grep -A 5 "coverage:" vitest.config.ts
# Should show coverage configuration

# Verify npm scripts
pnpm audit --help
# Should work

# Run audit
pnpm audit
# Should run without error

# Test coverage
pnpm test:coverage
# Should generate coverage report

# Check repo size reduction
du -sh .git
# Should be smaller than before
```


BEFORE & AFTER
═══════════════════════════════════════════════════════════════════════════════

BEFORE:
  ❌ Repository contains node_modules_prod (~3.3MB)
  ❌ Analysis files cluttering packages/ directory
  ❌ Incorrect workspace configuration
  ❌ No test coverage enforcement
  ❌ No Node version lockfile
  ❌ Minimal npm convenience scripts

AFTER:
  ✅ Clean git repository (~3.3MB smaller)
  ✅ No analysis artifacts
  ✅ Correct workspace structure
  ✅ Test coverage enforced
  ✅ Node version locked
  ✅ Easy-to-use npm scripts


═══════════════════════════════════════════════════════════════════════════════

Apply these fixes during your next session. Total time: < 30 minutes.
Impact: Cleaner codebase, better developer experience, improved security.

═══════════════════════════════════════════════════════════════════════════════
