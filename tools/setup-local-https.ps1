param(
  [switch]$InstallMkcert,
  [switch]$ForceCertificate,
  [switch]$Start
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$CertDir = Join-Path $Root "infra\nginx\certs"
$CertFile = Join-Path $CertDir "localhost.pem"
$KeyFile = Join-Path $CertDir "localhost-key.pem"
$BaseCompose = Join-Path $Root "docker-compose.yml"
$HttpsCompose = Join-Path $Root "docker-compose.https.yml"
$EnvFile = Join-Path $Root ".env"

function Resolve-Mkcert {
  $cmd = Get-Command mkcert -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $wingetLink = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\mkcert.exe"
  if (Test-Path $wingetLink) { return $wingetLink }

  return $null
}

if (-not (Test-Path $HttpsCompose)) {
  throw "docker-compose.https.yml not found at $HttpsCompose"
}

if (-not (Test-Path $EnvFile)) {
  Write-Host ".env not found. Creating it with a new JWT secret..." -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot "init-env.ps1")
}

$mkcert = Resolve-Mkcert
if (-not $mkcert -and $InstallMkcert) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "mkcert is missing and winget is unavailable. Install mkcert manually, then run this script again."
  }

  Write-Host "Installing mkcert with winget..." -ForegroundColor Cyan
  $wingetPath = $winget.Source
  & $wingetPath install --id FiloSottile.mkcert -e --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "winget failed to install mkcert (exit $LASTEXITCODE)." }
  $mkcert = Resolve-Mkcert
}

if (-not $mkcert) {
  throw "mkcert is not installed. Run: winget install --id FiloSottile.mkcert -e, then rerun this script; or rerun with -InstallMkcert."
}

New-Item -ItemType Directory -Force -Path $CertDir | Out-Null

Write-Host "Installing/trusting the local mkcert CA..." -ForegroundColor Cyan
& $mkcert -install
if ($LASTEXITCODE -ne 0) { throw "mkcert -install failed (exit $LASTEXITCODE)." }

if ($ForceCertificate) {
  Remove-Item $CertFile,$KeyFile -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $CertFile) -or -not (Test-Path $KeyFile)) {
  Write-Host "Generating localhost TLS certificate..." -ForegroundColor Cyan
  & $mkcert -cert-file $CertFile -key-file $KeyFile "localhost" "127.0.0.1" "::1"
  if ($LASTEXITCODE -ne 0) { throw "mkcert certificate generation failed (exit $LASTEXITCODE)." }
} else {
  Write-Host "Existing localhost certificate found; keeping it." -ForegroundColor DarkGray
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  throw "Docker CLI is not available. Start Docker Desktop and ensure docker.exe is on PATH."
}

Push-Location $Root
try {
  Write-Host "Validating HTTPS Compose configuration..." -ForegroundColor Cyan
  $dockerPath = $docker.Source
  & $dockerPath compose -f $BaseCompose -f $HttpsCompose config | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "docker compose config failed (exit $LASTEXITCODE)." }

  if ($Start) {
    Write-Host "Starting CineBooking with trusted local HTTPS..." -ForegroundColor Cyan
    & $dockerPath compose -f $BaseCompose -f $HttpsCompose up -d --build
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed (exit $LASTEXITCODE)." }

    & $dockerPath compose -f $BaseCompose -f $HttpsCompose ps
  }
} finally {
  Pop-Location
}

Write-Host "Local HTTPS is configured." -ForegroundColor Green
Write-Host "Open: https://localhost" -ForegroundColor Green
Write-Host "HTTP requests to http://localhost redirect to HTTPS when the HTTPS override is running." -ForegroundColor Green
if (-not $Start) {
  Write-Host "Start it with:" -ForegroundColor Yellow
  Write-Host "docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build" -ForegroundColor Yellow
}
