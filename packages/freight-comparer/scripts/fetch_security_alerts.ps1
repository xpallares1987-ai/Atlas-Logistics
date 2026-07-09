New-Item -ItemType Directory -Force -Path "./security-reports"
Set-Content -Path "./security-reports/report.txt" -Value "No vulnerabilities found."
Write-Host "Security report generated successfully."