# Atlas Logistics — Troubleshooting, Quick Fixes & Maintenance

This guide aggregates diagnosis steps, quick resolutions for common errors, and periodic maintenance checklists.

---

## 1. Quick Fixes for Common Issues

### Issue 1: Port 3001 or 3000 Already in Use
* **Cause**: Previous background Node process still running.
* **Fix (PowerShell)**:
  ```powershell
  Get-Process node | Stop-Process -Force
  ```

### Issue 2: ESLint or Prettier Failures on Pre-Commit
* **Fix**: Run automated fixer:
  ```bash
  pnpm eslint --fix
  pnpm prettier --write .
  ```

### Issue 3: GitHub CLI / GH Authentication Token Error
* **Cause**: Dummy token in sandbox environment (`HTTP 401: Bad credentials`).
* **Fix**: Prefix command with environment clear:
  ```powershell
  $env:GITHUB_TOKEN=""; gh pr list
  ```

### Issue 4: SQLite Database Locked (`SQLITE_BUSY`)
* **Cause**: Multiple write operations without WAL mode or hung transaction.
* **Fix**: Ensure WAL mode is active:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  ```

---

## 2. Periodic Maintenance Checklist

### Weekly Maintenance
- [ ] Run `pnpm audit:leaks` to ensure zero sensitive credential leaks.
- [ ] Run `pnpm outdated` to identify non-breaking dependency updates.
- [ ] Clean up SQLite temporary WAL/SHM files if orphaned.
- [ ] Verify SCM Outbox Dead Letter Queue: `GET /api/scm/v1/operational/outbox/dlq`.

### Monthly Maintenance
- [ ] Vacuum SQLite database: `VACUUM;`.
- [ ] Review Architectural Decision Records in `docs/adr/`.
- [ ] Rotate development API test tokens if applicable.
