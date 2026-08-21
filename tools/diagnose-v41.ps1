$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V41 diagnostics ===" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v40.ps1
python .\tools\verify_v41_notification_engagement.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "V41 source diagnostics passed." -ForegroundColor Green
Write-Host "Release flow: main CI -> v41.0.0-rc.N -> RC E2E -> v41.0.0 -> GitHub Release"
