# Contributing to Atlas Logistics

Thank you for your interest in contributing to Atlas Logistics! As a monorepo project (Turborepo) with complex database and AI integrations, we have established the following guidelines to ensure project stability.

## Workflow (Git Flow)

1. **Branching**: Create a branch from `main` following the naming convention `type/short-description` (e.g., `feat/gemini-integration`, `fix/camunda-worker`).
2. **Commits**: We use `commitlint`. Make sure your messages follow [Conventional Commits](https://www.conventionalcommits.org/). For example: `feat(dashboard): add predictive ETA badge`.
3. **Pull Requests**: Open the PR against `main`. Your PR must pass all tests and the linter (`pnpm run lint`) in the GitHub Actions pipeline. **NOTE:** PRs will not be accepted if the Code Scanning pipeline (CodeQL or njsscan) reports vulnerabilities or open alerts.
4. **Testing**: We strongly recommend running `pnpm run test:e2e` locally to validate the super-app using **Playwright** before pushing.

## Monorepo Development

When working on the unified project, you can install dependencies directly into the Super-App folder or the desired package:

```bash
# Add a dependency to the main app:
pnpm add lucide-react --filter @atlas/frontend
```

### Database Modification Rules

- The database is managed by **Local SQLite** and **Drizzle ORM**.
- If you need to alter tables, edit the TypeScript schema files (e.g., in `src/db/schema.ts`).
- After making changes, you **MUST** push the schema directly to your local database:
  ```bash
  pnpm run db:push
  ```
- **Forbidden**: Do not use cloud database services or Firebase Data Connect. The architecture relies on `$0` cost infrastructure.
- **Data Seeding**: Bulk insertions must be performed using local scripts connecting directly to `atlas.db` via the libSQL driver (`@libsql/client`).

### Backend and AI Functions Rules

- Backend API logic is centralized locally in the Fastify application under `src/`.
- Ensure new API routes are secured via JWT and RBAC (`@fastify/jwt` in `auth.routes.ts`) before merging.
- Real-time updates should emit events to the WebSocket server (`ws://`) instead of long-polling.
- For **heavy or asynchronous processes**, use **BullMQ (AtlasEngine Workers)** instead of keeping the HTTP request waiting.
- For **Artificial Intelligence modules**, we centralize the logic in specialized services (like `geminiService.ts`). When creating new prompts, make sure to carefully document and sanitize inputs.
- Native Python dependencies required by the AI should be provided using Gemini's `code_execution` tool, not by adding complex dependencies to the Node.js runtime.

## Visual Style and Design

- Atlas Logistics uses a rigorous **Dark Premium Glassmorphism** style.
- Please use the global CSS tokens defined in `packages/frontend/src/index.css`. Do not overuse arbitrary colors; rely on semi-transparent backgrounds, subtle borders, and blur effects (`backdrop-blur`).
