# ============================================================================
# ATLAS LOGISTICS BACKUP SCRIPT - Windows PowerShell
# Purpose: Automated weekly backup to external drive
# Run: Via Task Scheduler (recommended) or manually
# ============================================================================

param(
    [string]$SourcePath = "$env:USERPROFILE\atlas-logistics",
    [string]$BackupDestination = "D:\backups",
    [string]$MaxBackupsToKeep = 4,
    [switch]$Verbose = $false
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$BackupFolderPrefix = "atlas-logistics-backup"
$Timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$BackupFolder = "$BackupDestination\$BackupFolderPrefix-$Timestamp"
$LogFile = "$BackupDestination\backup-log.txt"

# ============================================================================
# FUNCTIONS
# ============================================================================

function Log {
    param([string]$Message, [switch]$Error = $false)
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    
    if ($Error) {
        Write-Host $LogMessage -ForegroundColor Red
        Add-Content -Path $LogFile -Value $LogMessage
    } else {
        Write-Host $LogMessage -ForegroundColor Green
        Add-Content -Path $LogFile -Value $LogMessage
    }
}

function VerifySource {
    if (-not (Test-Path $SourcePath)) {
        Log "ERROR: Source path not found: $SourcePath" -Error
        exit 1
    }
    Log "✓ Source path verified: $SourcePath"
}

function VerifyDestination {
    if (-not (Test-Path $BackupDestination)) {
        Log "Creating backup destination: $BackupDestination"
        New-Item -ItemType Directory -Path $BackupDestination -Force | Out-Null
    }
    Log "✓ Backup destination ready: $BackupDestination"
}

function PerformBackup {
    try {
        Log "Starting backup..."
        Log "Source: $SourcePath"
        Log "Destination: $BackupFolder"
        
        # Copy entire directory
        Copy-Item -Path $SourcePath -Destination $BackupFolder -Recurse -Force
        
        Log "✓ Backup completed successfully"
        return $true
    } catch {
        Log "ERROR: Backup failed - $_" -Error
        return $false
    }
}

function VerifyBackup {
    # Compare source and backup sizes
    $SourceSize = (Get-ChildItem $SourcePath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    $BackupSize = (Get-ChildItem $BackupFolder -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    
    # Allow 1% variance for system files
    $SizeDifference = [Math]::Abs($SourceSize - $BackupSize)
    $AcceptableDifference = $SourceSize * 0.01
    
    if ($SizeDifference -lt $AcceptableDifference) {
        Log "✓ Backup verification passed"
        Log "  Source size: $([Math]::Round($SourceSize, 2)) MB"
        Log "  Backup size: $([Math]::Round($BackupSize, 2)) MB"
        return $true
    } else {
        Log "ERROR: Backup size mismatch" -Error
        Log "  Source: $SourceSize MB"
        Log "  Backup: $BackupSize MB"
        return $false
    }
}

function CleanupOldBackups {
    Log "Cleaning up old backups (keeping $MaxBackupsToKeep most recent)..."
    
    $Backups = Get-ChildItem -Path $BackupDestination -Directory | 
        Where-Object { $_.Name -match "$BackupFolderPrefix-" } |
        Sort-Object -Property CreationTime -Descending
    
    if ($Backups.Count -gt $MaxBackupsToKeep) {
        $BackupsToDelete = $Backups | Select-Object -Skip $MaxBackupsToKeep
        
        foreach ($Backup in $BackupsToDelete) {
            Log "Deleting old backup: $($Backup.Name)"
            Remove-Item -Path $Backup.FullName -Recurse -Force
        }
        
        Log "✓ Cleanup completed"
    } else {
        Log "✓ No old backups to delete"
    }
}

function GenerateReport {
    $ReportContent = @"
================================================================================
                    ATLAS LOGISTICS BACKUP REPORT
================================================================================

Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Status: $(if ($BackupSuccess) { "SUCCESS ✓" } else { "FAILED ✗" })

Backup Details:
  Source: $SourcePath
  Destination: $BackupFolder
  Timestamp: $Timestamp

Next Steps:
  1. Verify backup: Compare file counts and sizes
  2. Schedule: Setup Task Scheduler to run weekly
  3. Test: Monthly restore test (verify backup works)

Recent Backups:
  (Last 5 backups in $BackupDestination)

For more information, see: BACKUP_CHECKLIST.md
================================================================================
"@
    
    Log "`n$ReportContent"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Log "╔════════════════════════════════════════════════════════════╗"
Log "║       ATLAS LOGISTICS BACKUP AUTOMATION                   ║"
Log "╚════════════════════════════════════════════════════════════╝"

VerifySource
VerifyDestination
$BackupSuccess = PerformBackup

if ($BackupSuccess) {
    VerifyBackup
    CleanupOldBackups
    GenerateReport
    Log "✓ Backup process completed successfully"
    exit 0
} else {
    GenerateReport
    Log "✗ Backup process failed"
    exit 1
}
