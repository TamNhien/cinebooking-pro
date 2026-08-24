$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$sql = Join-Path $PSScriptRoot 'check-demo-56-table-counts.sql'
if (-not (Test-Path $sql)) { throw "Count SQL not found: $sql" }
$remoteSql='/tmp/cinebooking-counts56.sql'
try {
  docker compose cp $sql "postgres:$remoteSql"
  if ($LASTEXITCODE -ne 0) { throw "Could not copy count SQL." }
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U cinebooking -d cinebooking -f $remoteSql
  if ($LASTEXITCODE -ne 0) { throw "56-table count check failed." }
} finally { docker compose exec -T postgres rm -f $remoteSql 2>$null | Out-Null }
