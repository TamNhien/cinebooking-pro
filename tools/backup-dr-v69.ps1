param(
  [string]$OutputFile = "",
  [int]$RetentionDays = 0,
  [switch]$SkipRetention
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "dr-common-v69.ps1")

Enter-CineBookingProject
try {
  Assert-DockerCompose
  Assert-PostgresReady
  $schema = Assert-DrV69LiveSchema

  if($RetentionDays -le 0) {
    $configured = if($env:DR_BACKUP_RETENTION_DAYS -match '^\d+$') { [int]$env:DR_BACKUP_RETENTION_DAYS } else { 30 }
    $RetentionDays = [Math]::Max(1,[Math]::Min(3650,$configured))
  }
  if([string]::IsNullOrWhiteSpace($OutputFile)) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputFile = ".\backups\cinebooking-v69-$stamp.dump"
  }
  $info = Get-SafeBackupInfo -BackupFile $OutputFile

  Write-Host "=== CineBooking V69 Backup & DR 5.0 ===" -ForegroundColor Cyan
  Write-Host ("Target: {0}" -f $info.FullPath)

  & (Join-Path $PSScriptRoot "backup-db.ps1") -OutputFile $info.FullPath
  if($LASTEXITCODE -ne 0) { throw "Base database backup failed" }

  $created = [DateTimeOffset]::UtcNow
  $verified = [DateTimeOffset]::UtcNow
  $retentionUntil = $created.AddDays($RetentionDays)
  $hash = (Get-FileHash -LiteralPath $info.FullPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $size = (Get-Item -LiteralPath $info.FullPath).Length
  $commit = Get-DrGitCommit
  $backupKey = "v69-{0}-{1}" -f $created.ToString("yyyyMMddHHmmss"), $hash.Substring(0,12)

  $manifest = [ordered]@{
    manifestVersion = 1
    strategyVersion = $script:DrStrategyVersion
    backupKey = $backupKey
    backupFile = $info.Name
    sha256 = $hash
    sizeBytes = $size
    latestFlywayVersion = $schema.FlywayVersion
    publicTableCount = $schema.PublicTableCount
    sourceCommit = $commit
    createdAtUtc = $created.ToString("o")
    verifiedAtUtc = $verified.ToString("o")
    retentionUntilUtc = $retentionUntil.ToString("o")
  }
  $manifestPath = Get-DrManifestPath -BackupFullPath $info.FullPath
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($manifestPath,($manifest | ConvertTo-Json -Depth 4) + "`n",$utf8)

  & (Join-Path $PSScriptRoot "verify-dr-backup-v69.ps1") -BackupFile $info.FullPath
  if($LASTEXITCODE -ne 0) { throw "V69 DR backup verification failed" }

  $sql = @"
insert into dr_backup_record(
  backup_key,storage_name,checksum_sha256,size_bytes,latest_flyway_version,public_table_count,
  source_commit,strategy_version,created_at,verified_at,retention_until,manifest_json
) values (
  $(ConvertTo-DrSqlLiteral $backupKey),
  $(ConvertTo-DrSqlLiteral $info.Name),
  $(ConvertTo-DrSqlLiteral $hash),
  $size,
  $($schema.FlywayVersion),
  $($schema.PublicTableCount),
  $(ConvertTo-DrSqlLiteral $commit),
  $(ConvertTo-DrSqlLiteral $script:DrStrategyVersion),
  $(ConvertTo-DrSqlLiteral $created.ToString("o"))::timestamptz,
  $(ConvertTo-DrSqlLiteral $verified.ToString("o"))::timestamptz,
  $(ConvertTo-DrSqlLiteral $retentionUntil.ToString("o"))::timestamptz,
  jsonb_build_object('manifestVersion',1,'backupFile',$(ConvertTo-DrSqlLiteral $info.Name),'sha256',$(ConvertTo-DrSqlLiteral $hash))
);
"@
  Invoke-DrSql -Sql $sql

  if(-not $SkipRetention) {
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    $old = @(Get-ChildItem -LiteralPath (Join-Path $script:ProjectRoot "backups") -Filter "cinebooking-v69-*.dump" -File |
      Where-Object { $_.LastWriteTime -lt $cutoff -and $_.FullName -ne $info.FullPath })
    foreach($file in $old) {
      Write-Host ("Retention cleanup: {0}" -f $file.Name) -ForegroundColor DarkGray
      Remove-Item -LiteralPath $file.FullName -Force
      Remove-Item -LiteralPath "$($file.FullName).sha256" -Force -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath "$($file.FullName).manifest.json" -Force -ErrorAction SilentlyContinue
    }
  }

  Write-Host "V69 BACKUP PASSED" -ForegroundColor Green
  Write-Host ("Backup key: {0}" -f $backupKey)
  Write-Host ("Archive: {0}" -f $info.FullPath)
  Write-Host ("Manifest: {0}" -f $manifestPath)
} finally {
  Exit-CineBookingProject
}
