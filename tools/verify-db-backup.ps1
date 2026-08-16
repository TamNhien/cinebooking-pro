param(
  [Parameter(Mandatory=$true)][string]$BackupFile
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "db-common.ps1")

Enter-CineBookingProject
try {
  Assert-DockerCompose
  Assert-PostgresReady
  $info = Get-SafeBackupInfo -BackupFile $BackupFile -MustExist

  Write-Host "=== CineBooking V27.1 backup verification ===" -ForegroundColor Cyan
  Write-Host ("File: {0}" -f $info.FullPath)

  $size = (Get-Item -LiteralPath $info.FullPath).Length
  if($size -lt 512) { throw "Backup is unexpectedly small: $size bytes" }

  $verifiedHash = Test-BackupHash -Info $info
  if($null -ne $verifiedHash) {
    Write-Host ("PASS SHA-256: {0}" -f $verifiedHash) -ForegroundColor Green
  } else {
    Write-Host "WARN: no .sha256 sidecar found; archive structure will still be checked." -ForegroundColor Yellow
  }

  $listCommand = 'set -e; listfile=/tmp/cinebooking-v27-archive-list.txt; rm -f "$listfile"; pg_restore --list "{0}" > "$listfile"; grep -Ev ''^(;|[[:space:]]*$)'' "$listfile" | grep -q .; rm -f "$listfile"' -f $info.ContainerPath
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", $listCommand) -FailureMessage "pg_restore could not read a non-empty archive listing"

  Write-Host "PASS: pg_restore archive listing is readable and non-empty" -ForegroundColor Green
  Write-Host ("PASS file size: {0:N0} bytes" -f $size) -ForegroundColor Green
  Write-Host "BACKUP VERIFY PASSED" -ForegroundColor Green
} finally {
  Exit-CineBookingProject
}
