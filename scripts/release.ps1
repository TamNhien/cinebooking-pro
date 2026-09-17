param(
  [Parameter(Mandatory=$true, Position=0)][string]$Version,
  [switch]$SkipVerify,
  [switch]$SkipDocker,
  [switch]$SkipE2E,
  [switch]$SkipCiWait,
  [string]$BaseUrl = "https://localhost",
  [string]$BrowserChannel = "msedge",
  [string[]]$E2ESpec = @()
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command was not found: $Name"
  }
}


function Read-DotEnv([string]$Path) {
  $values = @{}
  if (-not (Test-Path $Path)) { return $values }
  foreach ($raw in Get-Content -LiteralPath $Path -Encoding UTF8) {
    $line = $raw.Trim()
    if (-not $line -or $line.StartsWith('#')) { continue }
    $eq = $line.IndexOf('=')
    if ($eq -le 0) { continue }
    $key = $line.Substring(0,$eq).Trim()
    $value = $line.Substring($eq+1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1,$value.Length-2)
    }
    $values[$key] = $value
  }
  return $values
}

function Invoke-Checked([string]$Label, [scriptblock]$Command) {
  Write-Host "`n=== $Label ===" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

if ($Version -notmatch '^v[0-9]+\.[0-9]+\.[0-9]+$') {
  throw "Version must be a stable tag such as v77.0.0. RC/pre-release tags are not allowed."
}
if ($Version -match '-') { throw "Pre-release tags are disabled for CineBooking V68+." }

Assert-Command git
Assert-Command gh
Assert-Command python
Assert-Command npm
if (-not $SkipDocker -or -not $SkipE2E) { Assert-Command docker }

Write-Host "=== CineBooking stable-only release $Version ===" -ForegroundColor Cyan
Write-Host "Release order: source verify -> lint/build -> Docker -> Browser E2E -> push main -> CI -> tag -> GitHub Release" -ForegroundColor DarkCyan

Invoke-Checked 'GitHub authentication' { gh auth status }

$branch = (git branch --show-current).Trim()
if ($branch -ne 'main') {
  throw "Release must run from branch main. Current branch: $branch"
}

Invoke-Checked 'Fetch origin/main' { git fetch origin main }
$behind = [int](git rev-list --count 'HEAD..origin/main')
if ($behind -gt 0) {
  throw "Local main is behind origin/main by $behind commit(s). Integrate remote changes before releasing."
}

$existingLocal = git tag --list $Version
$existingRemote = git ls-remote --tags origin "refs/tags/$Version"
if ($existingLocal -or $existingRemote) {
  throw "Stable tag $Version already exists. Immutable tags are never overwritten."
}

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
    'tools/verify_v77_0_14_navigation_language_dropdown_localization.py',
    'tools/verify_v77_0_15_v64_v59_runtime_e2e.py',
    'tools/verify_v77_0_16_v59_language_surface_hotfix.py',
    'tools/verify_v77_0_17_full_navigation_language_store_fix.py',
    'tools/verify_v77_0_18_presentation_language_type_contract_fix.py',
    'tools/verify_v77_0_19_zero_warning_marketing_effect_dependencies.py',
    'tools/verify_v77_0_20_full_e2e_runtime_stabilization.py',
    'tools/verify_v77_0_21_hydration_language_v64_reentry.py',
    'tools/verify_v77_0_22_pre_hydration_language_readiness.py',
    'tools/verify_v77_0_23_single_provider_hydration_state.py',
    'tools/verify_v77_0_24_hydration_bundle_v64_startup_reliability.py',
    'tools/verify_v77_0_25_zero_warning_language_provider_cleanup.py',
    'tools/verify_v77_0_26_v64_publish_feedback_persistence.py',
    'tools/verify_v77_0_27_layout_effect_language_reconciliation.py',
    'tools/verify_v77_0_28_compose_readiness_hydration_gate.py',
    'tools/verify_v77_0_29_frontend_healthcheck_contract.py',
    'tools/verify_v77_0_30_full_suite_runtime_contract_alignment.py',
    'tools/verify_v77_0_31_remaining_full_suite_contract_alignment.py',
    'tools/verify_v77_0_32_final_four_runtime_contract_alignment.py',
    'tools/verify_v77_0_33_final_two_runtime_contract_alignment.py',
    'tools/verify_v77_0_34_ticket_control_runtime_contract_alignment.py',
    'tools/verify_v77_0_35_admin_payments_runtime_contract_alignment.py',
    'tools/verify_v77_0_36_final_three_full_suite_runtime_recovery.py',
    'tools/verify_v77_0_37_full_suite_policy_alert_runtime_recovery.py',
    'tools/verify_v77_0_38_release_gate_readiness_recovery.py',
    'tools/verify_v77_0_39_zero_warning_full_ui_language_contract.py',
    'tools/verify_v77_0_40_runtime_language_boundary_fix.py',
    'tools/verify_v77_0_41_movies_language_surface_fix.py',
    'tools/verify_v77_0_42_full_ui_language_completion.py',
    'tools/verify_v77_0_43_language_literal_audit_fix.py',
    'tools/verify_v77_0_44_crm_payload_v66_authority_fix.py',
    'tools/verify_v77_0_45_full_suite_repeatability_accessibility_fix.py',
    'tools/verify_v77_0_46_pwa_readiness_language_sweep_stabilization.py',
    'tools/verify_v77_0_47_historical_release_gate_forward_compatibility.py',
    'tools/verify_v77_0_48_maintenance_success_feedback_timer_ownership.py',
    'tools/verify_v77_0_49_release_staging_whitespace_preflight.py',
    'tools/verify_v77_0_50_v26_ci_service_worker_version_parser.py',
    'tools/verify_v77_0_51_v66_booking_authority_boot_surface.py',
    'tools/verify_v77_0_52_full_suite_transient_read_resilience.py',
    'tools/verify_v77_0_53_v29_2_playwright_contract_compatibility.py',
    'tools/verify_v77_0_54_v31_ticket_wallet_contract_compatibility.py',
    'tools/verify_v77_0_55_v31_2_confirmed_status_contract_compatibility.py',
    'tools/verify_v77_0_56_v48_inventory_bootstrap_read_resilience.py',
    'tools/verify_v77_0_57_v49_smart_planner_language_assertion.py',
    'tools/verify_v77_0_58_v41_notification_read_mutation_synchronization.py',
    'tools/verify_v77_0_59_v41_notification_identity_stability.py',
    'tools/verify_v77_0_60_v34_maintenance_load_ownership.py',
    'tools/verify_v77_0_61_v34_maintenance_repeatability_cleanup.py',
    'tools/verify_v78_ux_accessibility_pwa_5.py',
    'tools/verify_v78_0_1_runtime_language_business_data_boundaries.py',
    'tools/verify_v78_0_2_recommendation_presentation_language_ownership.py',
    'tools/verify_v78_0_3_staff_schedule_admin_runtime_sweep_stability.py',
    'tools/verify_v78_0_4_notification_presentation_language_business_boundaries.py',
    'tools/verify_v78_0_5_admin_audit_presentation_language_ownership.py',
    'tools/verify_v78_0_6_inventory_presentation_language_business_boundaries.py',
    'tools/verify_v78_0_7_admin_v78_entry_inventory_product_boundaries.py',
    'tools/verify_v78_0_8_favorites_movie_business_data_boundaries.py',
    'tools/verify_v78_0_9_command_center_cinema_business_data_boundaries.py',
    'tools/verify_v78_0_10_customer_intelligence_cinema_business_data_boundaries.py',
    'tools/verify_v78_0_11_finance_event_key_presentation_ownership.py',
    'tools/verify_v78_0_12_maintenance_asset_business_data_boundaries.py',
    'tools/verify_v78_0_13_comprehensive_language_ownership.py',
    'tools/verify_v78_0_14_pwa_live_region_stability.py',
    'tools/verify_v78_0_15_full_suite_runtime_business_data_hardening.py',
    'tools/verify_v78_0_16_pricing_rule_business_data_boundary.py',
    'tools/verify_v78_0_17_admin_booking_cinema_business_data_boundary.py',
    'tools/verify_v78_0_18_full_suite_operational_read_stability.py',
    'tools/verify_v78_0_18_post_tag_release_workflow_recovery.py',
    'tools/verify_realistic_data_57.py',
    'tools/verify_seed_demo_57.py'
  )
  foreach ($check in $checks) {
    Invoke-Checked "python -X utf8 $check" { & python -X utf8 $check }
  }

  $FrontendDir = Join-Path $Root 'frontend'
  Push-Location $FrontendDir
  try {
    if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
      Invoke-Checked 'Install frontend dependencies' { & npm install }
    }
    Invoke-Checked 'Frontend dependency audit (high/critical gate)' { & npm run security:audit }
    Invoke-Checked 'Frontend zero-warning lint' { & npm run lint }

    $previousApi = $env:NEXT_PUBLIC_API_URL
    try {
      $env:NEXT_PUBLIC_API_URL = '/api'
      Invoke-Checked 'Frontend production build' { & npm run build }
    }
    finally {
      if ($null -eq $previousApi) { Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue }
      else { $env:NEXT_PUBLIC_API_URL = $previousApi }
    }
  }
  finally {
    Pop-Location
  }
}

$ComposeArgs = @(
  '-f', 'docker-compose.yml',
  '-f', 'docker-compose.https.yml',
  '--profile', 'observability'
)

if (-not $SkipDocker) {
  Invoke-Checked 'Docker full stack build/start (8 runtime services + observability)' {
    & docker compose @ComposeArgs up -d --build
  }
  Invoke-Checked 'Docker runtime status' {
    & docker compose @ComposeArgs ps
  }

  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) {
    Write-Host "`n=== Wait for HTTPS frontend readiness: $BaseUrl ===" -ForegroundColor Cyan
    $ready = $false
    for ($i=0; $i -lt 60 -and -not $ready; $i++) {
      & curl.exe -k --silent --show-error --fail --output NUL $BaseUrl 2>$null
      if ($LASTEXITCODE -eq 0) { $ready = $true; break }
      Start-Sleep -Seconds 2
    }
    if (-not $ready) {
      & docker compose @ComposeArgs ps | Out-Host
      throw "HTTPS frontend did not become ready at $BaseUrl within 120 seconds."
    }
    Write-Host "HTTPS frontend is ready." -ForegroundColor Green
  }
  else {
    Write-Host 'curl.exe is unavailable; skipping explicit URL readiness probe. Playwright will still gate runtime readiness.' -ForegroundColor Yellow
  }
}

if (-not $SkipE2E) {
  $FrontendDir = Join-Path $Root 'frontend'
  Push-Location $FrontendDir
  $previousBaseUrl = $env:PLAYWRIGHT_BASE_URL
  $previousChannel = $env:PLAYWRIGHT_BROWSER_CHANNEL
  $previousAdminEmail = $env:E2E_ADMIN_EMAIL
  $previousAdminPassword = $env:E2E_ADMIN_PASSWORD
  try {
    $localEnv = Read-DotEnv (Join-Path $Root '.env')
    $resolvedAdminEmail = if (-not [string]::IsNullOrWhiteSpace($env:E2E_ADMIN_EMAIL)) { $env:E2E_ADMIN_EMAIL } elseif (-not [string]::IsNullOrWhiteSpace($env:ADMIN_EMAIL)) { $env:ADMIN_EMAIL } elseif ($localEnv.ContainsKey('ADMIN_EMAIL')) { $localEnv['ADMIN_EMAIL'] } else { $null }
    $resolvedAdminPassword = if (-not [string]::IsNullOrWhiteSpace($env:E2E_ADMIN_PASSWORD)) { $env:E2E_ADMIN_PASSWORD } elseif (-not [string]::IsNullOrWhiteSpace($env:ADMIN_PASSWORD)) { $env:ADMIN_PASSWORD } elseif ($localEnv.ContainsKey('ADMIN_PASSWORD')) { $localEnv['ADMIN_PASSWORD'] } else { $null }
    if ([string]::IsNullOrWhiteSpace($resolvedAdminEmail) -or [string]::IsNullOrWhiteSpace($resolvedAdminPassword)) {
      throw 'Browser E2E requires the existing admin credentials from root .env (ADMIN_EMAIL/ADMIN_PASSWORD) or explicit E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD.'
    }
    $env:E2E_ADMIN_EMAIL = $resolvedAdminEmail
    $env:E2E_ADMIN_PASSWORD = $resolvedAdminPassword
    Write-Host "E2E admin account: $resolvedAdminEmail (password hidden; reused from existing environment)" -ForegroundColor DarkCyan
    $env:PLAYWRIGHT_BASE_URL = $BaseUrl
    if ([string]::IsNullOrWhiteSpace($BrowserChannel)) {
      Remove-Item Env:PLAYWRIGHT_BROWSER_CHANNEL -ErrorAction SilentlyContinue
    }
    else {
      $env:PLAYWRIGHT_BROWSER_CHANNEL = $BrowserChannel
    }

    if ($E2ESpec.Count -gt 0) {
      Write-Host "`n=== Browser E2E release gate: selected specs ===" -ForegroundColor Cyan
      Write-Host ($E2ESpec -join ', ') -ForegroundColor DarkCyan
      & npx playwright test @E2ESpec --project=chromium
    }
    else {
      Write-Host "`n=== Browser E2E release gate: FULL e2e suite ===" -ForegroundColor Cyan
      & npx playwright test --project=chromium
    }
    if ($LASTEXITCODE -ne 0) {
      throw "Browser E2E failed. Git commit/push/tag/release were NOT started. Open report with: cd frontend; npx playwright show-report"
    }
  }
  finally {
    if ($null -eq $previousBaseUrl) { Remove-Item Env:PLAYWRIGHT_BASE_URL -ErrorAction SilentlyContinue }
    else { $env:PLAYWRIGHT_BASE_URL = $previousBaseUrl }
    if ($null -eq $previousChannel) { Remove-Item Env:PLAYWRIGHT_BROWSER_CHANNEL -ErrorAction SilentlyContinue }
    else { $env:PLAYWRIGHT_BROWSER_CHANNEL = $previousChannel }
    if ($null -eq $previousAdminEmail) { Remove-Item Env:E2E_ADMIN_EMAIL -ErrorAction SilentlyContinue }
    else { $env:E2E_ADMIN_EMAIL = $previousAdminEmail }
    if ($null -eq $previousAdminPassword) { Remove-Item Env:E2E_ADMIN_PASSWORD -ErrorAction SilentlyContinue }
    else { $env:E2E_ADMIN_PASSWORD = $previousAdminPassword }
    Pop-Location
  }
  Write-Host 'Browser E2E PASS. GitHub publication is now allowed.' -ForegroundColor Green
}

Write-Host "`n=== Stage source only after all local release gates PASS ===" -ForegroundColor Cyan
git add -A
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'git diff --cached --check failed' }

$staged = git diff --cached --name-only
if ($staged) {
  git commit -m "Release $Version"
  if ($LASTEXITCODE -ne 0) { throw 'git commit failed' }
}
else {
  Write-Host 'No staged source changes; releasing current HEAD.' -ForegroundColor DarkCyan
}

$sha = (git rev-parse HEAD).Trim()
Invoke-Checked 'Push main to GitHub' { git push origin main }
Write-Host "Pushed main: $sha" -ForegroundColor Green

if (-not $SkipCiWait) {
  Write-Host "`n=== Wait for CineBooking CI on exact commit ===" -ForegroundColor Cyan
  $runId = $null
  for ($i=0; $i -lt 60 -and -not $runId; $i++) {
    Start-Sleep -Seconds 2
    $json = gh run list --workflow ci.yml --commit $sha --limit 1 --json databaseId,headSha,status,conclusion | ConvertFrom-Json
    if ($json -and $json.Count -gt 0 -and $json[0].headSha -eq $sha) { $runId = $json[0].databaseId }
  }
  if (-not $runId) { throw "Could not find CineBooking CI run for $sha" }
  & gh run watch $runId --exit-status
  if ($LASTEXITCODE -ne 0) {
    Write-Host "`n=== Failed CI logs ===" -ForegroundColor Red
    gh run view $runId --log-failed | Out-Host
    throw "CineBooking CI failed for $sha. Stable tag/release were NOT created."
  }
  Write-Host "CI PASS for $sha" -ForegroundColor Green
}

Write-Host "`n=== Create immutable stable tag ===" -ForegroundColor Cyan
git tag -a $Version $sha -m "CineBooking Pro $Version"
if ($LASTEXITCODE -ne 0) { throw "Could not create tag $Version" }
git push origin $Version
if ($LASTEXITCODE -ne 0) { throw "Could not push tag $Version" }

Write-Host "`n=== GitHub release workflow ===" -ForegroundColor Cyan
Write-Host "Tag $Version was pushed. .github/workflows/v77-auto-release.yml will create the GitHub Release and attach Full Source + SHA-256 automatically." -ForegroundColor DarkCyan

$releaseUrl = $null
for ($i=0; $i -lt 90 -and -not $releaseUrl; $i++) {
  Start-Sleep -Seconds 4
  $releaseJson = & gh release view $Version --json url,tagName,isDraft,isPrerelease 2>$null
  if ($LASTEXITCODE -eq 0 -and $releaseJson) {
    $release = $releaseJson | ConvertFrom-Json
    if ($release.tagName -eq $Version -and -not $release.isDraft -and -not $release.isPrerelease) {
      $releaseUrl = $release.url
    }
  }
}

if (-not $releaseUrl) {
  Write-Host "GitHub Release was not visible within 6 minutes. Dispatching the stable-release recovery path for the existing immutable tag." -ForegroundColor Yellow
  & gh workflow run v77-auto-release.yml -f "tag=$Version"
  if ($LASTEXITCODE -eq 0) {
    for ($i=0; $i -lt 90 -and -not $releaseUrl; $i++) {
      Start-Sleep -Seconds 4
      $releaseJson = & gh release view $Version --json url,tagName,isDraft,isPrerelease 2>$null
      if ($LASTEXITCODE -eq 0 -and $releaseJson) {
        $release = $releaseJson | ConvertFrom-Json
        if ($release.tagName -eq $Version -and -not $release.isDraft -and -not $release.isPrerelease) {
          $releaseUrl = $release.url
        }
      }
    }
  }
}

if (-not $releaseUrl) {
  Write-Host "Automatic and recovery publication did not complete. Recent stable-release workflow runs:" -ForegroundColor Red
  gh run list --workflow v77-auto-release.yml --limit 5 | Out-Host
  throw "GitHub Release creation did not complete for $Version. For an already-tagged version use tools/recover-stable-release.ps1 after inspecting v77-auto-release.yml."
}

Write-Host "`nPASS: $Version local gates, Browser E2E, main push, CI, immutable tag and automatic GitHub Release all completed." -ForegroundColor Green
Write-Host "Release: $releaseUrl" -ForegroundColor Green
