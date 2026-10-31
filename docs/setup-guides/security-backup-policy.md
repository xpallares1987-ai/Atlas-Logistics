# Atlas Logistics — Security, Secrets & Backup Policy

This document defines the data protection, secrets rotation, and backup procedures for Atlas Logistics.

---

## 1. Secrets Management Policy

* **Zero-Commit Policy**: Secrets, API keys, passwords, and private tokens must never be committed to Git.
* **Leak Prevention Guard**: The automated scanner (`scripts/check-sensitive-leaks.cjs`) executes on pre-commit and fails commits containing sensitive keys, certificates, or tokens.
* **Local Credentials**: Kept strictly in `.env.local` (ignored in `.gitignore`).

---

## 2. Secrets Rotation Procedure

* **Frequency**: Rotate production JWT signing keys, external webhook secrets, and carrier API tokens every 90 days.
* **Emergency Rotation**: Triggered immediately upon any suspicion of credential exposure.
* **Procedure**:
  1. Generate new cryptographically secure secret (minimum 256 bits).
  2. Configure secondary decryption/verification key in application configuration.
  3. Deploy updated runtime.
  4. Deprecate and revoke previous secret after 24-hour grace period.

---

## 3. Database Backup Procedures (SQLite)

Because Atlas Logistics utilizes embedded SQLite, backups are zero-overhead and file-based:

### Hot Backup using SQLite Online Backup API
```bash
# Safely snapshot live database without locking writes
sqlite3 data/atlas.sqlite ".backup data/backups/atlas_backup_$(date +%Y%m%d_%H%M%S).sqlite"
```

### Automated Backup Retention
* **Daily Snapshots**: Retain last 7 days.
* **Weekly Snapshots**: Retain last 4 weeks.
* **Monthly Archives**: Retain for 12 months in cold storage.
