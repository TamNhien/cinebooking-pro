$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Keep console literals ASCII-only so this script is safe in Windows PowerShell 5.1
# as well as PowerShell 7 without requiring a UTF-8 BOM.
Write-Host "=== CineBooking V77.0.10: Vietnamese display-data localizer ===" -ForegroundColor Cyan
Write-Host "Only known mutable display text is normalized. Machine enums, IDs, timestamps, business codes and immutable ledger history are preserved." -ForegroundColor Yellow

$services = docker compose ps --status running --services
if ($LASTEXITCODE -ne 0 -or $services -notcontains 'postgres') { throw "PostgreSQL is not running." }
$sql = Join-Path $PSScriptRoot 'localize-vietnamese-display-data-v77-0-9.sql'
if (-not (Test-Path $sql)) { throw "SQL file not found: $sql" }
$remote = '/tmp/cinebooking-v77-0-10-localize-vi.sql'
try {
  docker compose cp $sql "postgres:$remote"
  if ($LASTEXITCODE -ne 0) { throw "Could not copy localization SQL into PostgreSQL container." }
  docker compose exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/cinebooking-v77-0-10-localize-vi.sql'
  if ($LASTEXITCODE -ne 0) { throw "Vietnamese display-data localization failed; transaction was rolled back." }
}
finally { docker compose exec -T postgres rm -f $remote 2>$null | Out-Null }
Write-Host "PASS: mutable display data was normalized to Vietnamese; immutable ledger history was preserved." -ForegroundColor Green
