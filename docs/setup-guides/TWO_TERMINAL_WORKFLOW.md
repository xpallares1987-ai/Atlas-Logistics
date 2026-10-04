# 🖥️ TWO-TERMINAL WORKFLOW — ATLAS LOGISTICS

The most efficient development workflow uses TWO terminal windows simultaneously.

---

## 📋 Overview

```
TERMINAL 1 (Primary)        TERMINAL 2 (Secondary)
├── pnpm dev                ├── Database commands
├── Redux + Backend running │   pnpm db:inspect
├── Frontend running        │   pnpm db:migrate
└── Shows all logs          │   pnpm db:seed
                            │
                            ├── Git commands
                            │   git commit
                            │   git push
                            │
                            ├── Test commands
                            │   pnpm test
                            │   pnpm lint
                            │
                            └── Build commands
                                pnpm build
```

---

## 🚀 Starting the Workflow

### Step 1: Open Terminal 1 (Primary Development)

```bash
# Navigate to project (if not already there)
cd C:\Users\xpall\Source\Atlas-Logistics

# Start development (this terminal will be BUSY)
pnpm dev

# Output:
# [REDIS]   ✓ Container started (redis:7.2-alpine)
# [BACKEND] ✓ Fastify listening on http://0.0.0.0:3001
# [MFE]     ✓ Ready on http://localhost:5173

# Leave this running ✓ DO NOT close or interrupt
# Ctrl+C will stop everything
```

**What Terminal 1 does:**
- Starts Redis Docker container
- Starts Fastify backend server
- Starts Vite frontend dev server
- Watches for file changes
- Auto-reloads on changes

### Step 2: Open Terminal 2 (Secondary Commands)

```bash
# In a NEW terminal window (don't kill Terminal 1!)
cd C:\Users\xpall\Source\Atlas-Logistics

# Now you can run commands here while Terminal 1 keeps dev running
```

**What Terminal 2 is for:**
- Database operations
- Git commands
- Running tests
- Building projects
- Linting code
- Everything that doesn't need to stay running

---

## 📝 Common Terminal 2 Commands

### Database Operations

```bash
# Explore database visually
pnpm db:inspect
# Opens Drizzle Studio UI at http://localhost:5173/dui/

# Run migrations (after schema changes)
pnpm db:migrate

# Populate test data
pnpm db:seed

# Reset everything
pnpm db:reset-and-seed

# Generate migration files from schema
pnpm db:generate
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run specific test file
pnpm test -- src/tests/specific.test.ts
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type checking
pnpm type-check

# All together
pnpm lint && pnpm type-check && pnpm test
```

### Git Operations

```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "feat: description"

# Push
git push

# View history
git log --oneline | head -20
```

### Build Operations

```bash
# Build for production
pnpm build

# Clean build cache
pnpm clean:cache

# Backup database
pnpm backup-db
```

---

## ⏱️ Time-Saving Tips

### Tip 1: Run Multiple Commands in Sequence

```bash
# In Terminal 2, run them back-to-back
pnpm lint && pnpm type-check && pnpm test

# If first command fails, others won't run
# So you know exactly where the problem is
```

### Tip 2: Watch for Changes (Bonus Terminal)

```bash
# Optional Terminal 3 (if you want to monitor something)
# For example, watch database file size
watch -n 1 'ls -lh atlas-erp-v2.db'

# Or monitor Docker memory
watch -n 2 'docker stats --no-stream'
```

### Tip 3: Keep Notes in Terminal

```bash
# In Terminal 2, create a TODO
cat > SESSION_NOTES.md << 'EOF'
# Today's TODOs

## Done
- [x] Fixed bug in auth endpoint
- [x] Added new component

## In Progress
- [ ] Implement dashboard

## Next
- [ ] Write tests for dashboard
EOF

# Edit with favorite editor
code SESSION_NOTES.md
```

### Tip 4: Quick Copy/Paste Commands

Keep a file with commands you use frequently:

```bash
# Create shortcuts file
cat > TERMINAL_SHORTCUTS.txt << 'EOF'
# Copy these and paste into Terminal 2 as needed

# Quick test & commit
pnpm lint && pnpm type-check && pnpm test && git add . && git commit -m "test: "

# Full validation
pnpm lint && pnpm type-check && pnpm test && pnpm build

# Database reset
pnpm db:reset-and-seed

# Monitor
docker stats atlas-redis-dev --no-stream
EOF
```

---

## 🔍 Monitoring Both Terminals

### Terminal 1 Shows:
- ✓ Redis container status
- ✓ Fastify server logs
- ✓ Frontend build logs
- ✓ Hot reload notifications
- ✓ Any runtime errors

### Terminal 2 Shows:
- ✓ Command output
- ✓ Test results
- ✓ Lint warnings/errors
- ✓ Build progress
- ✓ Git operations

---

## 📊 Workflow Pattern

### Morning (8:00 AM)

```bash
# Terminal 1
pnpm dev
# Keep running all day

# Terminal 2
pnpm db:inspect
# Visual check of data
# (Close when done)
```

### Throughout Day (Multiple times)

```bash
# Terminal 2
# Edit code in VS Code
# (Terminal 1 auto-reloads)

# Terminal 2 - Before committing
pnpm lint
pnpm type-check
pnpm test

# Terminal 2 - If all pass
git add .
git commit -m "feat: description"
git push
```

### Afternoon (3:00 PM)

```bash
# Terminal 2
# Before wrapping up
pnpm test              # Verify tests pass
pnpm build             # Verify build works
pnpm backup-db         # Backup database

# Terminal 2 - End of day
pnpm dev:stop          # Or Ctrl+C in Terminal 1
git status             # Verify all committed
```

---

## 🎯 Efficiency Metrics

### Without Two-Terminal Workflow
- Restart dev for every test: 8s + 2s overhead = 10s
- Restart dev for each command: 10s × 5 commands = 50s overhead per hour
- Total lost time: ~1 hour per day

### With Two-Terminal Workflow
- No restarts needed
- Commands run in parallel with dev
- Zero overhead
- **30+ minutes saved per day**

---

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: Closing Terminal 1
```bash
# WRONG - This stops development!
[Terminal 1] CTRL+C   # Now frontend/backend/redis stop
# Everything frozen
```

**Fix:** Always keep Terminal 1 running. Use CTRL+C only to intentionally stop.

---

### ❌ Mistake 2: Running Commands in Wrong Terminal

```bash
# WRONG - Running dev in Terminal 2
[Terminal 2] pnpm dev     # Terminal 2 is now busy, can't use it
```

**Fix:** Terminal 1 = `pnpm dev` only. Terminal 2 = everything else.

---

### ❌ Mistake 3: Ignoring Terminal 1 Errors

```bash
# WRONG - Error appears in Terminal 1, but ignored
[Terminal 1] Error: Cannot connect to Redis
# You keep working, but queues don't work
```

**Fix:** Always glance at Terminal 1 occasionally. Check logs if something seems wrong.

---

### ❌ Mistake 4: Forgetting Port Conflicts

```bash
# WRONG - Running pnpm dev in Terminal 1, then Terminal 2:
[Terminal 2] pnpm build     # Tries to bind ports
# Error: Port 3001 already in use
```

**Fix:** Only one `pnpm dev` across all terminals. Know what each command does.

---

## 🆘 Troubleshooting

### Issue: Terminal 1 hangs during startup

```bash
# Check if ports are in use
netstat -ano | findstr :3001
netstat -ano | findstr :5173
netstat -ano | findstr :6379

# Kill the process if needed
taskkill /PID <PID> /F

# Restart Terminal 1
pnpm dev:stop
pnpm dev
```

### Issue: Redis won't start

```bash
# Terminal 2
docker compose up redis --remove-orphans

# Or restart entirely
pnpm dev:stop
pnpm dev
```

### Issue: Code changes not reloading in Terminal 1

```bash
# Check Terminal 1 logs for errors
# If hot reload hung:
# - Save file again
# - Or restart Terminal 1 (pnpm dev:stop then pnpm dev)
```

---

## 🎨 Pro Setup Tips

### Set Different Colors

Make terminals visually distinct:

- **Terminal 1 (Primary):** Blue background (dev running)
- **Terminal 2 (Secondary):** Green background (commands)

In Windows Terminal settings:
```json
{
  "profiles": {
    "PowerShell": {
      "backgroundColor": "#001a33"  // Dark blue
    }
  }
}
```

### Use Terminal Titles

```bash
# Terminal 1 - title it
# (Right-click tab → Rename tab)
# Rename to: "🚀 DEV (atlas-logistics)"

# Terminal 2 - title it  
# (Right-click tab → Rename tab)
# Rename to: "⚙️ COMMANDS (atlas-logistics)"
```

### Arrange Windows Side-by-Side

```
┌──────────────────────┬──────────────────────┐
│                      │                      │
│  Terminal 1 (Dev)    │  Terminal 2 (Cmds)   │
│                      │                      │
│ ✓ Redis running      │ $ pnpm db:inspect    │
│ ✓ Backend running    │                      │
│ ✓ Frontend running   │ (Command output)     │
│                      │                      │
│ [Logs stream...]     │                      │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

---

## ✅ Checklist: Set Up Two-Terminal Workflow

- [ ] Open Terminal 1
- [ ] Run `pnpm dev` in Terminal 1
- [ ] Open Terminal 2 (different window)
- [ ] Verify Terminal 1 still running
- [ ] Run a command in Terminal 2 (`pnpm lint`)
- [ ] Verify both still working
- [ ] Bookmark common Terminal 2 commands
- [ ] Practice for 1 hour
- [ ] Feel the productivity boost!

---

**Once you adopt this workflow, you'll never go back. It's the most efficient way to develop.**
