$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== CineBooking V29 Release Candidate diagnostics ==="

Write-Host ""
Write-Host "=== V28.8 baseline ==="
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
if($LASTEXITCODE -ne 0){ throw "V28.8 baseline diagnostics failed" }

Write-Host ""
Write-Host "=== V29 release-candidate readiness ==="
python .\tools\verify_v29_release_candidate.py
if($LASTEXITCODE -ne 0){ throw "V29 release-candidate verifier failed" }

Write-Host ""
Write-Host "=== V29 Docker Compose validation ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "V29 docker compose config failed" }
Write-Host "PASS: docker compose config"

Write-Host ""
Write-Host "V29 DIAGNOSTICS PASSED"
Write-Host "Release Candidate workflow is manual-only and does not publish images or deploy production."
Write-Host "Next: commit/push V29, confirm normal CineBooking CI, then manually run 'CineBooking Release Candidate' with version v29-rc1."
