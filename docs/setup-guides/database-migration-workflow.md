# Database Migration & Schema Parity Guide

This How-To guide explains the database migration workflow, schema versioning standards, and automated DDL drift detection for Atlas-Logistics.

---

## 1. Architectural Overview

Atlas-Logistics uses **SQLite in WAL mode** managed through **Drizzle ORM** (`drizzle-orm@1.0.0-rc.5` and `drizzle-kit@1.0.0-rc.5`).

### Migration Folder Structure

Under Drizzle v1.0.0-rc.5, migrations are structured as folder-based snapshots under `drizzle/`:

```
drizzle/
├── 20260808111211_fantastic_maestro/
│   ├── migration.sql
│   └── snapshot.json
├── 20261114030000_enterprise_organization/
│   ├── migration.sql
│   └── snapshot.json
└── 20261114040000_scm_logical_entities_v2/
    ├── migration.sql
    └── snapshot.json
```

> [!IMPORTANT]
> Every migration folder must contain both `migration.sql` (executable DDL statements) and `snapshot.json` (the exact schema AST state at that migration point). Flat `.sql` files placed directly in `drizzle/` without snapshot folders are rejected by the migration engine.

---

## 2. Standard Developer Workflow

### Step 1: Modify or Create Schema Definitions

Update the relevant TypeScript schema module in `src/db/schema/` (e.g., `src/db/schema/organization.ts`, `src/db/schema/operations.ts`). Always export new entities from `src/db/schema/index.ts`.

### Step 2: Generate the Versioned Migration

Run the Drizzle generator:

```bash
pnpm db:generate
```

This inspects the TypeScript schema definitions, compares them against the latest snapshot in `drizzle/`, and creates a new migration directory containing `migration.sql` and `snapshot.json`.

### Step 3: Inspect the Generated SQL

Inspect the generated `migration.sql` file. Ensure that:
- Column constraints, foreign keys, and indexes are accurately reflected.
- Breaking modifications to existing columns include safe fallback or data migration strategies.

### Step 4: Apply Migrations Locally

Apply the pending migrations to your local development database (`data/dev.db`):

```bash
pnpm db:migrate
```

To run migrations and seed sample operational data:

```bash
pnpm db:reset-and-seed
```

---

## 3. Automated DDL Drift Detection (`audit:ddl-drift`)

To prevent discrepancies between TypeScript definitions and physical database schemas, Atlas-Logistics enforces automated drift detection via `scripts/check-ddl-drift.mjs`.

### Running Drift Audit Locally

```bash
pnpm run audit:ddl-drift
```

### Verification Pipeline

The automated drift detection executes three defensive checks:

1. **Snapshot Consistency Check (`drizzle-kit check`)**:
   Verifies that migration snapshot journals have no conflicting sequence numbers or unresolvable dependencies.
2. **Schema Drift Detection (`drizzle-kit generate`)**:
   Runs schema generation against `src/db/schema/`. If any new unmigrated tables or columns are detected, the script identifies the drift, immediately reverts temporary files, and exits with code 1.
3. **Physical Replay & PRAGMA Verification**:
   Replays all versioned migrations from scratch on a clean temporary SQLite database, verifying:
   - `PRAGMA integrity_check` returns `ok`.
   - `PRAGMA foreign_key_check` returns `0` violations.
   - Physical table count matches the domain model inventory.

---

## 4. Troubleshooting & Remediation

### Error: `DRIFT DETECTED! Found uncommitted schema change(s)`

**Cause**: A developer modified one or more files in `src/db/schema/` without committing the corresponding migration snapshot in `drizzle/`.

**Resolution**:
1. Run `pnpm db:generate` to generate the migration folder.
2. Review the resulting `migration.sql` and `snapshot.json`.
3. Commit both the schema changes in `src/db/schema/` and the new migration in `drizzle/`:
   ```bash
   git add src/db/schema/ drizzle/
   git commit -m "db(schema): add migration snapshot for new entities"
   ```

### Error: `No migration found`

**Cause**: Migration files were placed flat in `drizzle/*.sql` rather than in timestamped directories `drizzle/<timestamp>_<tag>/migration.sql`.

**Resolution**: Move flat migrations into their respective timestamped subdirectories accompanied by their `snapshot.json`.
