$ErrorActionPreference = 'Stop'
Write-Host '=== CineBooking V53 source diagnostics ===' -ForegroundColor Cyan

$checks = @(
  '.\tools\verify_v43_staff_operations.py',
  '.\tools\verify_v44_maintenance_reliability.py',
  '.\tools\verify_v45_customer_support.py',
  '.\tools\verify_v46_security_account_protection.py',
  '.\tools\verify_v47_payment_gateway_operations.py',
  '.\tools\verify_v48_concession_inventory_2.py',
  '.\tools\verify_v49_smart_showtime_planning_2.py',
  '.\tools\verify_v50_recommendation_intelligence_2.py',
  '.\tools\verify_v51_analytics_forecasting_3.py',
  '.\tools\verify_v51_utf8_real_data.py',
  '.\tools\verify_v52_pwa_mobile_3.py',
  '.\tools\verify_v53_operations_command_center.py',
  '.\tools\verify_seed_demo_57.py'
)

foreach ($check in $checks) {
  Write-Host "`n>>> python $check" -ForegroundColor DarkCyan
  python $check
  if ($LASTEXITCODE -ne 0) { throw "V53 diagnostic failed: $check" }
}

Write-Host "`nV53 source diagnostics passed." -ForegroundColor Green
