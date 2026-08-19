$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== CineBooking V35 release lifecycle diagnostics ==="
Write-Host "1) Chain V34 diagnostics"
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v34.ps1

Write-Host "2) Verify V35 automated release lifecycle"
python .\tools\verify_v35_release_lifecycle.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3) Verify GitHub Actions setup-node compatibility"
python .\tools\verify_v35_setup_node_compat.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "V35 DIAGNOSTICS PASSED"
Write-Host "Release flow: main CI -> vMAJOR.MINOR.PATCH-rc.N -> RC E2E -> vMAJOR.MINOR.PATCH -> GitHub Release"
