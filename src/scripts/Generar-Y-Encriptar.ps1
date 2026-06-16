<#
.SYNOPSIS
Extrae tarifas base desde un archivo CSV (simulando exportación Excel), maneja la serialización JSON profunda para evitar pérdida de datos, y ejecuta el pipeline de Node.js para generar el JS encriptado.
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path ".."
$InputFile = Join-Path $ProjectRoot "data\tarifas_raw.csv"
$NodeScript = Join-Path $ProjectRoot "dist\scripts\generate-secure-rates.js"
$TempJsonPath = Join-Path $ProjectRoot "data\temp_payload.json"

Write-Host "Iniciando pipeline de extracción y serialización de tarifas..." -ForegroundColor Cyan

if (-not (Test-Path $InputFile)) {
    Write-Error "El archivo de entrada no existe: $InputFile"
    exit 1
}

# Leer datos crudos y forzar la codificación para prevenir caracteres extraños en puertos
$Data = Import-Csv -Path $InputFile -Delimiter "," -Encoding UTF8

# Serialización controlada para evitar errores de anidamiento y límite de longitud
$JsonPayload = $Data | ConvertTo-Json -Depth 10 -Compress

$JsonPayload | Out-File -FilePath $TempJsonPath -Encoding utf8
Write-Host "JSON temporal generado en: $TempJsonPath" -ForegroundColor Green

Write-Host "Invocando módulo nativo de Node.js para cifrado AES-256-GCM..." -ForegroundColor Cyan
try {
    # Ejecutar script compilado de Node.js pasando la ruta absoluta
    node $NodeScript $TempJsonPath
    Write-Host "Pipeline completado exitosamente. Archivo listo para el frontend." -ForegroundColor Green
} catch {
    Write-Error "Fallo durante la ejecución del script de Node.js."
} finally {
    if (Test-Path $TempJsonPath) {
        Remove-Item -Path $TempJsonPath -Force
        Write-Host "Limpieza de payload temporal completada." -ForegroundColor Gray
    }
}