$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '=== CineBooking V72 Software Supply Chain Integrity 5.0 ===' -ForegroundColor Cyan
Write-Host 'Expected runtime: Flyway V72, at least 67 public tables.' -ForegroundColor DarkCyan

$checks=@(
  'tools/verify_v68_security_identity_5.py',
  'tools/verify_v69_backup_disaster_recovery_5.py',
  'tools/verify_v70_data_governance_privacy_5.py',
  'tools/verify_v71_secrets_key_governance_5.py',
  'tools/verify_v72_software_supply_chain_5.py',
  'tools/verify_realistic_data_57.py',
  'tools/verify_seed_demo_57.py'
)
foreach($check in $checks){
  Write-Host "`n>>> python -X utf8 $check" -ForegroundColor DarkCyan
  & python -X utf8 $check
  if($LASTEXITCODE -ne 0){throw "FAIL: $check"}
}

Write-Host "`nPASS: V72 source gates completed." -ForegroundColor Green
Write-Host 'Runtime next: docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build'
Write-Host 'Browser E2E: cd frontend; npx playwright test "e2e/software-supply-chain-v72.spec.ts" --project=chromium'
