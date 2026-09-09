$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "db-common.ps1")

$script:DrStrategyVersion = "V69-BACKUP-DR-5"

function ConvertTo-DrSqlLiteral {
  param([AllowNull()][string]$Value)
  if($null -eq $Value) { return "NULL" }
  return "'" + $Value.Replace("'", "''") + "'"
}

function Get-DrManifestPath {
  param([Parameter(Mandatory=$true)][string]$BackupFullPath)
  return "$BackupFullPath.manifest.json"
}

function Read-DrManifest {
  param([Parameter(Mandatory=$true)][string]$BackupFullPath)
  $path = Get-DrManifestPath -BackupFullPath $BackupFullPath
  if(-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "V69 DR manifest not found: $path"
  }
  try {
    return Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    throw "V69 DR manifest is not valid JSON: $path. $($_.Exception.Message)"
  }
}

function Invoke-DrPsql {
  param(
    [Parameter(Mandatory=$true)][string]$Sql,
    [string]$Database = ""
  )
  if([string]::IsNullOrWhiteSpace($Database)) {
    $dbArg = '"$POSTGRES_DB"'
  } else {
    if($Database -notmatch '^[A-Za-z0-9_]+$') { throw "Unsafe database name: $Database" }
    $dbArg = "'$Database'"
  }
  $shell = "psql -At -U `"`$POSTGRES_USER`" -d $dbArg -v ON_ERROR_STOP=1"
  $output = $Sql | & docker compose exec -T postgres sh -lc $shell 2>&1
  if($LASTEXITCODE -ne 0) {
    throw "psql failed. $((@($output) -join [Environment]::NewLine).Trim())"
  }
  return (@($output) -join "`n").Trim()
}

function Invoke-DrSql {
  param([Parameter(Mandatory=$true)][string]$Sql)
  [void](Invoke-DrPsql -Sql $Sql)
}

function Get-DrScalar {
  param(
    [Parameter(Mandatory=$true)][string]$Sql,
    [string]$Database = ""
  )
  $raw = Invoke-DrPsql -Sql $Sql -Database $Database
  return Get-LastNonEmptyLine -Text $raw
}

function Get-DrGitCommit {
  try {
    $sha = (& git rev-parse --verify HEAD 2>$null | Select-Object -First 1).Trim()
    if($sha -match '^[0-9a-fA-F]{40}$') { return $sha.ToLowerInvariant() }
  } catch {}
  return "unknown"
}

function Assert-DrV69LiveSchema {
  $latest = Get-DrScalar -Sql "select version from flyway_schema_history where success=true and version is not null order by installed_rank desc limit 1;"
  if(-not ($latest -match '^\d+$') -or [int]$latest -lt 69) {
    throw "V69 requires Flyway >=69 before DR evidence can be recorded. Live latest=$latest"
  }
  $tables = Get-DrScalar -Sql "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';"
  if(-not ($tables -match '^\d+$') -or [int]$tables -lt 61) {
    throw "V69 requires at least 61 public tables. Live count=$tables"
  }
  return [PSCustomObject]@{ FlywayVersion=[int]$latest; PublicTableCount=[int]$tables }
}
