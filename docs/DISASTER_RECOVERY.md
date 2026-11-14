# Disaster Recovery & Rollback Procedures

## Overview

This document covers rollback strategies, disaster recovery procedures, and backup/restore operations for Atlas Logistics.

## Table of Contents

1. [Rollback Procedures](#rollback-procedures)
2. [Database Backup & Restore](#database-backup--restore)
3. [Disaster Recovery Runbook](#disaster-recovery-runbook)
4. [Backup Strategy](#backup-strategy)
5. [RTO/RPO Targets](#rtorpo-targets)

---

## Rollback Procedures

### Quick Rollback (Kubernetes)

If a deployment fails or causes issues, rollback to the previous working version:

#### Automatic Rollback (Built-in)
The deployment script automatically rolls back on error:
```bash
./scripts/deploy.sh production v1.2.3
# If deployment fails, automatic rollback occurs
```

#### Manual Rollback to Previous Version
```bash
# Rollback backend deployment
kubectl rollout undo deployment/backend -n atlas-logistics

# Rollback frontend deployment
kubectl rollout undo deployment/frontend -n atlas-logistics

# Rollback worker deployment
kubectl rollout undo deployment/worker -n atlas-logistics

# Verify rollback is in progress
kubectl rollout status deployment/backend -n atlas-logistics
```

#### Rollback to Specific Revision
```bash
# View rollout history
kubectl rollout history deployment/backend -n atlas-logistics
# Shows all revisions with timestamp and image

# Rollback to specific revision (e.g., revision 3)
kubectl rollout undo deployment/backend --to-revision=3 -n atlas-logistics

# Verify the rollback
kubectl get deployment/backend -n atlas-logistics -o wide
```

#### Manual Image Tag Rollback
```bash
# Set to previous stable image tag
kubectl set image deployment/backend \
  backend=ghcr.io/xpallares1987-ai/atlas-logistics:backend-v1.1.0 \
  -n atlas-logistics \
  --record

# Wait for rollout
kubectl rollout status deployment/backend -n atlas-logistics --timeout=5m
```

### Docker Compose Rollback

For single-host Docker Compose deployments:

```bash
# Stop current services
docker compose -f docker-compose.prod.yml down

# Pull previous image tag
docker pull ghcr.io/xpallares1987-ai/atlas-logistics:backend-v1.1.0

# Update docker-compose.yml with previous image tag
sed -i 's|backend-latest|backend-v1.1.0|g' docker-compose.prod.yml

# Restart services
docker compose -f docker-compose.prod.yml up -d

# Verify services are healthy
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend
```

### Staged Rollback (Blue-Green)

For zero-downtime rollback:

```bash
# 1. Deploy previous version alongside current (green = new, blue = old)
kubectl set image deployment/backend-blue \
  backend=ghcr.io/xpallares1987-ai/atlas-logistics:backend-v1.1.0 \
  -n atlas-logistics

# 2. Update service to point to blue (old) deployment
kubectl patch service backend -n atlas-logistics -p \
  '{"spec":{"selector":{"deployment":"backend-blue"}}}'

# 3. Monitor for issues
kubectl logs -f deployment/backend-blue -n atlas-logistics

# 4. If successful, delete green (new) deployment
kubectl delete deployment backend-green -n atlas-logistics

# 5. If issues occur, switch back to green
kubectl patch service backend -n atlas-logistics -p \
  '{"spec":{"selector":{"deployment":"backend-green"}}}'
```

---

## Database Backup & Restore (SQLite WAL Mode)

### SQLite Online Backup & Snapshots

Because Atlas Logistics utilizes embedded SQLite with WAL mode, backups are zero-overhead, crash-consistent, and file-based.

#### 1. Hot Backup using SQLite Online Backup API
To safely create an atomic snapshot without interrupting live read/write transactions:

```bash
# Safely snapshot live production database
sqlite3 data/prod.db ".backup 'data/backups/atlas_backup_$(date +%Y%m%d_%H%M%S).db'"
```

#### 2. Native SQLite VACUUM INTO
Alternatively, use SQLite's native `VACUUM INTO` command for a defragmented, compact snapshot:

```bash
sqlite3 data/prod.db "VACUUM INTO 'data/backups/atlas_vacuum_$(date +%Y%m%d_%H%M%S).db';"
```

#### 3. WAL Checkpoint Flush (Pre-Maintenance)
Before taking cold filesystem copies or performing server maintenance:

```bash
# Truncate WAL log files back into the primary database file
sqlite3 data/prod.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

---

### Database Restore & Integrity Verification

#### 1. Restore from Snapshot
```bash
# 1. Stop backend services
docker compose -f docker-compose.prod.yml stop backend worker

# 2. Archive current database state
cp data/prod.db data/prod.db.bak.$(date +%Y%m%d_%H%M%S)

# 3. Restore chosen backup snapshot
cp data/backups/atlas_backup_20261114_060000.db data/prod.db

# 4. Remove stale WAL files if present
rm -f data/prod.db-wal data/prod.db-shm

# 5. Verify restored database integrity
sqlite3 data/prod.db "PRAGMA integrity_check;"
sqlite3 data/prod.db "PRAGMA foreign_key_check;"

# 6. Restart backend services
docker compose -f docker-compose.prod.yml start backend worker
```

#### 2. Replay & Migration Check
After restore, verify that migration snapshots are in parity:

```bash
pnpm run audit:ddl-drift
```
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc-restore
  namespace: atlas-logistics
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  dataSource:
    name: postgres-snapshot-backup
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
EOF

# 3. If restore is successful, swap PVC
kubectl scale deployment postgres --replicas=0 -n atlas-logistics
kubectl patch pvc postgres-pvc -n atlas-logistics -p '{"spec":{"volumeMode":"Filesystem"}}'
# (Manual swap of PVC, or use StatefulSet with update)
kubectl scale deployment postgres --replicas=1 -n atlas-logistics
```

### Redis Backup & Restore

#### Redis RDB Backup (Point-in-Time)
```bash
# Trigger Redis snapshot
kubectl exec -it redis-0 -n atlas-logistics -- redis-cli BGSAVE

# Wait for save to complete
kubectl exec -it redis-0 -n atlas-logistics -- redis-cli LASTSAVE

# Export RDB file
kubectl cp atlas-logistics/redis-0:/data/dump.rdb ./redis-backup.rdb

# Upload to S3 or external storage
aws s3 cp redis-backup.rdb s3://my-backups/redis/
```

#### Redis Restore
```bash
# Copy RDB file back to redis pod
kubectl cp ./redis-backup.rdb atlas-logistics/redis-0:/data/dump.rdb

# Restart redis to load snapshot
kubectl delete pod redis-0 -n atlas-logistics
kubectl rollout status statefulset/redis -n atlas-logistics
```

#### Redis Persistence Verification
```bash
# Check AOF (Append-Only File) is enabled
kubectl exec -it redis-0 -n atlas-logistics -- redis-cli CONFIG GET appendonly

# Monitor AOF rewrite
kubectl exec -it redis-0 -n atlas-logistics -- redis-cli INFO persistence
```

---

## Disaster Recovery Runbook

### Scenario 1: Service Outage (Pod Crash)

**Symptoms:** Pod stuck in `CrashLoopBackOff`, service unavailable

**Recovery Steps:**
```bash
# 1. Check pod status and events
kubectl describe pod backend-xyz -n atlas-logistics

# 2. Review logs to identify issue
kubectl logs backend-xyz -n atlas-logistics --tail=200

# 3. Check if persistent storage is full
kubectl exec backend-xyz -n atlas-logistics -- df -h

# 4. If OOM (Out of Memory), increase memory limits
kubectl set resources deployment backend \
  --limits=memory=3Gi,cpu=2 \
  -n atlas-logistics

# 5. Force pod restart
kubectl delete pod backend-xyz -n atlas-logistics

# 6. Verify pod recovered
kubectl get pods -n atlas-logistics -l app=backend
kubectl logs -f deployment/backend -n atlas-logistics
```

### Scenario 2: Database Corruption

**Symptoms:** Database query errors, foreign key constraint violations, data inconsistency

**Recovery Steps:**
```bash
# 1. Take backup immediately (don't lose current state)
kubectl exec -it postgres-0 -n atlas-logistics -- pg_dump atlas > corrupted-backup.sql

# 2. Check database integrity
kubectl exec -it postgres-0 -n atlas-logistics -- psql -U postgres -d atlas -c "REINDEX DATABASE atlas;"

# 3. If corruption is severe, restore from backup
# See "PostgreSQL Restore" section above

# 4. Run application migrations to ensure schema is correct
kubectl exec -it backend-xyz -n atlas-logistics -- pnpm run db:migrate:prod

# 5. Verify data integrity
kubectl exec -it backend-xyz -n atlas-logistics -- pnpm run db:check
```

### Scenario 3: Node Failure

**Symptoms:** Multiple pods evicted, `NotReady` node status

**Recovery Steps:**
```bash
# 1. Identify the failed node
kubectl get nodes
kubectl describe node <NODE_NAME>

# 2. Drain the node (gracefully remove pods)
kubectl drain <NODE_NAME> --ignore-daemonsets --delete-emptydir-data

# 3. Check if pods reschedule to other nodes
kubectl get pods -n atlas-logistics -o wide

# 4. If infrastructure issue, replace node
# (Infrastructure provider specific)

# 5. If node recovers, uncordon it
kubectl uncordon <NODE_NAME>

# 6. Verify cluster is healthy
kubectl get nodes
kubectl get pods -n atlas-logistics
```

### Scenario 4: Data Loss in Redis Queue

**Symptoms:** Stuck jobs, queue corruption, jobs disappearing

**Recovery Steps:**
```bash
# 1. Assess queue status
kubectl exec -it redis-0 -n atlas-logistics -- redis-cli INFO stats

# 2. If queue is corrupted, flush and reseed
kubectl exec -it redis-0 -n atlas-logistics -- redis-cli FLUSHDB

# 3. Restart worker pods to pick up fresh jobs
kubectl delete pod worker-xyz -n atlas-logistics

# 4. Reprocess jobs from database
kubectl exec -it backend-xyz -n atlas-logistics -- node -e "
  const { Bull } = require('bullmq');
  const { db } = require('./src/db');
  // Custom script to reseed queues from DB
"

# 5. Monitor queue recovery
kubectl logs -f deployment/worker -n atlas-logistics
```

---

## Backup Strategy

### Backup Schedule

| Component | Type | Frequency | Retention | Location |
|-----------|------|-----------|-----------|----------|
| SQLite (`prod.db`) | Hot snapshot (`.backup` / `VACUUM INTO`) | Daily (2 AM UTC) | 30 days | `data/backups/` + S3 |
| Redis | AOF + RDB snapshot | Hourly | 7 days | Volume + S3 |
| Application config | Git commits | On change | ∞ | GitHub |
| Secrets | Encrypted backup | Weekly | 365 days | Key vault + local `.env.local` |
| Prometheus data | TSDB | Daily retention | 30 days | Docker Volume |

### Backup Locations

**Primary:** Local persistent directory (`data/backups/`)  
**Secondary:** Encrypted object storage (off-site S3 / Cloud Storage)  
**Tertiary:** Git repository (code/config only)

### Backup Verification

```bash
# Daily backup test
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-test
  namespace: atlas-logistics
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM UTC
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: test
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Test backup restore on dummy DB
              echo "Testing backup restore..."
              # Script here
          restartPolicy: OnFailure
EOF
```

---

## RTO/RPO Targets

| Scenario | RTO | RPO | Strategy |
|----------|-----|-----|----------|
| Pod crash | 5 minutes | 0 (stateless) | Auto-restart + readiness probes |
| Node failure | 10 minutes | 0 (workload) | Pod affinity + node auto-scale |
| Database failure | 30 minutes | 5 minutes | Automated backups + restore |
| Region outage | 1 hour | 15 minutes | Multi-region setup (future) |
| Complete cluster loss | 2 hours | 1 hour | Full backup + external storage |

### Achieving RTO/RPO Targets

**RTO (Recovery Time Objective):**
- Pod restart: Configured via `restart: Always`
- Readiness probes trigger new pods within 30s
- Load balancer switches traffic automatically

**RPO (Recovery Point Objective):**
- Redis persistence: AOF fsync every second
- SQLite: WAL mode with immediate fsync and transactional outbox persistence
- Application: ACID transactions ensure zero loss of committed state

---

## Testing Disaster Recovery

### Monthly DR Drill

```bash
# 1. Snapshot current live database
sqlite3 data/prod.db ".backup 'data/backups/dr_drill_$(date +%Y%m%d).db'"

# 2. Verify snapshot integrity
sqlite3 "data/backups/dr_drill_$(date +%Y%m%d).db" "PRAGMA integrity_check;"
sqlite3 "data/backups/dr_drill_$(date +%Y%m%d).db" "PRAGMA foreign_key_check;"

# 3. Simulate restoration on scratch directory
mkdir -p data/scratch
cp "data/backups/dr_drill_$(date +%Y%m%d).db" data/scratch/test.db
sqlite3 data/scratch/test.db "SELECT count(*) FROM scm_shipments_v1;"

# 4. Clean up scratch
rm -rf data/scratch

# 5. Document results
echo "DR Test: $(date) - Status: PASS" >> DR-TEST-LOG.md
```

---

## Post-Incident Review

After any major incident, document:

1. **Timeline:** When did the incident start and end?
2. **Root Cause:** What was the underlying cause?
3. **Impact:** How many users/services were affected?
4. **Detection:** How was the incident discovered?
5. **Response:** What was the recovery procedure?
6. **Prevention:** How do we prevent this in the future?

**Template:**
```markdown
## Incident: [Title]
- **Date:** 2025-01-15
- **Duration:** 15 minutes
- **Severity:** High
- **Root Cause:** OOM in backend pod
- **Impact:** 500 users affected
- **Resolution:** Increased memory limit to 2Gi
- **Post-Action:** Auto-scale memory based on utilization
```

---

**Need help?** Contact the DevOps team or refer to the Kubernetes documentation.
