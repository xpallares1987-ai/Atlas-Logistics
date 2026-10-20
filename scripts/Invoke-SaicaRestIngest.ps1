<#
.SYNOPSIS
    Invoke-SaicaRestIngest.ps1 - Headless REST Ingestion for SAICA Logistics & FMS Platform.
.DESCRIPTION
    Decoupled REST ingestion client for SAICA delivery notes (albaranes) and dock exceptions.
    Complies with Book 012 (Barcelona BCN.FE.FE01.012) and AGENTS.md policies:
    - Strictly uses Invoke-RestMethod for headless unattended automation.
    - PROHIBITED from instantiating COM Excel.Application for network/OneDrive reads/writes.
.PARAMETER BaseUrl
    Base URL of Atlas Fastify API (default: http://localhost:3001).
.PARAMETER Action
    Operational action to execute: 'IngestAlbaran', 'IngestException', 'VerifyHealth', 'SimulateBatch'.
.PARAMETER PayloadJson
    Raw JSON string payload or path to a JSON file.
.EXAMPLE
    .\Invoke-SaicaRestIngest.ps1 -Action VerifyHealth
    .\Invoke-SaicaRestIngest.ps1 -Action IngestAlbaran
#>

[CmdletBinding()]
param (
    [string]$BaseUrl = $env:ATLAS_API_URL,
    [ValidateSet('VerifyHealth', 'IngestAlbaran', 'IngestException', 'SimulateBatch')]
    [string]$Action = 'SimulateBatch',
    [string]$PayloadJson = ''
)

# Fallback default URL if not specified
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
    $BaseUrl = "http://localhost:3001"
}

# Strict Architectural Compliance Guardrail:
# COM Excel.Application is strictly prohibited per AGENTS.md Rule 4
if (Get-Process -Name "EXCEL" -ErrorAction SilentlyContinue) {
    Write-Verbose "Nota de Integridad: Procesos Excel locales no están vinculados a esta ingesta desacoplada REST."
}

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   SAICA LOGISTICS REST INGESTION · CORREDOR OFICIAL BOOK 012 (BCN)       " -ForegroundColor Cyan
Write-Host "   API Endpoint: $BaseUrl/api/saica" -ForegroundColor DarkGray
Write-Host "==========================================================================" -ForegroundColor Cyan

function Test-SaicaApiHealth {
    param ([string]$Url)
    try {
        $response = Invoke-RestMethod -Uri "$Url/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] API Atlas Status: ONLINE" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] AVISO: API no disponible en $Url ($($_.Exception.Message))" -ForegroundColor Yellow
        return $false
    }
}

function Send-SaicaAlbaran {
    param ([string]$Url, [object]$Payload)
    $json = $Payload | ConvertTo-Json -Depth 5
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Enviando Albarán: $($Payload.albaranNumber) a almacén $($Payload.destinationWarehouse)..." -ForegroundColor White
    
    try {
        $result = Invoke-RestMethod -Uri "$Url/api/saica/albaranes/upload" `
                                    -Method Post `
                                    -ContentType "application/json; charset=utf-8" `
                                    -Body $json `
                                    -ErrorAction Stop

        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] ÉXITO: Albarán registrado." -ForegroundColor Green
        Write-Host "  -> Modo Detectado: $($result.albaran.vehicleDetection.transportMode)" -ForegroundColor Cyan
        Write-Host "  -> Vagón UIC / Tren Eléctrico: $($result.albaran.vehicleDetection.isRail)" -ForegroundColor Cyan
        Write-Host "  -> Ahorro Certificado CO2e: $($result.albaran.vehicleDetection.co2eSavingsPercent)%" -ForegroundColor Green
        Write-Host "  -> Peso Neto Total: $($result.albaran.totalNetWeightKg) kg" -ForegroundColor White
        return $result
    } catch {
        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] ERROR al enviar Albarán: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Send-SaicaException {
    param ([string]$Url, [object]$Payload)
    $json = $Payload | ConvertTo-Json -Depth 5
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Reportando Incidencia Muelle: $($Payload.exceptionType)..." -ForegroundColor White
    
    try {
        $result = Invoke-RestMethod -Uri "$Url/api/saica/exceptions/upload" `
                                    -Method Post `
                                    -ContentType "application/json; charset=utf-8" `
                                    -Body $json `
                                    -ErrorAction Stop

        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] ÉXITO: Incidencia de muelle registrada: $($result.exception.exceptionId)" -ForegroundColor Green
        Write-Host "  -> Reportado por: $($result.exception.reportedByRole) ($($result.exception.reportedByName))" -ForegroundColor Cyan
        Write-Host "  -> Severidad: $($result.exception.severity)" -ForegroundColor Yellow
        return $result
    } catch {
        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] ERROR registrando Incidencia: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# --- Execution Dispatcher ---

switch ($Action) {
    'VerifyHealth' {
        Test-SaicaApiHealth -Url $BaseUrl | Out-Null
    }

    'IngestAlbaran' {
        $albaranPayload = @{
            albaranNumber = "ALB-012-$([DateTime]::Now.ToString('yyyyMMdd-HHmm'))"
            factoryOrigin = "Zaragoza El Burgo"
            destinationWarehouse = "CANTUNIS"
            vehicleIdentifier = "31 71 4556 128-4"
            coils = @(
                @{
                    coilId = "BOB-SAICA-$([DateTime]::Now.ToString('MMdd-HHmmss'))-1"
                    paperGrade = "SAICA NATURE PRIMA 140"
                    grossWeightKg = 2650
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Zaragoza El Burgo"
                    destinationWarehouse = "CANTUNIS"
                },
                @{
                    coilId = "BOB-SAICA-$([DateTime]::Now.ToString('MMdd-HHmmss'))-2"
                    paperGrade = "SAICA NATURE MEDIUM 110"
                    grossWeightKg = 2580
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Zaragoza El Burgo"
                    destinationWarehouse = "CANTUNIS"
                }
            )
            targetContainerNumber = "MSKU-481920-4"
        }
        Send-SaicaAlbaran -Url $BaseUrl -Payload $albaranPayload | Out-Null
    }

    'IngestException' {
        $exceptionPayload = @{
            warehouse = "CANTUNIS"
            exceptionType = "RETRASO_FERROVIARIO"
            severity = "MEDIUM"
            affectedVehicleId = "31 71 4556 128-4"
            description = "Maniobra de posicionamiento en vía Morrot retrasada por tráfico de cercanías."
            reportedByRole = "ESACA"
            reportedByName = "Ariel Catalano"
        }
        Send-SaicaException -Url $BaseUrl -Payload $exceptionPayload | Out-Null
    }

    'SimulateBatch' {
        Write-Host "Iniciando ciclo de simulación desatendida Headless..." -ForegroundColor Cyan
        
        # 1. Albarán Ferroviario CANTUNIS (Electric Train)
        $trainAlbaran = @{
            albaranNumber = "ALB-012-CANTUNIS-RAIL-$([DateTime]::Now.ToString('HHmm'))"
            factoryOrigin = "Zaragoza El Burgo"
            destinationWarehouse = "CANTUNIS"
            vehicleIdentifier = "31 71 4556 881-0"
            coils = @(
                @{
                    coilId = "BOB-ZAZ-CAN-01"
                    paperGrade = "SAICA NATURE PRIMA 140"
                    grossWeightKg = 2680
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Zaragoza El Burgo"
                    destinationWarehouse = "CANTUNIS"
                },
                @{
                    coilId = "BOB-ZAZ-CAN-02"
                    paperGrade = "SAICA NATURE PRIMA 140"
                    grossWeightKg = 2680
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Zaragoza El Burgo"
                    destinationWarehouse = "CANTUNIS"
                }
            )
            targetContainerNumber = "CMAU-821940-2"
        }
        Send-SaicaAlbaran -Url $BaseUrl -Payload $trainAlbaran | Out-Null

        # 2. Albarán Camión Carretera TLSA (Curtain Trailer Euro VI)
        $truckAlbaran = @{
            albaranNumber = "ALB-012-TLSA-ROAD-$([DateTime]::Now.ToString('HHmm'))"
            factoryOrigin = "Zaragoza San Juan"
            destinationWarehouse = "TLSA"
            vehicleIdentifier = "5829-MZZ"
            coils = @(
                @{
                    coilId = "BOB-ZAZ-TLSA-01"
                    paperGrade = "SAICA NATURE MEDIUM 110"
                    grossWeightKg = 2550
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Zaragoza San Juan"
                    destinationWarehouse = "TLSA"
                }
            )
        }
        Send-SaicaAlbaran -Url $BaseUrl -Payload $truckAlbaran | Out-Null

        # 3. Incidencia de Muelle gestionada por ESACA (Ariel Catalano)
        $exc = @{
            warehouse = "TLSA"
            exceptionType = "BOBINA_DANADA"
            severity = "LOW"
            affectedCoilId = "BOB-ZAZ-TLSA-01"
            description = "Pequeña raspadura en embalaje kraft exterior; precintado reforzado con fleje."
            reportedByRole = "ESACA"
            reportedByName = "Ariel Catalano"
        }
        Send-SaicaException -Url $BaseUrl -Payload $exc | Out-Null
        Write-Host "Ciclo de simulación completado." -ForegroundColor Green
    }
}
