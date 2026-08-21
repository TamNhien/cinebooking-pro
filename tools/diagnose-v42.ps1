$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V42 diagnostics ===" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v41.ps1
python .\tools\verify_v42_financial_ledger.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "V42 source diagnostics passed." -ForegroundColor Green
Write-Host "Release flow: main CI -> v42.0.0-rc.N -> RC E2E -> v42.0.0 -> GitHub Release"
