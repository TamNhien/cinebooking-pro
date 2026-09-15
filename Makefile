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
	python tools/verify_v65_local_https.py
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


verify-v66:
	python tools/verify_v60_payment_production_4.py
	python tools/verify_v61_fraud_risk_intelligence.py
	python tools/verify_v62_dynamic_pricing_4.py
	python tools/verify_v63_recommendation_4.py
	python tools/verify_v64_crm_marketing_automation.py
	python tools/verify_v65_observability_reliability.py
	python tools/verify_v65_local_https.py
	python tools/verify_v66_booking_consistency_seat_locking.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v66:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v66.ps1

verify-seed-demo-v66:
	python tools/verify_seed_demo_57.py

check-seed-demo-v66:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v66:
	python tools/verify_reference_data_57.py

verify-realistic-data-v66:
	python tools/verify_realistic_data_57.py

verify-v67:
	python tools/verify_v60_payment_production_4.py
	python tools/verify_v61_fraud_risk_intelligence.py
	python tools/verify_v62_dynamic_pricing_4.py
	python tools/verify_v63_recommendation_4.py
	python tools/verify_v64_crm_marketing_automation.py
	python tools/verify_v65_observability_reliability.py
	python tools/verify_v65_local_https.py
	python tools/verify_v66_booking_consistency_seat_locking.py
	python tools/verify_v67_payment_resilience_reconciliation.py
	python tools/verify_realistic_data_57.py
	python tools/verify_seed_demo_57.py

diagnose-v67:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v67.ps1

verify-seed-demo-v67:
	python tools/verify_seed_demo_57.py

check-seed-demo-v67:
	powershell -ExecutionPolicy Bypass -File ./tools/check-demo-57-table-counts.ps1

verify-reference-v67:
	python tools/verify_reference_data_57.py

verify-realistic-data-v67:
	python tools/verify_realistic_data_57.py



verify-v68:
	python tools/verify_v68_security_identity_5.py


diagnose-v68:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v68.ps1

release-v68:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v68.0.0

verify-v69:
	python tools/verify_v69_backup_disaster_recovery_5.py

diagnose-v69:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v69.ps1

backup-v69:
	powershell -ExecutionPolicy Bypass -File ./tools/backup-dr-v69.ps1

release-v69:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v69.0.0

verify-v70:
	python tools/verify_v70_data_governance_privacy_5.py

diagnose-v70:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v70.ps1

release-v70:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v70.0.0

verify-v71:
	python tools/verify_v71_secrets_key_governance_5.py

diagnose-v71:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v71.ps1

release-v71:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v71.0.0

inventory-v72:
	python tools/generate_supply_chain_inventory_v72.py --output-dir build/supply-chain-v72

verify-v72:
	python tools/verify_v72_software_supply_chain_5.py

diagnose-v72:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v72.ps1

release-v72:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v72.0.0

verify-v73:
	python tools/verify_v73_github_actions_node24.py

diagnose-v73:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v73.ps1

release-v73:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v73.0.0

verify-v74:
	python tools/verify_v74_reliability_resilience_5.py


diagnose-v74:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v74.ps1

failover-plan-v74:
	powershell -ExecutionPolicy Bypass -File ./tools/failover-drill-v74.ps1

release-v74:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v74.0.0

verify-v75:
	python tools/verify_v75_analytics_bi_5.py

diagnose-v75:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v75.ps1

release-v75:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v75.0.0

verify-v75-cost:
	python tools/verify_v75_cost_coverage_drilldown.py

release-v75-patch:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v75.0.1

verify-v76:
	python tools/verify_v76_recommendation_5.py

diagnose-v76:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v76.ps1

release-v76:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v76.0.0

verify-v77:
	python tools/verify_v77_crm_automation_5.py

verify-v77-browser-identity:
	python tools/verify_v77_brave_browser_identity_fix.py

verify-v77-brave-alert-reconciliation:
	python tools/verify_v77_0_2_brave_alert_reconciliation.py

verify-v77-brave-evidence-reconciliation:
	python tools/verify_v77_0_3_historical_brave_evidence_reconciliation.py

verify-v77-zero-warning:
	python tools/verify_v77_0_4_zero_warning_artifact_hygiene.py

verify-v77-warning-free-runtime:
	python tools/verify_v77_0_5_warning_free_runtime_e2e.py

verify-v77-dependency-security:
	python tools/verify_v77_0_6_dependency_security_playwright_bootstrap.py

verify-v77-security-e2e-locator:
	python tools/verify_v77_0_7_security_e2e_strict_locator_reliability.py

verify-v77-ci-deprecation-browser-identity:
	python tools/verify_v77_0_8_ci_deprecation_chromium_brand_identity.py

verify-v77-vietnamese-ui-maintenance:
	python tools/verify_v77_0_9_vietnamese_ui_maintenance_completion.py

verify-v77-vietnamese-localizer-ledger:
	python tools/verify_v77_0_10_vietnamese_localizer_immutable_ledger.py

verify-v77-docker-windows-hygiene:
	python tools/verify_v77_0_11_docker_windows_node_modules_hygiene.py

verify-v77-typescript-localization-hygiene:
	python tools/verify_v77_0_12_typescript_localization_contract_hygiene.py

verify-v77-zero-warning-vietnamese-ui-lint:
	python tools/verify_v77_0_13_zero_warning_vietnamese_ui_lint.py

verify-v77-navigation-language-dropdown-localization:
	python tools/verify_v77_0_14_navigation_language_dropdown_localization.py

diagnose-v77:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v77.ps1

release-v77:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.0

release-v77-0-1:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.1

release-v77-0-2:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.2

release-v77-0-4:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.4

release-v77-0-5:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.5

release-v77-0-6:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.6

release-v77-0-7:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.7

release-v77-0-8:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.8

release-v77-0-9:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.9

release-v77-0-10:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.10

release-v77-0-11:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.11

release-v77-0-12:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.12

release-v77-0-13:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.13

release-v77-patch:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.14

release-v77-0-14:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.14
verify-v77-0-15:
	python tools/verify_v77_0_15_v64_v59_runtime_e2e.py

release-v77-0-15:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.15

verify-v77-0-16:
	python tools/verify_v77_0_16_v59_language_surface_hotfix.py

release-v77-0-16:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.16

verify-v77-0-17:
	python tools/verify_v77_0_17_full_navigation_language_store_fix.py

release-v77-0-17:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.17

verify-v77-0-18:
	python tools/verify_v77_0_18_presentation_language_type_contract_fix.py

release-v77-0-18:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.18
verify-v77-0-19:
	python tools/verify_v77_0_19_zero_warning_marketing_effect_dependencies.py

release-v77-0-19:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.19
verify-v77-0-20:
	python tools/verify_v77_0_20_full_e2e_runtime_stabilization.py

release-v77-0-20:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.20
verify-v77-0-21:
	python tools/verify_v77_0_21_hydration_language_v64_reentry.py

release-v77-0-21:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.21

verify-v77-0-22:
	python tools/verify_v77_0_22_pre_hydration_language_readiness.py

release-v77-0-22:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.22

verify-v77-0-23:
	python tools/verify_v77_0_23_single_provider_hydration_state.py

release-v77-0-23:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.23

verify-v77-0-24:
	python tools/verify_v77_0_24_hydration_bundle_v64_startup_reliability.py

release-v77-0-24:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.24
verify-v77-0-25:
	python tools/verify_v77_0_25_zero_warning_language_provider_cleanup.py

release-v77-0-25:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.25
verify-v77-0-26:
	python tools/verify_v77_0_26_v64_publish_feedback_persistence.py

release-v77-0-26:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.26
verify-v77-0-27:
	python tools/verify_v77_0_27_layout_effect_language_reconciliation.py

release-v77-0-27:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.27
verify-v77-0-28:
	python tools/verify_v77_0_28_compose_readiness_hydration_gate.py

release-v77-0-28:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.28

verify-v77-0-29:
	python tools/verify_v77_0_29_frontend_healthcheck_contract.py

release-v77-0-29:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.29


verify-v77-0-30:
	python tools/verify_v77_0_30_full_suite_runtime_contract_alignment.py

release-v77-0-30:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.30


verify-v77-0-31:
	python tools/verify_v77_0_31_remaining_full_suite_contract_alignment.py

release-v77-0-31:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.31

verify-v77-0-32:
	python tools/verify_v77_0_32_final_four_runtime_contract_alignment.py

release-v77-0-32:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.32
verify-v77-0-33:
	python tools/verify_v77_0_33_final_two_runtime_contract_alignment.py

release-v77-0-33:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.33

verify-v77-0-34:
	python tools/verify_v77_0_34_ticket_control_runtime_contract_alignment.py

release-v77-0-34:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.34


verify-v77-0-35:
	python tools/verify_v77_0_35_admin_payments_runtime_contract_alignment.py

release-v77-0-35:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.35

verify-v77-0-36:
	python tools/verify_v77_0_36_final_three_full_suite_runtime_recovery.py

release-v77-0-36:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.36

verify-v77-0-37:
	python tools/verify_v77_0_37_full_suite_policy_alert_runtime_recovery.py

release-v77-0-37:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.37


verify-v77-0-38:
	python tools/verify_v77_0_38_release_gate_readiness_recovery.py

release-v77-0-38:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.38

verify-v77-0-39:
	python tools/verify_v77_0_39_zero_warning_full_ui_language_contract.py

release-v77-0-39:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.39

verify-v77-0-40:
	python tools/verify_v77_0_40_runtime_language_boundary_fix.py

release-v77-0-40:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.40
verify-v77-0-41:
	python tools/verify_v77_0_41_movies_language_surface_fix.py

release-v77-0-41:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.41

verify-v77-0-42:
	python tools/verify_v77_0_42_full_ui_language_completion.py

release-v77-0-42:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.42
verify-v77-0-43:
	python tools/verify_v77_0_43_language_literal_audit_fix.py

release-v77-0-43:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.43


verify-v77-0-44:
	python tools/verify_v77_0_44_crm_payload_v66_authority_fix.py

release-v77-0-44:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.44

verify-v77-0-45:
	python tools/verify_v77_0_45_full_suite_repeatability_accessibility_fix.py

release-v77-0-45:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.45

verify-v77-0-46:
	python tools/verify_v77_0_46_pwa_readiness_language_sweep_stabilization.py

release-v77-0-46:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.46

verify-v77-0-47:
	python tools/verify_v77_0_47_historical_release_gate_forward_compatibility.py

release-v77-0-47:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.47


verify-v77-0-48:
	python tools/verify_v77_0_48_maintenance_success_feedback_timer_ownership.py

release-v77-0-48:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.48

verify-v77-0-49:
	python tools/verify_v77_0_49_release_staging_whitespace_preflight.py

release-v77-0-49:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.49

verify-v77-0-50:
	python tools/verify_v77_0_50_v26_ci_service_worker_version_parser.py

release-v77-0-50:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.50

verify-v77-0-51:
	python tools/verify_v77_0_51_v66_booking_authority_boot_surface.py

release-v77-0-51:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.51

verify-v77-0-52:
	python tools/verify_v77_0_52_full_suite_transient_read_resilience.py

release-v77-0-52:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.52
verify-v77-0-53:
	python tools/verify_v77_0_53_v29_2_playwright_contract_compatibility.py

release-v77-0-53:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.53

verify-v77-0-54:
	python tools/verify_v77_0_54_v31_ticket_wallet_contract_compatibility.py

release-v77-0-54:
	powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 v77.0.54
