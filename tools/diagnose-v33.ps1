$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V33 Showtime Planner + Conflict Guard diagnostics ==="

powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v32.ps1
if($LASTEXITCODE -ne 0){ throw "V32 diagnostics failed" }

Write-Host "`n=== V33 showtime planner verifier ==="
python .\tools\verify_v33_showtime_planner.py
if($LASTEXITCODE -ne 0){ throw "V33 showtime planner verifier failed" }

Write-Host "`n=== Docker Compose config ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "V33 docker compose config failed" }

Write-Host "`nV33 DIAGNOSTICS PASSED"
Write-Host "Next: commit/push V33, confirm CineBooking CI, then run Release Candidate manually with version v33-rc1."
