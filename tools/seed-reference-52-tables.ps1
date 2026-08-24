$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'seed-demo-52-tables.ps1')
exit $LASTEXITCODE
