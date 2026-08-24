$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$sql = Join-Path $PSScriptRoot 'check-demo-52-table-counts.sql'
$remoteSql = '/tmp/cinebooking-check-52-tables.sql'
try {
    docker compose cp $sql "postgres:$remoteSql"
    if ($LASTEXITCODE -ne 0) { throw "Could not copy table-count SQL into PostgreSQL container." }
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U cinebooking -d cinebooking -f $remoteSql
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect 52 table row counts." }
}
finally {
    docker compose exec -T postgres rm -f $remoteSql 2>$null | Out-Null
}
