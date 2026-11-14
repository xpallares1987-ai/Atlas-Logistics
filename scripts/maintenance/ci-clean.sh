#!/usr/bin/env bash
# @file ci-clean.sh
# @description Automated maintenance script for GitHub Actions CI/CD workflows and cache.
set -euo pipefail

COMMAND="${1:-help}"
REPO="xpallares1987-ai/Atlas-Logistics"

case "$COMMAND" in
  purge)
    echo "🧹 Purging old completed workflow runs..."
    gh run list --repo "$REPO" --status completed --limit 100 --json databaseId -q '.[].databaseId' | while read -r run_id; do
      echo "Deleting run $run_id..."
      gh run delete "$run_id" --repo "$REPO" || true
    done
    echo "✅ Workflow runs purged."
    ;;

  clear-cache)
    echo "🧹 Clearing GitHub Actions Cache..."
    node "$(dirname "$0")/ci-clean.mjs" --all
    ;;

  prune-stale)
    echo "🧹 Pruning stale BuildKit cache blobs (>3 days)..."
    node "$(dirname "$0")/ci-clean.mjs" --min-age=3
    ;;

  *)
    echo "Usage: $0 {purge|clear-cache|prune-stale}"
    exit 1
    ;;
esac
