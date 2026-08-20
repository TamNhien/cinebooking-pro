$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V39 Seat Map + Booking UX diagnostics ==="
& powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v38.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v39_seat_map_ux.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "PASS: V39 smart seat recommendation, contention guard and server-synced hold UX source checks"
Write-Host "Release flow: main CI -> v39.0.0-rc.N -> RC E2E -> v39.0.0 -> GitHub Release"
