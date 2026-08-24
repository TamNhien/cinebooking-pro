$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'check-demo-52-table-counts.ps1')
exit $LASTEXITCODE
