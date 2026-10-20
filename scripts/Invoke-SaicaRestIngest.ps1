<#
.SYNOPSIS
    Invoke-SaicaRestIngest.ps1 - Legacy wrapper forwarding to Invoke-Customer01RestIngest.ps1
#>
[CmdletBinding()]
param (
    [string]$BaseUrl = $env:ATLAS_API_URL,
    [ValidateSet('VerifyHealth', 'IngestAlbaran', 'IngestException', 'SimulateBatch')]
    [string]$Action = 'SimulateBatch',
    [string]$PayloadJson = ''
)

& "$PSScriptRoot/Invoke-Customer01RestIngest.ps1" -BaseUrl $BaseUrl -Action $Action -PayloadJson $PayloadJson
