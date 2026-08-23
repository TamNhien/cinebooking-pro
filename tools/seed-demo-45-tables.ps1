$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "seed-demo-50-tables.ps1")
exit $LASTEXITCODE
