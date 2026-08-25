$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'seed-demo-57-tables.ps1')
exit $LASTEXITCODE
