# Copilot instructions for Atlas-Logistics

## Repository scope

This repository is the monorepo at `C:\Users\xpall\Source\Atlas-Logistics`, not the older `Source\` meta-repo README. Treat `Atlas-Logistics` as the working root.

## Build, test, lint, and dev commands

Run commands from the monorepo root with `pnpm`:

```bash
pnpm install
pnpm run dev --filter @atlas/frontend
pnpm run build
pnpm run type-check
pnpm run lint
```

For tests, prefer package-level commands from the root with `--filter`:

```bash
pnpm --filter @atlas/shared test
pnpm --filter @atlas/dashboard test
pnpm --filter @atlas/freight-comparer test
pnpm --filter @atlas/bpmn-modeler test
```

Single-test examples:

```bash
pnpm --filter @atlas/shared test -- src/crypto.test.ts
pnpm --filter @atlas/dashboard exec vitest run src/app/dashboard.test.ts
pnpm --filter @atlas/dashboard exec playwright test tests/e2e/logistics.spec.ts
pnpm --filter @atlas/freight-comparer exec vitest run src/services/rateParser.test.ts
pnpm --filter @atlas/bpmn-modeler exec vitest run src/services/storage-service.test.ts
```

Notes that matter in this repo:

- The root `pnpm run test` script currently filters `@atlas/shared`, so it does **not** execute the full Atlas workspace test suite. Use package-level test commands instead.
- `packages/dashboard/playwright.config.ts` expects `dashboard.localhost:8080`; run `scripts/add-dev-hosts.bat` as Administrator if you need that host locally.

## High-level architecture

- `packages/frontend` is the host shell. It owns the top-level React Router tree, auth gating, layout, and route mapping for `/`, `/shipments`, `/rates`, `/workflows`, and admin settings.
- The host shell composes the feature packages directly from source:
  - `@atlas/dashboard/src/app/DashboardClient` for the shipments/dashboard experience
  - `@atlas/freight-comparer/src/index` for the rates module
  - `@atlas/bpmn-modeler/src/main` through `mountBPMNModeler()` inside `frontend/src/pages/Workflows.tsx`
- `packages/ui` is the shared design system and integration layer. It exports shared components plus the Firebase/Data Connect context (`FirebaseProvider`, `useFirebase`) and also re-exports `@atlas/shared`.
- `packages/shared` contains low-level reusable logic (DOM helpers, IndexedDB/db helpers, XML utilities, crypto, theme, schemas, i18n). Put non-visual cross-package utilities here first.
- `packages/dashboard` is a Next 16 preview app, but inside the monorepo it is also imported into the Vite host as a client component. Its local state is managed with Zustand and persisted to IndexedDB.
- `packages/bpmn-modeler` is not routed as a normal React subtree. The frontend renders a static HTML wrapper and then imperatively mounts the modeler into it; auth is inherited from the host app.
- Firebase Data Connect is the main typed data boundary. Packages link the generated SDK from the repository-level generated output instead of defining ad hoc query types in each package.

## Key conventions

- Prefer `pnpm --filter <workspace>` from the repo root over ad hoc commands inside package directories; the workspace is wired around pnpm + Turbo.
- Keep shared concerns in the right layer:
  - `@atlas/shared` for core utilities and schemas
  - `@atlas/ui` for reusable UI, hooks, theme helpers, and Firebase context
  - feature packages for module-specific screens and logic
- Do not hand-edit Data Connect generated code. Regenerate it with:

```bash
firebase init dataconnect
firebase dataconnect:sdk:generate
```

- The dashboard package has explicit AI guidance in `packages/dashboard/AGENTS.md` and `packages/dashboard/CLAUDE.md`: treat its Next.js version as non-standard and check `node_modules/next/dist/docs/` before making framework-specific changes.
- Preserve the CI permission baseline in `.github/workflows/ci.yml`: workflows are expected to keep `permissions: contents: read`.
