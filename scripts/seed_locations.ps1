$token = gcloud auth print-access-token
$base = "https://firestore.googleapis.com/v1/projects/gen-lang-client-0393063451/databases/database01/documents"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Set-FSDoc($collection, $id, $fields) {
    $body = @{ fields = $fields } | ConvertTo-Json -Depth 15
    try {
        Invoke-RestMethod -Uri "$base/$collection/$id" -Method Patch -Headers $headers -Body $body | Out-Null
        Write-Host "  OK: $collection/$id" -ForegroundColor Green
    } catch { Write-Host "  ERR: $collection/$id - $_" -ForegroundColor Red }
}
function S($v) { @{ stringValue = "$v" } }
function B($v) { @{ booleanValue = [bool]$v } }
function D($v) { @{ doubleValue = [double]$v } }

Write-Host "=== LOCATIONS ===" -ForegroundColor Cyan

$locations = @(
    @{ id="ESBCN"; name="Barcelona"; country="ES"; type="PORT"; region="Europe" },
    @{ id="ESVLC"; name="Valencia"; country="ES"; type="PORT"; region="Europe" },
    @{ id="ESMAD"; name="Madrid"; country="ES"; type="AIRPORT"; region="Europe" },
    @{ id="ESBIO"; name="Bilbao"; country="ES"; type="PORT"; region="Europe" },
    @{ id="CNSHA"; name="Shanghai"; country="CN"; type="PORT"; region="Asia" },
    @{ id="CNNBO"; name="Ningbo"; country="CN"; type="PORT"; region="Asia" },
    @{ id="CNSZX"; name="Shenzhen"; country="CN"; type="PORT"; region="Asia" },
    @{ id="CNHKG"; name="Hong Kong"; country="CN"; type="PORT"; region="Asia" },
    @{ id="NLRTM"; name="Rotterdam"; country="NL"; type="PORT"; region="Europe" },
    @{ id="DEHAM"; name="Hamburg"; country="DE"; type="PORT"; region="Europe" },
    @{ id="BRSSZ"; name="Santos"; country="BR"; type="PORT"; region="South America" },
    @{ id="USNYC"; name="New York"; country="US"; type="PORT"; region="North America" },
    @{ id="USLAX"; name="Los Angeles"; country="US"; type="PORT"; region="North America" },
    @{ id="SGSIN"; name="Singapore"; country="SG"; type="PORT"; region="Asia" }
)

foreach ($loc in $locations) {
    Set-FSDoc "locations" $loc.id @{
        tenantId = S "default"
        code = S $loc.id
        name = S $loc.name
        country = S $loc.country
        type = S $loc.type
        region = S $loc.region
        isActive = B $true
    }
}

Write-Host "=== LOCATIONS SEED COMPLETE ===" -ForegroundColor Cyan
