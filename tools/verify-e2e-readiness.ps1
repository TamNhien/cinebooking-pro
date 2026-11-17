param()
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$compose = @('-f','docker-compose.yml','-f','docker-compose.https.yml')
# Use DB state rather than silently fabricating future availability or weakening Playwright.
$query = @'
SELECT count(*)
FROM showtime
WHERE status = 'OPEN' AND start_time > now()
  AND movie_id = '11111111-1111-1111-1111-111111111111'::uuid;
'@
$lines = @(& docker compose @compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "$1"' sh $query)
if ($LASTEXITCODE -ne 0) { throw 'Cannot validate E2E movie schedule in PostgreSQL.' }
$count = ($lines | Where-Object { $_.Trim() -match '^[0-9]+$' } | Select-Object -Last 1)
if ($null -eq $count) { throw 'PostgreSQL E2E preflight returned no count.' }
if ([int]$count -lt 1) {
  throw @'
No upcoming OPEN showtimes for the V29 demo movie Hanh Trinh Sao Hoa. The
original V29 schedule ends 2026-09-30, and the public API correctly excludes
past shows. E2E booking journeys cannot run on expired showtimes.
For a DEMO database only, explicitly run:
  .\tools\seed-demo-e2e-showtimes.ps1 -ConfirmDemoOnly
For real data, schedule actual future screenings via the Admin UI instead.
No database changes were made by this check. Git publication remains blocked.
'@
}
Write-Host "E2E preflight: $count upcoming V29 demo movie showtimes verified against PostgreSQL." -ForegroundColor Green
