$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'check-demo-50-table-counts.ps1')
exit $LASTEXITCODE
