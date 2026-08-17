$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== CineBooking V31 Ticket Wallet + Calendar diagnostics ==="

Write-Host ""
Write-Host "=== V30.2 baseline ==="
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v30.ps1
if($LASTEXITCODE -ne 0){ throw "V30.2 baseline diagnostics failed" }

Write-Host ""
Write-Host "=== V31 ticket wallet + calendar ==="
python .\tools\verify_v31_ticket_wallet.py
if($LASTEXITCODE -ne 0){ throw "V31 ticket-wallet verifier failed" }

Write-Host ""
Write-Host "=== Docker Compose validation ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "V31 docker compose config failed" }
Write-Host "PASS: docker compose config"

Write-Host ""
Write-Host "V31 DIAGNOSTICS PASSED"
Write-Host "Next: commit/push V31, confirm CineBooking CI, then run the Release Candidate workflow with v31-rc1."
