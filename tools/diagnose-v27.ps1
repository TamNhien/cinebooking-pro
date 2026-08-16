$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "db-common.ps1")

Enter-CineBookingProject
try {
  Write-Host "=== CineBooking V27.2 data-safety diagnostics ===" -ForegroundColor Cyan
  Assert-DockerCompose

  Write-Host ""
  Write-Host "=== Docker services ===" -ForegroundColor Yellow
  Invoke-Compose -Arguments @("ps")
  Assert-PostgresReady

  Write-Host ""
  Write-Host "=== PostgreSQL backup tooling ===" -ForegroundColor Yellow
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "pg_dump", "--version") -FailureMessage "pg_dump is unavailable"
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "pg_restore", "--version") -FailureMessage "pg_restore is unavailable"

  Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", 'test -d /backups && test -w /backups') -FailureMessage "Container /backups mount is missing or not writable"
  Write-Host "PASS: /backups is mounted and writable" -ForegroundColor Green

  Write-Host ""
  Write-Host "=== Active database ===" -ForegroundColor Yellow
  Invoke-Compose -Arguments @(
    "exec", "-T", "postgres", "sh", "-lc",
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "SELECT current_database() || ''|'' || pg_size_pretty(pg_database_size(current_database()));"'
  ) -FailureMessage "Could not query database metadata"
  Write-Host "PASS: database query succeeded" -ForegroundColor Green

  $flywayProbe = 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "SELECT CASE WHEN to_regclass(''public.flyway_schema_history'') IS NULL THEN ''missing'' ELSE ''present'' END;" | grep -qx present'
  & docker compose exec -T postgres sh -lc $flywayProbe *> $null
  if($LASTEXITCODE -eq 0) {
    Write-Host "PASS: Flyway schema history present" -ForegroundColor Green
  } else {
    Write-Host "WARN: flyway_schema_history was not confirmed. Backup/restore can still be tested safely; the smoke test will treat Flyway metadata as optional when it is absent in the source database." -ForegroundColor Yellow
  }

  Write-Host ""
  Write-Host "V27.2 DIAGNOSTICS PASSED" -ForegroundColor Green
  Write-Host "Safe next command: powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1"
} finally {
  Exit-CineBookingProject
}
