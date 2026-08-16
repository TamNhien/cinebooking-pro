param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [switch]$ConfirmRestore,
  [switch]$SkipSafetyBackup,
  [switch]$NoAutoRollback
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "db-common.ps1")

if(-not $ConfirmRestore) {
  throw "Restore is destructive. Re-run with -ConfirmRestore after verifying the backup. Example: powershell -ExecutionPolicy Bypass -File .\tools\restore-db.ps1 -BackupFile '.\backups\file.dump' -ConfirmRestore"
}

Enter-CineBookingProject
$backendsStopped = $false
$databaseUsable = $true
$safetyInfo = $null
try {
  Assert-DockerCompose
  Assert-PostgresReady
  $restoreInfo = Get-SafeBackupInfo -BackupFile $BackupFile -MustExist

  & (Join-Path $PSScriptRoot "verify-db-backup.ps1") -BackupFile $restoreInfo.FullPath
  if($LASTEXITCODE -ne 0) { throw "Requested backup did not pass verification" }

  Write-Host "=== CineBooking V27 protected restore ===" -ForegroundColor Cyan
  Write-Host ("Restore source: {0}" -f $restoreInfo.FullPath)

  if(-not $SkipSafetyBackup) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safetyPath = ".\backups\pre-restore-$stamp.dump"
    Write-Host "Creating mandatory pre-restore safety backup..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "backup-db.ps1") -OutputFile $safetyPath
    if($LASTEXITCODE -ne 0) { throw "Safety backup failed; restore aborted before modifying the database." }
    $safetyInfo = Get-SafeBackupInfo -BackupFile $safetyPath -MustExist
  } else {
    Write-Host "WARNING: -SkipSafetyBackup disables the default rollback source." -ForegroundColor Red
  }

  Write-Host "Stopping backend writers..." -ForegroundColor Yellow
  Invoke-Compose -Arguments @("stop", "backend-1", "backend-2") -FailureMessage "Could not stop backend services"
  $backendsStopped = $true

  $databaseUsable = $false
  Write-Host "Recreating target database..." -ForegroundColor Yellow
  Invoke-DbRecreate
  Write-Host "Restoring archive..." -ForegroundColor Yellow
  Invoke-DbRestoreFromContainerPath -ContainerPath $restoreInfo.ContainerPath
  $databaseUsable = $true

  Write-Host "RESTORE PASSED" -ForegroundColor Green
  if($null -ne $safetyInfo) {
    Write-Host ("Safety backup retained at: {0}" -f $safetyInfo.FullPath) -ForegroundColor Green
  }
} catch {
  $originalError = $_
  Write-Host ("RESTORE FAILED: {0}" -f $originalError.Exception.Message) -ForegroundColor Red

  if((-not $databaseUsable) -and ($null -ne $safetyInfo) -and (-not $NoAutoRollback)) {
    Write-Host "Attempting automatic rollback from the pre-restore safety backup..." -ForegroundColor Yellow
    try {
      Invoke-DbRecreate
      Invoke-DbRestoreFromContainerPath -ContainerPath $safetyInfo.ContainerPath
      $databaseUsable = $true
      Write-Host "AUTO-ROLLBACK PASSED: previous database state was restored." -ForegroundColor Green
    } catch {
      Write-Host ("AUTO-ROLLBACK FAILED: {0}" -f $_.Exception.Message) -ForegroundColor Red
      Write-Host ("Safety backup: {0}" -f $safetyInfo.FullPath) -ForegroundColor Red
    }
  }
  throw $originalError
} finally {
  if($backendsStopped) {
    if($databaseUsable) {
      Write-Host "Starting backend services..." -ForegroundColor Yellow
      & docker compose start backend-1 backend-2
      if($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: database is usable but backend services could not be restarted automatically." -ForegroundColor Yellow
      }
    } else {
      Write-Host "BACKENDS LEFT STOPPED because database recovery did not complete successfully." -ForegroundColor Red
    }
  }
  Exit-CineBookingProject
}
