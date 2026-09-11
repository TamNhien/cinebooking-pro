$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'localize-vietnamese-display-data-v77-0-9.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
