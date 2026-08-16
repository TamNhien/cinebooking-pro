$script:ProjectRoot = Split-Path -Parent $PSScriptRoot
$script:BackupsDir = Join-Path $script:ProjectRoot "backups"

function Enter-CineBookingProject {
  if(-not (Test-Path (Join-Path $script:ProjectRoot "docker-compose.yml"))) {
    throw "docker-compose.yml not found at project root: $script:ProjectRoot"
  }
  if(-not (Test-Path $script:BackupsDir)) {
    New-Item -ItemType Directory -Path $script:BackupsDir -Force | Out-Null
  }
  Push-Location $script:ProjectRoot
}

function Exit-CineBookingProject {
  Pop-Location
}

function Assert-DockerCompose {
  & docker compose version *> $null
  if($LASTEXITCODE -ne 0) {
    throw "Docker Compose is not available. Start Docker Desktop and verify 'docker compose version'."
  }
}

function Invoke-Compose {
  param(
    [Parameter(Mandatory=$true)][string[]]$Arguments,
    [string]$FailureMessage = "docker compose command failed"
  )
  & docker compose @Arguments
  if($LASTEXITCODE -ne 0) {
    throw "$FailureMessage (exit code $LASTEXITCODE)"
  }
}

function Invoke-ComposeCapture {
  param(
    [Parameter(Mandatory=$true)][string[]]$Arguments,
    [string]$FailureMessage = "docker compose command failed"
  )
  $output = & docker compose @Arguments 2>&1
  $code = $LASTEXITCODE
  if($code -ne 0) {
    $text = ($output | Out-String).Trim()
    throw "$FailureMessage (exit code $code). $text"
  }
  return ($output | Out-String).Trim()
}

function Get-LastNonEmptyLine {
  param([AllowEmptyString()][string]$Text)
  $lines = @($Text -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if($lines.Count -eq 0) { return "" }
  return [string]$lines[$lines.Count - 1]
}

function Assert-PostgresReady {
  Invoke-Compose -Arguments @(
    "exec", "-T", "postgres", "sh", "-lc",
    'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  ) -FailureMessage "PostgreSQL is not ready"
}

function Get-SafeBackupInfo {
  param(
    [Parameter(Mandatory=$true)][string]$BackupFile,
    [switch]$MustExist
  )

  if([string]::IsNullOrWhiteSpace($BackupFile)) {
    throw "Backup file path is required."
  }

  $candidate = $BackupFile
  if(-not [System.IO.Path]::IsPathRooted($candidate)) {
    $candidate = Join-Path $script:ProjectRoot $candidate
  }

  $fullPath = [System.IO.Path]::GetFullPath($candidate)
  $backupRoot = [System.IO.Path]::GetFullPath($script:BackupsDir)
  $parent = [System.IO.Path]::GetDirectoryName($fullPath)
  $name = [System.IO.Path]::GetFileName($fullPath)

  $trimChars = [char[]]"\/"
  if($parent.TrimEnd($trimChars) -ne $backupRoot.TrimEnd($trimChars)) {
    throw "For safety, database dumps must be direct children of .\backups. Received: $BackupFile"
  }
  if($name -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*\.dump$') {
    throw "Backup filename must match [A-Za-z0-9._-]+.dump. Received: $name"
  }
  if($MustExist -and -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    throw "Backup file not found: $fullPath"
  }

  [PSCustomObject]@{
    FullPath = $fullPath
    Name = $name
    ContainerPath = "/backups/$name"
    ShaPath = "$fullPath.sha256"
  }
}

function Write-BackupHash {
  param([Parameter(Mandatory=$true)][string]$FullPath)
  $hash = (Get-FileHash -LiteralPath $FullPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $name = [System.IO.Path]::GetFileName($FullPath)
  [System.IO.File]::WriteAllText("$FullPath.sha256", "$hash  $name`r`n", [System.Text.Encoding]::ASCII)
  return $hash
}

function Test-BackupHash {
  param([Parameter(Mandatory=$true)]$Info)
  if(-not (Test-Path -LiteralPath $Info.ShaPath -PathType Leaf)) {
    return $null
  }
  $raw = (Get-Content -LiteralPath $Info.ShaPath -Raw).Trim()
  $expected = ($raw -split '\s+')[0].ToLowerInvariant()
  if($expected -notmatch '^[0-9a-f]{64}$') {
    throw "Invalid SHA-256 sidecar: $($Info.ShaPath)"
  }
  $actual = (Get-FileHash -LiteralPath $Info.FullPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -ne $expected) {
    throw "SHA-256 mismatch for $($Info.Name). Expected $expected, actual $actual"
  }
  return $actual
}

function Invoke-DbRecreate {
  Invoke-Compose -Arguments @(
    "exec", "-T", "postgres", "sh", "-lc",
    'dropdb --force -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -T template0 -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
  ) -FailureMessage "Could not recreate target database"
}

function Invoke-DbRestoreFromContainerPath {
  param([Parameter(Mandatory=$true)][string]$ContainerPath)
  if($ContainerPath -notmatch '^/backups/[A-Za-z0-9][A-Za-z0-9._-]*\.dump$') {
    throw "Unsafe container backup path: $ContainerPath"
  }
  $command = 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --exit-on-error "{0}"' -f $ContainerPath
  Invoke-Compose -Arguments @("exec", "-T", "postgres", "sh", "-lc", $command) -FailureMessage "pg_restore failed"
  Invoke-Compose -Arguments @(
    "exec", "-T", "postgres", "sh", "-lc",
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "ANALYZE;"'
  ) -FailureMessage "Post-restore ANALYZE failed"
}
