$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'check-demo-57-table-counts.ps1')
exit $LASTEXITCODE
