$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V45 diagnostics ===" -ForegroundColor Cyan
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
python .\tools\verify_v45_customer_support.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "V45 source diagnostics passed." -ForegroundColor Green
Write-Host "Release flow: main CI -> v45.0.0-rc.N -> V45 source gate + Docker smoke + Playwright -> v45.0.0 -> GitHub Release"
