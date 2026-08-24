$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'check-demo-54-table-counts.ps1')
exit $LASTEXITCODE
