$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== CineBooking V58: repair historical synthetic display data ===" -ForegroundColor Cyan
Write-Host "This keeps IDs, relationships, timestamps and audit events; it normalizes only known smoke/E2E display values." -ForegroundColor Yellow
Write-Host "Run seed-reference-57-tables.ps1 first so realistic USER reference accounts are available." -ForegroundColor Yellow

$services = docker compose ps --status running --services
if ($LASTEXITCODE -ne 0 -or $services -notcontains 'postgres') { throw "PostgreSQL service is not running." }
$sql = Join-Path $PSScriptRoot 'repair-realistic-data-57-tables.sql'
if (-not (Test-Path $sql)) { throw "Repair SQL not found: $sql" }
$remote = '/tmp/cinebooking-repair-realistic-57.sql'
try {
  docker compose cp $sql "postgres:$remote"
  if ($LASTEXITCODE -ne 0) { throw "Could not copy repair SQL into PostgreSQL container." }
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U cinebooking -d cinebooking -f $remote
  if ($LASTEXITCODE -ne 0) { throw "Realistic-data repair failed; transaction was rolled back." }
}
finally { docker compose exec -T postgres rm -f $remote 2>$null | Out-Null }
Write-Host "PASS: known historical smoke/E2E display data normalized." -ForegroundColor Green
Write-Host "Next: powershell -ExecutionPolicy Bypass -File .\tools\audit-realistic-data-57-tables.ps1" -ForegroundColor Cyan
