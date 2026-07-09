# ./scripts/maintenance/security-audit.ps1
Write-Host 'Running pnpm audit...' -ForegroundColor Cyan
pnpm audit --audit-level moderate
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Vulnerabilities found or audit failed.' -ForegroundColor Red
    exit 1
} else {
    Write-Host 'No moderate or higher vulnerabilities found.' -ForegroundColor Green
    exit 0
}
