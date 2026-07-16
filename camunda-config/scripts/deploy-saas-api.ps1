$tokenResponse = curl.exe -s -X POST "https://login.cloud.camunda.io/oauth/token" -H "Content-Type: application/json" -d "{\`"grant_type\`":\`"client_credentials\`",\`"client_id\`":\`"XqSmx64lKA8MRNWL0KU0os_1ZMksbfwG\`",\`"client_secret\`":\`"rm6-FLdEqMyTXR5TAQfxPKKxVHFERjvWQbSWz4w_MgEoceVFURxoWsHp9GRGez9U\`",\`"audience\`":\`"zeebe.camunda.io\`"}"
$tokenObj = $tokenResponse | ConvertFrom-Json
$token = $tokenObj.access_token

if (-not $token) {
    Write-Host "Failed to obtain token: $tokenResponse"
    exit 1
}

$clusterId = "c9d0ee13-1491-4b8c-a944-ee6147d37cb5"
$region = "bru-2"
$baseUrl = "https://$region.api.camunda.io/$clusterId"

Write-Host "Obtained SaaS Token successfully. Starting deployments..."

$folders = @("camunda-config/bpmn", "camunda-config/dmn", "camunda-config/forms")
$total = 0

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        $files = Get-ChildItem -Path $folder -Recurse -File | Where-Object { $_.Extension -match '\.(bpmn|dmn|form)$' }
        foreach ($file in $files) {
            Write-Host "Deploying $($file.FullName) ..."
            $out = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$baseUrl/v2/deployments" `
              -H "Authorization: Bearer $token" `
              -F "resources=@$($file.FullName)"
            Write-Host $out
            $total++
        }
    }
}
Write-Host "Deployed $total files."
