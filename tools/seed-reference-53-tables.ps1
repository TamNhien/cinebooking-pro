$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'seed-demo-53-tables.ps1')
exit $LASTEXITCODE
