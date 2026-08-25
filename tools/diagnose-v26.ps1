$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V26.3 PWA diagnostics ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== Docker services ===" -ForegroundColor Yellow
docker compose ps

$BaseUrl = "http://localhost"
function Check-Url([string]$Url) {
  try {
    $separator = if($Url.Contains("?")) { "&" } else { "?" }
    $noCacheUrl = $Url + $separator + "_cb=" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $r = Invoke-WebRequest -UseBasicParsing -Uri $noCacheUrl -TimeoutSec 10 -Headers @{ "Cache-Control" = "no-cache, no-store"; "Pragma" = "no-cache" }
    Write-Host ("OK {0} -> HTTP {1} {2}" -f $Url,$r.StatusCode,$r.Headers["Content-Type"]) -ForegroundColor Green
    return $r
  } catch {
    Write-Host ("FAIL {0} -> {1}" -f $Url,$_.Exception.Message) -ForegroundColor Red
    throw
  }
}

function Get-ResponseText($Response) {
  if($null -eq $Response.Content) { return "" }
  if($Response.Content -is [byte[]]) {
    return [System.Text.Encoding]::UTF8.GetString($Response.Content)
  }
  return [string]$Response.Content
}

function Parse-JsonResponse($Response, [string]$Label) {
  $text = Get-ResponseText $Response
  $text = $text.TrimStart([char]0xFEFF).Trim()
  try {
    return ConvertFrom-Json -InputObject $text
  } catch {
    $preview = if($text.Length -gt 500) { $text.Substring(0,500) + "..." } else { $text }
    throw "$Label returned invalid JSON. Body preview: $preview"
  }
}

Write-Host ""
Write-Host "=== PWA endpoints ===" -ForegroundColor Yellow
$manifestResponse = Check-Url "$BaseUrl/manifest.webmanifest"
$swResponse = Check-Url "$BaseUrl/sw.js"
Check-Url "$BaseUrl/offline" | Out-Null
Check-Url "$BaseUrl/offline-tickets" | Out-Null
Check-Url "$BaseUrl/icon-192.png" | Out-Null
Check-Url "$BaseUrl/icon-512.png" | Out-Null
Check-Url "$BaseUrl/icon-maskable-512.png" | Out-Null

$m = Parse-JsonResponse $manifestResponse "Manifest"
$manifestText = Get-ResponseText $manifestResponse
$swText = Get-ResponseText $swResponse

if([string]::IsNullOrWhiteSpace([string]$m.display)) {
  $preview = if($manifestText.Length -gt 800) { $manifestText.Substring(0,800) + "..." } else { $manifestText }
  throw "Manifest has no 'display' property. Response body: $preview"
}
if([string]$m.display -ne "standalone") { throw "Manifest display must be standalone (actual: '$([string]$m.display)')." }
if(@($m.icons).Count -lt 3) { throw "Manifest must expose PNG and maskable icons" }
if(@($m.shortcuts).Count -lt 2) { throw "Manifest shortcuts are missing" }
if($swText -notmatch 'const VERSION = "v(?<major>[0-9]+)"' -or [int]$Matches.major -lt 26) { throw "Service worker VERSION must be V26 or newer" }
if(-not $swText.Contains('cinebooking-shell-${VERSION}')) { throw "Service worker shell-cache naming rule not found" }
if($swText -notmatch '/offline-tickets') { throw "Offline ticket route not precached" }
if($swText -notmatch 'url\.pathname\.startsWith\("/api/"\)') { throw "Service worker API-cache exclusion not found" }

Write-Host ""
Write-Host "PASS: manifest standalone + icons + shortcuts" -ForegroundColor Green
Write-Host "PASS: service worker V26 + offline route + API no-cache rule" -ForegroundColor Green
Write-Host "PASS: offline shell and PWA icons reachable" -ForegroundColor Green
Write-Host ""
Write-Host "Manual mobile test:" -ForegroundColor Cyan
Write-Host "1. Open one CONFIRMED ticket and press 'Luu ve offline'."
Write-Host "2. Turn off Wi-Fi/mobile data."
Write-Host "3. Open /offline-tickets from the installed PWA and verify the QR still renders."
