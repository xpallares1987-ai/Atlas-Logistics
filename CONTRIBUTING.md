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
- The database is managed by **Firebase Data Connect** to Google Cloud SQL.
- If you need to alter tables, edit the `.gql` files in the `dataconnect/` folder.
- After making changes, you **MUST** regenerate the client SDK for TypeScript to catch errors and deploy:
  ```bash
  npx firebase dataconnect:sdk:generate
  npx firebase deploy --only dataconnect
  ```
- **Forbidden**: Do not manually edit any files within the generated dataconnect folders.
- **Data Seeding**: Bulk insertions must be performed using scripts invoking secure mutations. If the schema uses strict directives (`@auth(level: USER)`), make sure to test your scripts against the authenticated environment or change permissions to `PUBLIC` exclusively during automated maintenance operations and revert them immediately.

### Backend and AI Functions Rules
- Backend code is located in `functions/src`.
- For **heavy or asynchronous processes**, use *Cloud Tasks* (`onTaskDispatched`) instead of keeping the HTTP request waiting. (See `erp.ts` as an example).
- For **Artificial Intelligence modules**, we centralize the logic in `gemini.ts`. When creating new prompts, make sure to carefully document and sanitize inputs (especially if SQL queries are built).
- Native Python dependencies required by the AI should be provided using Gemini's `code_execution` tool, not by adding complex dependencies to the Node.js runtime.

## Visual Style and Design
- Atlas Logistics uses a rigorous **Dark Premium Glassmorphism** style.
- Please use the global CSS tokens defined in `packages/frontend/src/index.css`. Do not overuse arbitrary colors; rely on semi-transparent backgrounds, subtle borders, and blur effects (`backdrop-blur`).