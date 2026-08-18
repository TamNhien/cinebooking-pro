$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V32 Sold-out Waitlist + Seat Alerts diagnostics ==="

powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v31.ps1
if($LASTEXITCODE -ne 0){ throw "V31 diagnostics failed" }

Write-Host "`n=== V32 waitlist verifier ==="
python .\tools\verify_v32_waitlist.py
if($LASTEXITCODE -ne 0){ throw "V32 waitlist verifier failed" }

Write-Host "`n=== Docker Compose config ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "V32 docker compose config failed" }

Write-Host "`nV32 DIAGNOSTICS PASSED"
Write-Host "Next: commit/push V32, confirm CineBooking CI, then run Release Candidate manually with version v32-rc1."
