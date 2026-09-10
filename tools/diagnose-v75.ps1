$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host '=== CineBooking V75 Analytics & BI 5.0 diagnostics ===' -ForegroundColor Cyan
$checks=@(
  'tools/verify_v51_analytics_forecasting_3.py',
  'tools/verify_v55_customer_retention.py',
  'tools/verify_v56_customer_value_rfm.py',
  'tools/verify_v72_software_supply_chain_5.py',
  'tools/verify_v73_github_actions_node24.py',
  'tools/verify_v74_reliability_resilience_5.py',
  'tools/verify_v75_analytics_bi_5.py',
  'tools/verify_v75_cost_coverage_drilldown.py',
  'tools/verify_realistic_data_57.py',
  'tools/verify_seed_demo_57.py'
)
foreach($check in $checks){
  Write-Host "`n>>> python -X utf8 $check" -ForegroundColor DarkCyan
  & python -X utf8 $check
  if($LASTEXITCODE -ne 0){throw "Verification failed: $check"}
}
Write-Host "`nExpected schema authority: Flyway V72 / 67 public tables (V73-V75 no-schema)." -ForegroundColor Green
Write-Host 'V75 BI remains read-only; V75.0.1 adds exact missing-cost drill-down to the existing V51 cost-basis workflow.' -ForegroundColor Green
