Write-Host "Waiting for Keycloak to be ready..."
while ($true) {
    $res = curl.exe -s -o NUL -w "%{http_code}" "http://localhost:18080/auth/health/ready"
    if ($res -eq "200") { break }
    Start-Sleep -Seconds 5
}
Write-Host "Keycloak ready. Waiting for Orchestration to be ready..."
while ($true) {
    # Actually Orchestration might not expose /actuator/health on 8080 in Camunda 8.6, but Operate exposes /actuator/health
    $res = curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8080/actuator/health"
    if ($res -eq "200" -or $res -eq "401") { break }
    Start-Sleep -Seconds 5
}
Write-Host "Orchestration ready. Waiting an extra 10 seconds for safety..."
Start-Sleep -Seconds 10
Write-Host "Deploying resources..."
.\deploy-local-api.ps1
.\test-local.ps1
