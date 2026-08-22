$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V44 diagnostics ===" -ForegroundColor Cyan
python .\tools\verify_v42_financial_ledger.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v42_1_analytics_export.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v43_staff_operations.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v43_analytics_excel_detail.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v43_analytics_csv_detail.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v44_maintenance_reliability.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose config --quiet
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Write-Host "V44 source diagnostics passed." -ForegroundColor Green
Write-Host "Release flow: main CI -> v44.0.0-rc.N -> V44 gate + Docker smoke + Playwright -> v44.0.0 -> GitHub Release"
