# Changelog

> **DEPRECATION NOTICE**: As of v0.2.0, the SAICA Web Services integration has been fully deprecated and removed. Shipment-Dashboard now operates strictly via client-side CSV/Excel data ingestion.

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### 0.1.1 (2026-06-09)

### Features

- **analytics:** add predictive analytics and flow visualization chart ([1aa9d28](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/1aa9d2896b1694c63ff3581f7c5c22641f9aa5c4))
- **ci:** add ESLint and CodeQL security workflows ([d9c0af3](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/d9c0af3d0e91330a63f56636a3263d4cde21eb78))
- **codespaces:** add .devcontainer configuration for GitHub Codespaces support ([5ed452c](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/5ed452c92a218fdee6e5ede6c252ecb4c785d16b))
- **data:** add automated sync-saica script replacing powershell ([1622861](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/16228617ddeab6ab276c18f38d1cacfeb46703bc))
- initial commit for standalone Shipment Dashboard ([76a0c8e](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/76a0c8e394d416c7c81ac869d15558c8d96c87c2))

### Bug Fixes

- **build:** fix unknown type error in payload theme access ([ea49fbf](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/ea49fbfe8d7f8f1a3c0ecf3aef5cf904c9b60030))
- **build:** move data directory to public so Next.js static export includes the XML files ([80d9e34](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/80d9e34672f6ed48464872efd34b89dce0b5e281))
- **ci:** fix invalid action versions in CI and Deploy workflows ([a3b8e4a](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/a3b8e4a0c586140a6eafb7c2ab5e9ac167faab15))
- **dashboard:** resolve recharts minHeight warning and favicon path ([d6ce331](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/d6ce3314043bc91a3005c11c5026214bb847736a))
- **dashboard:** resolve sheetjs error, fix 404 paths, patch recharts warnings and remove gemini ai ([01c8d15](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/01c8d157fbf4a579694768e04a1938ee20a817fb))
- declare module 'xlsx' to resolve typescript compilation error on npm:sheetjs alias ([b7c25d3](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/b7c25d376a86d8e78f0007bffdd67d5846a16fcf))
- delete redundant pnpm-workspace.yaml to resolve CI dependency resolution failure ([33712ef](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/33712ef451c2d05bc04cddfbf25dc939f11d98ac))
- **deps:** add .npmrc, CI-safe husky prepare, fix pre-commit hook for cross-platform compat ([00b82bb](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/00b82bba6df30f9bc3f710e5ca39f6ffbaba662f))
- **deps:** replace sheetjs CDN url with npm package version to fix lockfile integrity error ([376e390](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/376e3903ec14f5172c5315887b706d5bad58c106))
- ignore and remove pnpm-workspace.yaml to resolve pnpm setup-node action error ([81a805a](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/81a805ac80380524cfa780599a71fbd28a748a45))
- move xlsx declarations to src/declarations.d.ts to resolve module augmentation error ([242d487](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/242d487dc0c36994c215324595d17bc05893e6c3))
- remove auto-generated pnpm-workspace.yaml to prevent CI workspace error ([e1d605f](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/e1d605f4ed00f01919b2a5e95249b279e49ec2ad))
- remove vite/client from tsconfig.json types as next.js does not use vite ([b9ce11b](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/b9ce11b4f35b1e08a9e1073c25b7f2711528d500))
- resolve Next.js Turbopack build issues, add xml2js dependency and copy shared assets ([ceca942](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/ceca9421a6f1f2e2aa4e31767bbf3444a0b464cd))
- resolve type-check errors (zod/vitest/fake-indexeddb dependencies, type casting import.meta.env, and deleting unnecessary config files) ([a5fbc1a](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/a5fbc1a7cea64d9ef7b51f8c8448e245bb90757b))
- **security:** fix path traversal, ci permissions and ignore coverage ([620b090](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/620b090015eb7ba7d4d9b2ab39e62524046ed3df))
- **ui:** favicon, link prefetch and recharts width ([1c46c15](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/1c46c15cbac48fc173e2b07a1293eda93dbddbcb))

### Reverts

- Revert "chore: setup lint-staged and prepare nextjs for vercel deployment" ([64c294d](https://github.com/xpallares1987-ai/Shipment-Dashboard/commit/64c294d70a4d8d6a89391798de4a2f94efbe430b))

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added predictive analytics service (`predictive-service.ts`) powered by `@tensorflow/tfjs`.
- Added flow visualization chart (`LogisticsSankey` component) using `recharts` for throughput tracking.
- Added canvas status overlay (`LogisticsOverlay` component) integrated into the shipping map.
- Added standardized `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md`.

### Fixed

- Fixed Vitest configuration to exclude Playwright E2E tests (`tests/**`) from unit testing.
- Fixed TypeScript compile errors in `predictive-service.ts` (typed parameter as `LogisticsItem[]` and prefixed unused variable with underscore).
- Configured Playwright E2E configuration (`playwright.config.ts`) to serve static out folder using `npx serve@latest out`.
- Updated `.github/workflows/deploy.yml` with Next.js caching and bumped `actions/deploy-pages` to v5.
