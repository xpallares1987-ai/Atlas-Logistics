# ============================================================================
# ATLAS LOGISTICS BACKUP SCRIPT - Windows PowerShell
# Purpose: Automated consistent SQLite database + .env backup
# Run: Via Task Scheduler (recommended) or manually
# ============================================================================

param(
    [string]$SourcePath = (Resolve-Path "$PSScriptRoot\..").Path,
    [string]$BackupDestination = $env:ATLAS_BACKUP_DIR,
    [int]$MaxBackupsToKeep = 14,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

function Log {
    param([string]$Message, [switch]$Error = $false)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    if ($Error) {
        Write-Host $LogMessage -ForegroundColor Red
    } else {
        Write-Host $LogMessage -ForegroundColor Green
    }
}

Log "╔════════════════════════════════════════════════════════════╗"
Log "║       ATLAS LOGISTICS BACKUP AUTOMATION                   ║"
Log "╚════════════════════════════════════════════════════════════╝"

if (-not (Test-Path $SourcePath)) {
    Log "ERROR: Project root not found: $SourcePath" -Error
    exit 1
}

Log "✓ Project root verified: $SourcePath"

# Set environment variables for the Node.js execution if provided
if ($BackupDestination) {
    $env:ATLAS_BACKUP_DIR = $BackupDestination
}
$env:MAX_LOCAL_BACKUPS = $MaxBackupsToKeep

try {
    Push-Location $SourcePath
    Log "Executing atomic WAL checkpoint and backup via backup-db.js..."
    node "$SourcePath\src\scripts\backup-db.js"
    if ($LASTEXITCODE -ne 0) {
        throw "Node process exited with code $LASTEXITCODE"
    }
    Log "✓ Backup process completed successfully."
} catch {
    Log "ERROR: Backup execution failed - $_" -Error
    exit 1
} finally {
    Pop-Location
}
