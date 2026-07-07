#!/bin/bash
set -e

PROJECT_ID="gen-lang-client-0393063451"
REPO="xpallares1987-ai/Atlas-Logistics"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"

echo "1. Creating Service Account..."
gcloud iam service-accounts create $SA_NAME --project="${PROJECT_ID}" --display-name="GitHub Actions Service Account" || echo "Service account may already exist"

echo "2. Granting permissions to the Service Account..."
# Firebase Admin for deployment
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/firebase.admin"
# Additional role for Data Connect deployment if needed
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/firebasedataconnect.admin"

echo "3. Creating Workload Identity Pool..."
gcloud iam workload-identity-pools create "${POOL_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool" || echo "Pool may already exist"

echo "4. Creating Workload Identity Provider..."
gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_NAME}" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" || echo "Provider may already exist"

echo "5. Binding Service Account to GitHub Repo..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${REPO}"

echo ""
echo "✅ Workload Identity Federation setup complete."
echo "Use the following details in your GitHub Actions workflow:"
echo "workload_identity_provider: 'projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}'"
echo "service_account: '${SA_EMAIL}'"
