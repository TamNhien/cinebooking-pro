$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost"
Write-Host "CineBooking V26 PWA / Offline Ticket smoke test" -ForegroundColor Cyan

function Wait-Api {
  for($i=0;$i -lt 30;$i++) {
    try {
      $r=Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/api/movies" -TimeoutSec 4
      if($r.StatusCode -eq 200) { return }
    } catch {}
    if($i -eq 0){Write-Host "WARN: API is not ready yet; waiting for backend/nginx startup..." -ForegroundColor Yellow}
    Start-Sleep -Seconds 2
  }
  throw "API did not become ready within 60 seconds"
}

function Get-Web([string]$Path) {
  $separator = if($Path.Contains("?")) { "&" } else { "?" }
  $url = "$BaseUrl$Path" + $separator + "_cb=" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 10 -Headers @{ "Cache-Control" = "no-cache, no-store"; "Pragma" = "no-cache" }
  if($r.StatusCode -ne 200){throw "$Path returned HTTP $($r.StatusCode)"}
  return $r
}

function Get-ResponseText($Response) {
  if($null -eq $Response.Content) { return "" }
  if($Response.Content -is [byte[]]) {
    return [System.Text.Encoding]::UTF8.GetString($Response.Content)
  }
  return [string]$Response.Content
}

function Parse-JsonResponse($Response, [string]$Label) {
  $text = (Get-ResponseText $Response).TrimStart([char]0xFEFF).Trim()
  try {
    return ConvertFrom-Json -InputObject $text
  } catch {
    $preview = if($text.Length -gt 500) { $text.Substring(0,500) + "..." } else { $text }
    throw "$Label returned invalid JSON. Body preview: $preview"
  }
}

Wait-Api
Write-Host "PASS: Public API reachable" -ForegroundColor Green
$manifestResponse=Get-Web "/manifest.webmanifest"
$manifest=Parse-JsonResponse $manifestResponse "Manifest"
if($manifest.name -ne "CineBooking Pro" -or [string]$manifest.display -ne "standalone") {
  throw "Invalid PWA manifest (name='$($manifest.name)', display='$($manifest.display)')"
}
if(@($manifest.icons | Where-Object { $_.sizes -eq "192x192" }).Count -lt 1) { throw "192x192 icon missing" }
if(@($manifest.icons | Where-Object { $_.sizes -eq "512x512" }).Count -lt 1) { throw "512x512 icon missing" }
if(@($manifest.icons | Where-Object { $_.purpose -eq "maskable" }).Count -lt 1) { throw "Maskable icon missing" }
Write-Host "PASS: Installable manifest exposes 192/512/maskable icons" -ForegroundColor Green

$sw=Get-ResponseText (Get-Web "/sw.js")
if(-not $sw.Contains('const VERSION = "v26"')) { throw "Service worker is not V26" }
if(-not $sw.Contains('cinebooking-shell-${VERSION}')) { throw "Service worker shell-cache naming rule missing" }
if($sw -notmatch '"/offline"' -or $sw -notmatch '"/offline-tickets"') { throw "Offline shell routes missing" }
if($sw -notmatch 'url\.pathname\.startsWith\("/api/"\)') { throw "API responses are not explicitly excluded from SW caching" }
if($sw -notmatch 'SKIP_WAITING') { throw "Service worker update flow missing" }
Write-Host "PASS: Service worker has offline shell, API privacy rule and update flow" -ForegroundColor Green

$offline=Get-Web "/offline"
$offlineTickets=Get-Web "/offline-tickets"
if((Get-ResponseText $offline) -notmatch 'offline' -or (Get-ResponseText $offlineTickets) -notmatch 'offline') { throw "Offline pages did not render" }
Write-Host "PASS: Offline fallback and offline-ticket pages render" -ForegroundColor Green

foreach($icon in @("/icon-192.png","/icon-512.png","/icon-maskable-512.png")) {
  $r=Get-Web $icon
  if([string]$r.Headers["Content-Type"] -notmatch 'image/png') { throw "$icon is not served as PNG" }
}
Write-Host "PASS: PWA PNG icons are served correctly" -ForegroundColor Green

Write-Host ""
Write-Host "ALL V26 PWA SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host ""
Write-Host "Offline QR persistence uses browser IndexedDB, so the final QR-offline check is intentionally a device/browser test." -ForegroundColor DarkGray
