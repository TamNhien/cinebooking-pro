$ErrorActionPreference = 'Stop'

Write-Host '=== CineBooking V51 real-data analytics refresh ===' -ForegroundColor Cyan
Write-Host 'No movies, cinemas, products, bookings, payments, or fake cost basis are created.' -ForegroundColor Yellow
Write-Host 'Existing data is reused. Missing concession cost remains NULL/unknown.' -ForegroundColor Yellow

$compose = docker compose ps --status running --services
if ($LASTEXITCODE -ne 0) { throw 'docker compose is not available. Start Docker Desktop first.' }
if ($compose -notcontains 'postgres') { throw 'PostgreSQL is not running. Run: docker compose up -d postgres' }

$serverEncoding = (docker compose exec -T postgres psql -At -U cinebooking -d cinebooking -c 'SHOW server_encoding;') | Out-String
if ($LASTEXITCODE -ne 0) { throw 'Could not read PostgreSQL server encoding.' }
$serverEncoding = $serverEncoding.Trim()
if ($serverEncoding -ne 'UTF8') { throw "PostgreSQL server_encoding must be UTF8, found '$serverEncoding'." }
Write-Host 'PostgreSQL server_encoding: UTF8' -ForegroundColor Green

$sql = Join-Path $PSScriptRoot 'seed-v51-real-data.sql'
if (-not (Test-Path $sql)) { throw "SQL file not found: $sql" }

$remoteSql = '/tmp/cinebooking-v51-real-data-utf8.sql'
try {
    docker compose cp $sql "postgres:$remoteSql"
    if ($LASTEXITCODE -ne 0) { throw 'Could not copy UTF-8 SQL to PostgreSQL container.' }
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U cinebooking -d cinebooking -f $remoteSql
    if ($LASTEXITCODE -ne 0) { throw 'V51 real-data refresh failed.' }
}
finally {
    docker compose exec -T postgres rm -f $remoteSql 2>$null | Out-Null
}

Write-Host 'V51 analytics_snapshot refreshed from existing database transactions.' -ForegroundColor Green
Write-Host 'cinema_concession_cost_basis was not fabricated; enter/import only real cost values.' -ForegroundColor Green
