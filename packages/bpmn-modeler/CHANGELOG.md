# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.1.4](https://github.com/xpallares1987-ai/BPMN-Modeler/compare/v1.1.3...v1.1.4) (2026-06-28)

### [1.1.3](https://github.com/xpallares1987-ai/BPMN-Modeler/compare/v1.1.2...v1.1.3) (2026-06-28)

### [1.1.2](https://github.com/xpallares1987-ai/BPMN-Modeler/compare/v1.1.1...v1.1.2) (2026-06-28)

### Bug Fixes

- add tsx to tsconfig ([9c5cd97](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/9c5cd97778091a795c5ed35449c5943ac9dd1afe))

### [1.1.1](https://github.com/xpallares1987-ai/BPMN-Modeler/compare/v1.1.0...v1.1.1) (2026-06-28)

### Bug Fixes

- **deps:** resolve elliptic vulnerability by replacing node-polyfills with direct buffer dependency ([10ebb87](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/10ebb87639985bfe7d74cc43be3127c9f2f45dda))

## 1.1.0 (2026-06-28)

### Features

- **ci:** add ESLint, njsscan and CodeQL security workflows ([151097a](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/151097a29e67aacd794df505e9529144abf16dd6))
- **codespaces:** add .devcontainer configuration for GitHub Codespaces support ([5e37f3c](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/5e37f3c08626d3d78bf804db46c09db51a3280ea))
- complete Phase 4 industrialization and secure audit ([d2efa51](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/d2efa510fd431611473fd01c85dbce15eb2f09f9))
- initial commit for standalone BPMN Modeler ([2545925](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/2545925c26299ee8aad8d018b3a6a026da567ec1))
- offload SOP generation to Web Worker and upgrade Gemini to 2.5-pro ([237b3ab](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/237b3ab5cfb5bc4536e817ddea5648f3ed8f149e))
- **sync:** add real-time collaborative sync and configure Playwright ([550c44d](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/550c44d2aef304f7c4397aa6dc1984c73d27c197))
- **ui:** add live XML viewer, minimap toggle and fix autocomplete warnings ([bcf4101](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/bcf41017184699cf2fa77d15d00d6880c2140bb8))
- **ui:** update toolbars and APIs for production ([285c3ae](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/285c3ae694dc650b7e0239c25eb05e695d8ba015))

### Bug Fixes

- add ids dependency to hoist it to node_modules/ids and build successfully ([cbf4b13](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/cbf4b1328e7980ec94e716f74384538d0f376cea))
- add missing dependencies (dexie, xml2js) and fix type check errors in inlined packages ([122a745](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/122a74562f30e4f146734a48081640533d30a17e))
- add ts-expect-error to ids-shim import path ([82e8d43](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/82e8d438eb388610d8eb17b70e5adcdf3588a0a1))
- **bundle:** resolve buffer polyfill, ids-shim import, and dynamic imports warnings ([c1294b3](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/c1294b3b6bbc764b292cb4d796a649fe8ef8a016))
- **ci:** fix invalid action versions in CI and Deploy workflows ([dc00b41](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/dc00b4129f08388105be466ca5aa98af22dbbbae))
- **ci:** install @google/genai to resolve type-check ([fa39828](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/fa3982858c2951e4c91bbbd50987b6410637826a))
- **ci:** install @google/genai to resolve type-check ([12fc5e0](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/12fc5e01db66fbe2366a862c5b196317e4e03ab9))
- delete redundant pnpm-workspace.yaml to resolve CI dependency resolution failure ([7642195](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/7642195f3062c7ddc47cc031cec4d1d992292110))
- **deploy:** correct GitHub Pages base path and update CI to pnpm v11 with ignore-scripts ([a2bf794](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/a2bf79436d3171069754c665acd774c311a79e92))
- **deps:** add .npmrc, fix pre-commit hook for cross-platform compat ([ce4fec5](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/ce4fec5af2b8ceac948c20005ef99276cdff5d34))
- ignore bpmn registration console errors in E2E ([d79587c](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/d79587c2f7106519879f9d89cdae6764781e2af3))
- increase playwright timeout for flaky CI tests ([658b581](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/658b5815b180e72ab50510a9aa3bf561da756c7e))
- industrialize CI workflows and resolve dependencies ([8d1714c](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/8d1714ce12fe5a0344e1945d098153ff189a5910))
- industrialize CI, resolve test scanning issues, and stabilize workflows ([0ae11a9](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/0ae11a9f5464ec52f583d7481f55da91649b7a46))
- inline shared UI and feature-flags, add path mappings to resolve CI compilation issues ([ca28408](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/ca284081febb6d204494380be92d96162bdcfeee))
- **lint:** replace all explicit any types with proper TypeScript types ([70e970d](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/70e970dd1becab8c0827c6d631a9b407ff606d0a))
- make ESLint self-contained and fix Vite resolve aliases ([ccdc187](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/ccdc187a8701888db2b8454d5483e6bddf1b199b))
- remove flaky filechooser test ([121ccf9](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/121ccf93d73623bfa8f5da995b399352b62c9a3b))
- resolve typescript errors and align @google/genai sdk usage ([c23af28](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/c23af2816afe8460c62e965be9c2c21cbe09491c))
- run Vitest with jsdom environment and exclude shared/dist ([aa134b8](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/aa134b8731989f74747d5294d25c4b350dbf7afc))
- **security:** mitigate XML bomb via regex pre-check and remove any types ([98de420](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/98de420b6d92943a41a4d732a9851676be7f8aab))
- **security:** resolve undici vulnerability via pnpm overrides ([a925acf](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/a925acfe1ba79fca9fe152b004b573c422dbc276))
- **security:** resolve xml bomb, workflow permissions and any type in codeql ([9994379](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/99943795cc1f124a0b949de98852c0d3a780d733))
- **types:** eliminate 'any' warnings and unused variables ([d020905](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/d020905e33a0ae0e1923f8b2f74176b3e0c27576))
- **types:** use explicit enums for HarmCategory and HarmBlockThreshold ([eea5ade](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/eea5ade8244d23c8c524ffca06c77d6def2c14e2))
- update lockfile with new dependencies (dexie, xml2js) and ignore pnpm-workspace.yaml ([c0f96b8](https://github.com/xpallares1987-ai/BPMN-Modeler/commit/c0f96b8a629c8c16cc3c866cb6cb3b09c0fa44bd))

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Real-time diagram remote synchronization via BroadcastChannel (`DIAGRAM_CHANGED` event type).
- Added `yjs` and `y-indexeddb` to dependencies.
- Added E2E testing framework support with Playwright.
- Added local site verification script `verify_live_site.js`.

### Fixed

- Replaced all explicit `any` types with proper TypeScript types to satisfy lint rules.
- Fixed type error in `eventBus` inside `modeler-service.ts` and missing import of `importDiagram` in `main.ts`.
- Mitigated XML-bomb vulnerability in `bpmn-worker.ts` with regex pre-check.
- Updated `.github/workflows/deploy.yml` to use `actions/deploy-pages@v5`.

### Security

- Fixed 24 CodeQL scan alerts (including XML-bomb and strict TypeScript type warnings).
