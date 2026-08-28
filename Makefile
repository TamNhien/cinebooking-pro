.PHONY: up down logs recreate backup diagnose-v27 test-v27 diagnose-v28 verify-v28 diagnose-v29 verify-v29 verify-v29.2 verify-v29.3 diagnose-v30 verify-v30 verify-v30-1 verify-v30-2 diagnose-v31 verify-v31 verify-v31-2 diagnose-v32 verify-v32 e2e-v29.2 reset verify-v33 diagnose-v33 verify-v34 diagnose-v34 verify-v35 diagnose-v35 verify-v36 diagnose-v36 verify-v45 diagnose-v45 verify-v51 diagnose-v51 verify-seed-demo-v51 seed-demo-v51 check-seed-demo-v51 verify-reference-v51 seed-reference-v51 check-reference-v51

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

recreate:
	docker compose down
	docker compose up --build -d

backup:
	powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1

diagnose-v27:
	powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v27.ps1

test-v27:
	powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1

diagnose-v28:
	powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1

verify-v28:
	python tools/verify_v28_ci.py

diagnose-v29:
	powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1

verify-v29:
	python tools/verify_v29_release_candidate.py

verify-v29.2:
	python tools/verify_v29_2_playwright_e2e.py

verify-v29.3:
	python tools/verify_v29_3_demo_schedule.py

diagnose-v30:
	powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v30.ps1

verify-v30:
	python tools/verify_v30_discovery_showtimes.py

e2e-v29.2:
	bash tools/e2e-v29.2.sh

reset:
	@echo "V27 SAFETY: destructive volume reset is disabled. Do NOT use docker compose down -v for normal updates."
	@exit 1

verify-v30-1:
	python tools/verify_v30_1_frontend_toolchain.py

diagnose-v30-1:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v30.ps1

verify-v30-2:
	python tools/verify_v30_2_playwright_pin_policy.py


verify-v31:
	python tools/verify_v31_ticket_wallet.py

diagnose-v31:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v31.ps1

verify-v31-1:
	python tools/verify_v31_1_lint_purity.py

verify-v31-2:
	python tools/verify_v31_2_rc_determinism.py

verify-v32:
	python tools/verify_v32_waitlist.py

diagnose-v32:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v32.ps1

verify-v33:
	python tools/verify_v33_showtime_planner.py

diagnose-v33:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v33.ps1

verify-v34:
	python tools/verify_v34_auditorium_blackouts.py

diagnose-v34:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v34.ps1


verify-v35:
	python tools/verify_v35_release_lifecycle.py

diagnose-v35:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v35.ps1

verify-v35-node:
	python tools/verify_v35_setup_node_compat.py

verify-v36:
	python tools/verify_v36_ticket_transfer.py

diagnose-v36:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v36.ps1


verify-v37:
	python tools/verify_v37_payment_gateway.py

diagnose-v37:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v37.ps1

verify-v38:
	python tools/verify_v38_refund_automation.py

diagnose-v38:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v38.ps1


verify-v39:
	python tools/verify_v39_seat_map_ux.py

diagnose-v39:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v39.ps1


verify-v40:
	python tools/verify_v40_loyalty_membership.py

diagnose-v40:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v40.ps1


verify-v41:
	python tools/verify_v41_notification_engagement.py

diagnose-v41:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v41.ps1


verify-v42:
	python tools/verify_v42_financial_ledger.py

diagnose-v42:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v42.ps1

verify-v42.1:
	python tools/verify_v42_1_analytics_export.py

diagnose-v42.1:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v42.1.ps1


verify-v43:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v43_analytics_excel_detail.py
	python tools/verify_v43_analytics_csv_detail.py

diagnose-v43:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v43.ps1

verify-v44:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v43_analytics_excel_detail.py
	python tools/verify_v43_analytics_csv_detail.py
	python tools/verify_v44_maintenance_reliability.py

diagnose-v44:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v44.ps1


verify-v45:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v43_analytics_excel_detail.py
	python tools/verify_v43_analytics_csv_detail.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_seed_demo_47.py

diagnose-v45:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v45.ps1


verify-seed-demo-v45:
	python tools/verify_seed_demo_47.py

seed-demo-v45:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-47-tables.ps1

check-seed-demo-v45:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-47-table-counts.ps1


verify-v46:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v43_analytics_excel_detail.py
	python tools/verify_v43_analytics_csv_detail.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_seed_demo_49.py

diagnose-v46:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v46.ps1

verify-seed-demo-v46:
	python tools/verify_seed_demo_49.py

seed-demo-v46:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-49-tables.ps1

check-seed-demo-v46:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-49-table-counts.ps1


verify-reference-v46:
	python tools/verify_reference_data_49.py

seed-reference-v46:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-49-tables.ps1

check-reference-v46:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-49-table-counts.ps1


verify-v47:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v43_analytics_excel_detail.py
	python tools/verify_v43_analytics_csv_detail.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_seed_demo_50.py

diagnose-v47:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v47.ps1

verify-seed-demo-v47:
	python tools/verify_seed_demo_50.py

seed-demo-v47:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-50-tables.ps1

check-seed-demo-v47:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-50-table-counts.ps1

verify-reference-v47:
	python tools/verify_reference_data_50.py

seed-reference-v47:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-50-tables.ps1

check-reference-v47:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-50-table-counts.ps1

verify-v48:
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_seed_demo_52.py

diagnose-v48:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v48.ps1

verify-seed-demo-v48:
	python tools/verify_seed_demo_52.py

seed-demo-v48:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-52-tables.ps1

check-seed-demo-v48:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-52-table-counts.ps1

verify-reference-v48:
	python tools/verify_reference_data_52.py

seed-reference-v48:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-52-tables.ps1

check-reference-v48:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-52-table-counts.ps1

verify-v49:
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_seed_demo_53.py

diagnose-v49:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v49.ps1

verify-seed-demo-v49:
	python tools/verify_seed_demo_53.py

seed-demo-v49:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-53-tables.ps1

check-seed-demo-v49:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-53-table-counts.ps1

verify-reference-v49:
	python tools/verify_reference_data_53.py

seed-reference-v49:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-53-tables.ps1

check-reference-v49:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-53-table-counts.ps1

verify-v50:
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_seed_demo_54.py

diagnose-v50:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v50.ps1

verify-seed-demo-v50:
	python tools/verify_seed_demo_54.py

seed-demo-v50:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-54-tables.ps1

check-seed-demo-v50:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-54-table-counts.ps1

verify-reference-v50:
	python tools/verify_reference_data_54.py

seed-reference-v50:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-54-tables.ps1

check-reference-v50:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-54-table-counts.ps1

verify-v51:
	python tools/verify_v43_analytics_excel_detail.py
	python tools/verify_v43_analytics_csv_detail.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_seed_demo_56.py

diagnose-v51:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v51.ps1

verify-seed-demo-v51:
	python tools/verify_seed_demo_56.py

seed-demo-v51:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-56-tables.ps1

check-seed-demo-v51:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-56-table-counts.ps1

verify-reference-v51:
	python tools/verify_reference_data_56.py

seed-reference-v51:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-56-tables.ps1

check-reference-v51:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-56-table-counts.ps1


verify-v51-utf8:
	python tools/verify_v51_utf8_real_data.py

seed-real-v51:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-v51-real-data.ps1

check-real-v51:
	powershell -ExecutionPolicy Bypass -File ./tools/check-v51-data-utf8.ps1

verify-v52:
	python tools/verify_v43_analytics_excel_detail.py
	python tools/verify_v43_analytics_csv_detail.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_v52_pwa_mobile_3.py
	python tools/verify_seed_demo_57.py

diagnose-v52:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v52.ps1

verify-seed-demo-v52:
	python tools/verify_seed_demo_57.py

seed-demo-v52:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

check-seed-demo-v52:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v52:
	python tools/verify_reference_data_57.py

seed-reference-v52:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1

check-reference-v52:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

generate-vapid-v52:
	powershell -ExecutionPolicy Bypass -File ./tools/generate-vapid-keys.ps1

verify-v53:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_v52_pwa_mobile_3.py
	python tools/verify_v53_operations_command_center.py
	python tools/verify_seed_demo_57.py

diagnose-v53:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v53.ps1

verify-seed-demo-v53:
	python tools/verify_seed_demo_57.py

check-seed-demo-v53:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v53:
	python tools/verify_reference_data_57.py

check-reference-v53:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

seed-demo-v53:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

seed-reference-v53:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1

verify-v54:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_v52_pwa_mobile_3.py
	python tools/verify_v53_operations_command_center.py
	python tools/verify_v54_performance_benchmarking.py
	python tools/verify_seed_demo_57.py

diagnose-v54:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v54.ps1

verify-seed-demo-v54:
	python tools/verify_seed_demo_57.py

check-seed-demo-v54:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

seed-demo-v54:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

verify-reference-v54:
	python tools/verify_reference_data_57.py

check-reference-v54:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

seed-reference-v54:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1

verify-v55:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_v52_pwa_mobile_3.py
	python tools/verify_v53_operations_command_center.py
	python tools/verify_v54_performance_benchmarking.py
	python tools/verify_v55_customer_retention.py
	python tools/verify_seed_demo_57.py

diagnose-v55:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v55.ps1

verify-seed-demo-v55:
	python tools/verify_seed_demo_57.py

check-seed-demo-v55:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

seed-demo-v55:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

verify-reference-v55:
	python tools/verify_reference_data_57.py

check-reference-v55:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

seed-reference-v55:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1

verify-v56:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_v52_pwa_mobile_3.py
	python tools/verify_v53_operations_command_center.py
	python tools/verify_v54_performance_benchmarking.py
	python tools/verify_v55_customer_retention.py
	python tools/verify_v56_customer_value_rfm.py
	python tools/verify_seed_demo_57.py

diagnose-v56:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v56.ps1

verify-seed-demo-v56:
	python tools/verify_seed_demo_57.py

check-seed-demo-v56:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

seed-demo-v56:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

verify-reference-v56:
	python tools/verify_reference_data_57.py

check-reference-v56:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

seed-reference-v56:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1

verify-v57:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_v52_pwa_mobile_3.py
	python tools/verify_v53_operations_command_center.py
	python tools/verify_v54_performance_benchmarking.py
	python tools/verify_v55_customer_retention.py
	python tools/verify_v56_customer_value_rfm.py
	python tools/verify_v57_booking_seat_intelligence.py
	python tools/verify_seed_demo_57.py

diagnose-v57:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v57.ps1

verify-seed-demo-v57:
	python tools/verify_seed_demo_57.py

check-seed-demo-v57:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

seed-demo-v57:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

verify-reference-v57:
	python tools/verify_reference_data_57.py

check-reference-v57:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

seed-reference-v57:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1



verify-v58:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_v52_pwa_mobile_3.py
	python tools/verify_v53_operations_command_center.py
	python tools/verify_v54_performance_benchmarking.py
	python tools/verify_v55_customer_retention.py
	python tools/verify_v56_customer_value_rfm.py
	python tools/verify_v57_booking_seat_intelligence.py
	python tools/verify_v58_operations_control_center.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v58:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v58.ps1

verify-seed-demo-v58:
	python tools/verify_seed_demo_57.py

check-seed-demo-v58:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

seed-demo-v58:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

verify-reference-v58:
	python tools/verify_reference_data_57.py

check-reference-v58:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

seed-reference-v58:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1


verify-realistic-data-v58:
	python tools/verify_realistic_data_57.py

repair-realistic-data-v58:
	powershell -ExecutionPolicy Bypass -File ./tools/repair-realistic-data-57-tables.ps1

audit-realistic-data-v58:
	powershell -ExecutionPolicy Bypass -File ./tools/audit-realistic-data-57-tables.ps1

verify-v59:
	python tools/verify_v43_staff_operations.py
	python tools/verify_v44_maintenance_reliability.py
	python tools/verify_v45_customer_support.py
	python tools/verify_v46_security_account_protection.py
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v48_concession_inventory_2.py
	python tools/verify_v49_smart_showtime_planning_2.py
	python tools/verify_v50_recommendation_intelligence_2.py
	python tools/verify_v51_analytics_forecasting_3.py
	python tools/verify_v51_utf8_real_data.py
	python tools/verify_v52_pwa_mobile_3.py
	python tools/verify_v53_operations_command_center.py
	python tools/verify_v54_performance_benchmarking.py
	python tools/verify_v55_customer_retention.py
	python tools/verify_v56_customer_value_rfm.py
	python tools/verify_v57_booking_seat_intelligence.py
	python tools/verify_v58_operations_control_center.py
	python tools/verify_v59_realtime_operations_4.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v59:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v59.ps1

verify-seed-demo-v59:
	python tools/verify_seed_demo_57.py

check-seed-demo-v59:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

seed-demo-v59:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

verify-reference-v59:
	python tools/verify_reference_data_57.py

check-reference-v59:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

seed-reference-v59:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1

verify-realistic-data-v59:
	python tools/verify_realistic_data_57.py

repair-realistic-data-v59:
	powershell -ExecutionPolicy Bypass -File ./tools/repair-realistic-data-57-tables.ps1

audit-realistic-data-v59:
	powershell -ExecutionPolicy Bypass -File ./tools/audit-realistic-data-57-tables.ps1

verify-v60:
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v58_operations_control_center.py
	python tools/verify_v59_realtime_operations_4.py
	python tools/verify_v60_payment_production_4.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py


diagnose-v60:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v60.ps1

verify-seed-demo-v60:
	python tools/verify_seed_demo_57.py

check-seed-demo-v60:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

seed-demo-v60:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-demo-57-tables.ps1

verify-reference-v60:
	python tools/verify_reference_data_57.py

check-reference-v60:
	powershell -ExecutionPolicy Bypass -File ./tools/check-reference-57-table-counts.ps1

seed-reference-v60:
	powershell -ExecutionPolicy Bypass -File ./tools/seed-reference-57-tables.ps1

verify-realistic-data-v60:
	python tools/verify_realistic_data_57.py

repair-realistic-data-v60:
	powershell -ExecutionPolicy Bypass -File ./tools/repair-realistic-data-57-tables.ps1

audit-realistic-data-v60:
	powershell -ExecutionPolicy Bypass -File ./tools/audit-realistic-data-57-tables.ps1


verify-v61:
	python tools/verify_v47_payment_gateway_operations.py
	python tools/verify_v59_realtime_operations_4.py
	python tools/verify_v60_payment_production_4.py
	python tools/verify_v61_fraud_risk_intelligence.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v61:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v61.ps1

verify-seed-demo-v61:
	python tools/verify_seed_demo_57.py

check-seed-demo-v61:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v61:
	python tools/verify_reference_data_57.py

verify-realistic-data-v61:
	python tools/verify_realistic_data_57.py

verify-v62:
	python tools/verify_v60_payment_production_4.py
	python tools/verify_v61_fraud_risk_intelligence.py
	python tools/verify_v62_dynamic_pricing_4.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v62:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v62.ps1

verify-seed-demo-v62:
	python tools/verify_seed_demo_57.py

check-seed-demo-v62:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v62:
	python tools/verify_reference_data_57.py

verify-realistic-data-v62:
	python tools/verify_realistic_data_57.py

verify-v63:
	python tools/verify_v60_payment_production_4.py
	python tools/verify_v61_fraud_risk_intelligence.py
	python tools/verify_v62_dynamic_pricing_4.py
	python tools/verify_v63_recommendation_4.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v63:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v63.ps1

verify-seed-demo-v63:
	python tools/verify_seed_demo_57.py

check-seed-demo-v63:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v63:
	python tools/verify_reference_data_57.py

verify-realistic-data-v63:
	python tools/verify_realistic_data_57.py

verify-v64:
	python tools/verify_v60_payment_production_4.py
	python tools/verify_v61_fraud_risk_intelligence.py
	python tools/verify_v62_dynamic_pricing_4.py
	python tools/verify_v63_recommendation_4.py
	python tools/verify_v64_crm_marketing_automation.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v64:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v64.ps1

verify-seed-demo-v64:
	python tools/verify_seed_demo_57.py

check-seed-demo-v64:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v64:
	python tools/verify_reference_data_57.py

verify-realistic-data-v64:
	python tools/verify_realistic_data_57.py

verify-v65:
	python tools/verify_v60_payment_production_4.py
	python tools/verify_v61_fraud_risk_intelligence.py
	python tools/verify_v62_dynamic_pricing_4.py
	python tools/verify_v63_recommendation_4.py
	python tools/verify_v64_crm_marketing_automation.py
	python tools/verify_v65_observability_reliability.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v65:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v65.ps1

verify-seed-demo-v65:
	python tools/verify_seed_demo_57.py

check-seed-demo-v65:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v65:
	python tools/verify_reference_data_57.py

verify-realistic-data-v65:
	python tools/verify_realistic_data_57.py

