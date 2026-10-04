# 🔧 LOW PRIORITY ACTION PLAN — NEXT STEPS

## Overview
Based on DEPENDENCY_HEALTH_ANALYSIS.md, here are actionable steps for dependency cleanup.

---

## 1. REACT DEPENDENCY DEDUPLICATION

### Current State
```json
// package.json — BOTH sections have react
"dependencies": {
  "react": "^19.2.8",
  "react-dom": "^19.2.8"
},
"devDependencies": {
  "react": "^19.2.8",
  "react-dom": "^19.2.8"
}
```

### Action: MOVE TO DEPENDENCIES ONLY
React is a runtime dependency (used in production build), not a dev dependency.

### Implementation
```bash
# 1. Remove from devDependencies
pnpm remove -D react react-dom

# 2. Verify in dependencies (already there)
pnpm list react

# 3. Test build
pnpm build

# 4. Commit
git add package.json pnpm-lock.yaml
git commit -m "chore: remove duplicate react from devDependencies"
```

### Expected Impact
- Cleaner package.json
- Smaller node_modules (no duplicate)
- Better semantic clarity
- No functional change

### Risk Level: VERY LOW (no code changes)

---

## 2. CROSS-FETCH REMOVAL (Node 20+ Compatibility)

### Current State
```json
"devDependencies": {
  "cross-fetch": "^4.1.0"  // ← Can be removed
}
```

### Why Remove?
- Node.js 20.0+ has native `fetch` API
- Your engines specify: `"node": ">=20.0.0"`
- cross-fetch only needed for Node 16 compatibility

### Implementation
```bash
# 1. Verify no imports in codebase
#    (If search shows imports, SKIP this step)

# 2. Remove package
pnpm remove -D cross-fetch

# 3. Test build
pnpm build

# 4. Test application
pnpm dev:minimal

# 5. Commit
git add package.json pnpm-lock.yaml
git commit -m "chore: remove cross-fetch (Node 20+ has native fetch)"
```

### Expected Impact
- Save ~15KB in node_modules
- Simpler dependency tree
- No functional change

### Risk Level: LOW (verify no imports first)

---

## 3. XML PARSER CONSOLIDATION

### Current State
```json
"dependencies": {
  "fast-xml-parser": "^5.11.1",  // 5.11KB
  "xml2js": "^0.6.2"              // 25KB
}
```

### Analysis Needed
1. Search codebase for which parser is actually used
2. Determine if both are truly necessary
3. Check if one can replace the other

### Implementation
```bash
# 1. Search for usage
pnpm find-usage fast-xml-parser
pnpm find-usage xml2js

# 2. If xml2js is NOT used:
pnpm remove xml2js

# 3. If fast-xml-parser is NOT used:
pnpm remove fast-xml-parser

# 4. If BOTH are used for different purposes:
Document in comments why both are needed

# 5. Test and commit
pnpm build
git add package.json pnpm-lock.yaml
git commit -m "chore: consolidate XML parsers (use only [parser-name])"
```

### Expected Impact
- Save 15-25KB if one removed
- Simpler maintenance
- Clearer data pipeline

### Risk Level: MEDIUM (verify usage first)

---

## 4. NODE-CACHE VERIFICATION

### Current State
```json
"dependencies": {
  "node-cache": "^5.1.2"  // 5KB
}
```

### Context
- You have Redis + BullMQ already
- node-cache is in-memory cache (single process)
- Might be redundant with Redis

### Implementation
```bash
# 1. Search for node-cache imports
#    (If no results, it's unused)

# 2. If unused:
pnpm remove node-cache

# 3. If used:
Document why it's used alongside Redis
(e.g., short-lived local cache, fallback, session storage)

# 4. Test and commit
pnpm build
git add package.json pnpm-lock.yaml
git commit -m "chore: remove unused node-cache dependency"
```

### Expected Impact
- Save 5KB if unused
- Clearer caching strategy
- Reduced cognitive load

### Risk Level: LOW if unused, NONE if documented

---

## 5. OPTIONAL: EMOTION IS-PROP-VALID

### Current State
```json
"devDependencies": {
  "@emotion/is-prop-valid": "^1.4.0"  // 3.6KB
}
```

### Context
- Only needed for custom emotion CSS-in-JS
- You're using Tailwind CSS (not emotion)
- Likely unused

### Implementation (OPTIONAL)
```bash
# 1. Verify not used (search for "emotion" imports)
# 2. If unused: pnpm remove @emotion/is-prop-valid
# 3. Test: pnpm build
# 4. Commit
```

### Risk Level: VERY LOW if unused

---

## RECOMMENDED EXECUTION ORDER

### Phase 1: No-Risk Changes (5 min)
1. ✅ React deduplication
   ```bash
   pnpm remove -D react react-dom
   pnpm build
   git add . && git commit -m "chore: remove duplicate react from devDependencies"
   ```

### Phase 2: Verification-Required (10-15 min)
2. ⏳ cross-fetch removal (verify no imports first)
3. ⏳ node-cache verification (search for usage)

### Phase 3: Analysis-Required (20 min)
4. 🔍 XML parser consolidation (determine which is used)

### Phase 4: Optional (10 min)
5. ✅ @emotion/is-prop-valid removal (if unused)

---

## QUARTERLY MAINTENANCE SCHEDULE

Add to MAINTENANCE_CHECKLIST.md:

```markdown
### QUARTERLY (Every 3 months)

1. **Dependency Audit** (30 min)
   ```bash
   pnpm outdated              # Check for updates
   pnpm audit                 # Security check
   pnpm audit --json | jq    # Detailed audit
   ```

2. **CVE Review** (20 min)
   - Review ignoreCves list in package.json
   - Remove any CVEs now fixed in newer versions
   - Document why each ignored CVE is still needed

3. **Build Performance** (15 min)
   ```bash
   time pnpm build
   du -sh node_modules
   ```

4. **Unused Dependencies** (15 min)
   - Manual review of imports
   - Check against package.json
   - Document findings
```

---

## CURRENT RECOMMENDATION

### IMPLEMENT NOW (5 min, no risk):
```bash
# Remove duplicate React
pnpm remove -D react react-dom
pnpm build
git add . && git commit -m "chore: remove duplicate react from devDependencies"
```

### INVESTIGATE LATER (when you have 30 min):
- cross-fetch usage (probably safe to remove)
- node-cache usage (probably unused)
- XML parser choice (verify both needed)
- @emotion/is-prop-valid (probably unused)

---

## STATUS

- React dedup: ✅ Ready to implement
- cross-fetch: ⏳ Ready after verification
- XML consolidation: 🔍 Needs analysis
- node-cache: 🔍 Needs verification
- Emotion removal: ✅ Ready if unused confirmed

**Estimated total time to implement: 45 minutes across next week**

---

**Created:** 2024-10-02
**Status:** ACTION PLAN READY
**Next:** Execute Phase 1 (React dedup)
