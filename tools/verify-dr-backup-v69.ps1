param(
  [Parameter(Mandatory=$true)][string]$BackupFile
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "dr-common-v69.ps1")

Enter-CineBookingProject
try {
  Assert-DockerCompose
  Assert-PostgresReady
  $info = Get-SafeBackupInfo -BackupFile $BackupFile -MustExist

  Write-Host "=== CineBooking V69 DR backup verification ===" -ForegroundColor Cyan
  Write-Host ("Archive: {0}" -f $info.FullPath)

  & (Join-Path $PSScriptRoot "verify-db-backup.ps1") -BackupFile $info.FullPath
  if($LASTEXITCODE -ne 0) { throw "Base archive verification failed" }

  $manifest = Read-DrManifest -BackupFullPath $info.FullPath
  $size = (Get-Item -LiteralPath $info.FullPath).Length
  $hash = (Get-FileHash -LiteralPath $info.FullPath -Algorithm SHA256).Hash.ToLowerInvariant()

  if([string]$manifest.strategyVersion -ne $script:DrStrategyVersion) { throw "Unexpected strategyVersion in manifest" }
  if([string]$manifest.backupFile -ne $info.Name) { throw "Manifest backupFile does not match archive filename" }
  if([string]$manifest.sha256 -ne $hash) { throw "Manifest SHA-256 does not match archive" }
  if([long]$manifest.sizeBytes -ne $size) { throw "Manifest sizeBytes does not match archive" }
  if([int]$manifest.latestFlywayVersion -lt 69) { throw "Manifest Flyway version is older than V69" }
  if([int]$manifest.publicTableCount -lt 61) { throw "Manifest public table count is below V69 baseline (61)" }
  if([string]::IsNullOrWhiteSpace([string]$manifest.createdAtUtc)) { throw "Manifest createdAtUtc is required" }
  if([string]::IsNullOrWhiteSpace([string]$manifest.verifiedAtUtc)) { throw "Manifest verifiedAtUtc is required" }

  $allowed = @('manifestVersion','strategyVersion','backupKey','backupFile','sha256','sizeBytes','latestFlywayVersion','publicTableCount','sourceCommit','createdAtUtc','verifiedAtUtc','retentionUntilUtc')
  $unexpected = @($manifest.PSObject.Properties.Name | Where-Object { $_ -notin $allowed })
  if($unexpected.Count -gt 0) { throw "Manifest contains unexpected fields: $($unexpected -join ', ')" }

  Write-Host ("PASS SHA-256: {0}" -f $hash) -ForegroundColor Green
  Write-Host ("PASS Flyway: V{0}" -f $manifest.latestFlywayVersion) -ForegroundColor Green
  Write-Host ("PASS public tables: {0}" -f $manifest.publicTableCount) -ForegroundColor Green
  Write-Host "PASS manifest contains metadata only; no credential fields" -ForegroundColor Green
  Write-Host "V69 DR BACKUP VERIFY PASSED" -ForegroundColor Green
} finally {
  Exit-CineBookingProject
}
