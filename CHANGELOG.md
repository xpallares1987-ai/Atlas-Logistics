# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Standardized `.github/workflows/dependabot.yml` workflow for auto-merging non-major dependency updates.
- Standardized Architecture Decision Record (ADR) template in `docs/adr/template.md`.
- Added standard `CODE_OF_CONDUCT.md` and `CHANGELOG.md` files to align repository with workspace documentation requirements.
- Added local `vitest.config.ts` in `packages/shared` and updated root `test` script to target the workspace package, resolving monorepo configuration climbing errors.
- Added `docs/adr/0003-transition-to-internal-monorepo-workspace.md` to document the refactoring shift.

### Removed

- Removed redundant `.github/workflows/codeql-analysis.yml` workflow file to prevent conflicts with GitHub's dynamic Default Setup.
