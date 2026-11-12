# Database Seed Scripts Reference

This guide clarifies the purpose and usage of each database seeding script in Atlas Logistics.

## Quick Reference

```bash
pnpm run db:seed          # ✅ Use this for dev: Full monolithic seed (recommended)
pnpm run db:seed:all      # Full phased seed (all phases: 1, 2, 3)
pnpm run db:seed:phase1   # Phase 1 only: Core entities
pnpm run db:seed:phase2   # Phase 2 only: Relationships
pnpm run db:seed:phase3   # Phase 3 only: Operations
pnpm run db:seed:prod     # Production seed (NODE_ENV=production)
pnpm run db:reset-and-seed # Nuke DB + Reseed
```

---

## Script Descriptions

### `pnpm run db:seed` (Primary — Recommended)

**Implementation:** `tsx src/db/seed.ts`

**Purpose:** Complete, full-featured development seed in one command.

**When to use:**
- Fresh local dev setup
- After `pnpm run db:reset`
- After running `pnpm run db:migrate` for first time

**What it does:**
1. Populates all core entities (parties, shipments, products, locations)
2. Creates transitive relationships (customer → shipments → invoices)
3. Generates test operations and scenarios
4. Completes in ~5-10 seconds

**Example:**
```bash
pnpm run db:migrate
pnpm run db:seed
# Backend is now ready with test data
pnpm run dev
```

---

### `pnpm run db:seed:all`

**Implementation:** `tsx src/db/seed-phases.ts --phase=all`

**Purpose:** Alternative phased approach to seeding (same end result as `db:seed`).

**When to use:**
- If `src/db/seed.ts` is unavailable or corrupted
- Debugging specific seed phases
- Advanced use: combine with `--dry-run` or `--verbose` flags

**What it does:**
- Runs Phase 1 → Phase 2 → Phase 3 sequentially
- Each phase depends on previous phases
- Total time: ~5-10 seconds (same as `db:seed`)

**Difference from `db:seed`:**
- `db:seed` = single unified script
- `db:seed:all` = phased orchestration (useful for rollback/debugging)

**Example:**
```bash
pnpm run db:seed:all        # Runs all phases
# Equivalent to:
pnpm run db:seed:phase1 && \
pnpm run db:seed:phase2 && \
pnpm run db:seed:phase3
```

---

### `pnpm run db:seed:phase1`

**Implementation:** `tsx src/db/seed-phases.ts --phase=1`

**Purpose:** Seed only core/foundational entities.

**When to use:**
- Testing schema changes that affect base entities
- Partial database population for performance testing
- Incremental data loading

**What it populates:**
- `parties` (customers, suppliers, carriers)
- `locations` (ports, airports, warehouses)
- `products` (commodities, HS codes)
- `users` (admin, operators)
- Base shipment records (empty operations)

**Time:** ~1-2 seconds

**Example:**
```bash
pnpm run db:reset
pnpm run db:seed:phase1
# DB now has ~100 parties but no transitive relationships
```

---

### `pnpm run db:seed:phase2`

**Implementation:** `tsx src/db/seed-phases.ts --phase=2`

**Purpose:** Create relationships and transitive data (depends on Phase 1).

**When to use:**
- After `db:seed:phase1` to add relationships
- Testing foreign key constraints
- Building interconnected test scenarios

**What it populates:**
- Shipment ↔ Party relationships
- Invoice ↔ Shipment associations
- Container ↔ Shipment bookings
- Routing and logistics links
- Document metadata

**Prerequisite:** Phase 1 must have run first.

**Time:** ~2-3 seconds

**Example:**
```bash
pnpm run db:seed:phase1
pnpm run db:seed:phase2
# DB now has linked entities (customers, shipments, invoices)
```

---

### `pnpm run db:seed:phase3`

**Implementation:** `tsx src/db/seed-phases.ts --phase=3`

**Purpose:** Create complex operations, test cases, and workflow scenarios.

**When to use:**
- Full dev environment with realistic workflows
- Testing BPM workflows and state machines
- E2E testing with complete operational data

**What it populates:**
- Workflow instances and transitions
- Operational events and timelines
- Exception/alert scenarios
- Performance baseline datasets
- Custom test fixtures

**Prerequisite:** Phases 1 & 2 must have run first.

**Time:** ~3-5 seconds

**Example:**
```bash
pnpm run db:seed:phase1
pnpm run db:seed:phase2
pnpm run db:seed:phase3
# DB fully loaded with operations, workflows, events
```

---

### `pnpm run db:seed:prod`

**Implementation:** `cross-env NODE_ENV=production tsx src/db/seed.ts`

**Purpose:** Production-safe seed script (minimal data, sanitized).

**When to use:**
- First-time prod deployment
- **⚠️ NEVER run this on existing production data** (will corrupt/duplicate)
- Use only on empty production databases

**What it does:**
1. Disables verbose logging
2. Seeds only essential reference data (admin user, default settings)
3. Skips test/dummy data
4. Runs migrations first (idempotent)

**Warning:**
```bash
# ❌ DANGEROUS — Will duplicate data if DB already has records:
pnpm run db:seed:prod  # on an existing DB

# ✅ SAFE — Only on fresh empty DB:
pnpm run db:migrate:prod
pnpm run db:seed:prod
```

---

### `pnpm run db:reset-and-seed`

**Implementation:** `sh .devcontainer/reset-db.sh && tsx src/db/seed.ts`

**Purpose:** Nuclear option — completely wipe and reseed database.

**When to use:**
- After major schema changes
- Testing migration path from scratch
- Corrupted dev database recovery

**What it does:**
1. Drops all tables (calls `reset-db.sh`)
2. Runs all migrations (`db:migrate`)
3. Runs full seed (`db:seed`)

**Warning:**
```bash
# ❌ NEVER on production:
pnpm run db:reset-and-seed  # in NODE_ENV=production → ERROR

# ✅ Safe for dev only:
pnpm run db:reset-and-seed  # in NODE_ENV=development
```

**Time:** ~10-15 seconds total

---

## Decision Tree

```
Does your database exist?
├─ NO (fresh setup)
│  └─ Run: pnpm run db:migrate && pnpm run db:seed
│
├─ YES, clean (empty tables)
│  └─ Run: pnpm run db:seed
│
├─ YES, corrupted
│  └─ Run: pnpm run db:reset-and-seed
│
└─ YES, production
   ├─ Need to add only reference data?
   │  └─ Run: pnpm run db:seed:prod (on EMPTY DB ONLY)
   │
   └─ DO NOT RESEED (risk of duplication/data loss)
      └─ Manual insert queries instead
```

---

## Common Workflows

### Fresh Local Dev Setup

```bash
# 1. Clone repo
git clone ...

# 2. Install deps
pnpm install

# 3. Setup database
pnpm run db:migrate    # Create schema
pnpm run db:seed       # Populate test data

# 4. Start server
pnpm run dev           # Backend + Frontend running with test data
```

### After Schema Changes

```bash
# 1. Make schema changes
# ... edit src/db/schema/*.ts

# 2. Generate migration
pnpm run db:generate

# 3. Apply migration
pnpm run db:migrate

# 4. Reseed if structure changed
pnpm run db:reset-and-seed

# 5. Restart dev
pnpm run dev
```

### Before E2E Tests

```bash
# 1. Fresh seed
pnpm run db:reset-and-seed

# 2. Run E2E
pnpm run test:e2e

# 3. (Optional) Reseed for next run
pnpm run db:reset-and-seed
```

### Production First Deployment

```bash
# 1. Migrations only (schema-only)
pnpm run db:migrate:prod

# 2. Seed reference data (admin user, configs)
# ⚠️ Only if DB is completely empty:
pnpm run db:seed:prod

# 3. (If seed fails, rollback and investigate)
# Manual rollback: Drop tables, reapply migrations, try again
```

---

## Troubleshooting

**Q: Seed script runs but data isn't visible**

A: Check SQLite file path in `.env.local`:
```bash
cat .env.local | grep DATABASE_URL
# Verify file exists:
ls -lh ./data/dev.db
```

**Q: Seed fails with "foreign key constraint"**

A: Phases ran out of order. Run full setup:
```bash
pnpm run db:reset-and-seed
```

**Q: Production seed says "UNIQUE constraint failed"**

A: Database is NOT empty. Never reseed a populated production DB:
```bash
# Check if data exists:
sqlite3 ./atlas-erp-prod.db ".tables"
# If tables have data, DO NOT run seed:
# → Consult DBA for manual data correction
```

**Q: Seed runs but completes instantly (no data)**

A: Check logs for errors:
```bash
pnpm run db:seed 2>&1 | head -50
```

---

## Summary Table

| Script | Speed | Use Case | Risk |
|--------|-------|----------|------|
| `db:seed` | ~5-10s | Fresh dev / after `db:reset` | Low |
| `db:seed:all` | ~5-10s | Phased alternative to `db:seed` | Low |
| `db:seed:phase1` | ~1-2s | Base entities only | Low |
| `db:seed:phase2` | ~2-3s | + Relationships | Medium (depends on Phase 1) |
| `db:seed:phase3` | ~3-5s | + Operations | Medium (depends on Phases 1-2) |
| `db:seed:prod` | ~5s | Production reference data | **HIGH** (only on empty DB) |
| `db:reset-and-seed` | ~10-15s | Complete wipe + reseed | **CRITICAL** (dev only) |

---

**Last Updated:** 2025-01-15  
**Recommendation:** Use `pnpm run db:seed` for 99% of dev tasks. Use phase scripts only for debugging or incremental testing.

