$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$checks = @(
  'tools/verify_v64_crm_marketing_automation.py',
  'tools/verify_v76_recommendation_5.py',
  'tools/verify_v77_crm_automation_5.py',
  'tools/verify_v77_brave_browser_identity_fix.py',
  'tools/verify_v77_0_2_brave_alert_reconciliation.py',
  'tools/verify_v77_0_3_historical_brave_evidence_reconciliation.py',
  'tools/verify_v77_0_4_zero_warning_artifact_hygiene.py',
  'tools/verify_v77_0_5_warning_free_runtime_e2e.py',
  'tools/verify_v77_0_6_dependency_security_playwright_bootstrap.py',
  'tools/verify_v77_0_7_security_e2e_strict_locator_reliability.py',
  'tools/verify_v77_0_8_ci_deprecation_chromium_brand_identity.py',
  'tools/verify_v77_0_9_vietnamese_ui_maintenance_completion.py',
  'tools/verify_v77_0_10_vietnamese_localizer_immutable_ledger.py',
  'tools/verify_v77_0_11_docker_windows_node_modules_hygiene.py',
  'tools/verify_v77_0_12_typescript_localization_contract_hygiene.py',
  'tools/verify_v77_0_13_zero_warning_vietnamese_ui_lint.py',
  'tools/verify_realistic_data_57.py',
  'tools/verify_seed_demo_57.py'
)

foreach ($check in $checks) {
  Write-Host "`n>>> python -X utf8 $check" -ForegroundColor Cyan
  & python -X utf8 $check
  if ($LASTEXITCODE -ne 0) { throw "Verification failed: $check" }
}

Write-Host "`nPASS: CineBooking V77.0.13 CRM Automation 5.0 + zero-warning Vietnamese UI lint hygiene source diagnostics completed." -ForegroundColor Green
