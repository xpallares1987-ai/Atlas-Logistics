#!/usr/bin/env pwsh
# ==============================================================================
# ATLAS LOGISTICS — QUICK START GUIDE (Windows)
# ==============================================================================

Write-Host "
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║   🚀 ATLAS LOGISTICS — QUICK START (Personal Development Optimized)   ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Step 1: Environment
Write-Host "📋 STEP 1: Environment Configuration" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
if (Test-Path ".env.local") {
    Write-Host "✓ .env.local exists" -ForegroundColor Green
    $envContent = Get-Content ".env.local"
    if ($envContent -match "DATABASE_URL=file:") {
        Write-Host "✓ Using SQLite (correct)" -ForegroundColor Green
    }
    if ($envContent -match "NODE_ENV=development") {
        Write-Host "✓ Development mode" -ForegroundColor Green
    }
} else {
    Write-Host "✗ .env.local missing" -ForegroundColor Red
    Write-Host "  → Create from template: copy .env.local.example .env.local" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Dependencies
Write-Host "📚 STEP 2: Node Dependencies" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
if (Test-Path "node_modules") {
    Write-Host "✓ Node modules installed" -ForegroundColor Green
    $packageCount = (Get-ChildItem "node_modules/.bin" -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host "  → $packageCount executable packages" -ForegroundColor Gray
} else {
    Write-Host "⚠ Node modules NOT installed" -ForegroundColor Yellow
    Write-Host "  → Run: pnpm install" -ForegroundColor Cyan
}
Write-Host ""

# Step 3: Database
Write-Host "🗄️  STEP 3: Database Setup" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
if (Test-Path "atlas-erp-v2.db") {
    $dbSize = (Get-Item "atlas-erp-v2.db").Length / 1MB
    Write-Host "✓ Development database exists (atlas-erp-v2.db)" -ForegroundColor Green
    Write-Host "  → Size: $([Math]::Round($dbSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "⚠ Development database NOT found" -ForegroundColor Yellow
    Write-Host "  → Will be created on first migration: pnpm db:migrate" -ForegroundColor Cyan
}
Write-Host ""

# Step 4: Docker
Write-Host "🐳 STEP 4: Docker Setup" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
try {
    $null = & docker ps 2>$null
    Write-Host "✓ Docker daemon is running" -ForegroundColor Green
    try {
        $version = & docker --version
        Write-Host "  → $version" -ForegroundColor Gray
    } catch {}
} catch {
    Write-Host "✗ Docker daemon NOT running" -ForegroundColor Red
    Write-Host "  → Start Docker Desktop and try again" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Available Ports
Write-Host "🔌 STEP 5: Ports Configuration" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  Backend:    http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Frontend:   http://localhost:5173 (dev) | http://localhost:3000 (SSR)" -ForegroundColor Cyan
Write-Host "  BullMQ:     http://localhost:3001/bull-board" -ForegroundColor Cyan
Write-Host "  Swagger:    http://localhost:3001/docs" -ForegroundColor Cyan
Write-Host "  Metrics:    http://localhost:3001/metrics" -ForegroundColor Cyan
Write-Host "  Redis:      localhost:6379 (in Docker)" -ForegroundColor Cyan
Write-Host ""

# Available Scripts
Write-Host "🎯 STEP 6: Next Commands" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  For first-time setup:" -ForegroundColor Cyan
Write-Host "    pnpm install            # Install dependencies" -ForegroundColor Gray
Write-Host "    pnpm db:migrate         # Run migrations" -ForegroundColor Gray
Write-Host "    pnpm db:seed            # Populate test data" -ForegroundColor Gray
Write-Host ""
Write-Host "  For daily development:" -ForegroundColor Cyan
Write-Host "    pnpm dev                # Start Redis + Backend + Frontend (RECOMMENDED)" -ForegroundColor Green
Write-Host "    pnpm dev:minimal        # Start Backend + Frontend only (fast)" -ForegroundColor Gray
Write-Host "    pnpm dev:observability  # Start all + Prometheus + Grafana (debugging)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Database utilities:" -ForegroundColor Cyan
Write-Host "    pnpm db:inspect         # Open Drizzle Studio (visual explorer)" -ForegroundColor Gray
Write-Host "    pnpm db:reset-and-seed  # Reset everything" -ForegroundColor Gray
Write-Host ""
Write-Host "  Stop everything:" -ForegroundColor Cyan
Write-Host "    pnpm dev:stop           # Stop all containers" -ForegroundColor Gray
Write-Host ""

# Quick Reference
Write-Host "📌 QUICK REFERENCE" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Development Modes:" -ForegroundColor Cyan
Write-Host "  • pnpm dev:minimal        ← Fast (no Docker)" -ForegroundColor Gray
Write-Host "  • pnpm dev               ← Standard (Redis) - USE THIS MOST" -ForegroundColor Green
Write-Host "  • pnpm dev:observability  ← Full stack (with metrics)" -ForegroundColor Gray
Write-Host ""
Write-Host "Database:" -ForegroundColor Cyan
Write-Host "  • Using: SQLite locally (atlas-erp-v2.db)" -ForegroundColor Gray
Write-Host "  • No PostgreSQL needed for development" -ForegroundColor Gray
Write-Host "  • Explore UI: pnpm db:inspect" -ForegroundColor Gray
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Cyan
Write-Host "  • Port conflict? Check QUICK_COMMANDS.md" -ForegroundColor Gray
Write-Host "  • DB migration fails? Run: pnpm db:reset-and-seed" -ForegroundColor Gray
Write-Host "  • Redis won't start? Run: docker compose up redis --remove-orphans" -ForegroundColor Gray
Write-Host ""

# Files Created
Write-Host "📚 DOCUMENTATION CREATED" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  DEV_SETUP.md              ← Complete setup guide (3 modes)" -ForegroundColor Gray
Write-Host "  QUICK_COMMANDS.md         ← Command reference" -ForegroundColor Gray
Write-Host "  ARCHITECTURE_SIMPLIFIED.md ← Diagrams & architecture" -ForegroundColor Gray
Write-Host "  RECOMMENDED_DOCKER_SETUP.md ← Detailed explanation" -ForegroundColor Gray
Write-Host "  setup-verify.ps1          ← Verification script (Windows)" -ForegroundColor Gray
Write-Host ""

# Final Status
Write-Host "════════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "🚀 YOU'RE READY TO START!" -ForegroundColor Green
Write-Host ""
Write-Host "Just run:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    pnpm dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "This will:" -ForegroundColor Gray
Write-Host "  • Start Redis in Docker" -ForegroundColor Gray
Write-Host "  • Start Fastify backend (:3001)" -ForegroundColor Gray
Write-Host "  • Start React frontend (:5173)" -ForegroundColor Gray
Write-Host "  • Enable hot reload for all changes" -ForegroundColor Gray
Write-Host ""
Write-Host "Questions? Check the documentation files above ⬆️" -ForegroundColor Gray
Write-Host ""
