$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== CineBooking V37 payment gateway diagnostics ==="
Write-Host "1) Chain V36 diagnostics"
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v36.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2) Verify V37 payment gateway hardening"
python .\tools\verify_v37_payment_gateway.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3) Validate Docker Compose"
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "V37 DIAGNOSTICS PASSED"
Write-Host "Release flow: main CI -> v37.0.0-rc.N -> RC E2E -> v37.0.0 -> GitHub Release"
Write-Host "Real VNPay/MoMo credentials must stay in .env or CI secrets, never in Git."
