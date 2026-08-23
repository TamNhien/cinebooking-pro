$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== CineBooking V47: realistic reference data across all 50 pgAdmin tables ===" -ForegroundColor Cyan
Write-Host "UTF-8 safe mode: SQL is copied into PostgreSQL container; no PowerShell text pipe is used." -ForegroundColor Cyan
Write-Host "Movies: reuse the 8 canonical V29 movies; no synthetic movies are created." -ForegroundColor Yellow
Write-Host "flyway_schema_history: real Flyway rows only; never seeded." -ForegroundColor Yellow
Write-Host "V47 payment operations: payment_event receives 10 deterministic local-history rows; V46 security rows remain covered." -ForegroundColor Cyan

$compose = docker compose ps --status running --services
if ($LASTEXITCODE -ne 0) {
    throw "docker compose is not available. Start Docker Desktop first."
}
if ($compose -notcontains 'postgres') {
    throw "PostgreSQL service is not running. Run: docker compose up -d postgres"
}

$serverEncoding = (docker compose exec -T postgres psql -At -U cinebooking -d cinebooking -c "SHOW server_encoding;") | Out-String
if ($LASTEXITCODE -ne 0) {
    throw "Could not read PostgreSQL server encoding."
}
$serverEncoding = $serverEncoding.Trim()
if ($serverEncoding -ne 'UTF8') {
    throw "PostgreSQL server_encoding must be UTF8, but is '$serverEncoding'."
}
Write-Host "PostgreSQL server_encoding: UTF8" -ForegroundColor Green

$sql = Join-Path $PSScriptRoot 'seed-demo-50-tables-10-rows.sql'
if (-not (Test-Path $sql)) {
    throw "Seed SQL not found: $sql"
}

$remoteSql = '/tmp/cinebooking-reference50-utf8.sql'
try {
    docker compose cp $sql "postgres:$remoteSql"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not copy UTF-8 seed SQL into PostgreSQL container."
    }

    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U cinebooking -d cinebooking -f $remoteSql
    if ($LASTEXITCODE -ne 0) {
        throw "Seed/repair failed. PostgreSQL rolled back the transaction."
    }
}
finally {
    docker compose exec -T postgres rm -f $remoteSql 2>$null | Out-Null
}

Write-Host "Seed/repair completed successfully." -ForegroundColor Green
Write-Host "All 50 pgAdmin tables now have data; Flyway history remains genuine." -ForegroundColor Green
Write-Host "customer_support_case: 10 realistic support cases." -ForegroundColor Green
Write-Host "customer_support_case_event: 10 immutable support events." -ForegroundColor Green
Write-Host "trusted_device: 10 realistic device records." -ForegroundColor Green
Write-Host "security_alert: 10 risk-scored security alerts." -ForegroundColor Green
Write-Host "Vietnamese reference data was refreshed from UTF-8 source." -ForegroundColor Green
Write-Host "No synthetic movie rows are added; relations reuse the 8 canonical movies." -ForegroundColor Green
Write-Host "Reference accounts: an.nguyen@cinebooking.local ... chau.ho@cinebooking.local" -ForegroundColor Green
Write-Host "Shared password: CineBooking@123" -ForegroundColor Green
