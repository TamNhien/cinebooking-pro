$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'check-demo-56-table-counts.ps1')
exit $LASTEXITCODE
