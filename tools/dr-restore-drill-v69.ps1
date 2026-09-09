param(
  [Parameter(Mandatory=$true)][string]$BackupFile
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "dr-common-v69.ps1")

Enter-CineBookingProject
$drillDb = $null
$backupId = $null
$drillKey = $null
$started = [DateTimeOffset]::UtcNow
$watch = [System.Diagnostics.Stopwatch]::StartNew()
try {
  Assert-DockerCompose
  Assert-PostgresReady
  [void](Assert-DrV69LiveSchema)
  $info = Get-SafeBackupInfo -BackupFile $BackupFile -MustExist
  $manifest = Read-DrManifest -BackupFullPath $info.FullPath

  & (Join-Path $PSScriptRoot "verify-dr-backup-v69.ps1") -BackupFile $info.FullPath
  if($LASTEXITCODE -ne 0) { throw "Backup did not pass V69 verification" }

  $hash = (Get-FileHash -LiteralPath $info.FullPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $backupId = Get-DrScalar -Sql "select id::text from dr_backup_record where checksum_sha256=$(ConvertTo-DrSqlLiteral $hash) order by recorded_at desc limit 1;"
  if($backupId -notmatch '^[0-9a-fA-F-]{36}$') {
    throw "Backup evidence is not registered in dr_backup_record. Create it with tools/backup-dr-v69.ps1 first."
  }

  $stamp = Get-Date -Format "yyyyMMddHHmmss"
  $drillDb = "cinebooking_drill_$stamp"
  $drillKey = "drill-$stamp-$($hash.Substring(0,12))"
  Write-Host "=== CineBooking V69 non-destructive restore drill ===" -ForegroundColor Cyan
  Write-Host ("Source: {0}" -f $info.FullPath)
  Write-Host ("Temporary database: {0}" -f $drillDb)

  Invoke-Compose -Arguments @("exec","-T","postgres","sh","-lc",("createdb -T template0 -U `"`$POSTGRES_USER`" -O `"`$POSTGRES_USER`" '{0}'" -f $drillDb)) -FailureMessage "Could not create temporary drill database"

  $restoreCommand = 'pg_restore -U "$POSTGRES_USER" -d "{0}" --no-owner --no-privileges --exit-on-error "{1}"' -f $drillDb,$info.ContainerPath
  Invoke-Compose -Arguments @("exec","-T","postgres","sh","-lc",$restoreCommand) -FailureMessage "Restore drill pg_restore failed"

  $restoredFlyway = Get-DrScalar -Database $drillDb -Sql "select version from flyway_schema_history where success=true and version is not null order by installed_rank desc limit 1;"
  $restoredTables = Get-DrScalar -Database $drillDb -Sql "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';"
  $critical = Get-DrScalar -Database $drillDb -Sql "select count(*) from information_schema.tables where table_schema='public' and table_name in ('booking','payment','seat_hold','admin_step_up_grant','dr_backup_record','dr_restore_drill');"
  if(-not ($restoredFlyway -match '^\d+$') -or [int]$restoredFlyway -lt 69) { throw "Restored Flyway version is below V69: $restoredFlyway" }
  if(-not ($restoredTables -match '^\d+$') -or [int]$restoredTables -lt 61) { throw "Restored public table count is below 61: $restoredTables" }
  if($critical -ne '6') { throw "Restored critical catalog is incomplete: $critical/6" }

  $watch.Stop()
  $completed = [DateTimeOffset]::UtcNow
  $backupCreated = [DateTimeOffset]::Parse([string]$manifest.createdAtUtc)
  $rpoSeconds = [Math]::Max(0,[long]($completed - $backupCreated).TotalSeconds)
  $duration = [Math]::Round($watch.Elapsed.TotalSeconds,3)

  $sql = @"
insert into dr_restore_drill(
  drill_key,backup_id,status,started_at,completed_at,restore_duration_seconds,rpo_seconds,
  restored_flyway_version,restored_public_table_count,checksum_verified,critical_catalog_verified,message,evidence_json
) values (
  $(ConvertTo-DrSqlLiteral $drillKey),
  $(ConvertTo-DrSqlLiteral $backupId)::uuid,
  'SUCCESS',
  $(ConvertTo-DrSqlLiteral $started.ToString("o"))::timestamptz,
  $(ConvertTo-DrSqlLiteral $completed.ToString("o"))::timestamptz,
  $duration,
  $rpoSeconds,
  $restoredFlyway,
  $restoredTables,
  true,
  true,
  'Non-destructive V69 restore drill passed',
  jsonb_build_object('criticalCatalogCount',6,'temporaryDatabase',true)
);
"@
  Invoke-DrSql -Sql $sql

  Write-Host ("PASS restore duration: {0:N3}s" -f $duration) -ForegroundColor Green
  Write-Host ("PASS restored Flyway: V{0}" -f $restoredFlyway) -ForegroundColor Green
  Write-Host ("PASS restored public tables: {0}" -f $restoredTables) -ForegroundColor Green
  Write-Host ("PASS critical catalog: {0}/6" -f $critical) -ForegroundColor Green
  Write-Host "V69 RESTORE DRILL PASSED" -ForegroundColor Green
} catch {
  $original = $_
  if($watch.IsRunning) { $watch.Stop() }
  if($backupId -match '^[0-9a-fA-F-]{36}$') {
    try {
      if([string]::IsNullOrWhiteSpace($drillKey)) { $drillKey = "drill-failed-$((Get-Date).ToString('yyyyMMddHHmmss'))" }
      $completed = [DateTimeOffset]::UtcNow
      $message = $original.Exception.Message
      if($message.Length -gt 1000) { $message = $message.Substring(0,1000) }
      $sql = @"
insert into dr_restore_drill(
  drill_key,backup_id,status,started_at,completed_at,checksum_verified,critical_catalog_verified,message,evidence_json
) values (
  $(ConvertTo-DrSqlLiteral $drillKey),
  $(ConvertTo-DrSqlLiteral $backupId)::uuid,
  'FAILED',
  $(ConvertTo-DrSqlLiteral $started.ToString("o"))::timestamptz,
  $(ConvertTo-DrSqlLiteral $completed.ToString("o"))::timestamptz,
  true,
  false,
  $(ConvertTo-DrSqlLiteral $message),
  jsonb_build_object('temporaryDatabase',true)
);
"@
      Invoke-DrSql -Sql $sql
    } catch {
      Write-Host ("WARNING: failed to persist failed-drill evidence: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
    }
  }
  throw $original
} finally {
  if(-not [string]::IsNullOrWhiteSpace($drillDb)) {
    try {
      Invoke-Compose -Arguments @("exec","-T","postgres","sh","-lc",("dropdb --force -U `"`$POSTGRES_USER`" --if-exists '{0}'" -f $drillDb)) -FailureMessage "Could not remove temporary drill database"
      Write-Host ("Temporary drill database removed: {0}" -f $drillDb) -ForegroundColor DarkGray
    } catch {
      Write-Host ("WARNING: temporary drill database cleanup failed: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
    }
  }
  Exit-CineBookingProject
}
