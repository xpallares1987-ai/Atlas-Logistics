# GitHub Secrets & CI/CD Setup Guide

## Step 1: Generate Secure Secrets

Run these commands to generate secure values for your environment:

### JWT Secret (for authentication)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: abc123def456abc123def456abc123def456abc123def456abc123def456abc1
```

### PostgreSQL Password
```bash
openssl rand -base64 32
# Output: xK9mP2q5R7sT8uV9wX0yZ1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4a
```

### Database URL (for PostgreSQL)
```
postgresql://postgres:<POSTGRES_PASSWORD>@atlas-postgres.example.com:5432/atlas
```

## Step 2: Configure GitHub Repository Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add the following secrets:

### Required Secrets:

| Secret Name | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@host:5432/atlas` | PostgreSQL connection string |
| `JWT_SECRET` | (generated from step 1) | Authentication token secret |
| `POSTGRES_PASSWORD` | (generated from step 1) | Database password |
| `GRAFANA_ADMIN_PASSWORD` | (generate new) | Grafana admin password |

### Optional Secrets (for advanced deployments):

| Secret Name | Value | Description |
|---|---|---|
| `DOCKER_REGISTRY_USERNAME` | `xpallares1987-ai` | GitHub username for registry access |
| `DOCKER_REGISTRY_PASSWORD` | `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` | GitHub Personal Access Token (if needed) |
| `SENTRY_DSN` | `https://xxx@sentry.io/123456` | Error tracking (optional) |
| `AWS_ACCESS_KEY_ID` | (from AWS console) | For S3 document storage (optional) |
| `AWS_SECRET_ACCESS_KEY` | (from AWS console) | For S3 document storage (optional) |

## Step 3: Set GitHub Secrets via CLI

Or use GitHub CLI for automation:

```bash
# Login to GitHub
gh auth login

# Set secrets for your repository
gh secret set DATABASE_URL --body "postgresql://postgres:PASSWORD@host:5432/atlas"
gh secret set JWT_SECRET --body "$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
gh secret set POSTGRES_PASSWORD --body "$(openssl rand -base64 32)"
gh secret set GRAFANA_ADMIN_PASSWORD --body "$(openssl rand -base64 32)"

# Verify secrets are set
gh secret list
```

## Step 4: Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Ensure "Allow all actions and reusable workflows" is selected
3. Configure "Workflow permissions":
   - ✓ Read repository contents
   - ✓ Write repository contents (for releases)
   - ✓ Write packages (for container registry access)

## Step 5: Configure Container Registry Access

GitHub Actions automatically uses `GITHUB_TOKEN` to push to ghcr.io.

**Verify access:**
```bash
# Authenticate with your GitHub token
echo $GITHUB_TOKEN | docker login ghcr.io -u xpallares1987-ai --password-stdin

# Test push (this will be done by CI/CD)
docker tag my-image:latest ghcr.io/xpallares1987-ai/atlas-logistics:test
docker push ghcr.io/xpallares1987-ai/atlas-logistics:test
```

## Step 6: Test CI/CD Pipeline

### Trigger a build:
```bash
# Make a commit and push to main branch
git add .
git commit -m "trigger ci/cd: test pipeline"
git push origin main

# Watch the workflow
gh run list --workflow=docker-build.yml --limit 5

# Follow real-time logs
gh run view <RUN_ID> --log
```

### Expected workflow stages:
1. ✓ Build frontend image
2. ✓ Build backend image
3. ✓ Build worker image
4. ✓ Push to ghcr.io
5. ✓ Scan for vulnerabilities (Trivy)
6. ✓ Upload security report to GitHub

## Step 7: Kubernetes Secrets Setup

Create secrets in your Kubernetes cluster:

```bash
# Create namespace
kubectl create namespace atlas-logistics
kubectl label namespace atlas-logistics name=atlas-logistics

# Create secrets from environment variables
kubectl create secret generic atlas-secrets \
  --from-literal=JWT_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')" \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 32)" \
  --from-literal=REDIS_PASSWORD="$(openssl rand -base64 32)" \
  -n atlas-logistics

# Verify secret was created
kubectl get secrets -n atlas-logistics
kubectl describe secret atlas-secrets -n atlas-logistics
```

## Step 8: Deploy to Kubernetes

### Option A: Using deployment script

```bash
# Make script executable (if on Linux/Mac)
chmod +x ./scripts/deploy.sh

# Deploy latest images
./scripts/deploy.sh production latest

# Deploy specific image tag
./scripts/deploy.sh production v1.2.3

# Check deployment status
./scripts/deploy.sh production --status

# View logs
./scripts/deploy.sh production --logs
```

### Option B: Manual kubectl apply

```bash
# Apply manifests
kubectl apply -f k8s/01-atlas-deployment.yaml
kubectl apply -f k8s/02-prometheus-monitoring.yaml

# Wait for rollout
kubectl rollout status deployment/backend -n atlas-logistics

# Verify pods are running
kubectl get pods -n atlas-logistics
```

## Step 9: Environment Variables by Deployment

### GitHub Actions Workflow Variables

Edit `.github/workflows/docker-build.yml` to add environment variables:

```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  NODE_VERSION: 22
  PNPM_VERSION: 11.5.1
```

### Docker Compose Production

Create `.env.production`:
```bash
cp .env.production.example .env.production

# Edit with actual values
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres:5432/atlas
REDIS_URL=redis://redis:6379
JWT_SECRET=$JWT_SECRET
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
```

### Kubernetes ConfigMap

Already defined in `k8s/01-atlas-deployment.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: atlas-config
  namespace: atlas-logistics
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  # ... (see manifest for full list)
```

## Step 10: Verify End-to-End Pipeline

### Test GitHub Actions
```bash
# Trigger workflow by pushing to main
git checkout -b test/ci-cd
echo "# Test CI/CD" >> README.md
git add README.md
git commit -m "test: trigger github actions"
git push origin test/ci-cd

# Open PR and merge to trigger build
# Workflow will automatically run
```

### Verify Container Registry
```bash
# Check images in ghcr.io
docker images | grep atlas-logistics

# Or via GitHub CLI
gh api repos/xpallares1987-ai/atlas-logistics/packages --jq '.[] | select(.name | startswith("atlas-logistics"))'
```

### Test Kubernetes Deployment
```bash
# Deploy to staging first
./scripts/deploy.sh staging latest

# Verify all pods are running
kubectl get pods -n atlas-logistics

# Check service endpoints
kubectl get svc -n atlas-logistics

# Port-forward to test locally
kubectl port-forward svc/backend 3001:3001 -n atlas-logistics
kubectl port-forward svc/frontend 8080:8080 -n atlas-logistics

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:8080/
```

## Troubleshooting

### GitHub Actions Workflow Fails

**Check logs:**
```bash
gh run list --workflow=docker-build.yml
gh run view <RUN_ID> --log
```

**Common issues:**
- Image not found: Ensure images are built before deploy step
- Authentication failed: Check `GITHUB_TOKEN` has write access to packages
- Trivy scan failed: Fix vulnerabilities or suppress false positives

### Kubernetes Deployment Issues

**Pod stuck in Pending:**
```bash
kubectl describe pod <POD_NAME> -n atlas-logistics
# Check for resource requests/limits, node selectors
```

**ImagePullBackOff:**
```bash
# Verify image exists and is accessible
docker pull ghcr.io/xpallares1987-ai/atlas-logistics:backend-latest

# Check pull secrets
kubectl get secrets -n atlas-logistics
```

**CrashLoopBackOff:**
```bash
# Check pod logs
kubectl logs <POD_NAME> -n atlas-logistics --tail=100
kubectl logs <POD_NAME> -n atlas-logistics --previous  # Previous crash
```

## Security Best Practices

✓ **Rotate secrets regularly:**
```bash
kubectl delete secret atlas-secrets -n atlas-logistics
kubectl create secret generic atlas-secrets \
  --from-literal=JWT_SECRET="<new-secret>" \
  # ... rest of secrets
```

✓ **Use sealed secrets for GitOps:**
```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Seal secrets
kubeseal -f secret.yaml -w sealed-secret.yaml
```

✓ **Audit secret access:**
```bash
kubectl logs -n kube-system -l app=audit
```

✓ **Network policies:**
Already defined in `k8s/01-atlas-deployment.yaml` (NetworkPolicy resource)

---

**Next Steps:**
1. Generate and add secrets to GitHub
2. Push code to trigger GitHub Actions
3. Verify images are pushed to ghcr.io
4. Deploy to Kubernetes using `./scripts/deploy.sh`
5. Monitor deployment with Prometheus/Grafana
