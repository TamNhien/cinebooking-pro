param(
  [ValidateSet('backend-1','backend-2')][string]$Target = 'backend-1',
  [string]$BaseUrl = 'https://localhost',
  [int]$Attempts = 6,
  [int]$DelaySeconds = 2,
  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Compose = @('-f','docker-compose.yml','-f','docker-compose.https.yml')
$ProbeUrl = ($BaseUrl.TrimEnd('/') + '/api/movies')

function Invoke-Compose([string[]]$Args) {
  & docker compose @Compose @Args
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed: $($Args -join ' ')" }
}

function Invoke-Probe {
  param([string]$Url)
  if ($Url -notmatch '^https?://(localhost|127\.0\.0\.1)(:\d+)?/') {
    throw 'V74 failover drill only permits loopback BaseUrl.'
  }
  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 10
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
  }
  catch { return $false }
}

Write-Host '=== CineBooking V74 controlled failover drill ===' -ForegroundColor Cyan
Write-Host "Target replica : $Target"
Write-Host "Probe URL      : $ProbeUrl"
Write-Host 'Safety         : one backend only; no volume deletion; target restarted in finally'

if (-not $Execute) {
  Write-Host ''
  Write-Host 'PLAN ONLY - no container will be stopped.' -ForegroundColor Yellow
  Write-Host "Run with -Execute only during a controlled maintenance window."
  exit 0
}

Invoke-Compose @('ps',$Target)
if (-not (Invoke-Probe -Url $ProbeUrl)) { throw "Baseline probe failed before failover: $ProbeUrl" }

$stopped = $false
try {
  Write-Host "Stopping $Target ..." -ForegroundColor Yellow
  Invoke-Compose @('stop',$Target)
  $stopped = $true

  $success = 0
  for ($i = 1; $i -le [Math]::Max(1,$Attempts); $i++) {
    if (Invoke-Probe -Url $ProbeUrl) {
      $success++
      Write-Host "[PASS] surviving replica served probe $i/$Attempts" -ForegroundColor Green
    }
    else {
      Write-Host "[WARN] probe $i/$Attempts failed while $Target was stopped" -ForegroundColor Yellow
    }
    if ($i -lt $Attempts) { Start-Sleep -Seconds ([Math]::Max(1,$DelaySeconds)) }
  }
  if ($success -lt [Math]::Max(2,[Math]::Ceiling($Attempts * 0.8))) {
    throw "Failover availability check failed: $success/$Attempts successful probes"
  }
  Write-Host "V74 FAILOVER DRILL PASSED: $success/$Attempts probes served with $Target stopped." -ForegroundColor Green
}
finally {
  if ($stopped) {
    Write-Host "Restarting $Target ..." -ForegroundColor Cyan
    Invoke-Compose @('start',$Target)
    for ($i = 1; $i -le 30; $i++) {
      $state = (& docker compose @Compose ps --status running --services) -join "`n"
      if ($state -match [regex]::Escape($Target)) { break }
      Start-Sleep -Seconds 2
    }
    Write-Host "$Target restart requested; verify docker compose ps before closing the drill." -ForegroundColor Green
  }
}
