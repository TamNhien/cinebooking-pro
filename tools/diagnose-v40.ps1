$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V40 Loyalty + Membership 2.0 diagnostics ==="
& powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v39.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v40_loyalty_membership.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "PASS: V40 lifetime tier, point-lot expiry, reward wallet, birthday benefit and audited loyalty operations source checks"
Write-Host "Release flow: main CI -> v40.0.0-rc.N -> RC E2E -> v40.0.0 -> GitHub Release"
