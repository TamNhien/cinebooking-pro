from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
sql_path = root / 'tools' / 'seed-demo-49-tables-10-rows.sql'
ps1_path = root / 'tools' / 'seed-demo-49-tables.ps1'
check_sql = root / 'tools' / 'check-demo-49-table-counts.sql'

# V46 has 48 application tables plus Flyway metadata = 49 tables in pgAdmin.
# movie deliberately reuses the 8 canonical V29 rows; flyway_schema_history is read-only.
expected_seed_inserts = {
    'app_user','audit_log','auditorium','auditorium_blackout','auth_session',
    'booking','booking_concession','booking_seat','cinema','cinema_equipment_asset',
    'concession_product','customer_support_case','customer_support_case_event',
    'financial_ledger_entry','financial_ledger_line','financial_reconciliation_issue',
    'financial_reconciliation_run','inventory_movement','loyalty_point_lot','loyalty_reward',
    'loyalty_reward_redemption','loyalty_transaction','maintenance_work_order',
    'maintenance_work_order_event','movie_favorite','movie_review','notification_preference',
    'password_reset_token','payment','payment_webhook_event','pricing_rule','recommendation_event',
    'seat','security_alert','showtime','showtime_waitlist','staff_attendance','staff_incident',
    'staff_leave_request','staff_profile','staff_shift','staff_shift_handover','ticket_checkin_log',
    'trusted_device','user_notification','voucher','voucher_redemption'
}
all_49_tables = expected_seed_inserts | {'movie','flyway_schema_history'}
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
verification_array = set(re.findall(r"'([a-z_]+)'", sql[sql.find('Quick verification of all 49 tables'):]))
main_data = sql[:sql.find('-- Fail if seeded reference rows')]

check('V46 49-table SQL exists and decodes as UTF-8', sql_path.exists() and 'Nguyễn Minh An' in sql and 'Bắp Phô Mai Lớn' in sql)
check('V46 49-table PowerShell runner exists', ps1_path.exists())
check('All 47 seeded application tables have INSERT coverage', expected_seed_inserts.issubset(targets) and len(expected_seed_inserts) == 47)
check('Reference people use natural Vietnamese names and non-placeholder emails', all(v in sql for v in ['Nguyễn Minh An','Trần Quốc Bảo','Phạm Thu Hà','an.nguyen@cinebooking.local','chau.ho@cinebooking.local']))
check('Staff codes no longer use DEMO45 labels', 'CBM001' in sql and 'CBS010' in sql and "format('DEMO45-%s'" not in main_data)
check('Concession rows use real product names', all(v in sql for v in ['Bắp Caramel Vừa','Bắp Phô Mai Lớn','Coca-Cola Lớn','Combo Family']))
check('Equipment rows use real asset identities', all(v in sql for v in ['Máy chiếu Barco SP4K-15','Bộ xử lý âm thanh Dolby CP950','Switch Cisco CBS350','Tủ trung tâm báo cháy Hochiki']))
check('Auditoriums are distributed one per reference cinema', "md5('seed45:cinema:' || n)::uuid" in sql[sql.find('INSERT INTO auditorium'):sql.find('-- 04. movie')])
check('Maintenance assets are distributed by cinema and auditorium', "md5('seed45:cinema:' || n)::uuid" in sql[sql.find('INSERT INTO cinema_equipment_asset'):sql.find('-- 39. maintenance_work_order')] and "md5('seed45:auditorium:' || n)::uuid" in sql[sql.find('INSERT INTO cinema_equipment_asset'):sql.find('-- 39. maintenance_work_order')])
check('Maintenance seed repairs existing branch ownership', 'Keep branch-scoped reference data aligned' in sql and "cinema_id=md5('seed45:cinema:' || m.n)::uuid" in sql and "UPDATE auditorium a SET cinema_id=md5('seed45:cinema:' || g.n)::uuid" in sql)
check('Gigamall receives a branch-specific maintenance asset code', 'AUD-GM-001' in sql)
check('Seeded payments use only configured local MOCK provider', "INSERT INTO payment(" in sql and "    'MOCK'," in main_data and not re.search(r"CASE\s+WHEN[^\n]+(?:VNPAY|MOMO)", main_data, re.I))
check('Existing seeded VNPAY/MOMO rows are repaired to MOCK', "UPDATE payment p SET\n    provider='MOCK'" in sql and "UPDATE payment_webhook_event e SET\n    provider='MOCK'" in sql)
check('Runtime self-check rejects leftover VNPAY/MOMO seeded rows', 'seeded VNPAY/MOMO rows remain' in sql and "p.provider IN ('VNPAY','VNPAY_QR','MOMO','MOMO_QR')" in sql)
check('Runtime self-check rejects placeholder Demo/mẫu values', 'placeholder values containing demo/mẫu remain' in sql and "lower(v) LIKE '%demo%'" in sql and "lower(v) LIKE '%mẫu%'" in sql)
check('No placeholder Demo/mẫu labels are inserted or refreshed', not re.search(r"^.*'(?:[^'\n]*(?:Demo|mẫu)[^'\n]*)'.*$", main_data, re.I | re.M))
check('trusted_device receives 10 deterministic rows', 'seed46:trusted-device:' in sql and 'INSERT INTO trusted_device(' in sql)
check('security_alert receives 10 deterministic rows', 'seed46:security-alert:' in sql and 'INSERT INTO security_alert(' in sql)
check('Security alert seed covers V46 event types', all(v in sql for v in ['NEW_DEVICE','CREDENTIAL_ATTACK','PASSWORD_CHANGED','PASSWORD_RESET','SESSION_REVOKED']))
check('Support cases use distinct real staff assignees', "assigned_to=md5('seed45:user:' || g.n)::uuid" in sql and "md5('seed45:user:' || n)::uuid" in sql[sql.find('INSERT INTO customer_support_case'):sql.find('-- 46. customer_support_case_event')])
check('movie table is not seeded with synthetic rows', not re.search(r'INSERT\s+INTO\s+movie\s*\(', sql, re.I))
check('All eight canonical V29 movie IDs are reused', all(mid in sql for mid in canonical_movie_ids))
check('Flyway metadata is never inserted/updated/deleted', not re.search(r'(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+flyway_schema_history', sql, re.I))
check('Final verification enumerates all 49 pgAdmin tables', all_49_tables.issubset(verification_array) and len(all_49_tables) == 49)
check('Row-count helper includes V46 tables', counts.count("'trusted_device'") == 2 and counts.count("'security_alert'") == 2)
check('Ledger stays balanced with MOCK clearing account', "'PAYMENT_CLEARING:MOCK','DEBIT'" in sql and "'CUSTOMER_FUNDS_CAPTURED','CREDIT'" in sql)
check('PowerShell is byte-safe UTF-8 and documents realistic account credentials', 'docker compose cp' in ps1 and 'Get-Content' not in ps1 and 'CineBooking@123' in ps1 and 'an.nguyen@cinebooking.local' in ps1)
check('Seed remains transactional and fails on empty tables', 'BEGIN;' in sql and 'COMMIT;' in sql and "client_encoding = 'UTF8'" in sql and 'IF c = 0 THEN' in sql)

passed=sum(ok for _,ok in checks)
print(f"\nSeed V46 49-table realistic-data verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed == len(checks) else 1)
