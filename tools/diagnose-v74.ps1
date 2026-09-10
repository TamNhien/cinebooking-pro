$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host '=== CineBooking V74 Reliability & Resilience 5.0 diagnostics ===' -ForegroundColor Cyan
$checks=@(
  'tools/verify_v59_realtime_operations_4.py',
  'tools/verify_v65_observability_reliability.py',
  'tools/verify_v69_backup_disaster_recovery_5.py',
  'tools/verify_v72_software_supply_chain_5.py',
  'tools/verify_v73_github_actions_node24.py',
  'tools/verify_v74_reliability_resilience_5.py',
  'tools/verify_realistic_data_57.py',
  'tools/verify_seed_demo_57.py'
)
foreach($check in $checks){
  Write-Host "`n>>> python -X utf8 $check" -ForegroundColor DarkCyan
  & python -X utf8 $check
  if($LASTEXITCODE -ne 0){throw "Verification failed: $check"}
}
Write-Host "`nExpected schema authority: Flyway V72 / 67 public tables (V73-V74 no-schema)." -ForegroundColor Green
Write-Host 'Failover drill defaults to PLAN ONLY. Use tools/failover-drill-v74.ps1 -Execute only in a controlled window.' -ForegroundColor Yellow
