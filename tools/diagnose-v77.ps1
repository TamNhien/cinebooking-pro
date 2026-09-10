$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$checks = @(
  'tools/verify_v64_crm_marketing_automation.py',
  'tools/verify_v76_recommendation_5.py',
  'tools/verify_v77_crm_automation_5.py',
  'tools/verify_realistic_data_57.py',
  'tools/verify_seed_demo_57.py'
)

foreach ($check in $checks) {
  Write-Host "`n>>> python -X utf8 $check" -ForegroundColor Cyan
  & python -X utf8 $check
  if ($LASTEXITCODE -ne 0) { throw "Verification failed: $check" }
}

Write-Host "`nPASS: CineBooking V77 CRM Automation 5.0 source diagnostics completed." -ForegroundColor Green
