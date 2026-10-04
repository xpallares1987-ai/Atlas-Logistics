# 🔧 MY CUSTOM SETUP — ATLAS LOGISTICS

**Last Updated:** [DATE]
**By:** [YOUR NAME]

> This file documents YOUR personal development environment customizations.
> DO NOT COMMIT to git. Keep locally only.
> Create: `cp CUSTOM_SETUP_TEMPLATE.md CUSTOM_SETUP.md`

---

## 🖥️ System Information

- **OS:** Windows 11 / macOS / Linux
- **Docker:** v[VERSION]
- **Node.js:** v[VERSION]
- **pnpm:** v[VERSION]
- **VS Code:** v[VERSION]

---

## 🔌 Port Customizations

If you've changed default ports:

| Service | Default | Your Port | Reason |
|---------|---------|-----------|--------|
| Fastify | 3001 | 3001 | Standard |
| Frontend | 5173 | 5173 | Standard |
| Redis | 6379 | 6379 | Standard |
| Prometheus | 9090 | 9090 | Standard |
| Grafana | 3002 | 3002 | Standard |

---

## 🗄️ Database Customizations

```bash
# Database location
DATABASE_URL=file:./atlas-erp-v2.db

# Backup location (if automated)
BACKUP_DIR=/backups

# Auto-seed on start? (yes/no)
AUTO_SEED=no
```

---

## 🐳 Docker Customizations

```bash
# Using custom Docker network?
DOCKER_NETWORK=atlas-network

# Custom Redis image/version?
REDIS_IMAGE=redis:7.2-alpine

# Custom resource limits?
REDIS_MEMORY=512m

# Running Docker on different socket?
DOCKER_SOCKET=/var/run/docker.sock
```

---

## 📦 Environment Variables

List any additional .env variables you're using (DO NOT include secrets):

```bash
# Example:
DEBUG=atlas:*
LOG_LEVEL=debug
ENABLE_PROFILING=false
```

---

## 📊 Development Workflow

Describe your typical daily workflow:

```
1. [8:00 AM] Open two terminals
   - Terminal 1: pnpm dev
   - Terminal 2: file browser + commands

2. [Throughout day]
   - Edit React components (HMR auto-updates)
   - Edit Fastify endpoints (auto-restarts)
   - Monitor http://localhost:5173

3. [Before commit]
   - pnpm lint
   - pnpm test
   - pnpm type-check

4. [End of day]
   - pnpm dev:stop
   - git push
```

---

## 🎯 Aliases & Shortcuts

If you've created terminal aliases:

```bash
# Example ~/.bashrc or ~/.zshrc additions:
alias dev="cd ~/Source/Atlas-Logistics && pnpm dev"
alias atlas-lint="pnpm lint"
alias atlas-test="pnpm test"
```

Or PowerShell profile:
```powershell
# Example in $PROFILE
function dev { cd C:\Users\xpall\Source\Atlas-Logistics; pnpm dev }
function atlas-lint { pnpm lint }
```

---

## 🔧 VS Code Extensions

Extensions you're using (beyond the recommended ones):

```
- GitHub Copilot
- Thunder Client (API testing)
- Better Comments
- Git Graph
- Docker
```

---

## 🔐 Security Customizations

Any local security settings:

```bash
# Firewall rules for ports?
Firewall: Port 3001 (local only)

# Custom .env.local location?
Location: C:\Users\xpall\Source\Atlas-Logistics\.env.local

# Secrets stored elsewhere?
Secrets Location: [Where do you store them?]
```

---

## 📝 Custom Scripts

If you've added scripts to package.json:

```bash
# Example:
pnpm my-custom:build    # Does [something]
pnpm my-custom:deploy   # Does [something]
```

---

## 🐛 Known Issues & Workarounds

Document any quirks you've discovered:

```
Issue: Redis takes 30s to start on Windows
Workaround: Run Docker Desktop first, wait 2min, then pnpm dev

Issue: TypeScript intellisense slow in VS Code
Workaround: Restart TS server: Cmd+Shift+P > TypeScript: Restart TS Server

Issue: HMR not working on React components
Workaround: Check if src/app.tsx is modified, restart pnpm dev
```

---

## 📈 Performance Baseline

Your personal machine's baseline:

```
Startup time:           8 seconds
Memory idle:            250 MB
Memory after 1 hour:    280 MB (stable)
API response avg:       23 ms
HMR latency:            350 ms
Bundle size:            ~2.4 MB

Last measured: [DATE]
```

---

## 🔄 Backup Strategy

How you back up your work:

```bash
# Automated backup?
Frequency: Manual only / Daily

# Backup location?
Local: C:\Users\xpall\Backups\
Cloud: OneDrive / Google Drive / GitHub

# Database backups?
pnpm backup-db  →  /backups/atlas-erp-v2-2024-10-02.db
```

---

## 🚀 Deployment Notes

When deploying from this machine:

```bash
# Pre-deployment checklist
□ Run pnpm test
□ Run pnpm type-check
□ Run pnpm lint
□ Update CHANGELOG.md
□ Create git tag

# Deployment commands
pnpm build
docker build -t atlas-logistics:latest .
docker push [registry]/atlas-logistics:latest
```

---

## 📞 Useful Contacts

```
Team Slack: #atlas-logistics
Project Lead: [Name]
DevOps: [Name]
Database Admin: [Name]
```

---

## 📚 Additional Resources

Links specific to YOUR setup:

```
- Team Wiki: [URL]
- Architecture Docs: [URL]
- API Reference: [URL]
- Database Schema: [URL]
```

---

## ✅ Setup Validation Checklist

Before starting development, verify:

- [ ] Docker Desktop is running
- [ ] `pnpm dev:minimal` starts in < 10 seconds
- [ ] Frontend loads at http://localhost:5173
- [ ] Backend API loads at http://localhost:3001/docs
- [ ] Database exists (atlas-erp-v2.db)
- [ ] All env vars are set in .env.local
- [ ] SSH key is configured for git
- [ ] VPN is connected (if needed)

---

## 🔄 Maintenance Log

Track what you've done to optimize your setup:

```
Date       | What I Did | Impact | Status
-----------|-----------|--------|-------
2024-10-02 | Added VS Code debugger | Easier breakpoints | ✓ Done
(Future)   | [Customization]        | [Improvement]    | [Status]
```

---

## 💾 Saving This File

To save your custom setup WITHOUT committing to git:

```bash
# 1. Create your custom setup file
cp CUSTOM_SETUP_TEMPLATE.md CUSTOM_SETUP.md

# 2. Fill it with YOUR customizations

# 3. Add to .gitignore (already there)
grep "CUSTOM_SETUP" .gitignore  # Should exist

# 4. Save locally only
# (This file will never be committed)
```

---

## 🎯 Remember

- This is YOUR personal documentation
- It's not shared with the team
- Update it when you change things
- Use it as a reference for onboarding new team members
- Share helpful parts with the team (create PRs for improvements)

---

**Last Sync:** [DATE]
**Next Review:** [DATE]
