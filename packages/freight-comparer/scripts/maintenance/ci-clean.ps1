# ./scripts/maintenance/ci-clean.ps1
param([string]$Action)

if ($Action -eq "purge") {
    Write-Host "Purging node_modules and lockfile..."
    Remove-Item -Recurse -Force -Path .\node_modules -ErrorAction SilentlyContinue
    Remove-Item -Force -Path .\pnpm-lock.yaml -ErrorAction SilentlyContinue
} elseif ($Action -eq "clear-cache") {
    Write-Host "Clearing pnpm store..."
    pnpm store prune
} else {
    Write-Host "Usage: .\scripts\maintenance\ci-clean.ps1 [purge|clear-cache]"
}
