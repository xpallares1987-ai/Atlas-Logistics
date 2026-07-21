# Copilot instructions for Atlas-Logistics

## Repository scope

This repository root is `C:\Users\xpall\Source\Atlas-Logistics`. An SCM based super App `pnpm` workspaces and Turborepo.

## Build, test, lint, and install commands

Run these from the repository root:

```bash
pnpm install
pnpm run build
pnpm run test
pnpm run lint
```

For focused testing, most real application code currently lives in `Atlas-Logistics`, so run single tests there:

```bash
cd Atlas-Logistics
pnpm --filter @atlas/shared test -- src/crypto.test.ts
pnpm --filter @atlas/dashboard exec vitest run src/app/dashboard.test.ts
pnpm --filter @atlas/dashboard exec playwright test tests/e2e/logistics.spec.ts
```

Important command quirks:

- Root CI in `.github/workflows/ci.yml` installs dependencies at both the meta-repo root and inside `Atlas-Logistics`.
- `.github/workflows/ci.yml` references `pnpm run coverage:check`, but the root `package.json` does not currently define that script.
- The `Atlas-Logistics/package.json` `test` script still targets `@torre/shared`, so package-level test commands are more reliable there than `pnpm test`.

## High-level architecture

- The root repo is an orchestration layer, not the main product app. `pnpm-workspace.yaml` registers five top-level workspaces: `BPMN-Modeler`, `Freight-Comparer`, `Shipment-Dashboard`, `Atlas-Logistics`, and `Control-Tower-UI`.
- Those top-level folders are also Git submodule mount points defined in `.gitmodules`. If a folder looks empty, assume the submodule is not populated rather than that the project does not exist.
- `turbo.json` coordinates cross-project tasks from the root and makes the four application builds depend on `@xpallares1987-ai/control-tower-ui#build`.
- In the current checkout, `Atlas-Logistics` is the populated application codebase. It is itself a nested monorepo containing the active frontend shell plus the logistics modules.
- Inside `Atlas-Logistics`, the host app is `@atlas/frontend`; it composes `@atlas/dashboard`, `@atlas/freight-comparer`, `@atlas/bpmn-modeler`, `@atlas/ui`, and `@atlas/shared`.

## Key conventions

- Treat root-level changes as workspace-orchestration work: Turborepo config, CI, docs, submodule wiring, and shared repository policy.
- Treat feature and product-code changes as `Atlas-Logistics` work unless the task clearly targets another initialized top-level submodule.
- Use the root docs together: `README.md` describes the meta-repo, while `GEMINI.md` captures the current strategic direction that most active development has consolidated into `Atlas-Logistics`.
- When you work inside `Atlas-Logistics`, also consult `Atlas-Logistics/.github/copilot-instructions.md` for package-level commands and architecture details.
- Preserve the existing repo conventions from `CONTRIBUTING.md`: Node 20, pnpm 10+, and Conventional Commits.
