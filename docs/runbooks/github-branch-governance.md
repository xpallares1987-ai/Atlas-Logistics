# GitHub Branch Protection & Ruleset Governance Runbook

> **Audience:** DevOps Engineers, Repository Administrators, System Operators  
> **Classification:** How-To Guide / Operational Runbook  
> **Diátaxis Quadrant:** How-To Guides (`docs/runbooks/`)  
> **Related Ruleset:** GitHub Repository Ruleset ID `26896465` (`Main Ruleset`)

---

## 1. Overview & Objective

This runbook documents the configuration, governance rules, and operational procedures for GitHub repository branch protection in the `xpallares1987-ai/Atlas-Logistics` monorepo.

To prevent unreviewed breaking changes, supply-chain tampering, and test regressions from entering the production codebase, the primary branch (`main`) is protected by GitHub Repository Rulesets (`Main Ruleset`).

---

## 2. Ruleset Architecture (`Main Ruleset`)

The ruleset enforces strict quality, security, and integrity gates before any ref can update `main`:

| Parameter | Configuration | Operational Utility |
| :--- | :--- | :--- |
| **Target Branch** | `~DEFAULT_BRANCH` (`refs/heads/main`) | Exclusively protects `main`; allows disposable feature/worktree branches. |
| **Enforcement Status** | `active` | Actively evaluates all pushes and pull request merge operations. |
| **Linear History** | `required_linear_history` | Eliminates merge commit clutter; ensures bisectable Git history. |
| **Deletion Lock** | `deletion` | Prevents accidental or malicious branch deletion of `main`. |
| **Non-Fast-Forward** | `non_fast_forward` | Prevents force pushes (`git push --force`) that rewrite Git history. |
| **Code Quality** | `severity: "errors"` | Fails pushes introducing syntax or compiler errors. |
| **Code Scanning** | CodeQL (`alerts_threshold: "errors"`, `security_alerts_threshold: "high_or_higher"`) | Blocks vulnerabilities flagged by GitHub CodeQL SAST scanning. |
| **Pull Request Gate** | `required_review_thread_resolution: true` | Requires all PR conversation threads to be resolved prior to merge. |

---

## 3. Required Status Checks & Code Scanning Gates

The following exact check runs and automated security scans must report a green (`success`) status before a merge into `main` can proceed:

1. **`Lint, Type Check, Build & Test (22)`**:
   - Executes ESLint, TypeScript compiler type-checking (`tsc --noEmit`), file-size audits (<1,000 lines per module), markdown link verification, and the complete Vitest test suite.
2. **`njsscan code scanning`**:
   - Executes Node.js SAST checks for security anti-patterns, regex DoS vulnerabilities, and insecure dependencies.
3. **`End-to-End Playwright Tests`**:
   - Executes headless browser E2E test scenarios across core frontend micro-modules.
4. **Native CodeQL Code Scanning Rule (`type: code_scanning`)**:
   - Evaluates GitHub CodeQL static analysis with `security_alerts_threshold: "high_or_higher"`. Enforced dynamically via GitHub Ruleset native code scanning integration rather than brittle string context matching, preventing pipeline deadlocks on non-code pull requests.

---

## 4. Administrative Bypass & Emergency Hotfixes

In accordance with repository guardrails:
- **Bypass Actors**: Repository Administrators (`RepositoryRole: Admin`, ID 5), Maintainers (`RepositoryRole: Maintain`, ID 4), and authorized deployment keys (`DeployKey`) maintain `bypass_mode: "always"`.
- **Purpose**:
  1. Permits authorized emergency hotfixes directly to `main` when CI runner infrastructure or third-party webhooks are impaired.
  2. Enables automated release pipelines and GitHub Actions bots to publish version tags, sync documentation mirrors, and update release notes without deadlocking.

> [!CAUTION]
> Direct pushes using administrative bypass MUST still pass all local verification routines (`pnpm run type-check`, `pnpm run check:file-sizes`, `pnpm run audit:leaks:staged`, Vitest suites) before pushing.

---

## 5. Atlas Project v2 Board Synchronization Automation

Pull request lifecycle events are synchronized automatically with the **Atlas Project** (Project #4: `https://github.com/users/xpallares1987-ai/projects/4`) via `.github/workflows/project-sync.yml`.

### 5.1. Workflow Lifecycle & State Transitions

| Pull Request Event | Project Board Transition | Trigger Action |
| :--- | :--- | :--- |
| `opened`, `reopened`, `ready_for_review` | `Status` -> **`In Progress`** | Idempotently adds card to Project #4 and updates status field. |
| `closed` (`merged: true`) | `Status` -> **`Done`** | Updates project card status field to Done upon successful merge. |
| `closed` (`merged: false`) | Unchanged | Leaves card status untouched for triage or post-mortem. |

### 5.2. Authentication & Permission Configuration

Because the project board is user-scoped (`users/xpallares1987-ai/projects/4`), the default repository `GITHUB_TOKEN` does not have write access to user-level Projects v2.

To enable automated synchronization:
1. Generate a GitHub Personal Access Token (Fine-Grained or Classic) with the `project` scope.
2. Add the token to repository secrets as `ATLAS_PROJECT_PAT` (`https://github.com/xpallares1987-ai/Atlas-Logistics/settings/secrets/actions`).
3. Alternatively, enable built-in native project workflows directly within GitHub Projects v2 settings at `https://github.com/users/xpallares1987-ai/projects/4/workflows`.

> [!NOTE]
> The workflow includes defensive handling: if `ATLAS_PROJECT_PAT` is not configured, the workflow emits a non-blocking informational notice and exits cleanly with code 0, ensuring pull request checks are never disrupted.

---

## 6. Inspection & Verification Procedures

To inspect or update the ruleset configuration, run the following GitHub CLI commands:

### 6.1. Inspect Active Ruleset Definition
```powershell
$env:GITHUB_TOKEN=""; gh api repos/xpallares1987-ai/Atlas-Logistics/rulesets/26896465
```

### 6.2. Test Branch Protection Enforcement
To test branch enforcement on a feature branch without affecting `main`:
```bash
git checkout -b test/governance-check
git commit --allow-empty -m "chore(test): test governance check"
git push origin test/governance-check
gh pr create --base main --head test/governance-check --title "test: governance verification" --body "Automated test"
```
Verify that required status checks are marked as mandatory on the pull request.

---

## 7. Revision History

- **2026-11-09**: Initial ruleset creation with CodeQL and build status check.
- **2026-11-14**: Hardened target branch to `~DEFAULT_BRANCH`; added native `code_scanning` evaluation, `njsscan code scanning`, and `End-to-End Playwright Tests` to mandatory status checks; added pull request thread resolution requirement; provisioned Atlas Project v2 automated board sync workflow (`.github/workflows/project-sync.yml`).
