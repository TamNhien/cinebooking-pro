$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V46 diagnostics ===" -ForegroundColor Cyan
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
python .\tools\verify_v46_security_account_protection.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_seed_demo_49.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "V46 source diagnostics passed." -ForegroundColor Green
Write-Host "Release flow: main CI -> v46.0.0-rc.N -> V46 source gate + Docker smoke + Playwright -> v46.0.0 -> GitHub Release"
