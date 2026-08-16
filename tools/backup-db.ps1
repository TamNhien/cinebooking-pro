param(
  [string]$OutputFile = "",
  [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "db-common.ps1")

Enter-CineBookingProject
try {
  Assert-DockerCompose
  Assert-PostgresReady

  if([string]::IsNullOrWhiteSpace($OutputFile)) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputFile = ".\backups\cinebooking-$stamp.dump"
  }

  $info = Get-SafeBackupInfo -BackupFile $OutputFile
  if(Test-Path -LiteralPath $info.FullPath) {
    throw "Refusing to overwrite existing backup: $($info.FullPath)"
  }

  Write-Host "=== CineBooking V27 database backup ===" -ForegroundColor Cyan
  Write-Host ("Target: {0}" -f $info.FullPath)

  $dumpCommand = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=9 --no-owner --no-privileges --file="{0}"' -f $info.ContainerPath
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", $dumpCommand) -FailureMessage "pg_dump failed"

  if(-not (Test-Path -LiteralPath $info.FullPath -PathType Leaf)) {
    throw "pg_dump completed but the host backup file is missing. Check the ./backups:/backups Docker mount."
  }
  $size = (Get-Item -LiteralPath $info.FullPath).Length
  if($size -lt 512) {
    throw "Backup is unexpectedly small ($size bytes): $($info.FullPath)"
  }

  $hash = Write-BackupHash -FullPath $info.FullPath
  Write-Host ("SHA-256: {0}" -f $hash) -ForegroundColor DarkGray

  if(-not $SkipVerify) {
    & (Join-Path $PSScriptRoot "verify-db-backup.ps1") -BackupFile $info.FullPath
    if($LASTEXITCODE -ne 0) { throw "Backup verification failed" }
  }

  Write-Host "BACKUP PASSED" -ForegroundColor Green
  Write-Host $info.FullPath
} finally {
  Exit-CineBookingProject
}
