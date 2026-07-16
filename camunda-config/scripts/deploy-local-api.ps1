$tokenResponse = curl.exe -s -X POST "http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token" -d "grant_type=client_credentials&client_id=orchestration&client_secret=secret"
$tokenObj = $tokenResponse | ConvertFrom-Json
$token = $tokenObj.access_token

if (-not $token) {
    Write-Host "Failed to obtain local token: $tokenResponse"
    exit 1
}

$baseUrl = "http://localhost:8080"
Write-Host "Obtained Local Token successfully. Starting deployments..."

$folders = @("camunda-config/bpmn", "camunda-config/dmn", "camunda-config/forms")
$total = 0

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        $files = Get-ChildItem -Path $folder -Recurse -File | Where-Object { $_.Extension -match '\.(bpmn|dmn|form)$' }
        foreach ($file in $files) {
            Write-Host "Deploying $($file.FullName) ..."
            $out = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$baseUrl/v2/deployments" `
              -H "Authorization: Bearer $token" `
              -H "Accept: application/json" `
              -F "resources=@$($file.FullName)"
            Write-Host $out
            $total++
        }
    }
}
Write-Host "Deployed $total files to local cluster."
