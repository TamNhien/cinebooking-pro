$ErrorActionPreference = 'Stop'

$sql = Join-Path $PSScriptRoot 'check-v51-data-utf8.sql'
if (-not (Test-Path $sql)) { throw "SQL file not found: $sql" }

$remoteSql = '/tmp/cinebooking-v51-data-utf8-check.sql'
try {
    docker compose cp $sql "postgres:$remoteSql"
    if ($LASTEXITCODE -ne 0) { throw 'Could not copy UTF-8 validation SQL.' }
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U cinebooking -d cinebooking -f $remoteSql
    if ($LASTEXITCODE -ne 0) { throw 'V51 database/UTF-8 validation failed.' }
}
finally {
    docker compose exec -T postgres rm -f $remoteSql 2>$null | Out-Null
}

Write-Host 'V51 database, real-data and UTF-8 validation passed.' -ForegroundColor Green
