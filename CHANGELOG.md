# [1.1.0](https://github.com/xpallares1987-ai/Atlas-Logistics/compare/v1.0.0...v1.1.0) (2026-08-21)


### Bug Fixes

* replace failing postgresql devcontainer feature with docker-compose service ([#66](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/66)) ([5ec66f1](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5ec66f17c592ad4ea268861c4ea1d007a58825f4))
* resolve adminRoutes import error and finally add dev script ([89b6e93](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/89b6e936f0b93941197ace55c836b2528ad737e8))
* resolve date-fns missing module and add dev script for e2e tests ([ffc2e27](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ffc2e27d794480488d4534d6a2a0be4b6861ae14))
* resolve E2E timeouts and CI db migration failures ([78e117f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/78e117f1e0fd38d8e288a6e6ad19ddb4d84cb02e))


### Features

* enterprise evolution ([#65](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/65)) ([577199b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/577199bfcaebfb5b7d37185fa92936ea21f78d5d))
* **warehouse:** finalize enterprise evolution, warehouse MFE, health metrics and backup cron ([618d87d](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/618d87d35909655d87510289985e6b9e49e11394))

# [1.1.0](https://github.com/xpallares1987-ai/Atlas-Logistics/compare/v1.0.0...v1.1.0) (2026-08-08)


### Bug Fixes

* replace failing postgresql devcontainer feature with docker-compose service ([#66](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/66)) ([5ec66f1](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5ec66f17c592ad4ea268861c4ea1d007a58825f4))
* resolve adminRoutes import error and finally add dev script ([89b6e93](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/89b6e936f0b93941197ace55c836b2528ad737e8))
* resolve date-fns missing module and add dev script for e2e tests ([ffc2e27](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ffc2e27d794480488d4534d6a2a0be4b6861ae14))
* resolve E2E timeouts and CI db migration failures ([78e117f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/78e117f1e0fd38d8e288a6e6ad19ddb4d84cb02e))


### Features

* enterprise evolution ([#65](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/65)) ([577199b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/577199bfcaebfb5b7d37185fa92936ea21f78d5d))

# [1.1.0](https://github.com/xpallares1987-ai/Atlas-Logistics/compare/v1.0.0...v1.1.0) (2026-08-08)


### Bug Fixes

* resolve adminRoutes import error and finally add dev script ([89b6e93](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/89b6e936f0b93941197ace55c836b2528ad737e8))
* resolve date-fns missing module and add dev script for e2e tests ([ffc2e27](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ffc2e27d794480488d4534d6a2a0be4b6861ae14))
* resolve E2E timeouts and CI db migration failures ([78e117f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/78e117f1e0fd38d8e288a6e6ad19ddb4d84cb02e))


### Features

* enterprise evolution ([#65](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/65)) ([577199b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/577199bfcaebfb5b7d37185fa92936ea21f78d5d))

# [1.1.0](https://github.com/xpallares1987-ai/Atlas-Logistics/compare/v1.0.0...v1.1.0) (2026-08-08)


### Bug Fixes

* resolve adminRoutes import error and finally add dev script ([89b6e93](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/89b6e936f0b93941197ace55c836b2528ad737e8))
* resolve date-fns missing module and add dev script for e2e tests ([ffc2e27](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ffc2e27d794480488d4534d6a2a0be4b6861ae14))
* resolve E2E timeouts and CI db migration failures ([78e117f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/78e117f1e0fd38d8e288a6e6ad19ddb4d84cb02e))


### Features

* enterprise evolution ([#65](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/65)) ([577199b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/577199bfcaebfb5b7d37185fa92936ea21f78d5d))

# 1.1.0 (2026-08-08)

### Features & Enterprise Upgrades
* **Security**: Implemented JWT Authentication and Role-Based Access Control (RBAC).
* **Real-Time**: Added WebSocket integration for instant system notifications.
* **Architecture**: Extracted Warehouse Operations into a federated Micro-Frontend (MFE).
* **Testing**: Bootstrapped Playwright for automated End-to-End (E2E) UI testing.
* **UI/UX**: Upgraded all remaining modules (Document Vault, Customs Clearance, Warehouse Ops, Agent Settlements) to the premium Glassmorphism design system.
* **Visuals**: Replaced 3D warehouse engine with a lightweight, high-performance 2.5D Isometric CSS grid.

---
# 1.0.0 (2026-08-01)


### Bug Fixes

* add @react-three/fiber, drei and three to @atlas/frontend deps (CI fix) ([790ccf2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/790ccf2c1489111893e580952575fd022a61eb76))
* add GHSA-mh99-v99m-4gvg to pnpm audit ignore list ([1297cbb](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1297cbb66e4fd5e0f52deff0200634c9ca29200d))
* add GHSA-qwww-vcr4-c8h2 to pnpm audit ignore list & sync user deps ([9cf14d0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9cf14d00f18b3b10cb8a87776c0c81ea11d9670e))
* add id-token write permission for Google Cloud WIF auth in CI ([c668202](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/c668202c4e00d7a85e077ac112c6ecc9854393e0))
* add missing @vitest/coverage-v8 dev dependency for CI ([3395383](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/3395383ed23276c14dfff8e34eb93124ae361256))
* add missing route files ([c0d98d3](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/c0d98d3c5339e216f93bbacbfc1badf7a8ec32cc))
* add route-specific rate limiting to auth routes, fix syntax error in aiWorker.ts ([2802155](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/2802155e52ce10a1612bc8cdb4c766202ccf2f67))
* add untracked frontend and backend files to fix CI build ([fb15705](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/fb157050697b38778c4b0a4da1ef4b6324956fda))
* add VITE_API_URL to github pages deploy workflow ([1f24e44](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1f24e44c40d0d06e1e78437f290e75b0c45a30f9))
* allow no-frozen-lockfile on UI clone ([9a9451e](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9a9451e9a877391e7d11422ba5e2941f66199a0c))
* backend dockerfile startup cmd ([5abb609](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5abb609f9171286f02e8396cfcc8a546a793ff80))
* build docker explicitly to push to GCR before cloud run deploy ([53e3ad6](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/53e3ad6862ab5e27dab12f767061f5a1d7582fe2))
* bypass pnpm action restriction with global install ([5adecd5](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5adecd56c15f576c59769401f105c8f4f6f4bc42))
* change frontend Nginx port to 8080 to fix Cloud Run health check ([347a351](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/347a351bbd24996c789bc18dd4b9ac71392d6033))
* ci deploy configs and dockerfile args ([d0e8962](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/d0e89623153ac059246b7e6330f1d27bf618e630))
* **ci:** Access FIREBASE_TOKEN secret via env variable in step conditional to resolve GHA syntax validation error ([1b814ab](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1b814ab6f9afc945a43f3b49825cc8928a73b2e5))
* **ci:** fetch real DATABASE_URL from Secret Manager and rewrite for proxy ([dc97c6d](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/dc97c6da2a698faa6e67fc2da5c944e11289f3fb))
* **ci:** point test script to shared package and add local vitest config ([10161c7](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/10161c776d147d6b34a877b695e9fa8addc3a837))
* **ci:** remove all remaining obsolete Control-Tower-UI clones from workflows ([169cd2c](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/169cd2c1d797a4fafac20cfb39f52157889a329c))
* **ci:** remove deprecated baseUrl and fix relative paths in package tsconfig files ([1cedaa5](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1cedaa5f4947fa333628bc4ce35453b69c6eca1b))
* **ci:** remove obsolete Control-Tower-UI clone and build dependencies for ESLint ([576fd0f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/576fd0f3521029fa118ca0cf0950ac7d0068f611))
* **ci:** remove redundant firebase-hosting action and nested .github folder ([f89e7b7](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f89e7b7043a7790e4b4ad3f40a2278c2fab37556))
* **ci:** run build before type-check to resolve cross-package typings ([502542b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/502542b95df1df882bcfe725f0327b00c65a525f))
* **ci:** Skip Firebase preview deploy step on PRs if FIREBASE_TOKEN secret is empty ([35a1553](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/35a1553aa3f227e144161970455a5904a6ef2df2))
* **ci:** update cloud-sql-proxy to v2.14.1 via wget ([9da125d](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9da125df4dd6cc9e10f78850aad22a5bfbf97fc7))
* **ci:** update github actions to v4/v3 to resolve startup failure ([50a250c](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/50a250cd882816c9257552c71baf7a9c0560683b))
* **ci:** use latest cloud-sql-proxy to fix mTLS CN error ([006f99c](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/006f99c08facd457afe3461b6d2c01fdf0f4b941))
* cleanup ci workflow yaml ([da0d3e8](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/da0d3e8b2f3930b1988c331a7b51714151e2c07d))
* **consolidation:** update to use external LCL Consolidation Engine with props ([89155fd](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/89155fde6433a3e175d86cd32f3262a4675c4df1))
* convert storage.rules to utf8 and update hosting public path ([f8408f2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f8408f2c3876d2270526d66deb7f67b85d9ebdf3))
* correct import errors causing backend crashes ([54b695c](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/54b695cb674fe9043701487591a1289ff128601a))
* **crypto:** use BufferSource cast instead of any for iv and cipher ([62ae9d2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/62ae9d26a8277dfe764d2b080ad3c50739642482))
* **dashboard:** resolve type-check and unused var errors ([97da25a](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/97da25a0fbbc5d7b054a1c05ac023865871ed651))
* db seed collisions and UI ts build errors ([92719d2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/92719d265670997f899dd4d65054af4a394455b2))
* **deps:** apply pnpm overrides to resolve security vulnerabilities ([439be3b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/439be3bc7ae388f3e79c0b9981e77265e5ee6776))
* **deps:** override shell-quote to resolve DoS vulnerability ([1909afe](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1909afe7a9891c5d193b625eb57321735d935291))
* **deps:** replace sheetjs git url with cdn url to fix CI 522 errors ([063c166](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/063c1660c27d4b5dfb463e8213d21a227125521c))
* **deps:** upgrade frontend react and types to v19 to fix type check build error ([6a8a2c1](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/6a8a2c11643c11be63f3a1e6e266244a3b17ff92))
* disable no-unused-vars to unblock CI and update e2e workflow test ([1a3e162](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1a3e1627b46f731652ea170b623ceb6277776d2e))
* disable TS checking for UI modules ([a33c759](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/a33c759389f9eabc7fcd2cf2a55be5446cbc0601))
* downgrade and unify react to v18.3.1 across workspace to prevent runtime dispatcher null errors and satisfy react-three-fiber peer dependencies ([36945fa](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/36945fae297399e7a025f9d4d6e6995b99e7ffa5))
* downgrade typescript to 5.7.3 to fix eslint compatibility ([ac30756](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ac307567721f55edbbc757c169084aa57ccc6d6d))
* **e2e:** update playwright webserver command and add claims worker ([8fea39b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/8fea39bc98e34a12df645b642df9532f83b03cbb))
* **eslint:** remove obsolete src/frontend/tsconfig.json from parser project ([ea758fd](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ea758fdbc3d91e989fb1bce64a6f1e2ed7976f23))
* frontend typescript build errors ([90941f7](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/90941f7db84daf05051a0e47e3d6fb6e85fc2fad))
* **frontend:** replace server actions with client fetch for static export ([b759c4f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/b759c4f0ad76162456e164fc28095e20590fa35b))
* **frontend:** syntax error in PublicTracking.tsx ([336c458](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/336c4586e3b8843c0195bf60b52b52b10a404d72))
* ignore functions in root eslint and set correct vite base path for gh-pages ([d5bdeac](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/d5bdeaca57565b1e4473801debb095fd78bee8a5)), closes [#pages](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/pages)
* industrialize CI workflows and resolve dependencies ([3124f81](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/3124f814d7696f72766e93ae434db37109033fc2))
* industrialize CI, resolve test scanning issues, and stabilize workflows ([f34e32c](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f34e32c4d496bda4f2d1c059770f3fa0da967454))
* **lint:** remove remaining unused-vars warnings across server routes ([55172ac](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/55172ac1ae7661833e8639b5d1ef03ee21164071))
* migrate to artifact registry ([5a641ba](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5a641ba12ae20e3988545816459adf0c18c436c3))
* move esbuild override to package.json pnpm.overrides and sync lockfile ([e679173](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e6791730698de7f56f23d6a62ebfce0c044fb2b9))
* pin pnpm version to 10.0.0 in copilot-setup-steps workflow ([6aa0484](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/6aa04842e7ce0ec5d5018db483ef8e7c76ed87a8))
* regenerate pnpm-lock.yaml after vite version revert (^8.1.2 → ^6.4.3) ([4432eab](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4432eab8a2b2b950b4e3bf2bc97ba055df17ad64))
* release workflow only triggers on workflow_dispatch or tag ([cbe39c1](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/cbe39c158ecd2fca34aad0e26c46f944b75b71e8))
* remove blank line in ci steps ([f1fedb5](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f1fedb5296db7a5c146f3827e7f0034fe842c878))
* remove blank line in ci steps ([444f6cd](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/444f6cd11e0d413637ac9658671a8c44156a34fd))
* remove blank line in ci steps ([0fbb4a9](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/0fbb4a94f95d953e77cb70d5cc7e2878b82e129c))
* remove blank line in ci steps ([943171a](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/943171ab3e391dff2465349e859ef2cd96723766))
* remove duplicate pnpm version from copilot-setup-steps.yml ([635a502](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/635a502fc2eab9cf524d7814879e31e5179256b6))
* remove functions tsconfig from eslint and add create-admin ([9afed3b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9afed3be71ff266a3f863acc03437a681a2d2de2))
* remove injected newline in checkout step ([b40023b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/b40023bf4f0f93697948e365749780577fc4a8bd))
* remove unused Settings import in frontend to fix build ([98d04a0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/98d04a097afe0e096e1233ee761a4c98a9d659ad))
* rename ci.yml to main.yml ([17be0a6](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/17be0a632f718083d4d33889ec28e908986b0ff6))
* replace failing postgres devcontainer feature with Dockerfile install ([d14b3c2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/d14b3c234b79c838ce474eb5919325c995c81ec5))
* replace failing postgres devcontainer feature with Dockerfile-based install ([#42](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/42)) ([03483d6](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/03483d692e6ce70a34c386dd80c543b89f91003e))
* replace vulnerable xlsx with exceljs to fix pnpm audit CI failure ([641286b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/641286bdb9063508c38293fcc18e59553c001fc1)), closes [hi#severity](https://github.com/hi/issues/severity)
* replace vulnerable xlsx with exceljs to fix pnpm audit CI failure ([#39](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/39)) ([8dd0282](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/8dd0282061168fbd52b6f77e909ab446dd452693)), closes [hi#severity](https://github.com/hi/issues/severity)
* replace xlsx with exceljs to solve dependabot vulnerabilities ([1fac404](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1fac4047011e4a246dc5e5e2074efb68db7c2ef1))
* resolve all remaining vulnerabilities via pnpm overrides ([dd738ef](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/dd738efe34e6eddc90453130b227ab433b90b841))
* resolve all TypeScript errors — CSS modules, ExtendableEvent, baseUrl deprecation ([c578838](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/c578838a383b459555b672312bf2401eda4ccef8))
* resolve CI failures, code scanning alerts and missing dependencies ([594d7be](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/594d7be31d9ca21557bab7deb9db0fcfa340ab84))
* resolve code scanning alerts [#162](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/162) (timing attack) and [#164](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/164) (modulo bias) ([48f5618](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/48f5618d697741a5032391920e5278dcebc7b4fe))
* resolve E2E timeout and ESLint missing plugin ([fbc5f69](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/fbc5f69589825cf3c40154777d3fac24ddc1e148))
* resolve syntax error in aiWorker.ts causing eslint failure ([bf5728b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/bf5728b8d450a31c42cac2c950495973a8c05606))
* resolve three.js duplicate instances, remove dead noise.svg, fix frankfurter api url ([52027d0](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/52027d0368b1e4c7fa14728886eb7811db9765f4))
* restore root pnpm esbuild override ([dacd6b2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/dacd6b2d620c8ef7b6c4dc150615f62a513bf6ec))
* restore security overrides in pnpm 10 compatible format ([f465a41](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f465a41bc7494fb34fba364c0a092cac24255aaa))
* restore valid JSON in bpmn-modeler package manifest ([d83ecf2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/d83ecf2a6dd53540857b73a1530b7d560937b36e))
* rollback esbuild bump that breaks CI build ([51d437d](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/51d437d3b607d31190d14725551c9f255c3dad2a))
* **security:** bump react-router to 8.3.0 via override ([fc44227](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/fc44227314c8e61daaca70f290cb120344f43c06))
* **security:** fix njsscan config key and remove broken local pnpm paths ([e97ebfd](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e97ebfd5e9bc937f1a5ef9f42b7b4bc194acb2f7))
* **security:** fix njsscan config key and remove broken local pnpm paths ([601d899](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/601d899603f43aba17d52f63c2091a5ffdd987a3))
* **security:** ignore CVE-2026-14257 and update brace-expansion ([24862eb](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/24862ebf502e165fcda7c6496953c3431a7178dd))
* **security:** ignore unfixable brace-expansion vulnerability in devDependencies ([f394bf9](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f394bf9c0f9ae23b69a6ecff3b27cce837d0ad84))
* **security:** pin uuid override to ^11.1.1 to preserve CJS compatibility ([47dc807](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/47dc807951a940a2441e26faa2ca045cea295619))
* **security:** remove hardcoded Firebase API key ([1460d0a](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1460d0a9dec8c58e7da7668a8cf9205aa2d12107))
* **security:** resolve brace-expansion vulnerability in functions ([7e4e4d6](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/7e4e4d60e1559b3dcd9a6c57060ecfafdf61f82b))
* **security:** resolve CodeQL Polynomial ReDoS and tainted format string warnings ([342d8c7](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/342d8c75fef45a3416fde9c8335faa74ffd2378f))
* **security:** resolve CodeQL scanning alerts ([acef824](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/acef824c2a8bbdeeddc0614e642abe3129dcc985))
* **security:** resolve d3-color, esbuild, and postcss vulnerabilities via overrides ([7973640](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/7973640cf0899fb6898756812a0e798194d1fc10))
* **security:** resolve Dependabot alerts for @grpc/grpc-js, postcss, uuid, fast-xml-parser ([cf37e99](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/cf37e99ca3581efa99579772c0b396c738ce9c42))
* **security:** resolve Dependabot alerts for @grpc/grpc-js, postcss, uuid, fast-xml-parser ([#25](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/25)) ([8b590e2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/8b590e263d6be27ca51b3034b3e14099106696a0)), closes [#7](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/7) [#19](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/19) [#20](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/20) [#76](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/76) [#79](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/79) [#80](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/80) [#84](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/84) [#17](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/17) [#74](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/74) [#14](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/14)
* **security:** resolve Dependabot alerts for grpc-js, postcss, uuid, fast-xml-parser ([c32e3a8](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/c32e3a89f33bd3bfae4669d919f433f335e8af19)), closes [#7](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/7) [#19](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/19) [#20](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/20) [#14](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/14) [#17](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/17) [80/#84](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/84)
* **security:** resolve ts-deepmerge and uuid dependabot vulnerabilities ([fa2c309](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/fa2c309647ee17ac11f4ac41b41367f9446f65ae))
* **security:** resolve vite, postcss and code-scanning alerts ([961a1df](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/961a1df2e09c95e53a93bf2b7c7cc26b83b5e51e)), closes [#127](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/127) [#128-130](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/128-130) [#131-134](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/131-134) [#135](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/135) [106-#125](https://github.com/106-/issues/125)
* Send IAP cookies for dynamic imports by setting crossorigin to use-credentials ([27a1746](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/27a174632a41a1f1f3ecf82b1e3d582509b7d888))
* setup db and seed admin user for E2E tests in CI ([88e1f1b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/88e1f1bbf0d22bab8f193eedfa9ea069473509dd))
* **shared:** set rootDir for TS6-compatible shared build ([27e93ae](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/27e93ae68a2278df347b9d6979abff09f420ef5d))
* standardize deploy workflow with pnpm action-setup and timeout ([26929f2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/26929f21295cf41c02b930e8e16332b7ff5a01e6))
* symmetric lane matching, consistent Scope 3 ratings, and license fix ([0f63d52](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/0f63d52b6e627dbc037ffa4955384c2dcef5a44f))
* touch .env.local in CI and ignore create-admin in eslint ([ca04000](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ca04000aa0ef6b6aab3d5a1a0723744ff8f97418))
* **tsconfig:** Specify ignoreDeprecations 5.0 to resolve baseUrl deprecation error TS5101 in CI ([19637de](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/19637decb57d003a3d88888be8aae5905bf1aefe))
* **ts:** remove deprecated baseUrl to fix compilation on both TS 5.x and 6.x ([bda7ccf](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/bda7ccfc34ae6c4ddc246553731df2d50aec4cb4))
* **ts:** update ignoreDeprecations to 6.0 for TypeScript 6.x compatibility ([0998a09](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/0998a09b510b5d971a9959dcd44666e5a0b6569c)), closes [#34](https://github.com/xpallares1987-ai/Atlas-Logistics/issues/34)
* **ui:** remove BookOpen, remove vite chunks ([f7eb918](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f7eb918c87c5eccd8da9eee27acb042bcf1cbff4))
* **ui:** resolve TS2339 on import.meta.env ([b9738e6](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/b9738e6b42afce9ff521bee58384a718e65bd554))
* update CI workflow triggers to standard format ([750e57a](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/750e57adfe123344d19a5905361206e1ac4c9b65))
* update full CI workflow ([4a92388](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4a92388a853357c47fd3a98c5ae7bd9da22487de))
* update node version to 22 in release.yml for semantic-release ([7867429](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/78674290947075d94644a796153114a0c249da24))
* update postcss to patch XSS vuln; fix eslint action versions ([48e4603](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/48e4603641dca6685f50cefa59d19513ab4858fd))
* upgrade frontend vite from ^6.4.3 to ^8.1.2 to fix CI build failure ([f5efc1b](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f5efc1b722476a470b6023badbbd642e10659937)), closes [atlas/frontend#build](https://github.com/atlas/frontend/issues/build)
* use pnpm/action-setup@v4 with quoted version ([dc9a06f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/dc9a06f041bafa15e884ddf5934d4fea259cd8e5))
* use relative URL in E2E test to avoid port mismatch timeout ([76d75fc](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/76d75fc33aa2a49dc051b9469e6d757280d34b39))
* use specific SHAs for GitHub Actions to resolve parsing issues ([481246a](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/481246a7dc634cdbce37e12af1e082ea4050034f))
* vite 8 rolldown compat and three.js version bump ([6335176](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/63351769547e31336b0c6da6177223fe78fa3bd9))


### Features

* add audit logs cleanup script and register db:clean-logs script ([928e7ea](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/928e7eaa4d6c9f874d26d9536637bb6e68ce0a1c))
* add email and password login form ([e862709](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e862709dc1ae4f56f217f98d7b044f6a0f9fb1a3))
* add Forgot Password UI and integrate with Control-Tower-UI ([30d2d83](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/30d2d83abe7a4840e9f99c3bed85165a6d97f27b))
* add PWA icons and favicon ([c7d60e9](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/c7d60e9996c5b48cc02639bf75ec3356bf1f60f7))
* add settings module and wire up header dropdown ([c1082dc](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/c1082dcf7673bfa31ccaa6f5626ed2f3733e34b4))
* Add Warehouse3D and AI Assistant, apply Framer Motion UI polish, and stabilize monorepo build (Phase 6 & 7) ([56d14af](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/56d14af1b2971d6fb8d8e008ebbc604e3024813c))
* AI Booking Parser, GCS Documents, and UI improvements ([0c18628](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/0c18628423caeddb81bcb994f62254af55d89972))
* **ai, ui:** connect AiCopilot to real OCR API and configure PWA manifest ([e4fa975](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e4fa9757587d665897c5b37ff62f2211979bf823))
* **ai:** integrate document OCR parser for AP invoices and add native pdfkit generation for HBL ([bebb314](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/bebb314f357fbefb7cad9b4a570d0423573a543b))
* **architecture:** Phase 3 - Security, AI Enrichment, CloudRun, Workflow UI ([90f6d57](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/90f6d57db05e750a330c161e28da7e672cb3f1a6))
* Atlas Logistics V2 - IAP, PubSub, Tracking and CodeQL ([6c58a12](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/6c58a1222a9a377512e1bb3800d6470150800822))
* complete Phase 1 global state with Zustand, roles and theming ([33dc43a](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/33dc43a4a48a67c9fe7364c876907220e3433bac))
* complete Phase 3 UI/UX enhancements and backend resilience ([4088bf3](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4088bf3abc1b11b34c99f47be4161211dd0105be))
* complete Phase 4 implementations ([e82a519](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e82a519abac2cf137c2392db53e0bfd2e3de1c5c))
* complete Phase 4 industrialization and secure audit ([46032ef](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/46032ef3c2afaf071474bc666eebddb409da568c))
* **core:** Atlas Logistics Super-App MVP (Phases 1-4) - All core architecture implemented ([90ec062](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/90ec062d977d601a5dc42847c48f97107af44995))
* **core:** synchronize workspace updates, UI integration and docs ([dca4663](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/dca4663d76c4ce9d629bc117ef5f674668523917))
* **dashboard:** add predictive AI badge to shipment list ([d47908f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/d47908f95362a9822fa5b16fec4cab4be7daaa69))
* **docs:** add code of conduct, changelog and update workspace files ([acc7687](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/acc7687c280cc10adc973f13a7dae07974b1ac29))
* **firebase:** add Firebase AuthProvider wrapper to root layout ([7ce48e8](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/7ce48e8c62d716fdb59cbc3eb0d5e90a5f9d437b))
* **gemini:** Implement Option B - Upgraded backend to GoogleGenAI Interactions API (Code Execution & Google Search) ([ddf0ae8](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/ddf0ae8aef43efea24d36fb1b10fad4bd9151fc6))
* implement Customer Portal module (Phase 3) ([daa0b21](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/daa0b21bab8552fa0c59daf42b4b8e86d0010784))
* implement Customs Clearance and Invoicing modules (Phase 2) ([e136acd](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e136acd81a5757d0f72fb560641032e98c532521))
* implement Sailing Schedules and Booking Management modules (Phase 1) ([eddb2eb](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/eddb2eba5abb814c63de687bb9285405552b7e7b))
* implement vite chunk splitting and interactive OmniSearch command palette ([1a58fef](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1a58fef2c2b303d6dd73b8ed4205ad59d53bc177))
* make top navigation icons interactive with dropdown popovers ([0a93d98](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/0a93d98f4f7db98236781af618eb9f4e5728a63f))
* migrate to bullmq, add ai worker, and update cloud run deployment config ([4b4c8cf](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/4b4c8cf83ff6ad8e0d3f74d84083b3e47017b1f1))
* migrate workflow engine to Data Connect and add AI OCR ([2125e60](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/2125e60d12fd51f1fbfedfe94af63652b3b8b1a9))
* **mvp:** finalize WMS, CRM, and EDI integrations ([1fdd9da](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1fdd9da7d2cee43a9affde14204b4eafdfe50128))
* **ops:** integrate d&d tracker and rfq generator ([99270ef](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/99270efa5d61cd114d15ccc6c3f89e02945bdbd2))
* persist parsed AI data into shipmentDocuments ([6cc04af](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/6cc04affbbd2426f094ef21bd13f07531e395087))
* **phase-1:** Omni-Search, GlobeTracker, PWA, RBAC & Live Sync fixes ([12b2512](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/12b25120b3d06f89fc7d796ad07356bf7e965110))
* **scm:** fix build errors and standardize repository structure ([5aaafcb](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/5aaafcbb1d4a4b0a69013788b88e01507203816c))
* **scm:** implement RBAC, Cloud Tasks ERP simulation, Data Analyst Chat and docs ([3c11544](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/3c115447a5ca12afec1806a051ae96f022c4e801))
* sync local changes including frontend modules and ui components ([1409692](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/1409692432af8e8729634db01bfded252a6d88ac))
* sync local changes including frontend modules and ui components ([9961f49](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/9961f4937024ab998c04a2cca9c3449f43a8715e))
* sync local changes including tracking routes and formatting ([bc03ea9](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/bc03ea9b45d34b875eb6967fd6479eb7c2826e7a))
* **ui:** add visual animated map for public tracking and integrate PDF document download in B2B portal ([235e1bb](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/235e1bbd6ffc5688c05cffe0bc0e8dad039afad4))
* **ui:** implement skeleton loaders, lazy code splitting and add helmet for CSP security ([e61f56f](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/e61f56f8ead736a3f6cdfdbf52f867240d79f289))
* update routes, schema, and apply db middleware ([adda715](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/adda715281493dbfe83931da70a6056b72f32ba6))
* use dynamic FirebaseProvider with env variables ([f46c907](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f46c907dada293fd3b14dc1920d7a7c82a2855c9))


### Performance Improvements

* 5 additional performance improvements across dashboard and frontend ([f3f65a2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f3f65a214a04d2724a396cb90de2e4ec30b82c14))
* **frontend:** lazy-load route modules to reduce initial bundle size ([11c1549](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/11c1549aa46754b87491a2adba133d5ab949d0b1))
* **optimizations:** Implement rendering acceleration, debounced port filters, restricted CORS, and injection mitigation ([f579350](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/f5793500482768b6c2fc01d70f92a699fabb100a))
* **optimizations:** Implement Structured JSON output mode, model fallback to gemini-2.5-flash, smooth CSS theme transitions, and lint import constraints ([a148e42](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/a148e427d5af93fe441f4deed0f310fa1d037a1f))


### Reverts

* undo Vite 8 bump and associated tsconfig side-effects (r3553425954) ([a54abc2](https://github.com/xpallares1987-ai/Atlas-Logistics/commit/a54abc2cc45a6845519e66607105c9d31fdaab81))

# Changelog

All notable changes to the Atlas Logistics monorepo will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Premium UI & Framer Motion:** Added micro-interactions, `AnimatePresence` and loading skeletons to core modules (`Dashboard`, `CustomerPortalModule`) for a premium user experience.
- **SQLite Advanced Objects:** Added `src/db/schema/views.ts` for native SQL views (`shipment_financial_summary`, `warehouse_occupancy`).
- **Triggers & Sequences:** Integrated raw SQL triggers into `seed.ts` to support automated sequenced IDs (`INV-00000X`) and immutable audit logging for shipments.
- **AI & API Integration:** Replaced static Mocks in UI with real fetch calls to backend SQLite endpoints (`/api/shipments`, `/api/ai/chat`).
- **BullMQ + Redis Fallback:** Async background jobs now seamlessly fallback to in-memory execution if Redis is unavailable, avoiding crashes.
- **Cost-0 Local Architecture**: Migración completa de la capa de datos en la nube hacia una arquitectura de base de datos local utilizando **SQLite (libSQL)** y **Drizzle ORM** para garantizar un coste operativo de $0.
- **Seguridad Mockeada**: Implementado un proveedor de autenticación simulado (Mock AuthProvider) para permitir el desarrollo y las pruebas sin incurrir en costes de Firebase Auth.
- **Integración Asíncrona (BullMQ)**: Nueva infraestructura para simular procesos en segundo plano utilizando BullMQ (AtlasEngine) en lugar de Google Cloud Tasks.
- **Nuevo Diseño UI**: Implementación global del diseño "Dark Premium Glassmorphism" en toda la Súper-App unificada.

### Changed
- **Arquitectura Unificada (Frontend)**: Consolidación de todos los submódulos dispersos de la interfaz en una sola Súper-App bajo el directorio `packages/frontend`.
- **Configuración Knip**: Se implementó `knip.json` adaptado al monorepo para optimizar la detección de código muerto.
- El componente `RateTable` ahora maneja cálculos de recargos BAF dinámicamente con estilos glassmorphism y tooltips interactivos.

### Removed
- Eliminada toda la infraestructura basada en Firebase Data Connect, Google Cloud SQL, Firebase Auth y Workload Identity Federation (WIF).
- Eliminados los directorios autogenerados de Data Connect y los scripts de migración asociados.

## [1.0.0] - 2026-06-01
### Added
- Versión inicial estable del frontend Vite + React Router.
- Modelador BPMN básico integrado.
