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
  'tools/verify_realistic_data_57.py',
  'tools/verify_seed_demo_57.py'
)

foreach ($check in $checks) {
  Write-Host "`n>>> python -X utf8 $check" -ForegroundColor Cyan
  & python -X utf8 $check
  if ($LASTEXITCODE -ne 0) { throw "Verification failed: $check" }
}

Invoke-Checked 'V78 UX / Accessibility / PWA 5.0' { python -X utf8 tools/verify_v78_ux_accessibility_pwa_5.py }
Invoke-Checked 'V78.0.1 runtime language boundaries' { python -X utf8 tools/verify_v78_0_1_runtime_language_business_data_boundaries.py }
Invoke-Checked 'V78.0.2 recommendation presentation language ownership' { python -X utf8 tools/verify_v78_0_2_recommendation_presentation_language_ownership.py }
Invoke-Checked 'V78.0.3 staff schedule Admin runtime sweep stability' { python -X utf8 tools/verify_v78_0_3_staff_schedule_admin_runtime_sweep_stability.py }
Invoke-Checked 'V78.0.4 notification presentation language/business-data boundaries' { python -X utf8 tools/verify_v78_0_4_notification_presentation_language_business_boundaries.py }
Invoke-Checked 'V78.0.5 Admin Audit presentation language ownership' { python -X utf8 tools/verify_v78_0_5_admin_audit_presentation_language_ownership.py }
Invoke-Checked 'V78.0.6 Inventory presentation language/business-data boundaries' { python -X utf8 tools/verify_v78_0_6_inventory_presentation_language_business_boundaries.py }
Invoke-Checked 'V78.0.7 visible Admin entry / Inventory product business-data boundaries' { python -X utf8 tools/verify_v78_0_7_admin_v78_entry_inventory_product_boundaries.py }
Invoke-Checked 'V78.0.8 Favorites movie business-data boundaries' { python -X utf8 tools/verify_v78_0_8_favorites_movie_business_data_boundaries.py }
Invoke-Checked 'V78.0.9 Command Center cinema business-data boundaries' { python -X utf8 tools/verify_v78_0_9_command_center_cinema_business_data_boundaries.py }
Invoke-Checked 'V78.0.10 customer intelligence cinema business-data boundaries' { python -X utf8 tools/verify_v78_0_10_customer_intelligence_cinema_business_data_boundaries.py }
Invoke-Checked 'V78.0.11 finance event-key presentation ownership' { python -X utf8 tools/verify_v78_0_11_finance_event_key_presentation_ownership.py }
Invoke-Checked 'V78.0.12 maintenance asset business-data boundaries' { python -X utf8 tools/verify_v78_0_12_maintenance_asset_business_data_boundaries.py }
Invoke-Checked 'V78.0.13 comprehensive presentation-language ownership' { python -X utf8 tools/verify_v78_0_13_comprehensive_language_ownership.py }
Invoke-Checked 'V78.0.14 persistent PWA live-region stability' { python -X utf8 tools/verify_v78_0_14_pwa_live_region_stability.py }
Invoke-Checked 'V78.0.15 full-suite runtime business-data hardening' { python -X utf8 tools/verify_v78_0_15_full_suite_runtime_business_data_hardening.py }
Invoke-Checked 'V78.0.16 Pricing rule business-data boundary' { python -X utf8 tools/verify_v78_0_16_pricing_rule_business_data_boundary.py }
Invoke-Checked 'V78.0.17 Admin Booking cinema business-data boundary' { python -X utf8 tools/verify_v78_0_17_admin_booking_cinema_business_data_boundary.py }
Invoke-Checked 'V78.0.18 full-suite operational read stability' { python -X utf8 tools/verify_v78_0_18_full_suite_operational_read_stability.py }
Invoke-Checked 'V78.0.18 post-tag stable-release workflow recovery' { python -X utf8 tools/verify_v78_0_18_post_tag_release_workflow_recovery.py }

Write-Host 'PASS: CineBooking V78 UX / Accessibility / PWA 5.0 source diagnostics completed.' -ForegroundColor Green
