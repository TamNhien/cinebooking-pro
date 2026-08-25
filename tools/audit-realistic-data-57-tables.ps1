$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "=== CineBooking V58: audit realistic data across all 57 public tables ===" -ForegroundColor Cyan
$services = docker compose ps --status running --services
if ($LASTEXITCODE -ne 0 -or $services -notcontains 'postgres') { throw "PostgreSQL service is not running." }
$sql = Join-Path $PSScriptRoot 'audit-realistic-data-57-tables.sql'
if (-not (Test-Path $sql)) { throw "Audit SQL not found: $sql" }
$remote='/tmp/cinebooking-audit-realistic-57.sql'
try {
  docker compose cp $sql "postgres:$remote"
  if ($LASTEXITCODE -ne 0) { throw "Could not copy audit SQL into PostgreSQL container." }
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U cinebooking -d cinebooking -f $remote
  if ($LASTEXITCODE -ne 0) { throw "57-table realistic-data audit failed. Review the finding rows above." }
}
finally { docker compose exec -T postgres rm -f $remote 2>$null | Out-Null }
Write-Host "PASS: all 57 tables passed realistic-data and ownership checks." -ForegroundColor Green
