$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host '=== CineBooking V73 GitHub Actions Runtime Modernization 5.0 ===' -ForegroundColor Cyan
Write-Host 'Schema unchanged: Flyway V72, at least 67 public tables.' -ForegroundColor DarkCyan
Write-Host 'GitHub-hosted workflows must use Node 24-capable action majors.' -ForegroundColor DarkCyan

$checks = @(
  'tools/verify_v28_ci.py',
  'tools/verify_v35_setup_node_compat.py',
  'tools/verify_v59_realtime_operations_4.py',
  'tools/verify_v72_software_supply_chain_5.py',
  'tools/verify_v73_github_actions_node24.py',
  'tools/verify_realistic_data_57.py',
  'tools/verify_seed_demo_57.py'
)

foreach ($check in $checks) {
  Write-Host "`n>>> python -X utf8 $check" -ForegroundColor DarkCyan
  & python -X utf8 $check
  if ($LASTEXITCODE -ne 0) { throw "Verification failed: $check" }
}

Write-Host "`nPASS: V73 source/toolchain gates completed." -ForegroundColor Green
