$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$checks = @(
  'tools/verify_v63_recommendation_4.py',
  'tools/verify_v74_reliability_resilience_5.py',
  'tools/verify_v75_analytics_bi_5.py',
  'tools/verify_v75_cost_coverage_drilldown.py',
  'tools/verify_v76_recommendation_5.py',
  'tools/verify_realistic_data_57.py',
  'tools/verify_seed_demo_57.py'
)

foreach ($check in $checks) {
  Write-Host "`n>>> python -X utf8 $check" -ForegroundColor Cyan
  & python -X utf8 $check
  if ($LASTEXITCODE -ne 0) { throw "Verification failed: $check" }
}

Write-Host "`nPASS: CineBooking V76 Recommendation 5.0 source diagnostics completed." -ForegroundColor Green
