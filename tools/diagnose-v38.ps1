$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V38 diagnostics ==="
& powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v37.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v38_refund_automation.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "PASS: V38 refund/cancellation automation source checks"
Write-Host "Release flow: main CI -> v38.0.0-rc.N -> RC E2E -> v38.0.0 -> GitHub Release"
