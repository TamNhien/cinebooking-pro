from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(label,cond):
    checks.append((label,bool(cond)))
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

seed=text('tools/seed-demo-57-tables-10-rows.sql')
seed_ps=text('tools/seed-demo-57-tables.ps1')
repair=text('tools/repair-realistic-data-57-tables.sql')
repair_ps=text('tools/repair-realistic-data-57-tables.ps1')
audit=text('tools/audit-realistic-data-57-tables.sql')
audit_ps=text('tools/audit-realistic-data-57-tables.ps1')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
release=text('.github/workflows/release.yml')
readme=text('README.md')

e2e='\n'.join(p.read_text(encoding='utf-8') for p in sorted((ROOT/'frontend/e2e').glob('*.ts')))
integration='\n'.join(p.read_text(encoding='utf-8') for p in sorted((ROOT/'backend/src/test').rglob('*.java')))
smoke='\n'.join(p.read_text(encoding='utf-8') for p in sorted((ROOT/'tools').glob('test-v*.ps1')))
future_test_data=e2e+'\n'+integration+'\n'+smoke

check('Reference seed separates 10 staff identities from 10 fictional USER customer identities',
      'CREATE TEMP TABLE seed_real_people' in seed and 'CREATE TEMP TABLE seed_real_customers' in seed and "md5('seed45:customer:' || n)::uuid" in seed)
check('Reference customers use natural Vietnamese names and reserved example.com mailboxes',
      all(v in seed for v in ['Nguyễn Minh Khang','Trần Thảo Vy','Lê Gia Hân','Võ Ngọc Mai','Hồ Nhật Nam','minh.khang@example.com','nhat.nam@example.com']))
check('Reference customer-facing booking/payment/loyalty/support/security/PWA ownership uses customer IDs',
      all(v in seed for v in ["md5('seed45:customer:' || n)::uuid", "payer_user_id=md5('seed45:customer:'", "owner_user_id=md5('seed45:customer:'", "UPDATE loyalty_transaction t SET user_id=md5('seed45:customer:'", "UPDATE customer_support_case c SET user_id=md5('seed45:customer:'", "md5('seed45:customer:' || g.n)::uuid"]))
check('Reference role self-check rejects staff-owned customer data',
      all(v in seed for v in ['bookings are not owned by USER customers','staff profiles are linked to customer roles','support cases have invalid customer/staff roles']))
check('Seed runner documents both staff and customer reference accounts',
      'Reference staff accounts:' in seed_ps and 'Reference customer accounts:' in seed_ps and 'minh.khang@example.com' in seed_ps)

check('Future browser/integration/smoke test identities no longer use example.test', '@example.test' not in future_test_data)
check('Future integration device metadata no longer persists Playwright as a device/user-agent label',
      'Playwright integration' not in integration and 'Chrome · Linux · Integration' not in integration)
check('Future E2E customer names are natural names rather than version labels',
      all(v in e2e for v in ['Nguyễn Gia Huy','Nguyễn Minh Khang','Lê Gia Hân','Phạm Quang Huy','Nguyễn Đức Anh','Trần Thảo Vy','Trương Thanh Trúc','Trần Khánh Linh','Hồ Minh Châu','Võ Ngọc Mai','Phạm Hoàng Anh','Lê Minh Thư','Bùi Gia Khánh','Đặng Ngọc Lan']))
check('V46 trusted-device E2E stores a natural device label', 'Laptop cá nhân' in text('frontend/e2e/security-account-protection.spec.ts') and 'Laptop E2E V46' not in e2e)
check('V44 maintenance E2E persists operational equipment/work-order text',
      'Máy chiếu Barco SP4K' in text('frontend/e2e/maintenance-reliability.spec.ts') and 'Cân chỉnh máy chiếu' in text('frontend/e2e/maintenance-reliability.spec.ts') and 'Playwright V44' not in e2e)
check('V43 incident E2E persists an operational incident description',
      'Khách cần hỗ trợ tại cổng soát vé' in text('frontend/e2e/staff-operations.spec.ts') and 'Playwright V43' not in e2e)
check('V45 support E2E now creates a real USER-shaped customer before admin resolution',
      all(v in text('frontend/e2e/customer-support.spec.ts') for v in ['gia.han+support-${stamp}@example.com','Lê Gia Hân','/api/auth/logout','context.clearCookies','Không nhận được email xác nhận vé']))
check('V48 inventory E2E uses natural branch/address/ledger notes',
      all(v in text('frontend/e2e/inventory-operations-v48.spec.ts') for v in ['CineHub Bình Thạnh','88 Nguyễn Gia Trí','Bổ sung tồn kho cho ca tối','Hao hụt ghi nhận khi kiểm kê cuối ca']))
check('Notification test stores a user-facing operational confirmation instead of a test label',
      'Xác nhận kênh thông báo đang hoạt động' in text('backend/src/main/java/com/cinebooking/notification/NotificationService.java') and 'Thông báo thử CineBooking' not in text('backend/src/main/java/com/cinebooking/notification/NotificationService.java'))
check('V10/V11/V12/V19 smoke tests keep realistic human-readable rows',
      all(v in smoke for v in ['Nguyễn Hoàng Long','Trần Đức Minh','Lê Anh Tuấn','Ưu đãi thành viên mới 10%','Bổ sung tồn kho trước ca tối']) and not any(v in smoke for v in ['V10 Test Staff','V11 Test Staff','V12 Test Staff','V10 Test Cinema','Local smoke test','automated smoke test']))

check('Historical repair SQL covers screenshot-era synthetic customers and staff without deleting history',
      all(v in repair for v in ['V29 Playwright Customer','V40 Loyalty Customer','V42 Finance Customer','V10 Test Staff Updated','V11 Test Staff Updated','session_replication_role = replica']) and 'DELETE FROM' not in repair.upper())
check('Historical repair covers maintenance/support/incident/inventory/trusted-device/notification display data',
      all(v in repair for v in ['V44 E2E','V45 E2E support','V43 E2E','V19 automated smoke test restock','Laptop E2E V46','Thông báo thử CineBooking']))
check('Historical repair fixes all non-USER booking/support/payment ownership without deleting history',
      all(v in repair for v in ['UPDATE booking b','UPDATE payment p','UPDATE customer_support_case c','current_payer.role','booking_customer.role']) and 'DELETE FROM' not in repair.upper())
check('Historical ownership repair uses the USER accounts that actually exist in the target database',
      all(v in repair for v in ['CREATE TEMP TABLE repair_user_pool','FROM app_user',"WHERE role=\'USER\'",'repair_booking_owner_map','repair_payment_owner_map','repair_support_owner_map']))
check('Historical repair fails closed when no USER customer exists',
      "Realistic-data repair requires at least one USER account" in repair)
check('Historical repair normalizes residual audit/support/payment-event test display markers',
      all(v in repair for v in ['UPDATE audit_log','UPDATE payment_event pe','@example.test','Không nhận được email xác nhận vé']))
check('Audit-log repair covers every synthetic marker scanned by the runtime audit',
      all(v in repair for v in ['%test staff%','%test cinema%','%local smoke test%','%automated smoke test%','% v43 e2e %','% v44 e2e %','% v45 e2e %','e2e-%','%đường kiểm thử%','%kiểm thử tự động%','%bài test%']))
check('Repair runner is transactional-container safe and never resets volumes',
      'docker compose cp' in repair_ps and 'ON_ERROR_STOP=1' in repair_ps and 'down -v' not in repair_ps.lower())

expected_tables={
'app_user','audit_log','auditorium','auditorium_blackout','auth_session','booking','booking_concession','booking_seat','cinema','cinema_equipment_asset','cinema_concession_inventory','cinema_concession_price','cinema_concession_cost_basis','concession_product','customer_support_case','customer_support_case_event','financial_ledger_entry','financial_ledger_line','financial_reconciliation_issue','financial_reconciliation_run','flyway_schema_history','inventory_movement','loyalty_point_lot','loyalty_reward','loyalty_reward_redemption','loyalty_transaction','maintenance_work_order','maintenance_work_order_event','movie','movie_favorite','movie_review','notification_preference','password_reset_token','payment','payment_event','payment_webhook_event','pricing_rule','pwa_device','recommendation_event','recommendation_feedback','analytics_snapshot','seat','showtime','showtime_planning_run','showtime_waitlist','staff_attendance','staff_incident','staff_leave_request','staff_profile','staff_shift','staff_shift_handover','ticket_checkin_log','trusted_device','security_alert','user_notification','voucher','voucher_redemption'}
audit_tables=set(re.findall(r"'([a-z_]+)'",audit[audit.find('FOREACH t IN ARRAY'):audit.find('] LOOP')]))
check('Audit SQL explicitly enumerates all 57 public tables', len(expected_tables)==57 and expected_tables.issubset(audit_tables))
check('Audit dynamically scans every public text/varchar column for known synthetic display markers',
      'information_schema.columns' in audit and "table_name <> 'flyway_schema_history'" in audit and '@example.test' in audit and 'playwright' in audit and 'kiểm thử tự động' in audit)
check('Audit enforces customer/staff semantic ownership',
      all(v in audit for v in ['booking purchaser is not USER','booking owner is not USER','payment payer is not USER','staff_profile links to non-staff role','support customer is not USER','support assignee is not staff role']))
check('Audit fails closed on empty tables, synthetic text, or semantic violations',
      all(v in audit for v in ['public tables are empty','synthetic human-readable values remain','semantic ownership/name/email violations remain']))
check('Audit runner uses container copy and ON_ERROR_STOP without destructive volume reset',
      'docker compose cp' in audit_ps and 'ON_ERROR_STOP=1' in audit_ps and 'down -v' not in audit_ps.lower())

check('Main CI runs realistic 57-table data policy verifier', 'python3 tools/verify_realistic_data_57.py' in ci)
check('RC and stable release preflight run realistic-data policy verifier', 'python3 tools/verify_realistic_data_57.py' in rc and 'python3 tools/verify_realistic_data_57.py' in release)
check('README documents realistic fictional identities and repair/audit commands',
      'realistic fictional' in readme.lower() and 'repair-realistic-data-57-tables.ps1' in readme and 'audit-realistic-data-57-tables.ps1' in readme)

failed=[name for name,ok in checks if not ok]
print(f"\nV58 realistic 57-table data policy verification: {len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    for name in failed: print(' - '+name)
    sys.exit(1)
