$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'check-demo-53-table-counts.ps1')
exit $LASTEXITCODE
