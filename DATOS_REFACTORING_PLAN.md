# 📋 DATOS.TS REFACTORING PLAN

## Current Situation
File: `packages/rate-comparer/src/data/datos.ts`
Size: 109 KB
Issue: Very large single TypeScript file may impact build performance

## Analysis
The file appears to contain rate data (matrices, pricing information, surcharges for freight forwarding).

## Recommended Refactoring Strategy

### Option 1: Split by Category (RECOMMENDED)
Split `datos.ts` into smaller logical files:

```
packages/rate-comparer/src/data/
├── index.ts                    # Main export barrel
├── base-rates.ts              # ~30KB - Base freight rates
├── surcharges.ts              # ~30KB - BAF, CAF, other surcharges
├── special-rates.ts           # ~30KB - Specialty/handling rates
├── constants.ts               # ~10KB - Shared constants, types
└── legacy-datos.ts            # ~9KB - Legacy/deprecated rates
```

### Option 2: Convert to JSON + Lazy Load
Keep large data in JSON format and lazy-load when needed:

```typescript
// datos.ts (lightweight)
import type { RateData } from './types'

export async function loadRates(): Promise<RateData> {
  const response = await import('./datos.json')
  return response.default
}
```

### Option 3: Database-Driven
Move rates to a database table (SQLite already in use):
- Query rates at runtime
- Eliminates static file
- Better for updates

## Immediate Action (Low Priority)
For now, no action needed. Track if build time increases.

## When to Refactor
Refactor when:
- Build time > 60 seconds
- Project team size > 3 (better maintainability)
- Frequent rate updates needed

## Decision Rationale
- **Option 1** (Split): Best for development velocity, minimal risk
- **Option 2** (JSON): Best for bundle size, requires lazy-loading
- **Option 3** (DB): Best for production, requires schema changes

## Implementation Steps (When Ready)
1. Analyze `datos.ts` to identify logical groups
2. Create `data/constants.ts` for shared types
3. Extract each group to separate file
4. Update `data/index.ts` to re-export all
5. Run `pnpm test` to verify no breaking changes
6. Benchmark build time before/after

## Tracking
- [ ] Monitor build time (pnpm build)
- [ ] Decide on strategy (timeline: 1-3 months)
- [ ] Implement chosen solution

---

**Status: DEFERRED** — No action needed now, will revisit based on metrics.
