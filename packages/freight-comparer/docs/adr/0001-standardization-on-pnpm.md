# 0001 Standardization on pnpm

- **Status**: Accepted
- **Deciders**: AI Assistant
- **Date**: 2026-06-06

## Context and Problem Statement

The project consisted of multiple independent repositories with inconsistent package management (some using npm, some using pnpm). This caused overhead in maintaining CI/CD and dependency management.

## Decision Drivers

- Need for unified dependency management across all projects.
- pnpm provides faster installation and efficient disk space usage.
- Consistency in CI/CD workflows.

## Decision Outcome

Chosen option: Standardize all repositories on pnpm, because it provides better performance and consistency for the project ecosystem.

### Consequences

- **Good**: Consistent dependency resolution, faster builds, reduced disk usage.
- **Bad**: Teams must adopt pnpm if they haven't already.
