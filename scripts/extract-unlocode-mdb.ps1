<#
.SYNOPSIS
    Extracts the official UNECE UN/LOCODE 2022-2 MS Access database (.mdb) into
    compressed, cross-platform NDJSON/JSON catalogs under data/catalogs/.
.DESCRIPTION
    Uses native Microsoft.ACE.OLEDB.16.0 on Windows to extract:
      - 2022-2 UNLOCODE CodeList (~116,000 locations) -> data/catalogs/unlocode-2022-2.ndjson.gz
      - CountryCodes (249 ISO 3166-1 countries/territories) -> data/catalogs/unlocode-countries-2022-2.json
      - SubdivisionCodes (4,676 ISO 3166-2 subdivisions) -> data/catalogs/unlocode-subdivisions-2022-2.json.gz
#>
param(
    [string]$MdbPath = "C:\Users\xpall\Downloads\UNLOCODE-2022-2\2022-2 UNLOCODE CodeList.mdb",
    [string]$OutputDir = (Join-Path (Get-Location) "data\catalogs")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MdbPath)) {
    throw "UN/LOCODE MDB not found at: $MdbPath"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Convert-UneceCoordToDecimal {
    param([string]$RawCoord)
    if ([string]::IsNullOrWhiteSpace($RawCoord)) { return @($null, $null) }
    $trimmed = $RawCoord.Trim()
    if ($trimmed -match '^(\d{2})(\d{2})([NS])\s+(\d{3})(\d{2})([EW])$') {
        $lat = [double]$Matches[1] + ([double]$Matches[2] / 60.0)
        if ($Matches[3] -eq 'S') { $lat = -$lat }
        $lon = [double]$Matches[4] + ([double]$Matches[5] / 60.0)
        if ($Matches[6] -eq 'W') { $lon = -$lon }
        return @([Math]::Round($lat, 5), [Math]::Round($lon, 5))
    }
    return @($null, $null)
}

$connStr = "Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$MdbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$conn.Open()

try {
    # 1. Extract CountryCodes (249 rows)
    $countries = New-Object System.Collections.Generic.List[object]
    $cmdC = $conn.CreateCommand()
    $cmdC.CommandText = "SELECT CountryCode, CountryName FROM [CountryCodes] ORDER BY CountryCode"
    $rdC = $cmdC.ExecuteReader()
    while ($rdC.Read()) {
        $code = ("$($rdC.GetValue(0))").Trim().ToUpper()
        $name = ("$($rdC.GetValue(1))").Trim()
        if ($code.Length -eq 2) {
            $countries.Add([ordered]@{ code = $code; name = $name })
        }
    }
    $rdC.Close()
    $countriesPath = Join-Path $OutputDir "unlocode-countries-2022-2.json"
    [System.IO.File]::WriteAllText($countriesPath, ($countries | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
    Write-Host "Extracted $($countries.Count) countries -> $countriesPath"

    # 2. Extract SubdivisionCodes (4,676 rows) -> gzipped JSON
    $subdivs = New-Object System.Collections.Generic.List[object]
    $cmdS = $conn.CreateCommand()
    $cmdS.CommandText = "SELECT SUCountry, SUCode, SUName FROM [SubdivisionCodes] ORDER BY SUCountry, SUCode"
    $rdS = $cmdS.ExecuteReader()
    while ($rdS.Read()) {
        $cc = ("$($rdS.GetValue(0))").Trim().ToUpper()
        $sc = ("$($rdS.GetValue(1))").Trim()
        $sn = ("$($rdS.GetValue(2))").Trim()
        if ($cc.Length -eq 2 -and $sc.Length -gt 0) {
            $subdivs.Add([ordered]@{ c = $cc; s = $sc; n = $sn })
        }
    }
    $rdS.Close()
    $subdivsPath = Join-Path $OutputDir "unlocode-subdivisions-2022-2.json.gz"
    $subBytes = [System.Text.UTF8Encoding]::new($false).GetBytes(($subdivs | ConvertTo-Json -Compress))
    $fsSub = [System.IO.File]::Create($subdivsPath)
    $gzSub = New-Object System.IO.Compression.GZipStream($fsSub, [System.IO.Compression.CompressionLevel]::Optimal)
    $gzSub.Write($subBytes, 0, $subBytes.Length)
    $gzSub.Close()
    $fsSub.Close()
    Write-Host "Extracted $($subdivs.Count) subdivisions -> $subdivsPath"

    # 3. Extract 2022-2 UNLOCODE CodeList (~116,000 rows) -> gzipped NDJSON
    $locPath = Join-Path $OutputDir "unlocode-2022-2.ndjson.gz"
    $fsLoc = [System.IO.File]::Create($locPath)
    $gzLoc = New-Object System.IO.Compression.GZipStream($fsLoc, [System.IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object System.IO.StreamWriter($gzLoc, [System.Text.UTF8Encoding]::new($false))

    $cmdL = $conn.CreateCommand()
    $cmdL.CommandText = "SELECT Change, Country, Location, Name, NameWoDiacritics, Subdivision, Status, Function, Date, IATA, Coordinates, Remarks FROM [2022-2 UNLOCODE CodeList]"
    $rdL = $cmdL.ExecuteReader()
    $count = 0
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    while ($rdL.Read()) {
        $chg = ("$($rdL.GetValue(0))").Trim()
        $cc  = ("$($rdL.GetValue(1))").Trim().ToUpper()
        $loc = ("$($rdL.GetValue(2))").Trim().ToUpper()
        $nm  = ("$($rdL.GetValue(3))").Trim()
        $nwd = ("$($rdL.GetValue(4))").Trim()
        $sub = ("$($rdL.GetValue(5))").Trim()
        $st  = ("$($rdL.GetValue(6))").Trim()
        $fn  = ("$($rdL.GetValue(7))").Trim()
        $dt  = ("$($rdL.GetValue(8))").Trim()
        $iat = ("$($rdL.GetValue(9))").Trim().ToUpper()
        $crd = ("$($rdL.GetValue(10))").Trim()
        $rem = ("$($rdL.GetValue(11))").Trim()

        # Skip country divider header rows (empty location code)
        if ($cc.Length -ne 2 -or $loc.Length -ne 3) { continue }
        $fullCode = "$cc$loc"
        if (-not $seen.Add($fullCode)) { continue }

        if ([string]::IsNullOrWhiteSpace($fn)) { $fn = "--------" }
        if ([string]::IsNullOrWhiteSpace($st)) { $st = "RL" }
        $coords = Convert-UneceCoordToDecimal $crd

        $row = [ordered]@{
            u  = $fullCode
            c  = $cc
            l  = $loc
            n  = $nm
            nw = $(if ($nwd) { $nwd } else { $nm })
            sb = $(if ($sub) { $sub } else { $null })
            f  = $fn
            st = $st
            ch = $(if ($chg) { $chg } else { $null })
            dt = $(if ($dt) { $dt } else { $null })
            ia = $(if ($iat) { $iat } else { $null })
            rc = $(if ($crd) { $crd } else { $null })
            la = $coords[0]
            lo = $coords[1]
            rm = $(if ($rem) { $rem } else { $null })
        }
        $writer.WriteLine(($row | ConvertTo-Json -Compress))
        $count++
    }
    $rdL.Close()
    $writer.Flush()
    $writer.Close()
    $gzLoc.Close()
    $fsLoc.Close()

    $sizeMb = [Math]::Round((Get-Item $locPath).Length / 1MB, 2)
    Write-Host "Extracted $count official UN/LOCODE 2022-2 locations ($sizeMb MB) -> $locPath"
}
finally {
    $conn.Close()
}
