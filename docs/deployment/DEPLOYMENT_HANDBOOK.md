# Atlas Logistics: Deployment Handbook

**Complete guide for load testing, security testing, GDPR verification, and production deployment**

---

## WEEK 3: TESTING PHASE

### Task 3.3: Load Testing (1000+ RPS)

**Tools:** Apache JMeter or k6  
**Target:** 1000 requests/second, P99 latency < 500ms

```bash
# Install k6
brew install k6

# Create load test script (load-test.js)
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 500 },   // Ramp up to 500 users  
    { duration: '10m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 0 },     // Ramp down
  ],
};

export default function () {
  const token = __ENV.TOKEN;
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

  // Test pagination (most common operation)
  let response = http.get(`${baseUrl}/api/shipments?page=1&limit=20`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
}

# Run load test
k6 run load-test.js --vus 100 --duration 30s
# Expected: P99 < 500ms, 0% errors
```

**Success Criteria:**
- ✅ P99 latency < 500ms
- ✅ P95 latency < 300ms
- ✅ Error rate < 0.1%
- ✅ Database handles pagination efficiently
- ✅ No OOM errors

---

### Task 3.4: Security Penetration Testing

**Scope:** OWASP Top 10, injection attacks, access control

```bash
# Use OWASP ZAP for automated scanning
docker run -t owasp/zap2docker-stable \
  zap-baseline.py -t http://host.docker.internal:3001 \
  -r security-report.html

# Manual testing checklist:
# ✅ SQL Injection: Try ' OR '1'='1 in parameters
# ✅ XSS: Try <script>alert('xss')</script>
# ✅ CSRF: Verify SameSite cookies
# ✅ Path Traversal: Try ../../etc/passwd
# ✅ Broken Auth: Try default credentials
# ✅ Privilege Escalation: Try accessing admin endpoints as user
```

**Expected Results:**
- No CRITICAL/HIGH vulnerabilities
- All OWASP Top 10 mitigations in place
- All paths traversal attempts blocked
- Authentication enforced on protected endpoints

---

### Task 3.5: GDPR Compliance Verification

**Verification Checklist:**

```bash
# 1. Audit Logging Active
psql -U atlas_staging -d atlas_logistics_staging -c "
  SELECT COUNT(*) FROM audit_logs;"
# Expected: > 0 entries

# 2. User Data Exportable
# Verify endpoint exists:
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/users/me/data-export
# Expected: JSON of user data

# 3. Data Deletion Works
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/users/me
# Expected: User deleted, audit log entry created

# 4. Data Retention Policies
# Verify 30-day GDPR purge job configured
grep -r "GDPR\|30 days" src/jobs/

# 5. Privacy Policy Present
curl http://localhost:3001/api/privacy
# Expected: Privacy policy endpoint
```

---

## WEEK 4: PRODUCTION DEPLOYMENT

### Task 4.1: Pre-Deployment Checklist

```bash
# ✅ Code
- [ ] All 400+ tests passing
- [ ] Code review approved
- [ ] No TODOs or FIXMEs
- [ ] Security scanning passed

# ✅ Database
- [ ] Migrations tested in staging
- [ ] Backups configured
- [ ] Monitoring alerts set up
- [ ] 40+ indexes in place

# ✅ Security
- [ ] JWT_SECRET generated (64 chars)
- [ ] COOKIE_SECRET generated (64 chars)
- [ ] HTTPS certificate valid
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured

# ✅ Infrastructure
- [ ] Load balancer configured
- [ ] CDN configured (if needed)
- [ ] Auto-scaling policies set
- [ ] Monitoring/alerting in place
- [ ] Logs aggregation configured
- [ ] Backup/recovery tested

# ✅ Documentation
- [ ] Runbooks created
- [ ] Incident response plan ready
- [ ] Team trained
- [ ] Rollback procedures tested

# ✅ Compliance
- [ ] GDPR audit log active
- [ ] PCI DSS controls enabled
- [ ] SOC 2 logging in place
- [ ] Encryption at rest enabled
```

### Task 4.2: Production Deployment

```bash
# 1. Generate Production Secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
COOKIE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Create Production Environment
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
DATABASE_URL=postgresql://atlas_prod:[REDACTED]@prod-db.internal:5432/atlas_logistics
REDIS_HOST=prod-redis.internal
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET
ENFORCE_HTTPS=true
CORS_ORIGIN=https://atlas-logistics.com,https://www.atlas-logistics.com
EOF

# 3. Build Production Images
docker build -t atlas-logistics:backend-prod-v1.0.0 \
  -f Dockerfile.backend --target production .

docker build -t atlas-logistics:frontend-prod-v1.0.0 \
  -f Dockerfile --target production .

# 4. Push to Registry
docker tag atlas-logistics:backend-prod-v1.0.0 registry.example.com/atlas-logistics:backend-v1.0.0
docker push registry.example.com/atlas-logistics:backend-v1.0.0

# 5. Deploy (Kubernetes example)
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/atlas-backend

# 6. Verify Deployment
curl -s https://api.atlas-logistics.com/api/health | jq .
kubectl get pods -l app=atlas-backend
kubectl logs -l app=atlas-backend
```

### Task 4.3: Post-Deployment Monitoring

```bash
# Monitor Metrics (First 24 hours)
- Request rate (target: < 100ms P95)
- Error rate (target: < 0.01%)
- Database queries (target: < 50ms avg)
- Memory usage (target: < 80% capacity)
- Disk usage (target: < 70% capacity)

# Alert Triggers
- Error rate > 1%
- P95 latency > 500ms
- Memory > 90%
- Database connection pool > 80%

# Rollback Criteria
- Error rate spikes > 5x
- Major performance degradation
- Security breach detected
- Data corruption discovered

# Rollback Procedure
kubectl rollout undo deployment/atlas-backend
docker stop $(docker ps -q)
docker-compose up -d  # Fall back to previous version
```

---

## MONITORING & ALERTING

### Key Metrics to Track

```yaml
# Application Metrics
- api.requests.total (counter)
- api.requests.duration (histogram, < 500ms)
- api.errors.total (counter, by error code)
- auth.login.attempts (counter)
- auth.login.failures (counter, alert if > 5 in 5min)

# Database Metrics
- db.connections (gauge)
- db.query.duration (histogram, < 100ms)
- db.query.errors (counter)
- audit_log.entries (counter)

# Infrastructure
- memory.usage_percent (gauge, alert > 80%)
- cpu.usage_percent (gauge, alert > 75%)
- disk.usage_percent (gauge, alert > 70%)
- uptime (gauge)
```

### Alert Rules

```yaml
# Critical (immediate action required)
- error_rate > 1% for 5 min → Page on-call
- latency_p99 > 1000ms for 10 min → Page on-call
- memory > 95% → Page on-call

# High (within 30 min)
- error_rate > 0.5% for 10 min → Notify team
- latency_p99 > 500ms for 15 min → Notify team
- database_queries > 1000ms avg → Investigate

# Medium (within 1 hour)
- cpu > 80% sustained → Review scaling
- disk > 80% → Review retention
- failed_logins > 10 in 5min → Review security
```

---

## RUNBOOKS

### Emergency Scaling

```bash
# If load exceeds capacity:
kubectl scale deployment atlas-backend --replicas=5
kubectl autoscaling.yaml apply

# If database is overwhelmed:
kubectl port-forward svc/postgres 5432:5432
psql -U atlas_prod -d atlas_logistics < optimize-queries.sql
```

### Incident Response

```bash
# 1. Assess
kubectl get pods
kubectl logs -f deployment/atlas-backend

# 2. Isolate
kubectl scale deployment atlas-backend --replicas=0

# 3. Investigate
docker logs <container>
psql: check query logs
Review audit logs: SELECT * FROM audit_logs WHERE created_at > now() - interval '10 minutes'

# 4. Fix
# Apply patch or roll back
kubectl rollout undo deployment/atlas-backend

# 5. Verify
curl -s https://api.atlas-logistics.com/api/health
# Restore to normal
kubectl scale deployment atlas-backend --replicas=3
```

---

## GRADUAL ROLLOUT (Canary Deployment)

```bash
# Deploy to 10% of traffic first
kubectl set image deployment/atlas-backend \
  atlas-backend=registry.example.com/atlas-logistics:backend-v1.0.0 \
  --record

# Monitor for 15 minutes
kubectl top pods
kubectl logs -f deployment/atlas-backend

# If all OK, scale to 100%
kubectl rollout resume deployment/atlas-backend
```

---

## SUCCESS CRITERIA

✅ **All tests passing in staging**
✅ **Load testing: 1000 RPS, P99 < 500ms**
✅ **Security testing: no critical vulnerabilities**
✅ **GDPR compliance verified**
✅ **Production infrastructure ready**
✅ **Team trained on runbooks**
✅ **Monitoring and alerting active**
✅ **Rollback procedures tested**

---

## POST-DEPLOYMENT (First Week)

**Daily:**
- Monitor metrics dashboard
- Check error logs
- Review user feedback

**Weekly:**
- Performance analysis
- Security audit
- Database optimization
- Capacity planning

**Monthly:**
- Full compliance audit
- Dependency updates
- Penetration testing
- Incident review

---

**Status:** READY FOR PRODUCTION DEPLOYMENT ✅
