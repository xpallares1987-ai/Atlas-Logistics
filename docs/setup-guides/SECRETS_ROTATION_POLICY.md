# 🔐 SECRETS ROTATION POLICY — ATLAS LOGISTICS

## Generated Secrets (Use These)

Generated on: 2024-10-02 (now)

```
JWT_SECRET=c4df736e339ffc6d82ee98f25f0d39b09264ada026f42b864fffae010ba48a6e
COOKIE_SECRET=6391727d977089070fc5ab0454e560d9a55147fa2c83ae47ebc54844043ed813
```

---

## How to Update .env.local

1. Open your `.env.local` file
2. Replace:
   ```
   JWT_SECRET=your-jwt-secret-dev-only-change-this
   COOKIE_SECRET=your-cookie-secret-dev-only-change-this
   ```
   
   With:
   ```
   JWT_SECRET=c4df736e339ffc6d82ee98f25f0d39b09264ada026f42b864fffae010ba48a6e
   COOKIE_SECRET=6391727d977089070fc5ab0454e560d9a55147fa2c83ae47ebc54844043ed813
   ```

3. Save and restart development:
   ```bash
   pnpm dev:stop
   pnpm dev
   ```

---

## Rotation Schedule

### Development Environment
- **Frequency:** Every 30 days (or when team member leaves)
- **When:** First Monday of each month
- **Process:**
  ```bash
  # 1. Generate new secrets
  node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'));"
  
  # 2. Update .env.local with new values
  
  # 3. Restart development
  pnpm dev:stop
  pnpm dev
  
  # 4. Document in SECRETS_LOG.md (see below)
  ```

### Staging Environment (if you have it)
- **Frequency:** Every 2 weeks
- **Process:** Same as development
- **Note:** All team members need to pull new .env values

### Production Environment
- **Frequency:** Every 7 days
- **Process:** Use Docker Secrets or secrets manager (Vault, AWS Secrets Manager, etc.)
- **WARNING:** Never store in .env files in production

---

## Secrets Rotation Log

Keep track of when you rotated secrets:

```
Date       | Environment | JWT_SECRET (first 10 chars) | Changed By | Notes
-----------|-------------|-----------------------------|------------|------
2024-10-02 | Development | c4df736e33              | You        | Initial setup
(Future)   | (Dev)       | (new value)             | (Who?)     | (Reason?)
```

---

## Best Practices

✅ **DO:**
- Keep secrets out of git
- Rotate regularly
- Use strong random values (40+ hex chars)
- Document rotations
- Restart apps after rotation

❌ **DON'T:**
- Commit .env.local to git
- Share secrets in Slack/email
- Use simple/guessable values
- Forget to rotate
- Skip production rotations

---

## Generate New Secrets (Whenever Needed)

Run this command anytime you need fresh values:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'));"
```

Or create a shortcut in your `package.json`:

```json
{
  "scripts": {
    "secrets:generate": "node -e \"console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'));\""
  }
}
```

Then run:
```bash
pnpm secrets:generate
```

---

## Production Deployment

For production, NEVER use .env files. Use your platform's secrets manager:

**Docker:**
```bash
# Create secrets
docker secret create jwt_secret -
docker secret create cookie_secret -

# Use in compose
docker service create \
  --secret jwt_secret \
  --secret cookie_secret \
  ...
```

**Kubernetes:**
```bash
kubectl create secret generic atlas-secrets \
  --from-literal=JWT_SECRET=<value> \
  --from-literal=COOKIE_SECRET=<value>
```

**Cloud Platforms:**
- AWS: AWS Secrets Manager
- GCP: Google Secret Manager
- Azure: Azure Key Vault
- Vercel/Netlify: Platform env vars

---

## Testing After Rotation

After updating secrets, test:

```bash
# 1. Backend still starts
pnpm dev

# 2. Login still works
# Visit: http://localhost:5173
# Try logging in

# 3. Sessions persist
# Reload page, should still be logged in

# 4. API calls work
# Visit: http://localhost:3001/docs
# Try an authenticated endpoint
```

---

## Emergency: Secrets Leaked?

If you accidentally commit secrets to git:

```bash
# 1. IMMEDIATELY stop development
pnpm dev:stop

# 2. Generate NEW secrets (see above)

# 3. Update .env.local

# 4. Restart
pnpm dev

# 5. Cleanup git history (if committed)
git log --oneline | head -1  # Find commit
git revert <commit-hash>     # Revert the commit
git push
```

---

**Last updated:** 2024-10-02
**Next rotation:** 2024-11-01
