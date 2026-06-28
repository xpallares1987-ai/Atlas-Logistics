# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.1.0 (2026-06-28)


### Features

* add audit logs cleanup script and register db:clean-logs script ([928e7ea](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/928e7eaa4d6c9f874d26d9536637bb6e68ce0a1c))
* complete Phase 4 industrialization and secure audit ([46032ef](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/46032ef3c2afaf071474bc666eebddb409da568c))
* **docs:** add code of conduct, changelog and update workspace files ([acc7687](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/acc7687c280cc10adc973f13a7dae07974b1ac29))
* **mvp:** finalize WMS, CRM, and EDI integrations ([1fdd9da](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1fdd9da7d2cee43a9affde14204b4eafdfe50128))
* **scm:** fix build errors and standardize repository structure ([5aaafcb](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5aaafcbb1d4a4b0a69013788b88e01507203816c))


### Bug Fixes

* **ci:** point test script to shared package and add local vitest config ([10161c7](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/10161c776d147d6b34a877b695e9fa8addc3a837))
* cleanup ci workflow yaml ([da0d3e8](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/da0d3e8b2f3930b1988c331a7b51714151e2c07d))
* **deps:** upgrade frontend react and types to v19 to fix type check build error ([6a8a2c1](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/6a8a2c11643c11be63f3a1e6e266244a3b17ff92))
* industrialize CI workflows and resolve dependencies ([3124f81](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/3124f814d7696f72766e93ae434db37109033fc2))
* industrialize CI, resolve test scanning issues, and stabilize workflows ([f34e32c](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f34e32c4d496bda4f2d1c059770f3fa0da967454))
* rename ci.yml to main.yml ([17be0a6](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/17be0a632f718083d4d33889ec28e908986b0ff6))
* **security:** resolve CodeQL Polynomial ReDoS and tainted format string warnings ([342d8c7](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/342d8c75fef45a3416fde9c8335faa74ffd2378f))
* **security:** resolve d3-color, esbuild, and postcss vulnerabilities via overrides ([7973640](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/7973640cf0899fb6898756812a0e798194d1fc10))
* update CI workflow triggers to standard format ([750e57a](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/750e57adfe123344d19a5905361206e1ac4c9b65))
* update full CI workflow ([4a92388](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4a92388a853357c47fd3a98c5ae7bd9da22487de))
* use specific SHAs for GitHub Actions to resolve parsing issues ([481246a](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/481246a7dc634cdbce37e12af1e082ea4050034f))

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
