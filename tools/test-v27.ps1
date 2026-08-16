param(
  [switch]$KeepBackup
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "db-common.ps1")

Enter-CineBookingProject
$testDb = ""
$backupInfo = $null
$sourceHasFlyway = $false
$probeFiles = @()
try {
  Assert-DockerCompose
  Assert-PostgresReady

  Write-Host "=== CineBooking V27.2 non-destructive restore smoke test ===" -ForegroundColor Cyan

  $sourceFlywayProbe = 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "SELECT CASE WHEN to_regclass(''public.flyway_schema_history'') IS NULL THEN ''missing'' ELSE ''present'' END;" | grep -qx present'
  & docker compose exec -T postgres sh -lc $sourceFlywayProbe *> $null
  $sourceHasFlyway = ($LASTEXITCODE -eq 0)

  $stamp = Get-Date -Format "yyyyMMddHHmmss"
  $backupPath = ".\backups\v27-smoke-$stamp.dump"

  & (Join-Path $PSScriptRoot "backup-db.ps1") -OutputFile $backupPath
  if($LASTEXITCODE -ne 0) { throw "Smoke-test backup failed" }
  $backupInfo = Get-SafeBackupInfo -BackupFile $backupPath -MustExist

  $testDb = "cinebooking_v27_test_$stamp"
  if($testDb -notmatch '^[a-z0-9_]+$') { throw "Unsafe temporary database name" }

  Write-Host ("Creating temporary restore database: {0}" -f $testDb) -ForegroundColor Yellow
  $createCommand = 'createdb -T template0 -U "$POSTGRES_USER" -O "$POSTGRES_USER" "{0}"' -f $testDb
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", $createCommand) -FailureMessage "Could not create temporary test database"

  $restoreCommand = 'pg_restore -U "$POSTGRES_USER" -d "{0}" --no-owner --no-privileges --exit-on-error "{1}"' -f $testDb,$backupInfo.ContainerPath
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", $restoreCommand) -FailureMessage "Round-trip pg_restore failed"

  # PowerShell 5.1 can corrupt nested shell quoting around SQL such as count(*).
  # Put the SQL in the already-mounted /backups directory and let psql read it with -f.
  # This keeps SQL syntax out of the sh -lc command line entirely.
  $probeDir = Split-Path -Parent $backupInfo.FullPath
  $probeSqlName = "v27-table-count-$stamp.sql"
  $sourceCountName = "v27-source-count-$stamp.txt"
  $restoredCountName = "v27-restored-count-$stamp.txt"
  $probeSqlPath = Join-Path $probeDir $probeSqlName
  $sourceCountPath = Join-Path $probeDir $sourceCountName
  $restoredCountPath = Join-Path $probeDir $restoredCountName
  $probeFiles = @($probeSqlPath, $sourceCountPath, $restoredCountPath)

  $probeSql = "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';`r`n"
  [System.IO.File]::WriteAllText($probeSqlPath, $probeSql, [System.Text.Encoding]::ASCII)

  $sourceCountCommand = 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -f "/backups/{0}" -o "/backups/{1}"' -f $probeSqlName,$sourceCountName
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", $sourceCountCommand) -FailureMessage "Could not count public tables in the source database"

  $restoredCountCommand = 'psql -U "$POSTGRES_USER" -d "{0}" -At -v ON_ERROR_STOP=1 -f "/backups/{1}" -o "/backups/{2}"' -f $testDb,$probeSqlName,$restoredCountName
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", $restoredCountCommand) -FailureMessage "Could not count public tables in the temporary restore database"

  if(-not (Test-Path -LiteralPath $sourceCountPath -PathType Leaf)) { throw "Source table-count result file was not created" }
  if(-not (Test-Path -LiteralPath $restoredCountPath -PathType Leaf)) { throw "Restored table-count result file was not created" }

  $sourceCountText = (Get-Content -LiteralPath $sourceCountPath -Raw).Trim()
  $restoredCountText = (Get-Content -LiteralPath $restoredCountPath -Raw).Trim()
  $sourceCount = 0
  $restoredCount = 0
  if(-not [int]::TryParse($sourceCountText, [ref]$sourceCount)) { throw "Invalid source public-table count: '$sourceCountText'" }
  if(-not [int]::TryParse($restoredCountText, [ref]$restoredCount)) { throw "Invalid restored public-table count: '$restoredCountText'" }
  if($sourceCount -lt 1) { throw "Source database unexpectedly has no public base tables" }
  if($restoredCount -ne $sourceCount) { throw "Temporary restore public-table count mismatch. Source=$sourceCount Restored=$restoredCount" }
  Write-Host ("PASS: restored public-table count matches source ({0} tables)" -f $sourceCount) -ForegroundColor Green

  if($sourceHasFlyway) {
    $restoredFlywayProbe = 'psql -U "$POSTGRES_USER" -d "{0}" -At -v ON_ERROR_STOP=1 -c "SELECT CASE WHEN to_regclass(''public.flyway_schema_history'') IS NULL THEN ''missing'' ELSE ''present'' END;" | grep -qx present' -f $testDb
    Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", $restoredFlywayProbe) -FailureMessage "Source had Flyway metadata but restored test database does not"
    Write-Host "PASS: Flyway schema history round-tripped" -ForegroundColor Green
  } else {
    Write-Host "WARN: source database has no confirmed flyway_schema_history; Flyway metadata check skipped for round-trip equivalence." -ForegroundColor Yellow
  }

  Write-Host "PASS: production database was not dropped or recreated" -ForegroundColor Green
  Write-Host "ALL V27.2 DATABASE SAFETY TESTS PASSED" -ForegroundColor Green
} finally {
  if(-not [string]::IsNullOrWhiteSpace($testDb)) {
    Write-Host ("Removing temporary database: {0}" -f $testDb) -ForegroundColor DarkGray
    $dropCommand = 'dropdb --force -U "$POSTGRES_USER" --if-exists "{0}"' -f $testDb
    & docker compose exec -T postgres sh -lc $dropCommand *> $null
  }
  foreach($probeFile in $probeFiles) {
    Remove-Item -LiteralPath $probeFile -Force -ErrorAction SilentlyContinue
  }
  if(($null -ne $backupInfo) -and (-not $KeepBackup)) {
    Remove-Item -LiteralPath $backupInfo.FullPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $backupInfo.ShaPath -Force -ErrorAction SilentlyContinue
  }
  Exit-CineBookingProject
}
