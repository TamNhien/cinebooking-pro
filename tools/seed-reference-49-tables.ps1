$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'seed-demo-49-tables.ps1')
exit $LASTEXITCODE
