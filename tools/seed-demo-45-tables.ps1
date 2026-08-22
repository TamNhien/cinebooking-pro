$ErrorActionPreference = 'Stop'
Write-Host "Compatibility alias: seed-demo-45-tables.ps1 now runs the V45 47-table seed." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot 'seed-demo-47-tables.ps1')
exit $LASTEXITCODE
