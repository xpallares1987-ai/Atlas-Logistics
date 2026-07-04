# scripts/run-encrypt.ps1
# PowerShell wrapper to invoke the Node.js encryption script

param (
    [string]$Password = $env:ENCRYPTED_DATA
)

if (-not $Password) {
    Write-Error "ENCRYPTED_DATA environment variable not set. Provide the password as an argument or set the env var."
    exit 1
}

# Export the password to the environment for the Node script
$env:ENCRYPTED_DATA = $Password

# Resolve script path (both live under scripts/)
$scriptPath = Join-Path -Path $PSScriptRoot -ChildPath "Encrypt-Data.cjs"

Write-Host "Running encryption script..." -ForegroundColor Cyan

# Use Node to execute the script
node "$scriptPath"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Encryption script failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Encryption completed successfully." -ForegroundColor Green
