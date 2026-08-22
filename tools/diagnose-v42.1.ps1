$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V42.1 diagnostics ===" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v42.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v42_1_analytics_export.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "V42.1 source diagnostics passed." -ForegroundColor Green
Write-Host "Release flow: main CI -> v42.1.0-rc.N -> RC source gate + Docker smoke + E2E -> v42.1.0 -> GitHub Release"
