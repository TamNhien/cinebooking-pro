$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$checks=@(
  '.\tools\verify_v43_analytics_excel_detail.py',
  '.\tools\verify_v43_analytics_csv_detail.py',
  '.\tools\verify_v46_security_account_protection.py',
  '.\tools\verify_v47_payment_gateway_operations.py',
  '.\tools\verify_v48_concession_inventory_2.py',
  '.\tools\verify_v49_smart_showtime_planning_2.py',
  '.\tools\verify_v50_recommendation_intelligence_2.py',
  '.\tools\verify_v51_analytics_forecasting_3.py',
  '.\tools\verify_v51_utf8_real_data.py',
  '.\tools\verify_seed_demo_56.py'
)
foreach($check in $checks){
  python $check
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
}
Write-Host 'V51 source diagnostics passed.' -ForegroundColor Green
