param([switch]$ConfirmDemoOnly)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
if (-not $ConfirmDemoOnly) {
  throw 'This changes demo showtimes. Rerun with -ConfirmDemoOnly only against your DEMO CineBooking database.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker CLI not found.' }
$compose = @('-f','docker-compose.yml','-f','docker-compose.https.yml')
$sql = Get-Content (Join-Path $PSScriptRoot 'seed-demo-e2e-showtimes.sql') -Raw -Encoding UTF8
Write-Host 'Demo-only E2E schedule: add upcoming slots based on 8 existing V29 movies. Existing bookings, shows and prices are not changed.' -ForegroundColor Yellow
$sql | & docker compose @compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
if ($LASTEXITCODE -ne 0) { throw 'Demo-only E2E schedule insert failed; transaction rolled back.' }
Write-Host 'Future demo showtimes are ready. This is sample scheduling data, not real cinema availability.' -ForegroundColor Green
