#!/bin/bash

# GitHub CI/CD Secrets Setup Helper
# This script guides you through setting up Docker Hub secrets for the CI/CD pipeline

set -e

echo "🔐 Atlas Logistics GitHub Secrets Setup"
echo "======================================"
echo ""
echo "This helper will guide you through creating the necessary secrets for Docker image push."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "   Install from: https://github.com/cli/cli"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "   Run: gh auth login"
    exit 1
fi

# Get repository
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
echo "📦 Repository: $REPO"
echo ""

# Prompt for Docker Hub credentials
echo "Enter your Docker Hub credentials:"
read -p "Docker Hub username: " DOCKER_USERNAME
read -sp "Docker Hub access token (create at https://hub.docker.com/settings/security): " DOCKER_PASSWORD
echo ""
echo ""

# Verify credentials by testing docker login (optional)
echo "🔍 Verifying credentials..."
if echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin &> /dev/null; then
    echo "✅ Docker credentials verified"
    docker logout &> /dev/null
else
    echo "⚠️  Could not verify Docker credentials. Continuing anyway..."
fi

echo ""
echo "Setting GitHub secrets..."

# Set secrets
gh secret set DOCKER_USERNAME --body "$DOCKER_USERNAME" --repo "$REPO" 2>&1 && \
    echo "✅ DOCKER_USERNAME set"

gh secret set DOCKER_PASSWORD --body "$DOCKER_PASSWORD" --repo "$REPO" 2>&1 && \
    echo "✅ DOCKER_PASSWORD set"

echo ""
echo "🎉 GitHub secrets configured successfully!"
echo ""
echo "Next steps:"
echo "1. Create a test PR or push to main branch"
echo "2. Watch the workflow: gh run list --limit 5"
echo "3. View logs: gh run view <run-id> --log"
echo ""
echo "Your Docker images will be pushed to:"
echo "  - docker.io/$DOCKER_USERNAME/atlas-frontend:latest"
echo "  - docker.io/$DOCKER_USERNAME/atlas-backend:latest"
