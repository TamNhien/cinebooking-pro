from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
sql_path = root / 'tools' / 'seed-demo-57-tables-10-rows.sql'
ps1_path = root / 'tools' / 'seed-demo-57-tables.ps1'
check_sql = root / 'tools' / 'check-demo-57-table-counts.sql'

# V52 has 56 application tables plus Flyway metadata = 57 tables in pgAdmin.
# movie deliberately reuses the 8 canonical V29 rows; flyway_schema_history is read-only.
expected_seed_inserts = {
    'app_user','audit_log','auditorium','auditorium_blackout','auth_session',
    'booking','booking_concession','booking_seat','cinema','cinema_equipment_asset',
    'cinema_concession_inventory','cinema_concession_price','cinema_concession_cost_basis','concession_product','customer_support_case','customer_support_case_event',
    'financial_ledger_entry','financial_ledger_line','financial_reconciliation_issue',
    'financial_reconciliation_run','inventory_movement','loyalty_point_lot','loyalty_reward',
    'loyalty_reward_redemption','loyalty_transaction','maintenance_work_order',
    'maintenance_work_order_event','movie_favorite','movie_review','notification_preference',
    'password_reset_token','payment','payment_event','payment_webhook_event','pricing_rule','pwa_device','recommendation_event','recommendation_feedback','analytics_snapshot',
    'seat','security_alert','showtime','showtime_planning_run','showtime_waitlist','staff_attendance','staff_incident',
    'staff_leave_request','staff_profile','staff_shift','staff_shift_handover','ticket_checkin_log',
    'trusted_device','user_notification','voucher','voucher_redemption'
}
all_57_tables = expected_seed_inserts | {'movie','flyway_schema_history'}
canonical_movie_ids = [
    '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
    '88888888-8888-8888-8888-888888888888','99999999-9999-9999-9999-999999999999',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc','dddddddd-dddd-dddd-dddd-dddddddddddd',
]

checks=[]
def check(name, condition):
    checks.append((name, bool(condition)))
    print(f"[ {'OK' if condition else 'FAIL'} ] {name}")

sql = sql_path.read_text(encoding='utf-8') if sql_path.exists() else ''
ps1 = ps1_path.read_text(encoding='utf-8') if ps1_path.exists() else ''
counts = check_sql.read_text(encoding='utf-8') if check_sql.exists() else ''
targets = {t.lower() for t in re.findall(r'INSERT\s+INTO\s+([a-zA-Z_][\w]*)', sql, re.I)}
verification_array = set(re.findall(r"'([a-z_]+)'", sql[sql.find('Quick verification of all 57 tables'):]))
main_data = sql[:sql.find('-- Fail if seeded reference rows')]

check('V52 57-table SQL exists and decodes as UTF-8', sql_path.exists() and 'Nguyễn Minh An' in sql and 'Bắp Phô Mai Lớn' in sql)
check('V52 57-table PowerShell runner exists', ps1_path.exists())
check('All 55 seeded application tables have INSERT coverage', expected_seed_inserts.issubset(targets) and len(expected_seed_inserts) == 55)
check('Reference staff use natural Vietnamese names and non-placeholder emails', all(v in sql for v in ['Nguyễn Minh An','Trần Quốc Bảo','Phạm Thu Hà','an.nguyen@cinebooking.local','chau.ho@cinebooking.local']))
check('Reference fixture defines 10 fictional USER customers with natural Vietnamese identities', 'CREATE TEMP TABLE seed_real_customers' in sql and all(v in sql for v in ['Nguyễn Minh Khang','Trần Thảo Vy','Lê Gia Hân','Võ Ngọc Mai','Hồ Nhật Nam','minh.khang@example.com','nhat.nam@example.com']))
check('Reference app_user coverage includes separate staff and customer identities', "md5('seed45:user:' || g.n)::uuid" in sql and "md5('seed45:customer:' || g.n)::uuid" in sql and "'USER'" in sql[sql.find('seed45:customer:'):sql.find('-- 02. audit_log')])
check('Customer-domain reference rows are relinked to USER customer IDs', all(marker in sql for marker in [
    "purchaser_user_id=md5('seed45:customer:'", "payer_user_id=md5('seed45:customer:'", "owner_user_id=md5('seed45:customer:'",
    "UPDATE loyalty_transaction t SET user_id=md5('seed45:customer:'", "UPDATE movie_review r SET user_id=md5('seed45:customer:'",
    "UPDATE customer_support_case c SET user_id=md5('seed45:customer:'", "INSERT INTO pwa_device("
]))
check('Reference self-check enforces USER booking owners and staff-only staff profiles', 'Reference ownership failed: % bookings are not owned by USER customers' in sql and 'staff profiles are linked to customer roles' in sql and 'support cases have invalid customer/staff roles' in sql)
check('Staff codes no longer use DEMO45 labels', 'CBM001' in sql and 'CBS010' in sql and "format('DEMO45-%s'" not in main_data)
check('Concession rows use real product names', all(v in sql for v in ['Bắp Caramel Vừa','Bắp Phô Mai Lớn','Coca-Cola Lớn','Combo Family']))
check('V48 branch inventory seeds all 100 reference cinema/product pairs', 'seed48:branch-inventory:' in sql and 'CROSS JOIN generate_series(1,10) p(n)' in sql and 'expected 100 cinema/product rows' in sql)
check('V48 branch prices seed all 100 reference cinema/product pairs', 'seed48:branch-price:' in sql and 'cinema_concession_price' in sql and 'V48 branch pricing refresh failed' in sql)
check('V48 inventory movement rows carry cinema and reference key', 'cinema_id,booking_id,movement_type' in sql and 'REFERENCE-RESTOCK-' in sql)
check('Equipment rows use real asset identities', all(v in sql for v in ['Máy chiếu Barco SP4K-15','Bộ xử lý âm thanh Dolby CP950','Switch Cisco CBS350','Tủ trung tâm báo cháy Hochiki']))
check('Auditoriums are distributed one per reference cinema', "md5('seed45:cinema:' || n)::uuid" in sql[sql.find('INSERT INTO auditorium'):sql.find('-- 04. movie')])
check('Maintenance assets are distributed by cinema and auditorium', "md5('seed45:cinema:' || n)::uuid" in sql[sql.find('INSERT INTO cinema_equipment_asset'):sql.find('-- 39. maintenance_work_order')] and "md5('seed45:auditorium:' || n)::uuid" in sql[sql.find('INSERT INTO cinema_equipment_asset'):sql.find('-- 39. maintenance_work_order')])
check('Maintenance seed repairs existing branch ownership', 'Keep branch-scoped reference data aligned' in sql and "cinema_id=md5('seed45:cinema:' || m.n)::uuid" in sql and "UPDATE auditorium a SET cinema_id=md5('seed45:cinema:' || g.n)::uuid" in sql)
check('Gigamall receives a branch-specific maintenance asset code', 'AUD-GM-001' in sql)
check('Seeded payments use only configured local MOCK provider', "INSERT INTO payment(" in sql and "    'MOCK'," in main_data and not re.search(r"CASE\s+WHEN[^\n]+(?:VNPAY|MOMO)", main_data, re.I))
check('Existing seeded VNPAY/MOMO rows are repaired to MOCK', "UPDATE payment p SET\n    provider='MOCK'" in sql and "UPDATE payment_webhook_event e SET\n    provider='MOCK'" in sql)
check('Runtime self-check rejects leftover VNPAY/MOMO seeded rows', 'seeded VNPAY/MOMO rows remain' in sql and "p.provider IN ('VNPAY','VNPAY_QR','MOMO','MOMO_QR')" in sql)
check('Runtime self-check rejects placeholder Demo/mẫu values', 'placeholder values containing demo/mẫu remain' in sql and "lower(v) LIKE '%demo%'" in sql and "lower(v) LIKE '%mẫu%'" in sql)
check('V47 payment_event remains covered with honest local history markers', 'INSERT INTO payment_event(' in sql and 'seed47:payment-event:' in sql and 'PAYMENT_HISTORY_IMPORTED' in sql and 'V47_REFERENCE_SYNC' in sql)
check('No placeholder Demo/mẫu labels are inserted or refreshed', not re.search(r"^.*'(?:[^'\n]*(?:Demo|mẫu)[^'\n]*)'.*$", main_data, re.I | re.M))
check('trusted_device receives 10 deterministic rows', 'seed46:trusted-device:' in sql and 'INSERT INTO trusted_device(' in sql)
check('security_alert receives 10 deterministic rows', 'seed46:security-alert:' in sql and 'INSERT INTO security_alert(' in sql)
check('Security alert seed covers V46 event types', all(v in sql for v in ['NEW_DEVICE','CREDENTIAL_ATTACK','PASSWORD_CHANGED','PASSWORD_RESET','SESSION_REVOKED']))
check('Support cases use distinct real staff assignees', "assigned_to=md5('seed45:user:' || g.n)::uuid" in sql and "md5('seed45:user:' || n)::uuid" in sql[sql.find('INSERT INTO customer_support_case'):sql.find('-- 46. customer_support_case_event')])
check('Admin shift page receives 10 deterministic upcoming scheduled shifts', "seed46:planned-shift:" in sql and "CURRENT_DATE + (n - 1)" in sql and "'SCHEDULED'" in sql[sql.find('-- 08B. staff_shift upcoming schedule'):sql.find('-- 09. staff_attendance')])
check('Reference refresh keeps upcoming shifts inside the default 14-day window', 'expected 10 upcoming shifts in the default admin window' in sql and "s.shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14" in sql)
check('V49 smart planner seeds 10 durable planning runs', 'INSERT INTO showtime_planning_run(' in sql and 'seed49:planning-run:' in sql and 'V49-DEMAND-BALANCED-2' in sql)
check('V49 reference showtimes keep SMART provenance', "planning_source='SMART'" in sql and "planning_run_id=md5('seed49:planning-run:'" in sql and 'planning_score=LEAST(100, 62 + g.n * 2)' in sql)
check('V50 recommendation feedback seeds 10 explicit taste controls', 'INSERT INTO recommendation_feedback(' in sql and 'seed50:recommendation-feedback:' in sql and all(v in sql for v in ['MORE_LIKE_THIS','LESS_LIKE_THIS','HIDE']))
check('V50 recommendation feedback refresh is deterministic and self-checked', 'ON CONFLICT (user_id,movie_id) DO UPDATE SET' in sql and 'V50 recommendation feedback refresh failed: expected 10 deterministic rows' in sql)
check('V51 seeds 10 branch cost-basis reference rows without filling every branch/product pair', 'INSERT INTO cinema_concession_cost_basis(' in sql and 'seed51:cost-basis:' in sql and 'Missing combinations stay unknown/NULL by design' in sql)
check('V51 seeds 10 deterministic analytics snapshots across daily weekly monthly periods', 'INSERT INTO analytics_snapshot(' in sql and 'seed51:analytics-snapshot:' in sql and all(v in sql for v in ["'DAILY'","'WEEKLY'","'MONTHLY'"]))
check('V51 reference snapshots pin the forecasting algorithm version', 'V51-WEEKDAY-WEIGHTED-MA-1' in sql and 'V51 analytics snapshot algorithm marker mismatch' in sql)
check('V51 reference rows self-check both new application tables', 'V51 concession cost-basis refresh failed: expected 10 deterministic rows' in sql and 'V51 analytics snapshot refresh failed: expected 10 deterministic rows' in sql)
check('V52 seeds 10 realistic PWA device-presence rows', 'INSERT INTO pwa_device(' in sql and 'seed52:pwa-device:' in sql and 'Chrome · Windows · Laptop văn phòng' in sql)
check('V52 reference devices never fabricate Web Push subscription credentials', 'push_enabled=FALSE' in sql and 'push_endpoint=NULL' in sql and 'p256dh=NULL' in sql and 'auth_secret=NULL' in sql and 'must not contain fabricated Web Push credentials' in sql)
check('V52 reference natural-key upserts reclaim deterministic IDs', sql.count('id=EXCLUDED.id') >= 4 and 'ON CONFLICT (cinema_id,period_kind,period_start) DO UPDATE SET\n    id=EXCLUDED.id' in sql and 'ON CONFLICT (cinema_id,product_id) DO UPDATE SET\n    id=EXCLUDED.id' in sql and 'ON CONFLICT (user_id,movie_id) DO UPDATE SET\n    id=EXCLUDED.id' in sql and 'ON CONFLICT (device_key) DO UPDATE SET\n    id=EXCLUDED.id' in sql)
check('movie table is not seeded with synthetic rows', not re.search(r'INSERT\s+INTO\s+movie\s*\(', sql, re.I))
check('All eight canonical V29 movie IDs are reused', all(mid in sql for mid in canonical_movie_ids))
check('Flyway metadata is never inserted/updated/deleted', not re.search(r'(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+flyway_schema_history', sql, re.I))
check('Final verification enumerates all 57 pgAdmin tables', all_57_tables.issubset(verification_array) and len(all_57_tables) == 57)
check('Row-count helper includes V46 through V52 tables', counts.count("'pwa_device'") == 2 and counts.count("'trusted_device'") == 2 and counts.count("'security_alert'") == 2 and counts.count("'payment_event'") == 2 and counts.count("'cinema_concession_inventory'") == 2 and counts.count("'cinema_concession_price'") == 2 and counts.count("'showtime_planning_run'") == 2 and counts.count("'recommendation_feedback'") == 2 and counts.count("'cinema_concession_cost_basis'") >= 2 and counts.count("'analytics_snapshot'") == 2)
check('Ledger stays balanced with MOCK clearing account', "'PAYMENT_CLEARING:MOCK','DEBIT'" in sql and "'CUSTOMER_FUNDS_CAPTURED','CREDIT'" in sql)
check('PowerShell is byte-safe UTF-8 and documents realistic staff/customer credentials', 'docker compose cp' in ps1 and 'Get-Content' not in ps1 and 'CineBooking@123' in ps1 and 'an.nguyen@cinebooking.local' in ps1 and 'minh.khang@example.com' in ps1)
check('Seed remains transactional and fails on empty tables', 'BEGIN;' in sql and 'COMMIT;' in sql and "client_encoding = 'UTF8'" in sql and 'IF c = 0 THEN' in sql)

passed=sum(ok for _,ok in checks)
print(f"\nSeed V52 57-table realistic-data verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed == len(checks) else 1)
