param(
  [ValidateSet("GET")]
  [string]$Mode = "GET",
  [string]$BaseUrl   = "https://www.b2b.paper.saica.com",
  [string]$strLogin = "AEMEYERSSOHN",
  [string]$strPassword = "prueba",
  [string]$OutFolder = "C:\Users\xpall\Source\Shipment-Dashboard\public\data",
  [string]$CodBoarding = "",
  [string]$LoadCode = "",
  [int]$RetryCount = 3,
  [int]$RetryDelaySec = 10,
  [int]$TimeoutSec = 600
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Login = if ($env:WAREHOUSE_SYNC_LOGIN) { $env:WAREHOUSE_SYNC_LOGIN } else { $strLogin }
$Password = if ($env:WAREHOUSE_SYNC_PASSWORD) { $env:WAREHOUSE_SYNC_PASSWORD } else { $strPassword }
$BaseUrl = if ($env:EXTERNAL_WAREHOUSE_URL) { $env:EXTERNAL_WAREHOUSE_URL } else { $BaseUrl }

if ([string]::IsNullOrWhiteSpace($Login) -or [string]::IsNullOrWhiteSpace($Password)) {
    Write-Host ("{0}  ERROR: Las variables de entorno WAREHOUSE_SYNC_LOGIN y WAREHOUSE_SYNC_PASSWORD son obligatorias." -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
    exit 1
}

try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
} catch {}

function Ensure-Folder([string]$path){
  if (!(Test-Path -LiteralPath $path)) { [void](New-Item -ItemType Directory -Path $path -Force) }
}

function Log([string]$msg){
  Write-Host ("{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg)
}

function Build-Url([string]$path, [hashtable]$params){
  $base = $BaseUrl.TrimEnd('/')
  $p = if ($path.StartsWith('/')) { $path } else { '/' + $path }
  $query = ($params.GetEnumerator() | Sort-Object Key | ForEach-Object {
    "{0}={1}" -f $_.Key, [System.Uri]::EscapeDataString([string]$_.Value)
  }) -join "&"
  return ("{0}{1}?{2}" -f $base, $p, $query)
}

function Download-With-Retry([string]$url){
  for ($i=1; $i -le $RetryCount; $i++){
    try{
      return (Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec $TimeoutSec).Content
    } catch {
      if ($i -lt $RetryCount) {
        Log ("ERROR descarga: " + $_.Exception.Message + " | Reintento en " + $RetryDelaySec + "s")
        Start-Sleep -Seconds $RetryDelaySec
      } else { throw }
    }
  }
}

function Clean-XmlString([string]$s){
  if ([string]::IsNullOrEmpty($s)) { return $s }
  $s = $s -replace "[\x00-\x08\x0B\x0C\x0E-\x1F]", ""
  return ($s -replace '&(?!amp;|lt;|gt;|apos;|quot;|#\d+;|#x[0-9A-Fa-f]+;)', '&amp;')
}

function Parse-ResponseToXml([string]$content){
  $content = Clean-XmlString $content
  [xml]$outer = $content
  $stringNode = $outer.SelectSingleNode("//*[local-name()='string']")
  if ($null -ne $stringNode) {
      $inner = [System.Net.WebUtility]::HtmlDecode($stringNode.InnerText).Trim()
      $inner = Clean-XmlString $inner
      [xml]$innerDoc = $inner
      return $innerDoc
  }
  return $outer
}

function Add-OriginTag([xml]$doc, [System.Xml.XmlNode]$itemNode, [string]$code){
  $name = if ($code -eq "100") { "ES" } else { "FR" }
  $el = $doc.CreateElement("Origin")
  $el.InnerText = $name
  [void]$itemNode.AppendChild($el)
}

function Merge-Items([xml]$destDoc, [xml]$srcDoc, [string]$destListXPath, [string]$srcItemXPath, [string]$code){
  $destList = $destDoc.SelectSingleNode($destListXPath)
  if($null -eq $destList) { return }
  $srcItems = $srcDoc.SelectNodes($srcItemXPath)
  if($null -eq $srcItems) { return }
  foreach ($n in $srcItems) {
    Add-OriginTag $srcDoc $n $code
    [void]$destList.AppendChild($destDoc.ImportNode($n, $true))
  }
}

function Save-XmlReplaced([xml]$doc, [string]$path){
    $text = $doc.OuterXml
    $text = $text -replace ">ANVERS<", ">VAN MOER<"
    $text = $text -replace "VOGT", "HAMILTON"
    [System.IO.File]::WriteAllText($path, $text, [System.Text.Encoding]::UTF8)
}

function Sync-Endpoint {
    param (
        [string]$EndpointName,
        [string]$EntityPath,
        [string]$ListXPath,
        [string]$ItemXPath,
        [string]$OutputFileName,
        [hashtable]$ExtraParams = @{}
    )
    
    $params100 = @{strLogin=$Login; strPassword=$Password; strCompany="100"}
    $params200 = @{strLogin=$Login; strPassword=$Password; strCompany="200"}
    
    foreach ($key in $ExtraParams.Keys) {
        $params100[$key] = $ExtraParams[$key]
        $params200[$key] = $ExtraParams[$key]
    }

    $doc100 = Parse-ResponseToXml (Download-With-Retry (Build-Url $EntityPath $params100))
    $doc200 = Parse-ResponseToXml (Download-With-Retry (Build-Url $EntityPath $params200))

    foreach ($n in $doc100.SelectNodes($ItemXPath)) { Add-OriginTag $doc100 $n "100" }
    Merge-Items $doc100 $doc200 $ListXPath $ItemXPath "200"

    Save-XmlReplaced $doc100 (Join-Path $OutFolder $OutputFileName)
}

Ensure-Folder $OutFolder
$OutFolder = Convert-Path $OutFolder

Log "1/4 Descargando Embarques (Boarding)..."
Sync-Endpoint -EndpointName "GetBoardingList" -EntityPath "/Webservices/ExternalWarehousesService.asmx/GetBoardingList" -ListXPath "//Shipments" -ItemXPath "//BoardingItem" -OutputFileName "GetBoardingList.xml" -ExtraParams @{strCodBoarding=$CodBoarding}

Log "2/4 Descargando Recepciones (Receptions)..."
Sync-Endpoint -EndpointName "GetPendingReceptionsList" -EntityPath "/Webservices/ExternalWarehousesService.asmx/GetPendingReceptionsList" -ListXPath "//Receptions" -ItemXPath "//ReceptionItem" -OutputFileName "GetPendingReceptions.xml"

Log "3/4 Descargando Contenido de Recepciones (Receptions Content)..."
Sync-Endpoint -EndpointName "GetPendingReceptionsContent" -EntityPath "/Webservices/ExternalWarehousesService.asmx/GetPendingReceptionsContent" -ListXPath "//Receptions" -ItemXPath "//ReceptionItem" -OutputFileName "GetPendingReceptionsContent.xml" -ExtraParams @{strLoadCode=$LoadCode}

Log "4/4 Descargando Stock..."
Sync-Endpoint -EndpointName "GetStock" -EntityPath "/Webservices/ExternalWarehousesService.asmx/GetStock" -ListXPath "//Stock" -ItemXPath "//StockItem" -OutputFileName "GetStock.xml"

Log "Sincronizacion Finalizada Exitosamente."