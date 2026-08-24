$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'seed-demo-56-tables.ps1')
exit $LASTEXITCODE
