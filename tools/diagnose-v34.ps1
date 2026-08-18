$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V34 Auditorium Maintenance + Blackout diagnostics ==="

powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v33.ps1
if($LASTEXITCODE -ne 0){ throw "V33 diagnostics failed" }

Write-Host "`n=== V34 auditorium blackout verifier ==="
python .\tools\verify_v34_auditorium_blackouts.py
if($LASTEXITCODE -ne 0){ throw "V34 auditorium blackout verifier failed" }

Write-Host "`n=== Docker Compose config ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "V34 docker compose config failed" }

Write-Host "`nV34 DIAGNOSTICS PASSED"
Write-Host "Next: commit/push V34, confirm CineBooking CI, then run Release Candidate manually with version v34-rc1."
