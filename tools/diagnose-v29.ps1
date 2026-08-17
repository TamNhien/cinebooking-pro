$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== CineBooking V29.3 Release Candidate + Playwright E2E + demo schedule diagnostics ==="

Write-Host ""
Write-Host "=== V28.8 baseline ==="
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
if($LASTEXITCODE -ne 0){ throw "V28.8 baseline diagnostics failed" }

Write-Host ""
Write-Host "=== V29 release-candidate readiness ==="
python .\tools\verify_v29_release_candidate.py
if($LASTEXITCODE -ne 0){ throw "V29 release-candidate verifier failed" }

Write-Host ""
Write-Host "=== V29.1 checkout compatibility ==="
python .\tools\verify_v29_1_checkout_compat.py
if($LASTEXITCODE -ne 0){ throw "V29.1 checkout compatibility verifier failed" }

Write-Host ""
Write-Host "=== V29.2 Playwright E2E structure ==="
python .\tools\verify_v29_2_playwright_e2e.py
if($LASTEXITCODE -ne 0){ throw "V29.2 Playwright E2E verifier failed" }

Write-Host ""
Write-Host "=== V29.3 demo catalog + September schedule ==="
python .\tools\verify_v29_3_demo_schedule.py
if($LASTEXITCODE -ne 0){ throw "V29.3 demo schedule verifier failed" }

Write-Host ""
Write-Host "=== V29 Docker Compose validation ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "V29 docker compose config failed" }
Write-Host "PASS: docker compose config"

Write-Host ""
Write-Host "V29.3 DIAGNOSTICS PASSED"
Write-Host "Release Candidate workflow is manual-only and does not publish images or deploy production."
Write-Host "Next: commit/push V29.3, confirm normal CineBooking CI, then manually run 'CineBooking Release Candidate' with version v29.3-rc1. The RC includes Playwright and the demo schedule through 2026-09-30."
