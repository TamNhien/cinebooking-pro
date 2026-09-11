param(
  [Parameter(Mandatory=$true, Position=0)][string]$Version,
  [switch]$SkipVerify,
  [switch]$SkipCiWait
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if ($Version -notmatch '^v[0-9]+\.[0-9]+\.[0-9]+$') {
  throw "Version must be a stable tag such as v77.0.0. RC/pre-release tags are not allowed."
}
if ($Version -match '-') { throw "Pre-release tags are disabled for CineBooking V68+." }

Write-Host "=== CineBooking stable-only release $Version ===" -ForegroundColor Cyan

gh auth status | Out-Host

if (-not $SkipVerify) {
  $checks = @(
    'tools/verify_v60_payment_production_4.py',
    'tools/verify_v61_fraud_risk_intelligence.py',
    'tools/verify_v62_dynamic_pricing_4.py',
    'tools/verify_v63_recommendation_4.py',
    'tools/verify_v64_crm_marketing_automation.py',
    'tools/verify_v65_observability_reliability.py',
    'tools/verify_v66_booking_consistency_seat_locking.py',
    'tools/verify_v67_payment_resilience_reconciliation.py',
    'tools/verify_v68_security_identity_5.py',
    'tools/verify_v69_backup_disaster_recovery_5.py',
    'tools/verify_v70_data_governance_privacy_5.py',
    'tools/verify_v71_secrets_key_governance_5.py',
    'tools/verify_v72_software_supply_chain_5.py',
    'tools/verify_v73_github_actions_node24.py',
    'tools/verify_v74_reliability_resilience_5.py',
    'tools/verify_v75_analytics_bi_5.py',
    'tools/verify_v75_cost_coverage_drilldown.py',
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
    Write-Host "`n>>> python -X utf8 $check" -ForegroundColor DarkCyan
    & python -X utf8 $check
    if ($LASTEXITCODE -ne 0) { throw "Verification failed: $check" }
  }

  Write-Host "`n=== Frontend lint preflight ===" -ForegroundColor Cyan
  $FrontendDir = Join-Path $Root 'frontend'
  if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
    throw 'frontend/node_modules is missing. Run npm install in .\frontend before release.'
  }
  Push-Location $FrontendDir
  try {
    & npm run security:audit
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency audit failed at high/critical severity. Release was not committed or pushed.' }
    & npm run lint
    if ($LASTEXITCODE -ne 0) { throw 'Frontend lint failed. Release was not committed or pushed.' }
  }
  finally {
    Pop-Location
  }
}

Write-Host "`n=== Stage source ===" -ForegroundColor Cyan
git add -A
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'git diff --cached --check failed' }

$staged = git diff --cached --name-only
if ($staged) {
  git commit -m "Release $Version"
}

git push origin main
$sha = (git rev-parse HEAD).Trim()
Write-Host "Pushed main: $sha" -ForegroundColor Green

if (-not $SkipCiWait) {
  Write-Host "`n=== Wait for CineBooking CI on exact commit ===" -ForegroundColor Cyan
  $runId = $null
  for ($i=0; $i -lt 30 -and -not $runId; $i++) {
    Start-Sleep -Seconds 2
    $json = gh run list --workflow ci.yml --commit $sha --limit 1 --json databaseId,headSha,status,conclusion | ConvertFrom-Json
    if ($json -and $json.Count -gt 0 -and $json[0].headSha -eq $sha) { $runId = $json[0].databaseId }
  }
  if (-not $runId) { throw "Could not find CineBooking CI run for $sha" }
  gh run watch $runId --exit-status
  if ($LASTEXITCODE -ne 0) {
    Write-Host "`n=== Failed CI logs ===" -ForegroundColor Red
    gh run view $runId --log-failed | Out-Host
    throw "CineBooking CI failed for $sha"
  }
}

$existingLocal = git tag --list $Version
$existingRemote = git ls-remote --tags origin "refs/tags/$Version"
if ($existingLocal -or $existingRemote) { throw "Stable tag $Version already exists. Immutable tags are never overwritten." }

Write-Host "`n=== Create stable tag ===" -ForegroundColor Cyan
git tag -a $Version $sha -m "CineBooking Pro $Version"
git push origin $Version

Write-Host "`n=== Create GitHub stable release ===" -ForegroundColor Cyan
gh release create $Version --verify-tag --title "CineBooking Pro $Version" --generate-notes --latest
if ($LASTEXITCODE -ne 0) { throw "GitHub Release creation failed for $Version" }

Write-Host "`nPASS: $Version pushed, tagged and published as Latest stable release." -ForegroundColor Green
