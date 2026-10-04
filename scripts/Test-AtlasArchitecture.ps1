<#
.SYNOPSIS
    Auditoría de paquetes y arquitectura del monorepo Atlas-Logistics.
.DESCRIPTION
    Inspecciona la integridad estructural de cada paquete, sus dependencias workspace,
    tamaños en disco, conteo de ficheros y valida que no falten manifiestos esenciales.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$BasePath = "",
    
    [Parameter(Mandatory = $false)]
    [string[]]$ModulesList = @("bpmn-modeler", "rate-comparer", "mfe-dashboard", "frontend", "shared", "mfe-warehouse", "ui"),
    
    [switch]$DryRun,
    [switch]$SkipHash,
    [int]$MaxHashSizeMB = 50,
    [int]$Throttle = 6,
    [switch]$NoNotify
)

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         AUDITORIA DE ARQUITECTURA (ATLAS-LOGISTICS)          " -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "======================================================================`n" -ForegroundColor Cyan

if (-not $BasePath) {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
    if (-not $scriptDir) { $scriptDir = "." }
    $BasePath = Join-Path $scriptDir "..\packages"
}

$resolvedPath = Resolve-Path -LiteralPath $BasePath -ErrorAction SilentlyContinue
if (-not $resolvedPath -or -not (Test-Path -LiteralPath $resolvedPath)) {
    Write-Host "ERROR: BasePath no existe: $BasePath" -ForegroundColor Red
    return
}
$BasePath = $resolvedPath.Path

Write-Host "Directorio de paquetes detectado: $BasePath`n" -ForegroundColor DarkGray

$auditResults = [System.Collections.Generic.List[PSCustomObject]]::new()
$totalFiles = 0
$totalSizeBytes = 0

foreach ($moduleName in $ModulesList) {
    $modulePath = Join-Path $BasePath $moduleName
    Write-Host "Inspeccionando modulo: [$moduleName]..." -NoNewline
    
    if (-not (Test-Path -LiteralPath $modulePath)) {
        Write-Host " [NO ENCONTRADO]" -ForegroundColor Red
        $auditResults.Add([PSCustomObject]@{
            Package     = $moduleName
            Status      = "Missing"
            Version     = "N/A"
            FilesCount  = 0
            SizeBytes   = 0
            SizeMB      = 0
            HasPackage  = $false
            HasTsConfig = $false
            Folder      = $moduleName
        })
        continue
    }

    $pkgJsonPath = Join-Path $modulePath "package.json"
    $hasPkgJson = Test-Path -LiteralPath $pkgJsonPath
    $pkgVersion = "Sin version"
    $pkgRealName = $moduleName

    if ($hasPkgJson) {
        try {
            $rawJson = Get-Content -LiteralPath $pkgJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($rawJson.name) { $pkgRealName = $rawJson.name }
            if ($rawJson.version) { $pkgVersion = $rawJson.version }
        } catch {
            $pkgVersion = "Error JSON"
        }
    }

    $hasTsConfig = (Test-Path -LiteralPath (Join-Path $modulePath "tsconfig.json")) -or 
                   (Test-Path -LiteralPath (Join-Path $modulePath "tsconfig.build.json"))

    # Conteo eficiente de ficheros excluyendo node_modules y dist
    $allFiles = Get-ChildItem -LiteralPath $modulePath -Recurse -File -ErrorAction SilentlyContinue | 
                Where-Object { $_.FullName -notmatch '[\\/](node_modules|dist|\.turbo|\.next)[\\/]' }

    $mCount = $allFiles.Count
    $mBytes = ($allFiles | Measure-Object -Property Length -Sum).Sum
    if (-not $mBytes) { $mBytes = 0 }

    $totalFiles += $mCount
    $totalSizeBytes += $mBytes

    $sizeMb = [Math]::Round($mBytes / 1MB, 2)
    $status = if ($hasPkgJson) { "OK" } else { "Alerta: No package.json" }

    $auditResults.Add([PSCustomObject]@{
        Package     = $pkgRealName
        Status      = $status
        Version     = $pkgVersion
        FilesCount  = $mCount
        SizeBytes   = $mBytes
        SizeMB      = $sizeMb
        HasPackage  = $hasPkgJson
        HasTsConfig = $hasTsConfig
        Folder      = $moduleName
    })

    Write-Host " [OK] ($mCount ficheros, $sizeMb MB)" -ForegroundColor Green
}

Write-Host "`n----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "RESUMEN DE AUDITORIA" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray

$auditResults | Format-Table Folder, Package, Version, Status, FilesCount, SizeMB, HasTsConfig -AutoSize

$totalMB = [Math]::Round($totalSizeBytes / 1MB, 2)
Write-Host "Total paquetes auditados: $($auditResults.Count)" -ForegroundColor White
Write-Host "Total ficheros de codigo fuente: $totalFiles" -ForegroundColor White
Write-Host "Peso neto en disco: $totalMB MB" -ForegroundColor White

if (-not $DryRun) {
    try {
        $reportPath = Join-Path $BasePath "estadisticas_modulos.md"
        $mdLines = @(
            "# Reporte de Auditoria de Arquitectura - Atlas Logistics",
            "",
            "Generado el: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
            "",
            "| Modulo | Paquete | Version | Estado | Ficheros | Tamano (MB) | TypeScript |",
            "|---|---|---|---|---|---|---|"
        )
        foreach ($r in $auditResults) {
            $tsIcon = if ($r.HasTsConfig) { "SI" } else { "NO" }
            $mdLines += "| $($r.Folder) | $($r.Package) | $($r.Version) | $($r.Status) | $($r.FilesCount) | $($r.SizeMB) | $tsIcon |"
        }
        $mdLines += "", "**Total:** $totalFiles ficheros | $totalMB MB"
        $mdLines | Set-Content -LiteralPath $reportPath -Encoding UTF8
        Write-Host "`n[OK] Reporte Markdown guardado en: $reportPath" -ForegroundColor Green
    } catch {
        Write-Warning "No se pudo guardar el reporte markdown: $_"
    }
}

Write-Host "`n Auditoria finalizada con exito." -ForegroundColor Green
