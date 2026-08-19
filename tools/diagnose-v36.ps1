$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== CineBooking V36 secure ticket transfer diagnostics ==="
Write-Host "1) Chain V35 diagnostics"
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v35.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2) Verify V36 secure ticket transfer"
python .\tools\verify_v36_ticket_transfer.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3) Validate Docker Compose"
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "V36 DIAGNOSTICS PASSED"
Write-Host "Release flow: main CI -> v36.0.0-rc.N -> RC E2E -> v36.0.0 -> GitHub Release"
