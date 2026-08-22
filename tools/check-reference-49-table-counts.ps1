$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'check-demo-49-table-counts.ps1')
exit $LASTEXITCODE
