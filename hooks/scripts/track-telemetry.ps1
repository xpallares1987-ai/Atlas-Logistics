param(
  [string]$Event = "session-start",
  [string]$Message = ""
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Write-Host "[telemetry] $Event" -ForegroundColor Cyan
if ($Message) {
  Write-Host $Message -ForegroundColor DarkGray
}
Write-Host "Working directory: $repo" -ForegroundColor DarkGray
