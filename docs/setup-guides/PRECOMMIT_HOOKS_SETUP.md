# ✅ PRE-COMMIT HOOKS SETUP & VALIDATION

Your project already has Husky configured. Let's validate and optimize it.

---

## Current Status

Your project has:
- ✅ Husky installed (git hooks manager)
- ✅ lint-staged configured
- ✅ ESLint + Prettier configured
- ✅ TypeScript type checking

File locations:
- `.husky/` — Hook scripts
- `lint-staged` config in `package.json`

---

## What Happens on `git commit`

When you run `git commit`, these hooks execute automatically:

```
1. Pre-commit hook triggers
   ├─ Lint files with ESLint (auto-fix enabled)
   ├─ Format with Prettier
   └─ Check TypeScript types
   
2. If all pass → Commit succeeds ✓
3. If any fail → Commit blocked ✗ (fix errors, try again)
```

---

## Testing Pre-commit Hooks

### Scenario 1: Successful Commit

```bash
# 1. Create a valid change
echo "// valid code" >> src/app.ts

# 2. Stage it
git add src/app.ts

# 3. Commit
git commit -m "test: valid commit"

# Expected output:
# ✓ Linting... (auto-fixed)
# ✓ Formatting... (auto-applied)
# ✓ Type checking... (passed)
# [main abc1234] test: valid commit
#  1 file changed, 1 insertion(+)
```

### Scenario 2: Invalid Commit (Blocked)

```bash
# 1. Create invalid code
echo "const x: string = 123" >> src/app.ts

# 2. Stage it
git add src/app.ts

# 3. Try to commit
git commit -m "test: invalid commit"

# Expected output:
# ✗ TypeScript type checking failed
# × Type 'number' is not assignable to type 'string'
# [commit blocked - fix errors and try again]
```

Fix the error, then commit again.

### Scenario 3: Skip Hooks (Emergency Only)

```bash
git commit --no-verify -m "test: skip hooks"
```

⚠️ **Use ONLY in emergencies.** Normal workflow should not need this.

---

## Install/Reinstall Hooks

If hooks aren't working:

```bash
# Install Husky
pnpm prepare

# Verify hooks are installed
ls -la .husky/

# Should see:
# _/
# pre-commit
# pre-push (if configured)
```

---

## Customize Pre-commit Behavior

### Option 1: Make Hooks Stricter

Edit `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting
pnpm run eslint --max-warnings 0   # Fail on any warnings

# Run type checking  
pnpm run type-check

# Run tests (optional - makes commits slow)
# pnpm run test
```

### Option 2: Make Hooks Faster

Skip some checks for local development:

```bash
# Commit with type-check disabled
GIT_SKIP_TYPE_CHECK=1 git commit -m "..."

# Or skip all hooks entirely (not recommended)
git commit --no-verify -m "..."
```

### Option 3: Only Check Staged Files

Husky is already configured with `lint-staged` to only check changed files.

Current config in `package.json`:
```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix --no-warn-ignored",
    "prettier --write"
  ]
}
```

---

## Common Issues & Fixes

### Issue: "husky - skipping hooks"
```
Error: husky - skipping hooks
Reason: husky can't find .git directory
```

**Fix:**
```bash
pnpm prepare
```

---

### Issue: Hooks Run Very Slowly
```
Problem: Commit takes 30+ seconds
```

**Causes:**
1. Full project linting (not using lint-staged)
2. Running tests on every commit
3. Type checking entire project

**Fix:** Modify `.husky/pre-commit` to only check staged files

---

### Issue: ESLint Fix Not Working
```
Problem: Linting fails but doesn't auto-fix
```

**Fix:** Check ESLint config in `eslint.config.js`

---

## Full Workflow Validation

Run this entire sequence to validate everything:

```bash
# 1. Verify Husky is installed
pnpm prepare

# 2. Create a test branch
git checkout -b test/hooks-validation

# 3. Make a valid change
echo "// test" >> src/test.ts

# 4. Stage it
git add src/test.ts

# 5. Commit (hooks should run)
git commit -m "test: validate hooks"

# 6. Verify success
git log --oneline | head -1
# Should show: test: validate hooks

# 7. Clean up
git checkout main
git branch -D test/hooks-validation
```

---

## Measuring Hook Performance

```bash
# Time your commit process
time git commit -m "test: measure hooks"

# Output example:
# ✓ ESLint... 2.3s
# ✓ Prettier... 0.8s
# ✓ Type check... 4.1s
# Total: 7.2s
# real    0m7.234s
```

**Expected:** < 10 seconds total

If slower, optimize by:
1. Only linting changed files (already done)
2. Removing test-on-commit
3. Using cached type checking

---

## Pre-push Hooks (Optional)

If you want additional checks before pushing:

Create `.husky/pre-push`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run full test suite before push
pnpm run test

# Run type checking on entire project
pnpm run type-check

# Run linting on entire project
pnpm run lint
```

Then enable:
```bash
husky install
husky add .husky/pre-push "$YOUR_SCRIPT"
```

---

## CI/CD Integration

Your GitHub Actions already run:
- ✅ ESLint
- ✅ Type checking
- ✅ Tests

**Pro tip:** If CI catches issues that local hooks missed, make hooks stricter locally.

---

## Team Standards

Document for your team:

```
PRE-COMMIT CHECKLIST:

✓ Code must pass ESLint
✓ Code must be formatted with Prettier
✓ TypeScript types must be valid
✓ No console.log in production code
✓ No unused imports
✓ Comments for complex logic

If commit is blocked:
1. Read the error message
2. Fix the issue
3. Stage changes: git add .
4. Commit again: git commit -m "..."

Emergency bypass (last resort):
git commit --no-verify -m "..."
```

---

## Validation Checklist

- [ ] Husky is installed (`ls .husky/pre-commit`)
- [ ] `pnpm prepare` works without errors
- [ ] Committing valid code succeeds
- [ ] Committing invalid code fails
- [ ] ESLint auto-fixes work
- [ ] Prettier auto-formats work
- [ ] Type checking catches errors
- [ ] Commit takes < 10 seconds
- [ ] Team understands the workflow

---

## Quick Commands

```bash
# Test hooks
pnpm prepare

# Skip hooks (emergency)
git commit --no-verify -m "..."

# Reinstall hooks
rm -rf .husky && pnpm prepare

# View hook logs
cat .husky/pre-commit

# Disable hooks temporarily
husky uninstall

# Re-enable hooks
husky install
```

---

**Your pre-commit hooks are already well configured. No changes needed unless you want to add stricter checks.**
