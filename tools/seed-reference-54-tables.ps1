$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'seed-demo-54-tables.ps1')
exit $LASTEXITCODE
