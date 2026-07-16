$tokenResponse = curl.exe -s -X POST "http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token" -d "grant_type=client_credentials&client_id=orchestration&client_secret=secret"
$tokenObj = $tokenResponse | ConvertFrom-Json
$token = $tokenObj.access_token

$baseUrl = "http://localhost:8080"

Write-Host "Starting Vendor Onboarding Process..."
$data = '{"processDefinitionId": "vendor-onboarding-process", "variables": {"vendorName": "Logistics Corp SA", "country": "US", "financialScore": 85}}'

$out = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$baseUrl/v1/process-instances" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json" `
  -d $data

Write-Host "Result (v1):"
Write-Host $out

$data | Out-File -Encoding utf8 "payload.json"

$out2 = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$baseUrl/v2/process-instances" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json" `
  -d "@payload.json"

Write-Host "Result (v2):"
Write-Host $out2
