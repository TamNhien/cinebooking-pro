$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V43 diagnostics ===" -ForegroundColor Cyan
python .\tools\verify_v42_financial_ledger.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v42_1_analytics_export.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v43_staff_operations.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose config --quiet
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Write-Host "V43 source diagnostics passed." -ForegroundColor Green
Write-Host "Release flow: main CI -> v43.0.0-rc.N -> V43 gate + Docker smoke + Playwright -> v43.0.0 -> GitHub Release"
