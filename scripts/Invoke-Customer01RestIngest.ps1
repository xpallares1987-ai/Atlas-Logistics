<#
.SYNOPSIS
    Invoke-Customer01RestIngest.ps1 - Headless REST Ingestion for Customer01 Logistics Platform.
.DESCRIPTION
    Decoupled REST ingestion client for Customer01 delivery notes (albaranes) and dock exceptions.
    Complies with Book TEST01 (Barcelona DEPT-TEST01) and AGENTS.md policies:
    - Strictly uses Invoke-RestMethod for headless unattended automation.
    - PROHIBITED from instantiating COM Excel.Application for network/OneDrive reads/writes.
.PARAMETER BaseUrl
    Base URL of Atlas Fastify API (default: http://localhost:3001).
.PARAMETER Action
    Operational action to execute: 'IngestAlbaran', 'IngestException', 'VerifyHealth', 'SimulateBatch'.
.PARAMETER PayloadJson
    Raw JSON string payload or path to a JSON file.
.EXAMPLE
    .\Invoke-Customer01RestIngest.ps1 -Action VerifyHealth
    .\Invoke-Customer01RestIngest.ps1 -Action IngestAlbaran
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
Write-Host "   CUSTOMER01 LOGISTICS REST INGESTION · CORREDOR OFICIAL BOOK TEST01     " -ForegroundColor Cyan
Write-Host "   API Endpoint: $BaseUrl/api/customer01" -ForegroundColor DarkGray
Write-Host "==========================================================================" -ForegroundColor Cyan

function Test-Customer01ApiHealth {
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

function Send-Customer01Albaran {
    param ([string]$Url, [object]$Payload)
    $json = $Payload | ConvertTo-Json -Depth 5
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Enviando Albarán: $($Payload.albaranNumber) a almacén $($Payload.destinationWarehouse)..." -ForegroundColor White
    
    try {
        $result = Invoke-RestMethod -Uri "$Url/api/customer01/albaranes/upload" `
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

function Send-Customer01Exception {
    param ([string]$Url, [object]$Payload)
    $json = $Payload | ConvertTo-Json -Depth 5
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Reportando Incidencia Muelle: $($Payload.exceptionType)..." -ForegroundColor White
    
    try {
        $result = Invoke-RestMethod -Uri "$Url/api/customer01/exceptions/upload" `
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
        Test-Customer01ApiHealth -Url $BaseUrl | Out-Null
    }

    'IngestAlbaran' {
        $albaranPayload = @{
            albaranNumber = "ALB-TEST01-$([DateTime]::Now.ToString('yyyyMMdd-HHmm'))"
            factoryOrigin = "Plant North"
            destinationWarehouse = "CANTUNIS"
            vehicleIdentifier = "31 71 4556 128-4"
            coils = @(
                @{
                    coilId = "BOB-CUST01-$([DateTime]::Now.ToString('MMdd-HHmmss'))-1"
                    paperGrade = "PRIMA 140"
                    grossWeightKg = 2650
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Plant North"
                    destinationWarehouse = "CANTUNIS"
                },
                @{
                    coilId = "BOB-CUST01-$([DateTime]::Now.ToString('MMdd-HHmmss'))-2"
                    paperGrade = "MEDIUM 110"
                    grossWeightKg = 2580
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Plant North"
                    destinationWarehouse = "CANTUNIS"
                }
            )
            targetContainerNumber = "MSKU-481920-4"
        }
        Send-Customer01Albaran -Url $BaseUrl -Payload $albaranPayload | Out-Null
    }

    'IngestException' {
        $exceptionPayload = @{
            warehouse = "CANTUNIS"
            exceptionType = "RETRASO_FERROVIARIO"
            severity = "MEDIUM"
            affectedVehicleId = "31 71 4556 128-4"
            description = "Maniobra de posicionamiento en vía Morrot retrasada por tráfico de cercanías."
            reportedByRole = "TEST01"
            reportedByName = "Operator Lead"
        }
        Send-Customer01Exception -Url $BaseUrl -Payload $exceptionPayload | Out-Null
    }

    'SimulateBatch' {
        Write-Host "Iniciando ciclo de simulación desatendida Headless..." -ForegroundColor Cyan
        
        # 1. Albarán Ferroviario CANTUNIS (Electric Train)
        $trainAlbaran = @{
            albaranNumber = "ALB-TEST01-CANTUNIS-RAIL-$([DateTime]::Now.ToString('HHmm'))"
            factoryOrigin = "Plant North"
            destinationWarehouse = "CANTUNIS"
            vehicleIdentifier = "31 71 4556 881-0"
            coils = @(
                @{
                    coilId = "BOB-PLN-CAN-01"
                    paperGrade = "PRIMA 140"
                    grossWeightKg = 2680
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Plant North"
                    destinationWarehouse = "CANTUNIS"
                },
                @{
                    coilId = "BOB-PLN-CAN-02"
                    paperGrade = "PRIMA 140"
                    grossWeightKg = 2680
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Plant North"
                    destinationWarehouse = "CANTUNIS"
                }
            )
            targetContainerNumber = "CMAU-821940-2"
        }
        Send-Customer01Albaran -Url $BaseUrl -Payload $trainAlbaran | Out-Null

        # 2. Albarán Camión Carretera TLSA (Curtain Trailer Euro VI)
        $truckAlbaran = @{
            albaranNumber = "ALB-TEST01-TLSA-ROAD-$([DateTime]::Now.ToString('HHmm'))"
            factoryOrigin = "Plant East"
            destinationWarehouse = "TLSA"
            vehicleIdentifier = "5829-MZZ"
            coils = @(
                @{
                    coilId = "BOB-PLE-TLSA-01"
                    paperGrade = "MEDIUM 110"
                    grossWeightKg = 2550
                    widthMm = 2400
                    diameterMm = 1250
                    factoryOrigin = "Plant East"
                    destinationWarehouse = "TLSA"
                }
            )
        }
        Send-Customer01Albaran -Url $BaseUrl -Payload $truckAlbaran | Out-Null

        # 3. Incidencia de Muelle gestionada por TEST01 (Operator Lead)
        $exc = @{
            warehouse = "TLSA"
            exceptionType = "BOBINA_DANADA"
            severity = "LOW"
            affectedCoilId = "BOB-PLE-TLSA-01"
            description = "Pequeña raspadura en embalaje kraft exterior; precintado reforzado con fleje."
            reportedByRole = "TEST01"
            reportedByName = "Operator Lead"
        }
        Send-Customer01Exception -Url $BaseUrl -Payload $exc | Out-Null
        Write-Host "Ciclo de simulación completado." -ForegroundColor Green
    }
}
