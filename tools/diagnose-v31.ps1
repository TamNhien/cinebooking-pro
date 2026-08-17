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
Write-Host "=== V31.1 lint purity hotfix ==="
python .\tools\verify_v31_1_lint_purity.py
if($LASTEXITCODE -ne 0){ throw "V31.1 lint-purity verifier failed" }

Write-Host ""
Write-Host "=== V31.2 RC determinism hotfix ==="
python .\tools\verify_v31_2_rc_determinism.py
if($LASTEXITCODE -ne 0){ throw "V31.2 RC-determinism verifier failed" }

Write-Host ""
Write-Host "=== Docker Compose validation ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "V31 docker compose config failed" }
Write-Host "PASS: docker compose config"

Write-Host ""
Write-Host "V31.2 DIAGNOSTICS PASSED"
Write-Host "Next: commit/push V31.2, confirm CineBooking CI, then run the Release Candidate workflow with v31.2-rc1."
