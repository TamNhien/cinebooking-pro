$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== CineBooking V30 Movie Discovery + Showtime Calendar diagnostics ==="

Write-Host ""
Write-Host "=== V29.3 baseline ==="
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1
if($LASTEXITCODE -ne 0){ throw "V29.3 baseline diagnostics failed" }

Write-Host ""
Write-Host "=== V30 discovery + showtime calendar ==="
python .\tools\verify_v30_discovery_showtimes.py
if($LASTEXITCODE -ne 0){ throw "V30 discovery/showtime verifier failed" }

Write-Host ""
Write-Host "=== Docker Compose validation ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "V30 docker compose config failed" }
Write-Host "PASS: docker compose config"

Write-Host ""
Write-Host "V30 DIAGNOSTICS PASSED"
Write-Host "Next: commit/push V30, confirm CineBooking CI, then run the Release Candidate workflow for browser E2E smoke."
