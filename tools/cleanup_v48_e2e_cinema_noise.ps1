$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "V48 persistent E2E cinema-name cleanup"
Write-Host "Repo root: $repoRoot"
Write-Host "Only orphan timestamp-suffixed CineHub Binh Thanh test cinemas are eligible."

$sql = @'
BEGIN;
WITH candidates AS (
    SELECT c.id, c.name
    FROM cinema c
    WHERE c.name LIKE 'CineHub Bình Thạnh %'
      AND char_length(substring(c.name from char_length('CineHub Bình Thạnh ') + 1)) >= 10
      AND substring(c.name from char_length('CineHub Bình Thạnh ') + 1) !~ '[^0-9]'
      AND NOT EXISTS (SELECT 1 FROM auditorium a WHERE a.cinema_id = c.id)
), deleted AS (
    DELETE FROM cinema c
    USING candidates x
    WHERE c.id = x.id
    RETURNING c.id, c.name
)
SELECT 'REMOVED' AS cleanup_status, id, name FROM deleted ORDER BY name;
COMMIT;
'@

$compose = @(
  "compose",
  "-f", "docker-compose.yml",
  "-f", "docker-compose.https.yml",
  "--profile", "observability",
  "exec", "-T", "postgres",
  "sh", "-lc", 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
)

$sql | & docker @compose
if ($LASTEXITCODE -ne 0) {
  throw "V48 cinema cleanup failed with exit code $LASTEXITCODE. No destructive fallback was attempted."
}
Write-Host "Cleanup complete. Only unreferenced timestamp test cinemas were removed; referenced cinemas were preserved."
