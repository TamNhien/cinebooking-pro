$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== CineBooking V51: realistic reference data across all 56 pgAdmin tables ===" -ForegroundColor Cyan
Write-Host "CI/reference fixture only: for an existing real database use tools/seed-v51-real-data.ps1 instead." -ForegroundColor Yellow
Write-Host "UTF-8 safe mode: SQL is copied into PostgreSQL container; no PowerShell text pipe is used." -ForegroundColor Cyan
Write-Host "Movies: reuse the 8 canonical V29 movies; no synthetic movies are created." -ForegroundColor Yellow
Write-Host "flyway_schema_history: real Flyway rows only; never seeded." -ForegroundColor Yellow
Write-Host "V51 analytics: cost basis + scheduled snapshots are seeded; V50 taste controls, V49 planner, V48 inventory and V47 payment history remain covered." -ForegroundColor Cyan

$compose = docker compose ps --status running --services
if ($LASTEXITCODE -ne 0) { throw "docker compose is not available. Start Docker Desktop first." }
if ($compose -notcontains 'postgres') { throw "PostgreSQL service is not running. Run: docker compose up -d postgres" }

$serverEncoding = (docker compose exec -T postgres psql -At -U cinebooking -d cinebooking -c "SHOW server_encoding;") | Out-String
if ($LASTEXITCODE -ne 0) { throw "Could not read PostgreSQL server encoding." }
$serverEncoding = $serverEncoding.Trim()
if ($serverEncoding -ne 'UTF8') { throw "PostgreSQL server_encoding must be UTF8, but is '$serverEncoding'." }
Write-Host "PostgreSQL server_encoding: UTF8" -ForegroundColor Green

$sql = Join-Path $PSScriptRoot 'seed-demo-56-tables-10-rows.sql'
if (-not (Test-Path $sql)) { throw "Seed SQL not found: $sql" }

$remoteSql = '/tmp/cinebooking-reference56-utf8.sql'
try {
    docker compose cp $sql "postgres:$remoteSql"
    if ($LASTEXITCODE -ne 0) { throw "Could not copy UTF-8 seed SQL into PostgreSQL container." }
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U cinebooking -d cinebooking -f $remoteSql
    if ($LASTEXITCODE -ne 0) { throw "Seed/repair failed. PostgreSQL rolled back the transaction." }
}
finally {
    docker compose exec -T postgres rm -f $remoteSql 2>$null | Out-Null
}

Write-Host "Seed/repair completed successfully." -ForegroundColor Green
Write-Host "All 56 pgAdmin tables now have data; Flyway history remains genuine." -ForegroundColor Green
Write-Host "recommendation_feedback: 10 deterministic MORE/LESS/HIDE taste controls." -ForegroundColor Green
Write-Host "showtime_planning_run: 10 realistic smart-planner audit runs." -ForegroundColor Green
Write-Host "trusted_device/security_alert: 10 realistic security records each." -ForegroundColor Green
Write-Host "No synthetic movie rows are added; relations reuse the 8 canonical movies." -ForegroundColor Green
Write-Host "Reference accounts: an.nguyen@cinebooking.local ... chau.ho@cinebooking.local" -ForegroundColor Green
Write-Host "Shared password: CineBooking@123" -ForegroundColor Green
