# ==============================================================================
# ATLAS LOGISTICS — SETUP VERIFICATION (Windows PowerShell)
# ==============================================================================
# Usage: .\setup-verify.ps1 (can be run from any working directory)
# ==============================================================================

param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
)

Write-Host "🔍 Verifying Atlas Logistics Local Development Setup..." -ForegroundColor Cyan
Write-Host "📁 Project root: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

$checksPass = 0
$checksFail = 0

function Check-File {
    param($relPath, $description)
    $fullPath = Join-Path $ProjectRoot $relPath
    if (Test-Path $fullPath) {
        Write-Host "✓ $description ($relPath)" -ForegroundColor Green
        $global:checksPass++
    } else {
        Write-Host "✗ $description ($relPath) — MISSING" -ForegroundColor Red
        $global:checksFail++
    }
}

function Check-Command {
    param($cmd, $description)
    try {
        $version = & $cmd --version 2>$null | Select-Object -First 1
        if ($version) {
            Write-Host "✓ $description ($version)" -ForegroundColor Green
            $global:checksPass++
        } else {
            Write-Host "✗ $description — NOT INSTALLED" -ForegroundColor Red
            $global:checksFail++
        }
    } catch {
        Write-Host "✗ $description — NOT INSTALLED" -ForegroundColor Red
        $global:checksFail++
    }
}

# Check system dependencies
Write-Host "📦 Checking System Dependencies..." -ForegroundColor Yellow
Check-Command "node" "Node.js"
Check-Command "pnpm" "pnpm (Package Manager)"
Check-Command "docker" "Docker"
Write-Host ""

# Check project files
Write-Host "📄 Checking Project Files..." -ForegroundColor Yellow
Check-File "docker-compose.yml" "Docker Compose Configuration"
Check-File ".env.local" "Local Environment Variables"
Check-File "package.json" "Package Configuration"
Check-File "drizzle.config.ts" "Drizzle ORM Configuration"
Check-File "src/server.ts" "Backend Server"
Check-File "src/worker-node.ts" "Worker Node"
Write-Host ""

# Check Node modules
Write-Host "📚 Checking Node Dependencies..." -ForegroundColor Yellow
$nodeModulesPath = Join-Path $ProjectRoot "node_modules"
if (Test-Path $nodeModulesPath) {
    Write-Host "✓ Node modules installed" -ForegroundColor Green
    $checksPass++
} else {
    Write-Host "✗ Node modules NOT installed — Run: pnpm install" -ForegroundColor Red
    $checksFail++
}
Write-Host ""

# Check environment
Write-Host "⚙️  Checking Environment Configuration..." -ForegroundColor Yellow
$envLocalPath = Join-Path $ProjectRoot ".env.local"
if (Test-Path $envLocalPath) {
    Write-Host "✓ .env.local exists" -ForegroundColor Green
    $checksPass++
    $envContent = Get-Content $envLocalPath
    if ($envContent -match "NODE_ENV") {
        Write-Host "✓ NODE_ENV configured" -ForegroundColor Green
        $checksPass++
    }
    if ($envContent -match "DATABASE_URL") {
        Write-Host "✓ DATABASE_URL configured" -ForegroundColor Green
        $checksPass++
    }
} else {
    Write-Host "⚠ .env.local NOT FOUND — Copy from: cp .env.local.example .env.local" -ForegroundColor Yellow
}
Write-Host ""

# Check Docker
Write-Host "🐳 Checking Docker Setup..." -ForegroundColor Yellow
try {
    $null = & docker ps 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker daemon is running" -ForegroundColor Green
        $checksPass++
    } else {
        Write-Host "⚠ Docker daemon is not responding or running" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Docker daemon check bypassed" -ForegroundColor Yellow
}
Write-Host ""

# Available scripts
Write-Host "🚀 Available Development Scripts:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Standard (recommended):" -ForegroundColor Cyan
Write-Host "    pnpm dev                  — Starts backend + frontend + Redis"
Write-Host "    pnpm dev:minimal         — Starts backend + frontend only (no Docker)"
Write-Host "    pnpm dev:observability   — Starts all + Prometheus + Grafana"
Write-Host ""
Write-Host "  Database:" -ForegroundColor Cyan
Write-Host "    pnpm db:migrate         — Run migrations"
Write-Host "    pnpm db:seed            — Populate test data"
Write-Host "    pnpm db:reset-and-seed  — Full reset"
Write-Host "    pnpm db:inspect         — Open Drizzle Studio (UI)"
Write-Host "    pnpm backup-db          — Consistent SQLite WAL snapshot + .env backup"
Write-Host ""
Write-Host "  Management:" -ForegroundColor Cyan
Write-Host "    pnpm dev:stop           — Stop all containers"
Write-Host "    pnpm dev:redis:only     — Start only Redis"
Write-Host "    pnpm lint               — Run ESLint"
Write-Host "    pnpm test               — Run tests"
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Checks passed:  $checksPass" -ForegroundColor Green
if ($checksFail -gt 0) {
    Write-Host "Checks failed:  $checksFail" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Some checks failed. Please fix the issues above." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "Checks failed:  0" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Your Atlas Logistics development environment is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Install dependencies:     pnpm install" -ForegroundColor Gray
    Write-Host "  2. Run migrations:           pnpm db:migrate" -ForegroundColor Gray
    Write-Host "  3. Seed data:                pnpm db:seed" -ForegroundColor Gray
    Write-Host "  4. Start development:        pnpm dev" -ForegroundColor Gray
    Write-Host ""
    exit 0
}
